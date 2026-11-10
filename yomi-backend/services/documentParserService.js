const path = require('path');
const AdmZip = require('adm-zip');
const { fromBuffer: pdf2picFromBuffer } = require('pdf2pic');
const { PDFParse } = require('pdf-parse');

const naturalCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

function decodeOriginalFilename(rawName = '') {
  const str = String(rawName || '');
  try {
    const decoded = Buffer.from(str, 'latin1').toString('utf8');
    if (decoded.includes('\uFFFD')) return str;
    return decoded;
  } catch {
    return str;
  }
}

function getFileExtension(filename = '') {
  const clean = String(filename || '').trim();
  const match = clean.match(/\.([a-zA-Z0-9]{1,8})$/);
  return match ? match[1].toLowerCase() : '';
}

function mimeFromExt(ext = 'jpg') {
  const lower = String(ext || '').toLowerCase();
  if (lower === 'png') return 'image/png';
  if (lower === 'webp') return 'image/webp';
  if (lower === 'gif') return 'image/gif';
  if (lower === 'svg') return 'image/svg+xml';
  return 'image/jpeg';
}

function escapeXml(str = '') {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates a high-contrast Manga Script SVG page image so `.txt` script chapters
 * (or text-only presentation slides) render cleanly inside the `/manga` visual reader.
 */
function buildScriptPageSvgBuffer({ chapterTitle = 'פרק טקסט', pageNumber = 1, lines = [] }) {
  const width = 900;
  const height = Math.max(1250, 240 + lines.length * 145);

  const panelsSvg = lines
    .map((lineText, idx) => {
      const y = 150 + idx * 135;
      const truncated =
        lineText.length > 95 ? `${lineText.slice(0, 92)}...` : lineText;
      const isRight = idx % 2 === 0;
      const boxX = isRight ? 90 : 70;
      return `
    <g transform="translate(${boxX}, ${y})">
      <rect x="0" y="0" width="740" height="112" rx="22" fill="#1e293b" stroke="#475569" stroke-width="2.5" />
      <circle cx="700" cy="30" r="16" fill="#4f46e5" />
      <text x="700" y="36" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="14" fill="#ffffff">#${idx + 1}</text>
      <text x="670" y="64" text-anchor="end" font-family="sans-serif" font-weight="700" font-size="21" fill="#f8fafc">${escapeXml(
        truncated
      )}</text>
    </g>`;
    })
    .join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="pageBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#111827" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#pageBg)" />
  <rect x="28" y="28" width="${width - 56}" height="${height - 56}" rx="28" fill="none" stroke="#334155" stroke-width="3" />
  <text x="${width / 2}" y="82" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="28" fill="#e2e8f0">${escapeXml(
    chapterTitle
  )} — עמוד ${pageNumber}</text>
  <line x1="70" y1="110" x2="${width - 70}" y2="110" stroke="#334155" stroke-width="2" />
  ${panelsSvg}
</svg>`;

  return Buffer.from(svg, 'utf8');
}

/**
 * Detects the normalized document/image format of an uploaded Multer file.
 */
function detectUploadedFileFormat(file) {
  const originalName = decodeOriginalFilename(file?.originalname || '');
  const ext = getFileExtension(originalName);
  const mime = String(file?.mimetype || '').toLowerCase();

  if (ext === 'pdf' || mime === 'application/pdf') {
    return 'pdf';
  }
  if (
    ext === 'pptx' ||
    mime.includes('presentationml.presentation') ||
    mime.includes('powerpoint')
  ) {
    return 'pptx';
  }
  if (ext === 'odp' || mime.includes('opendocument.presentation')) {
    return 'odp';
  }
  if (ext === 'txt' || mime === 'text/plain') {
    return 'txt';
  }
  return 'image';
}

/**
 * 1. PDF Handler:
 * Renders every page of a `.pdf` buffer into a high-resolution PNG buffer in sequential order.
 * Uses `PDFParse.getScreenshot` (pure JS `pdfjs-dist` + `@napi-rs/canvas`, zero external OS binaries needed)
 * with an automatic fallback to `pdf2pic`.
 */
async function parsePdfBuffer(pdfBuffer, originalFileName = 'chapter.pdf', maxPages = 35) {
  const cleanBase = decodeOriginalFilename(originalFileName).replace(/\.[^/.]+$/, '') || 'pdf_chapter';

  // Primary: Pure Node.js high-res page rendering via PDFParse (`pdf-parse` v2)
  let parser = null;
  try {
    parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
    const screenshotResult = await parser.getScreenshot({ scale: 2.0 });
    const rawPages = Array.isArray(screenshotResult?.pages) ? screenshotResult.pages : [];

    if (rawPages.length > 0) {
      const sorted = [...rawPages]
        .sort((a, b) => Number(a.pageNumber || 0) - Number(b.pageNumber || 0))
        .slice(0, maxPages);

      return sorted.map((p, idx) => {
        const pageNum = idx + 1;
        const padded = String(pageNum).padStart(3, '0');
        return {
          pageNumber: pageNum,
          fileName: `${cleanBase}_p${padded}.png`,
          buffer: Buffer.from(p.data),
          mimeType: 'image/png',
          ext: 'png',
          scriptText: null,
        };
      });
    }
  } catch (primaryErr) {
    console.warn('[DocumentParser] PDFParse.getScreenshot fallback to pdf2pic:', primaryErr.message);
  } finally {
    if (parser && typeof parser.destroy === 'function') {
      await parser.destroy().catch(() => {});
    }
  }

  // Secondary fallback: `pdf2pic` (if Ghostscript/GraphicsMagick is installed on host)
  try {
    const converter = pdf2picFromBuffer(pdfBuffer, {
      density: 180,
      format: 'png',
      width: 1200,
      height: 1700,
    });
    const convertedPages = await converter.bulk(-1, { responseType: 'buffer' });
    if (Array.isArray(convertedPages) && convertedPages.length > 0) {
      return convertedPages.slice(0, maxPages).map((item, idx) => {
        const pageNum = idx + 1;
        const padded = String(pageNum).padStart(3, '0');
        return {
          pageNumber: pageNum,
          fileName: `${cleanBase}_p${padded}.png`,
          buffer: Buffer.isBuffer(item.buffer) ? item.buffer : Buffer.from(item.buffer || []),
          mimeType: 'image/png',
          ext: 'png',
          scriptText: null,
        };
      });
    }
  } catch (fallbackErr) {
    throw new Error(`Failed to extract pages from PDF "${originalFileName}": ${fallbackErr.message}`);
  }

  throw new Error(`No readable pages found in PDF "${originalFileName}"`);
}

/**
 * 2. PPTX / ODP Handler:
 * Unzips `.pptx` or `.odp` presentation archives via `adm-zip`, resolves slide order from
 * `ppt/slides/_rels/slideN.xml.rels` (or natural sorting of `ppt/media/*` and `Pictures/*`),
 * and extracts all embedded manga page images sequentially.
 */
async function parsePresentationBuffer(
  zipBuffer,
  originalFileName = 'presentation.pptx',
  maxPages = 35
) {
  const cleanBase =
    decodeOriginalFilename(originalFileName).replace(/\.[^/.]+$/, '') || 'slides_chapter';
  const zip = new AdmZip(zipBuffer);
  const zipEntries = zip.getEntries();

  const entryByPath = new Map();
  for (const entry of zipEntries) {
    if (!entry.isDirectory) {
      entryByPath.set(entry.entryName.replace(/\\/g, '/'), entry);
    }
  }

  // Step A: Try mapping exact slide order via `ppt/slides/_rels/slideN.xml.rels`
  const slideRelsEntries = zipEntries
    .filter((e) => /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/i.test(e.entryName.replace(/\\/g, '/')))
    .sort((a, b) => naturalCollator.compare(a.entryName, b.entryName));

  const orderedMediaEntries = [];
  const usedMediaPaths = new Set();

  for (const relEntry of slideRelsEntries) {
    const relXml = relEntry.getData().toString('utf8');
    const targetMatches = [...relXml.matchAll(/Target="([^"]+)"/gi)];
    for (const match of targetMatches) {
      const rawTarget = match[1];
      if (!rawTarget || !rawTarget.includes('media/')) continue;
      const normalizedPath = path.posix.normalize(
        path.posix.join('ppt/slides', rawTarget)
      );
      const ext = getFileExtension(normalizedPath);
      if (
        IMAGE_EXTENSIONS.has(ext) &&
        entryByPath.has(normalizedPath) &&
        !usedMediaPaths.has(normalizedPath)
      ) {
        usedMediaPaths.add(normalizedPath);
        orderedMediaEntries.push(entryByPath.get(normalizedPath));
      }
    }
  }

  // Step B: Collect any remaining media images in `ppt/media/` (PPTX) or `Pictures/` / `media/` (ODP)
  const remainingMediaEntries = zipEntries
    .filter((e) => {
      if (e.isDirectory) return false;
      const norm = e.entryName.replace(/\\/g, '/');
      if (usedMediaPaths.has(norm)) return false;
      const ext = getFileExtension(norm);
      if (!IMAGE_EXTENSIONS.has(ext)) return false;
      return (
        norm.startsWith('ppt/media/') ||
        norm.startsWith('Pictures/') ||
        norm.startsWith('media/')
      );
    })
    .sort((a, b) => naturalCollator.compare(a.entryName, b.entryName));

  const combinedImageEntries = [...orderedMediaEntries, ...remainingMediaEntries].slice(
    0,
    maxPages
  );

  if (combinedImageEntries.length > 0) {
    return combinedImageEntries.map((entry, idx) => {
      const pageNum = idx + 1;
      const ext = getFileExtension(entry.entryName) || 'jpg';
      const padded = String(pageNum).padStart(3, '0');
      return {
        pageNumber: pageNum,
        fileName: `${cleanBase}_p${padded}.${ext}`,
        buffer: entry.getData(),
        mimeType: mimeFromExt(ext),
        ext,
        scriptText: null,
      };
    });
  }

  // Step C: Fallback if the PPTX/ODP contains text slides (`ppt/slides/slideN.xml` or `content.xml`) with 0 raster images
  const slideXmlEntries = zipEntries
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/i.test(e.entryName.replace(/\\/g, '/')))
    .sort((a, b) => naturalCollator.compare(a.entryName, b.entryName));

  const extractedPages = [];
  for (const slideEntry of slideXmlEntries.slice(0, maxPages)) {
    const xml = slideEntry.getData().toString('utf8');
    const texts = [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/gi)]
      .map((m) => m[1].trim())
      .filter(Boolean);
    if (texts.length > 0) {
      const pageNum = extractedPages.length + 1;
      const padded = String(pageNum).padStart(3, '0');
      const svgBuffer = buildScriptPageSvgBuffer({
        chapterTitle: cleanBase,
        pageNumber: pageNum,
        lines: texts.slice(0, 8),
      });
      extractedPages.push({
        pageNumber: pageNum,
        fileName: `${cleanBase}_slide${padded}.svg`,
        buffer: svgBuffer,
        mimeType: 'image/svg+xml',
        ext: 'svg',
        scriptText: texts.join('\n'),
      });
    }
  }

  if (extractedPages.length > 0) {
    return extractedPages;
  }

  throw new Error(
    `No embedded manga page images or text slides found in "${originalFileName}"`
  );
}

/**
 * 3. TXT Handler:
 * Parses raw `.txt` chapter scripts into structured multi-page script blocks
 * and generates visual Manga Script SVG pages for the `/manga` studio reader.
 */
function parseTxtBuffer(txtBuffer, originalFileName = 'script.txt', maxPages = 35) {
  const cleanBase =
    decodeOriginalFilename(originalFileName).replace(/\.[^/.]+$/, '') || 'script_chapter';
  const rawText = txtBuffer
    .toString('utf8')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .trim();

  if (!rawText) {
    throw new Error(`Text file "${originalFileName}" is empty`);
  }

  // Check if the script has explicit page dividers (`---`, `===`, `Page 1:`, `עמוד 1:`, `第1ページ`)
  const explicitBlocks = rawText
    .split(/(?:^|\n)\s*(?:---+|\===+|(?:\[?\s*(?:page|עמוד|ページ)\s*\d+\s*:?\s*\]?))\s*(?:\n|$)/i)
    .map((block) =>
      block
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
    )
    .filter((lines) => lines.length > 0);

  let pageLineGroups = [];
  if (explicitBlocks.length > 1) {
    pageLineGroups = explicitBlocks.slice(0, maxPages);
  } else {
    const allLines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const linesPerPage = 6;
    for (let i = 0; i < allLines.length && pageLineGroups.length < maxPages; i += linesPerPage) {
      pageLineGroups.push(allLines.slice(i, i + linesPerPage));
    }
  }

  return pageLineGroups.map((lines, idx) => {
    const pageNum = idx + 1;
    const padded = String(pageNum).padStart(3, '0');
    const svgBuffer = buildScriptPageSvgBuffer({
      chapterTitle: cleanBase,
      pageNumber: pageNum,
      lines,
    });

    return {
      pageNumber: pageNum,
      fileName: `${cleanBase}_p${padded}.svg`,
      buffer: svgBuffer,
      mimeType: 'image/svg+xml',
      ext: 'svg',
      scriptText: lines.join('\n'),
    };
  });
}

/**
 * Unified orchestrator: takes uploaded Multer files (`.pdf`, `.pptx`, `.odp`, `.txt`, or `image/*`),
 * extracts/converts all pages in order, and returns a normalized list of page descriptors.
 */
async function extractPagesFromUploadedFiles(files = [], maxPages = 35) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('No files provided');
  }

  const allExtractedPages = [];
  const imageFilesToSort = [];
  let detectedTitle = '';
  let primaryFormat = 'images';

  for (const file of files) {
    const format = detectUploadedFileFormat(file);
    const decodedName = decodeOriginalFilename(file.originalname || '');
    if (!detectedTitle && decodedName) {
      detectedTitle = decodedName
        .replace(/\.[^/.]+$/, '')
        .replace(/[_\-\s]*(p|page)?0*\d+$/i, '')
        .replace(/[_-]+/g, ' ')
        .trim();
    }

    if (format === 'image') {
      imageFilesToSort.push(file);
      continue;
    }

    primaryFormat = format;
    let docPages = [];
    if (format === 'pdf') {
      docPages = await parsePdfBuffer(file.buffer, decodedName, maxPages);
    } else if (format === 'pptx' || format === 'odp') {
      docPages = await parsePresentationBuffer(file.buffer, decodedName, maxPages);
    } else if (format === 'txt') {
      docPages = parseTxtBuffer(file.buffer, decodedName, maxPages);
    }

    allExtractedPages.push(...docPages);
  }

  if (imageFilesToSort.length > 0) {
    const sortedImages = [...imageFilesToSort].sort((a, b) =>
      naturalCollator.compare(
        decodeOriginalFilename(a.originalname),
        decodeOriginalFilename(b.originalname)
      )
    );

    for (const imgFile of sortedImages) {
      const decodedName = decodeOriginalFilename(imgFile.originalname);
      const ext = getFileExtension(decodedName) || 'jpg';
      const safeExt = IMAGE_EXTENSIONS.has(ext) ? ext : 'jpg';
      allExtractedPages.push({
        pageNumber: allExtractedPages.length + 1,
        fileName: decodedName,
        buffer: imgFile.buffer,
        mimeType: imgFile.mimetype || mimeFromExt(safeExt),
        ext: safeExt,
        scriptText: null,
      });
    }
  }

  const capped = allExtractedPages.slice(0, maxPages).map((p, idx) => ({
    ...p,
    pageNumber: idx + 1,
  }));

  if (capped.length === 0) {
    throw new Error('No valid manga pages could be extracted from the uploaded file(s)');
  }

  return {
    pages: capped,
    detectedTitle: detectedTitle || 'פרק מנגה חדש',
    sourceFormat: primaryFormat,
    detectedFormat: primaryFormat,
  };
}

module.exports = {
  detectUploadedFileFormat,
  parsePdfBuffer,
  parsePresentationBuffer,
  parseTxtBuffer,
  extractPagesFromUploadedFiles,
  decodeOriginalFilename,
};
