const path = require('path');
const zlib = require('zlib');
const AdmZip = require('adm-zip');
const { fromBuffer: pdf2picFromBuffer } = require('pdf2pic');
const { PDFParse } = require('pdf-parse');
const { PDFDocument } = require('pdf-lib');

const naturalCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'bmp']);

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
  if (lower === 'avif') return 'image/avif';
  if (lower === 'bmp') return 'image/bmp';
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

function decodeXmlEntities(str = '') {
  return String(str || '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * Generates a high-contrast Manga Script SVG page image so `.txt` script chapters
 * (or text-only presentation slides / headless PDF text fallbacks) render cleanly inside `/manga`.
 */
function buildScriptPageSvgBuffer({ chapterTitle = 'פרק טקסט', pageNumber = 1, lines = [] }) {
  const safeLines = Array.isArray(lines) && lines.length > 0 ? lines : [`עמוד ${pageNumber}`];
  const width = 900;
  const height = Math.max(1250, 240 + safeLines.length * 145);

  const panelsSvg = safeLines
    .map((lineText, idx) => {
      const y = 150 + idx * 135;
      const cleanLine = String(lineText || '').trim();
      const truncated =
        cleanLine.length > 95 ? `${cleanLine.slice(0, 92)}...` : cleanLine;
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
 * Checks BOTH lowercase filename extension AND MIME type (critical on Windows where `file.mimetype` is often empty or `application/octet-stream`).
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
    ext === 'ppt' ||
    mime.includes('presentationml.presentation') ||
    mime.includes('ms-powerpoint') ||
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
 * Extracts embedded JPEG (`FF D8 FF` ... `FF D9`) and PNG (`89 50 4E 47` ... `IEND`) buffers
 * directly from a PDF buffer (including inflating FlateDecode streams when applicable).
 */
function scanEmbeddedImagesInPdfBuffer(pdfBuffer, maxPages = 35) {
  const extracted = [];
  if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length < 16) return extracted;

  const buffersToScan = [pdfBuffer];

  // Also try inflating compressed PDF streams that may wrap image bytes
  const streamRegex = /stream\r?\n/g;
  let match;
  while ((match = streamRegex.exec(pdfBuffer.toString('latin1'))) !== null) {
    const startOffset = match.index + match[0].length;
    const endIdx = pdfBuffer.indexOf(Buffer.from('endstream'), startOffset);
    if (endIdx > startOffset && endIdx - startOffset < 25 * 1024 * 1024) {
      const rawSlice = pdfBuffer.subarray(startOffset, endIdx);
      try {
        const inflated = zlib.inflateSync(rawSlice);
        if (inflated && inflated.length > 256) {
          buffersToScan.push(inflated);
        }
      } catch {
        // Not a zlib stream or raw DCTDecode JPEG stream (already covered by pdfBuffer scan)
      }
    }
    if (buffersToScan.length > 80) break;
  }

  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const pngEnd = Buffer.from([0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
  const jpgSig = Buffer.from([0xff, 0xd8, 0xff]);
  const jpgEnd = Buffer.from([0xff, 0xd9]);

  for (const buf of buffersToScan) {
    // 1. Scan for PNGs
    let offset = 0;
    while (offset < buf.length && extracted.length < maxPages) {
      const start = buf.indexOf(pngSig, offset);
      if (start === -1) break;
      const end = buf.indexOf(pngEnd, start + pngSig.length);
      if (end === -1) break;
      const imgBuf = buf.subarray(start, end + pngEnd.length);
      if (imgBuf.length >= 512) {
        extracted.push({ buffer: Buffer.from(imgBuf), ext: 'png', mimeType: 'image/png' });
      }
      offset = end + pngEnd.length;
    }

    // 2. Scan for JPEGs
    offset = 0;
    while (offset < buf.length && extracted.length < maxPages) {
      const start = buf.indexOf(jpgSig, offset);
      if (start === -1) break;
      // Search for JPEG EOI after start
      let end = buf.indexOf(jpgEnd, start + 3);
      while (end !== -1 && end - start < 1024) {
        // Skip tiny thumbnail markers inside EXIF headers
        const nextEnd = buf.indexOf(jpgEnd, end + 2);
        if (nextEnd !== -1 && nextEnd - start < 15 * 1024 * 1024) {
          end = nextEnd;
        } else {
          break;
        }
      }
      if (end === -1) break;
      const imgBuf = buf.subarray(start, end + 2);
      if (imgBuf.length >= 1024) {
        extracted.push({ buffer: Buffer.from(imgBuf), ext: 'jpg', mimeType: 'image/jpeg' });
      }
      offset = end + 2;
    }
  }

  return extracted.slice(0, maxPages);
}

/**
 * Extracts per-page text strings from a PDF buffer using `PDFParse.getText()`
 * with a fallback to raw PDF text operator extraction.
 */
async function extractPdfTextsPerPage(pdfBuffer, maxPages = 35) {
  const pageTexts = [];
  let parser = null;
  try {
    parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
    const textResult = await parser.getText();
    if (Array.isArray(textResult?.pages) && textResult.pages.length > 0) {
      const sorted = [...textResult.pages]
        .sort((a, b) => Number(a.num || a.pageNumber || 0) - Number(b.num || b.pageNumber || 0))
        .slice(0, maxPages);
      for (const p of sorted) {
        const clean = String(p.text || '').trim();
        pageTexts.push(clean);
      }
      return pageTexts;
    }
    if (typeof textResult?.text === 'string' && textResult.text.trim()) {
      pageTexts.push(textResult.text.trim());
      return pageTexts;
    }
  } catch (err) {
    console.warn('[DocumentParser] PDFParse.getText warning:', err.message);
  } finally {
    if (parser && typeof parser.destroy === 'function') {
      await parser.destroy().catch(() => {});
    }
  }
  return pageTexts;
}

/**
 * 1. PDF Handler (Hardened for both Windows & Render Headless Linux):
 * - Tier 1: `PDFParse.getScreenshot` (page rendering to PNG) + per-page text hints.
 * - Tier 2: `PDFParse.getImage` / raw embedded JPEG & PNG stream extraction from PDF objects.
 * - Tier 3: `pdf2pic` (if Ghostscript/GraphicsMagick is installed).
 * - Tier 4: Visual Manga Script SVG pages constructed from per-page PDF text / `pdf-lib` page metadata
 *   so a PDF upload NEVER fails with a 500 error on Render!
 */
async function parsePdfBuffer(pdfBuffer, originalFileName = 'chapter.pdf', maxPages = 35) {
  const cleanBase =
    decodeOriginalFilename(originalFileName).replace(/\.[^/.]+$/, '') || 'pdf_chapter';

  // Pre-extract any selectable text per page (helpful for Google Slides PDFs & fallback)
  const pageTexts = await extractPdfTextsPerPage(pdfBuffer, maxPages);

  // Tier 1: Pure Node.js high-res page rendering via PDFParse (`pdf-parse` v2)
  let parser = null;
  try {
    parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
    const screenshotResult = await parser.getScreenshot({ scale: 1.8 });
    const rawPages = Array.isArray(screenshotResult?.pages) ? screenshotResult.pages : [];

    if (rawPages.length > 0) {
      const sorted = [...rawPages]
        .sort((a, b) => Number(a.pageNumber || 0) - Number(b.pageNumber || 0))
        .slice(0, maxPages);

      const validRendered = sorted.filter((p) => p?.data && p.data.length > 0);
      if (validRendered.length > 0) {
        return validRendered.map((p, idx) => {
          const pageNum = idx + 1;
          const padded = String(pageNum).padStart(3, '0');
          const textHint = pageTexts[idx] ? String(pageTexts[idx]).trim() : '';
          return {
            pageNumber: pageNum,
            fileName: `${cleanBase}_p${padded}.png`,
            buffer: Buffer.from(p.data),
            mimeType: 'image/png',
            ext: 'png',
            scriptText: textHint || null,
          };
        });
      }
    }
  } catch (primaryErr) {
    console.warn(
      '[DocumentParser] PDFParse.getScreenshot failed on host, trying embedded image/text fallbacks:',
      primaryErr.message
    );
  } finally {
    if (parser && typeof parser.destroy === 'function') {
      await parser.destroy().catch(() => {});
    }
  }

  // Tier 2A: Try `PDFParse.getImage()` to extract embedded XObject images per page
  let imgParser = null;
  try {
    imgParser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
    if (typeof imgParser.getImage === 'function') {
      const imageResult = await imgParser.getImage();
      const pagesWithImages = Array.isArray(imageResult?.pages) ? imageResult.pages : [];
      const collected = [];
      for (const p of pagesWithImages) {
        const imgs = Array.isArray(p?.images) ? p.images : [];
        for (const img of imgs) {
          if (img?.data && img.data.length > 512) {
            collected.push({
              buffer: Buffer.from(img.data),
              ext: 'png',
              mimeType: 'image/png',
            });
            if (collected.length >= maxPages) break;
          }
        }
        if (collected.length >= maxPages) break;
      }
      if (collected.length > 0) {
        return collected.map((item, idx) => {
          const pageNum = idx + 1;
          const padded = String(pageNum).padStart(3, '0');
          return {
            pageNumber: pageNum,
            fileName: `${cleanBase}_p${padded}.${item.ext}`,
            buffer: item.buffer,
            mimeType: item.mimeType,
            ext: item.ext,
            scriptText: pageTexts[idx] || null,
          };
        });
      }
    }
  } catch (imgErr) {
    console.warn('[DocumentParser] PDFParse.getImage fallback notice:', imgErr.message);
  } finally {
    if (imgParser && typeof imgParser.destroy === 'function') {
      await imgParser.destroy().catch(() => {});
    }
  }

  // Tier 2B: Direct binary scan for embedded JPEG/PNG streams inside the PDF
  try {
    const rawEmbedded = scanEmbeddedImagesInPdfBuffer(pdfBuffer, maxPages);
    if (rawEmbedded.length > 0) {
      return rawEmbedded.map((item, idx) => {
        const pageNum = idx + 1;
        const padded = String(pageNum).padStart(3, '0');
        return {
          pageNumber: pageNum,
          fileName: `${cleanBase}_p${padded}.${item.ext}`,
          buffer: item.buffer,
          mimeType: item.mimeType,
          ext: item.ext,
          scriptText: pageTexts[idx] || null,
        };
      });
    }
  } catch (scanErr) {
    console.warn('[DocumentParser] Embedded PDF stream scan notice:', scanErr.message);
  }

  // Tier 3: `pdf2pic` (if Ghostscript/GraphicsMagick is installed on the host)
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
          scriptText: pageTexts[idx] || null,
        };
      });
    }
  } catch (pdf2picErr) {
    console.warn('[DocumentParser] pdf2pic fallback notice:', pdf2picErr.message);
  }

  // Tier 4: Guaranteed Zero-500 Fallback — build visual SVG script pages from PDF text or pdf-lib page count
  const nonEmptyPageTexts = pageTexts.filter((t) => t && t.trim().length > 0);
  if (nonEmptyPageTexts.length > 0) {
    return nonEmptyPageTexts.slice(0, maxPages).map((textBlock, idx) => {
      const pageNum = idx + 1;
      const padded = String(pageNum).padStart(3, '0');
      const lines = textBlock
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const svgBuffer = buildScriptPageSvgBuffer({
        chapterTitle: cleanBase,
        pageNumber: pageNum,
        lines: lines.slice(0, 8),
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

  // Even if the PDF had 0 extractable text strings and canvas failed on Linux, inspect page count via pdf-lib
  let totalPdfPages = 1;
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    totalPdfPages = Math.min(Math.max(pdfDoc.getPageCount(), 1), maxPages);
  } catch {
    totalPdfPages = 1;
  }

  return Array.from({ length: totalPdfPages }, (_, idx) => {
    const pageNum = idx + 1;
    const padded = String(pageNum).padStart(3, '0');
    const fallbackLines = [`${cleanBase} — עמוד ${pageNum}`];
    const svgBuffer = buildScriptPageSvgBuffer({
      chapterTitle: cleanBase,
      pageNumber: pageNum,
      lines: fallbackLines,
    });
    return {
      pageNumber: pageNum,
      fileName: `${cleanBase}_p${padded}.svg`,
      buffer: svgBuffer,
      mimeType: 'image/svg+xml',
      ext: 'svg',
      scriptText: fallbackLines.join('\n'),
    };
  });
}

/**
 * Extracts text lines from a PowerPoint `ppt/slides/slideN.xml` string (`<a:t>...</a:t>`).
 */
function extractTextFromSlideXml(xml = '') {
  if (!xml) return '';
  const paragraphs = xml.split(/<\/a:p>/i);
  const lines = [];
  for (const p of paragraphs) {
    const runs = [...p.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/gi)]
      .map((m) => decodeXmlEntities(m[1]))
      .join('');
    const trimmed = runs.trim();
    if (trimmed) {
      lines.push(trimmed);
    }
  }
  return lines.join('\n');
}

/**
 * 2. PPTX / ODP Handler:
 * Unzips `.pptx` or `.odp` presentation archives via `adm-zip`, resolves slide order from
 * `ppt/slides/slideN.xml` + `ppt/slides/_rels/slideN.xml.rels` (or natural sorting of `ppt/media/*` and `Pictures/*`),
 * extracts all embedded manga page images sequentially, AND attaches any slide text boxes (`<a:t>`)
 * as `scriptText` hints alongside the slide image!
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

  // Step A: Inspect `ppt/slides/slideN.xml` in slide order to pair each slide's image(s) with its `<a:t>` text boxes
  const slideXmlEntries = zipEntries
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/i.test(e.entryName.replace(/\\/g, '/')))
    .sort((a, b) => naturalCollator.compare(a.entryName, b.entryName));

  const slidePages = [];
  const usedMediaPaths = new Set();

  for (const slideEntry of slideXmlEntries) {
    if (slidePages.length >= maxPages) break;

    const normSlidePath = slideEntry.entryName.replace(/\\/g, '/');
    const slideFileName = path.posix.basename(normSlidePath); // e.g., "slide1.xml"
    const relsPath = `ppt/slides/_rels/${slideFileName}.rels`;
    const slideXml = slideEntry.getData().toString('utf8');
    const slideText = extractTextFromSlideXml(slideXml);

    const slideMediaEntries = [];
    const relEntry = entryByPath.get(relsPath);
    if (relEntry) {
      const relXml = relEntry.getData().toString('utf8');
      const targetMatches = [...relXml.matchAll(/Target="([^"]+)"/gi)];
      for (const match of targetMatches) {
        const rawTarget = match[1];
        if (!rawTarget || !rawTarget.includes('media/')) continue;
        const normalizedPath = path.posix.normalize(
          path.posix.join('ppt/slides', rawTarget)
        );
        const ext = getFileExtension(normalizedPath);
        if (IMAGE_EXTENSIONS.has(ext) && entryByPath.has(normalizedPath)) {
          usedMediaPaths.add(normalizedPath);
          slideMediaEntries.push(entryByPath.get(normalizedPath));
        }
      }
    }

    if (slideMediaEntries.length > 0) {
      // Attach the slide's text boxes (if any) as `scriptText` hints alongside the slide's image
      slideMediaEntries.forEach((mediaEntry, mediaIdx) => {
        if (slidePages.length >= maxPages) return;
        const pageNum = slidePages.length + 1;
        const ext = getFileExtension(mediaEntry.entryName) || 'jpg';
        const padded = String(pageNum).padStart(3, '0');
        slidePages.push({
          pageNumber: pageNum,
          fileName: `${cleanBase}_p${padded}.${ext}`,
          buffer: mediaEntry.getData(),
          mimeType: mimeFromExt(ext),
          ext,
          scriptText: mediaIdx === 0 && slideText ? slideText : null,
        });
      });
    } else if (slideText) {
      // Text-only slide in PPTX -> render visual Manga Script SVG page + keep scriptText
      const pageNum = slidePages.length + 1;
      const padded = String(pageNum).padStart(3, '0');
      const lines = slideText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const svgBuffer = buildScriptPageSvgBuffer({
        chapterTitle: cleanBase,
        pageNumber: pageNum,
        lines: lines.slice(0, 8),
      });
      slidePages.push({
        pageNumber: pageNum,
        fileName: `${cleanBase}_slide${padded}.svg`,
        buffer: svgBuffer,
        mimeType: 'image/svg+xml',
        ext: 'svg',
        scriptText: slideText,
      });
    }
  }

  // Step B: Also check for standalone `ppt/slides/_rels/slideN.xml.rels` if `slideN.xml` wasn't matched
  if (slidePages.length === 0) {
    const slideRelsEntries = zipEntries
      .filter((e) =>
        /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/i.test(e.entryName.replace(/\\/g, '/'))
      )
      .sort((a, b) => naturalCollator.compare(a.entryName, b.entryName));

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
          const entry = entryByPath.get(normalizedPath);
          const pageNum = slidePages.length + 1;
          const padded = String(pageNum).padStart(3, '0');
          slidePages.push({
            pageNumber: pageNum,
            fileName: `${cleanBase}_p${padded}.${ext}`,
            buffer: entry.getData(),
            mimeType: mimeFromExt(ext),
            ext,
            scriptText: null,
          });
        }
      }
    }
  }

  // Step C: Collect any remaining media images in `ppt/media/` (PPTX) or `Pictures/` / `media/` (ODP)
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

  // If ODP `content.xml` exists, extract text hints if needed
  let odpTextLines = [];
  const odpContentEntry = entryByPath.get('content.xml');
  if (odpContentEntry) {
    const odpXml = odpContentEntry.getData().toString('utf8');
    odpTextLines = [...odpXml.matchAll(/<text:p[^>]*>([\s\S]*?)<\/text:p>/gi)]
      .map((m) => decodeXmlEntities(m[1].replace(/<[^>]+>/g, '')).trim())
      .filter(Boolean);
  }

  for (const entry of remainingMediaEntries) {
    if (slidePages.length >= maxPages) break;
    const pageNum = slidePages.length + 1;
    const ext = getFileExtension(entry.entryName) || 'jpg';
    const padded = String(pageNum).padStart(3, '0');
    slidePages.push({
      pageNumber: pageNum,
      fileName: `${cleanBase}_p${padded}.${ext}`,
      buffer: entry.getData(),
      mimeType: mimeFromExt(ext),
      ext,
      scriptText: odpTextLines[pageNum - 1] || null,
    });
  }

  if (slidePages.length > 0) {
    return slidePages.slice(0, maxPages);
  }

  // Step D: If ODP had only text in `content.xml` and 0 images
  if (odpTextLines.length > 0) {
    const svgBuffer = buildScriptPageSvgBuffer({
      chapterTitle: cleanBase,
      pageNumber: 1,
      lines: odpTextLines.slice(0, 8),
    });
    return [
      {
        pageNumber: 1,
        fileName: `${cleanBase}_slide001.svg`,
        buffer: svgBuffer,
        mimeType: 'image/svg+xml',
        ext: 'svg',
        scriptText: odpTextLines.join('\n'),
      },
    ];
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
