const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const multer = require('multer');
const router = express.Router();

const supabase = require('../config/supabaseClient');
const {
  analyzeMangaPageVision,
  evaluateMangaDubAttempt,
  formatCleanGeminiError,
} = require('../services/geminiService');
const { generateAudio, assignCharacterVoices } = require('../services/audioService');
const { getUserEntitlements } = require('../services/entitlementsService');
const { scheduleReview, enrichCardWithSrs } = require('../services/srsService');
const { getTokenizer, kata2Hira } = require('../services/morphologyService');
const {
  extractPagesFromUploadedFiles,
  decodeOriginalFilename,
} = require('../services/documentParserService');

const MANGA_BUCKET = 'manga_pages';
const MAX_PAGES_PER_CHAPTER = 35;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 65 * 1024 * 1024, // 65MB to support full multi-page PDF / PPTX / ODP chapters
    files: MAX_PAGES_PER_CHAPTER,
  },
});

let mangaBucketVerified = false;

// In-memory fallback store if SQL migration 005 hasn't been executed yet
const inMemoryChaptersMap = new Map();
// Per-chapter async mutex so concurrent page updates never clobber JSONB
const chapterWriteLocks = new Map();
// Deduplicates concurrent Page Vision requests (e.g., server auto-queue of Page 1 + client request)
const inFlightPageAnalyses = new Map();

function rememberChapterInMemory(chapter) {
  if (!chapter || !chapter.id) return;
  if (inMemoryChaptersMap.size > 50) {
    const oldest = inMemoryChaptersMap.keys().next().value;
    if (oldest) inMemoryChaptersMap.delete(oldest);
  }
  inMemoryChaptersMap.set(chapter.id, chapter);
}

async function withChapterLock(chapterId, taskFn) {
  const prev = chapterWriteLocks.get(chapterId) || Promise.resolve();
  let release;
  const next = new Promise((resolve) => {
    release = resolve;
  });
  chapterWriteLocks.set(
    chapterId,
    prev.catch(() => {}).then(() => next)
  );

  try {
    await prev.catch(() => {});
    return await taskFn();
  } finally {
    release();
    if (chapterWriteLocks.get(chapterId) === next) {
      chapterWriteLocks.delete(chapterId);
    }
  }
}

function getSafeImageExt(file) {
  const mime = String(file?.mimetype || '').toLowerCase();
  if (mime.includes('svg')) return 'svg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  const extMatch = String(file?.originalname || '').match(/\.([a-zA-Z0-9]{2,5})$/);
  if (extMatch) {
    const ext = extMatch[1].toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) return ext;
  }
  return 'jpg';
}

async function ensureMangaBucket() {
  if (mangaBucketVerified) return;
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (!error && Array.isArray(buckets)) {
      const exists = buckets.some((b) => b.name === MANGA_BUCKET);
      if (!exists) {
        await supabase.storage.createBucket(MANGA_BUCKET, {
          public: true,
          fileSizeLimit: 15 * 1024 * 1024,
        });
      }
      mangaBucketVerified = true;
    }
  } catch (err) {
    console.warn('[MangaRoute] Could not verify/create manga_pages bucket:', err.message);
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const currentIdx = cursor++;
      results[currentIdx] = await mapper(items[currentIdx], currentIdx);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

/**
 * Merges newly detected characters on a page into the chapter-wide character roster,
 * preserving consistent Neural2 voices across all pages of the chapter.
 */
function mergeChapterCharacters(existingChars = [], pageDetectedChars = []) {
  const roster = [...existingChars];
  const idAliasMap = new Map();

  for (const detected of pageDetectedChars) {
    const normJa = String(detected.name_ja || '').trim().toLowerCase();
    const normHe = String(detected.name_he || '').trim().toLowerCase();

    const match = roster.find(
      (c) =>
        c.id === detected.id ||
        (normJa && String(c.name_ja || '').trim().toLowerCase() === normJa) ||
        (normHe && String(c.name_he || '').trim().toLowerCase() === normHe)
    );

    if (match) {
      idAliasMap.set(detected.id, match.id);
      if (!match.personality && detected.personality) {
        match.personality = detected.personality;
      }
    } else {
      const uniqueId = roster.some((c) => c.id === detected.id)
        ? `char_${roster.length + 1}`
        : detected.id || `char_${roster.length + 1}`;
      idAliasMap.set(detected.id, uniqueId);
      roster.push({
        ...detected,
        id: uniqueId,
      });
    }
  }

  const voicedRoster = assignCharacterVoices(roster);
  return { characters: voicedRoster, idAliasMap };
}

async function fetchChapterById(chapterId) {
  const { data, error } = await supabase
    .from('manga_chapters')
    .select('*')
    .eq('id', chapterId)
    .maybeSingle();

  if (!error && data) {
    rememberChapterInMemory(data);
    return { chapter: data, fromMemory: false };
  }

  const mem = inMemoryChaptersMap.get(chapterId);
  if (mem) {
    return { chapter: mem, fromMemory: true };
  }

  return { chapter: null, fromMemory: false };
}

async function downloadPageImageBuffer(page) {
  if (page.storage_path) {
    const { data, error } = await supabase.storage
      .from(MANGA_BUCKET)
      .download(page.storage_path);
    if (!error && data) {
      const arrayBuf = await data.arrayBuffer();
      return Buffer.from(arrayBuf);
    }
  }

  if (page.image_url) {
    if (page.image_url.startsWith('data:')) {
      const base64Part = page.image_url.split(',')[1] || '';
      return Buffer.from(base64Part, 'base64');
    }
    const resp = await axios.get(page.image_url, { responseType: 'arraybuffer' });
    return Buffer.from(resp.data);
  }

  throw new Error('No accessible image source found for manga page');
}

// ============================================================================
// Internal Helper: Execute Vision/Script Analysis + Neural2 TTS for a Page
// Deduplicates concurrent requests for the same (chapterId, pageNumber)
// ============================================================================
async function executePageVisionAnalysis(chapterId, targetPageNum, forceReanalyze = false) {
  const inflightKey = `${chapterId}:${targetPageNum}`;
  if (!forceReanalyze && inFlightPageAnalyses.has(inflightKey)) {
    return inFlightPageAnalyses.get(inflightKey);
  }

  const jobPromise = (async () => {
    const { chapter: initialChapter } = await fetchChapterById(chapterId);
    if (!initialChapter) {
      const notFoundErr = new Error('Manga chapter not found');
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }

    const existingPage = (initialChapter.pages || []).find(
      (p) => Number(p.page_number) === targetPageNum
    );
    if (!existingPage) {
      const notFoundErr = new Error(`Page ${targetPageNum} not found in chapter`);
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }

    if (existingPage.status === 'ready' && !forceReanalyze) {
      return {
        chapterId,
        cached: true,
        page: existingPage,
        characters: initialChapter.characters || [],
      };
    }

    // 1. Download image buffer (unless pure SVG script page where script_text is primary)
    let imageBuffer = null;
    const isSvgPage =
      existingPage.mime_type === 'image/svg+xml' ||
      (existingPage.storage_path && existingPage.storage_path.endsWith('.svg'));

    if (!isSvgPage) {
      try {
        imageBuffer = await downloadPageImageBuffer(existingPage);
      } catch (dlErr) {
        if (!existingPage.script_text) {
          throw dlErr;
        }
      }
    }

    // 2. Run Gemini Multimodal Vision / Script Analysis + Kuromoji enrichment
    const visionResult = await analyzeMangaPageVision({
      imageBuffer,
      mimeType: existingPage.mime_type || 'image/jpeg',
      scriptText: existingPage.script_text || null,
      sourceLanguage: initialChapter.source_language,
      jlptTarget: initialChapter.jlpt_target,
      knownCharacters: initialChapter.characters || [],
      chapterTitle: initialChapter.title || '',
    });

    // 3. Serialize character merge + TTS pre-caching + JSONB persistence under chapter lock
    const savedResult = await withChapterLock(chapterId, async () => {
      const { chapter: latestChapter, fromMemory } = await fetchChapterById(chapterId);
      const currentChapter = latestChapter || initialChapter;

      const { characters: mergedCharacters, idAliasMap } = mergeChapterCharacters(
        currentChapter.characters || [],
        visionResult.characters_detected || []
      );

      const charById = new Map(mergedCharacters.map((c) => [c.id, c]));

      // Remap bubble speaker IDs to canonical chapter character IDs & pre-synthesize Neural2 TTS
      const bubblesWithAudio = await mapWithConcurrency(
        visionResult.bubbles || [],
        4,
        async (bubble) => {
          const canonicalSpeakerId =
            idAliasMap.get(bubble.speaker_id) || bubble.speaker_id;
          const speaker =
            charById.get(canonicalSpeakerId) || mergedCharacters[0] || null;

          let audioUrl = null;
          if (bubble.japanese) {
            try {
              const tts = await generateAudio(
                bubble.japanese,
                speaker?.voice_name || 'ja-JP-Neural2-C',
                speaker?.speaking_rate ?? 1.0,
                speaker?.pitch ?? 0.0
              );
              audioUrl = tts.audioUrl;
            } catch (ttsErr) {
              console.warn(
                `[MangaRoute] Bubble TTS skipped on p${targetPageNum}#${bubble.bubble_index}:`,
                ttsErr.message
              );
            }
          }

          return {
            ...bubble,
            speaker_id: canonicalSpeakerId,
            speaker_name_ja: speaker?.name_ja || bubble.speaker_name_ja,
            speaker_name_he: speaker?.name_he || bubble.speaker_name_he,
            audio_url: audioUrl,
          };
        }
      );

      // Pre-cache SFX pronunciation audio as well
      const sfxWithAudio = await mapWithConcurrency(
        visionResult.sfx_list || [],
        3,
        async (sfx) => {
          let audioUrl = null;
          const speakable = sfx.sfx_text || sfx.reading;
          if (speakable) {
            try {
              const tts = await generateAudio(speakable, 'ja-JP-Neural2-D', 1.05, 1.2);
              audioUrl = tts.audioUrl;
            } catch {
              // Optional SFX audio
            }
          }
          return {
            ...sfx,
            audio_url: audioUrl,
          };
        }
      );

      const updatedPage = {
        ...existingPage,
        status: 'ready',
        page_summary_hebrew: visionResult.page_summary_hebrew || '',
        bubbles: bubblesWithAudio,
        sfx_list: sfxWithAudio,
        analyzed_at: new Date().toISOString(),
      };

      const updatedPages = (currentChapter.pages || []).map((p) =>
        Number(p.page_number) === targetPageNum ? updatedPage : p
      );

      const nextChapterObj = {
        ...currentChapter,
        characters: mergedCharacters,
        pages: updatedPages,
      };

      if (!fromMemory) {
        const { data: dbUpdated, error: updErr } = await supabase
          .from('manga_chapters')
          .update({
            characters: mergedCharacters,
            pages: updatedPages,
          })
          .eq('id', chapterId)
          .select()
          .maybeSingle();

        if (!updErr && dbUpdated) {
          rememberChapterInMemory(dbUpdated);
          return { page: updatedPage, characters: mergedCharacters };
        }
      }

      rememberChapterInMemory(nextChapterObj);
      return { page: updatedPage, characters: mergedCharacters };
    });

    return {
      chapterId,
      cached: false,
      page: savedResult.page,
      characters: savedResult.characters,
    };
  })();

  inFlightPageAnalyses.set(inflightKey, jobPromise);
  try {
    return await jobPromise;
  } finally {
    inFlightPageAnalyses.delete(inflightKey);
  }
}

// ============================================================================
// POST /api/manga/chapters — Upload images OR (.pdf, .pptx, .odp, .txt) documents
// ============================================================================
router.post(
  '/chapters',
  (req, res, next) => {
    upload.any()(req, res, (multerErr) => {
      if (multerErr) {
        return res.status(400).json({
          error: `Upload error: ${multerErr.message}`,
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const files = Array.isArray(req.files) ? req.files : [];
      const {
        title = '',
        sourceLanguage = 'he_en_translated',
        jlptTarget = 'N4',
        userId,
      } = req.body || {};

      if (!userId || userId === 'anonymous') {
        return res.status(400).json({ error: 'Authentication (userId) is required' });
      }

      if (files.length === 0) {
        return res.status(400).json({
          error: 'At least 1 manga page image or document (.pdf, .pptx, .odp, .txt) is required',
        });
      }

      const resolvedSourceLang =
        sourceLanguage === 'ja_raw' ? 'ja_raw' : 'he_en_translated';
      const validLevels = new Set(['N5', 'N4', 'N3', 'N2', 'N1']);
      const resolvedJlpt = validLevels.has(jlptTarget) ? jlptTarget : 'N4';

      const { isPro, isAdmin } = await getUserEntitlements(userId);
      const maxAllowedPages = isAdmin || isPro ? MAX_PAGES_PER_CHAPTER : 5;

      // Extract sequential pages from images, PDF, PPTX, ODP, or TXT files
      const { pages: extractedPages, detectedFormat } =
        await extractPagesFromUploadedFiles(files, maxAllowedPages);

      if (!extractedPages || extractedPages.length === 0) {
        return res.status(400).json({
          error: 'Could not extract any readable pages from the uploaded file(s)',
        });
      }

      const chapterId = crypto.randomUUID();
      const firstOriginalName = decodeOriginalFilename(files[0].originalname);
      const cleanTitle =
        String(title || '').trim() ||
        firstOriginalName.replace(/\.[^/.]+$/, '') ||
        'פרק מנגה חדש';

      await ensureMangaBucket();

      const pages = await mapWithConcurrency(
        extractedPages,
        5,
        async (extracted, index) => {
          const pageNumber = index + 1;
          const ext = getSafeImageExt({
            mimetype: extracted.mimeType,
            originalname: extracted.fileName,
          });
          const mimeType =
            extracted.mimeType ||
            (ext === 'svg'
              ? 'image/svg+xml'
              : ext === 'png'
              ? 'image/png'
              : 'image/jpeg');
          const padded = String(pageNumber).padStart(3, '0');
          const storagePath = `${userId}/${chapterId}/page_${padded}.${ext}`;
          const displayFileName =
            extracted.fileName || `page_${padded}.${ext}`;

          let imageUrl = null;
          let storedPath = storagePath;

          try {
            const { error: upErr } = await supabase.storage
              .from(MANGA_BUCKET)
              .upload(storagePath, extracted.buffer, {
                contentType: mimeType,
                upsert: true,
              });

            if (upErr) throw upErr;

            const { data: pubData } = supabase.storage
              .from(MANGA_BUCKET)
              .getPublicUrl(storagePath);
            imageUrl = pubData.publicUrl;
          } catch (storageErr) {
            console.warn(
              `[MangaRoute] Storage upload fallback to data URI on page ${pageNumber}:`,
              storageErr.message
            );
            storedPath = null;
            imageUrl = `data:${mimeType};base64,${extracted.buffer.toString('base64')}`;
          }

          return {
            page_number: pageNumber,
            file_name: displayFileName,
            storage_path: storedPath,
            mime_type: mimeType,
            image_url: imageUrl,
            script_text: extracted.scriptText || null,
            status: 'pending',
            page_summary_hebrew: '',
            bubbles: [],
            sfx_list: [],
          };
        }
      );

      const chapterRecord = {
        id: chapterId,
        user_id: userId,
        title: cleanTitle,
        source_language: resolvedSourceLang,
        jlpt_target: resolvedJlpt,
        total_pages: pages.length,
        characters: [],
        pages,
      };

      const { data, error } = await supabase
        .from('manga_chapters')
        .insert([chapterRecord])
        .select()
        .single();

      let finalChapter = data;
      let persisted = true;

      if (error) {
        console.warn(
          '[MangaRoute] Could not persist to `manga_chapters` (run migration 005):',
          error.message
        );
        persisted = false;
        finalChapter = {
          ...chapterRecord,
          created_at: new Date().toISOString(),
        };
      }

      rememberChapterInMemory(finalChapter);

      // Queue Page 1 for immediate Vision/Script analysis in the background
      executePageVisionAnalysis(chapterId, 1, false).catch((bgErr) => {
        console.warn(
          `[MangaRoute] Auto-queued Page 1 vision notice (${chapterId}):`,
          bgErr.message
        );
      });

      return res.status(201).json({
        persisted,
        sourceFormat: detectedFormat,
        chapter: finalChapter,
      });
    } catch (error) {
      console.error('Error in POST /api/manga/chapters:', error);
      return res.status(500).json({
        error: 'Failed to create manga chapter',
        details: error.message,
      });
    }
  }
);

// ============================================================================
// POST /api/manga/chapters/:id/analyze-page/:pageNumber — Vision + TTS + Save
// ============================================================================
router.post('/chapters/:id/analyze-page/:pageNumber', async (req, res) => {
  const { id: chapterId, pageNumber: rawPageNumber } = req.params;
  const targetPageNum = Number(rawPageNumber);
  const forceReanalyze = Boolean(req.body?.force);

  if (!chapterId || !Number.isInteger(targetPageNum) || targetPageNum < 1) {
    return res.status(400).json({ error: 'Valid chapter id and pageNumber are required' });
  }

  try {
    const result = await executePageVisionAnalysis(
      chapterId,
      targetPageNum,
      forceReanalyze
    );
    return res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    if (statusCode === 404) {
      return res.status(404).json({ error: error.message });
    }

    console.error(
      `Error in POST /api/manga/chapters/${chapterId}/analyze-page/${targetPageNum}:`,
      error
    );

    const cleanErrMsg = formatCleanGeminiError(
      error,
      `שגיאה בניתוח עמוד ${targetPageNum} מול מנוע ה-Vision. לחץ על "נסה שוב".`
    );

    // Best-effort mark page status as 'error'
    await withChapterLock(chapterId, async () => {
      const { chapter, fromMemory } = await fetchChapterById(chapterId);
      if (!chapter) return;
      const errPages = (chapter.pages || []).map((p) =>
        Number(p.page_number) === targetPageNum
          ? { ...p, status: 'error', error_message: cleanErrMsg }
          : p
      );
      if (!fromMemory) {
        await supabase
          .from('manga_chapters')
          .update({ pages: errPages })
          .eq('id', chapterId);
      }
      rememberChapterInMemory({ ...chapter, pages: errPages });
    }).catch(() => {});

    return res.status(500).json({
      error: cleanErrMsg,
      details: cleanErrMsg,
    });
  }
});

// ============================================================================
// POST /api/manga/dub-challenge/evaluate — Reverse-Dubbing Eval + SRS Boost
// ============================================================================
router.post('/dub-challenge/evaluate', async (req, res) => {
  try {
    const {
      userId,
      originalText = '',
      referenceJapanese = '',
      translationHebrew = '',
      speakerNameHe = '',
      speakerPersona = '',
      voiceName = 'ja-JP-Neural2-C',
      speakingRate = 1.0,
      pitch = 0.0,
      bubbleWords = [],
      userSentenceJapanese = '',
    } = req.body;

    const cleanAttempt = String(userSentenceJapanese || '').trim();
    if (!cleanAttempt || !String(referenceJapanese || '').trim()) {
      return res.status(400).json({
        error: 'userSentenceJapanese and referenceJapanese are required',
      });
    }

    // 1. Tokenize learner's Japanese attempt with Kuromoji
    const tokenizer = await getTokenizer();
    const kuromojiTokens = tokenizer.tokenize(cleanAttempt).map((t) => ({
      surface: t.surface_form,
      lemma: t.basic_form && t.basic_form !== '*' ? t.basic_form : t.surface_form,
      reading: t.reading ? kata2Hira(t.reading) : '',
      pos: t.pos,
    }));

    // 2. Evaluate via Gemini Sensei
    const evaluation = await evaluateMangaDubAttempt({
      originalText,
      referenceJapanese,
      translationHebrew,
      speakerNameHe,
      speakerPersona,
      userSentenceJapanese: cleanAttempt,
      kuromojiTokens,
    });

    // 3. Ensure native bubble audio is cached & ready
    let referenceAudioUrl = null;
    try {
      const tts = await generateAudio(
        referenceJapanese,
        voiceName || 'ja-JP-Neural2-C',
        speakingRate ?? 1.0,
        pitch ?? 0.0
      );
      referenceAudioUrl = tts.audioUrl;
    } catch (ttsErr) {
      console.warn('[MangaRoute] Dub reference TTS skipped:', ttsErr.message);
    }

    // 4. Boost matching SRS flashcards if learner succeeded!
    const boostedCards = [];
    if (evaluation.is_correct && userId && userId !== 'anonymous') {
      const producedLemmas = new Set(
        kuromojiTokens
          .filter((t) => !['助詞', '助動詞', '記号'].includes(t.pos))
          .flatMap((t) => [t.lemma, t.surface])
          .filter(Boolean)
      );

      // Also include bubble content lemmas whose reading matches a spoken Hiragana token
      const producedReadings = new Set(
        kuromojiTokens.map((t) => t.reading || kata2Hira(t.surface)).filter(Boolean)
      );
      for (const bw of Array.isArray(bubbleWords) ? bubbleWords : []) {
        if (
          bw &&
          bw.type !== 'particle' &&
          bw.type !== 'punctuation' &&
          bw.reading &&
          producedReadings.has(kata2Hira(bw.reading))
        ) {
          if (bw.lemma) producedLemmas.add(bw.lemma);
          if (bw.kanji) producedLemmas.add(bw.kanji);
        }
      }

      if (producedLemmas.size > 0) {
        const { data: userDeck } = await supabase
          .from('flashcards')
          .select('*')
          .eq('user_id', userId);

        const matchingDeckCards = (userDeck || []).filter(
          (card) =>
            producedLemmas.has(String(card.lemma || '').trim()) ||
            producedLemmas.has(String(card.kanji || '').trim())
        );

        const appliedRating =
          evaluation.grammar_score >= 90 && evaluation.naturalness_score >= 85 ? 4 : 3;
        const now = new Date();

        for (const card of matchingDeckCards.slice(0, 5)) {
          const nextSchedule = scheduleReview(card, appliedRating, now);
          const nextOutputCount = (Number(card.output_success_count) || 0) + 1;

          const updatePayload = {
            state: nextSchedule.state,
            stability: nextSchedule.stability,
            difficulty: nextSchedule.difficulty,
            interval: nextSchedule.interval,
            ease_factor: nextSchedule.ease_factor,
            reps: nextSchedule.reps,
            lapses: nextSchedule.lapses,
            mastery_level: nextSchedule.mastery_level,
            due_date: nextSchedule.due_date,
            last_reviewed_at: nextSchedule.last_reviewed_at,
            output_success_count: nextOutputCount,
            last_output_at: nextSchedule.last_reviewed_at,
          };

          let { data: updatedCard, error: updErr } = await supabase
            .from('flashcards')
            .update(updatePayload)
            .eq('id', card.id)
            .select()
            .maybeSingle();

          if (updErr && updErr.message && updErr.message.includes('output_')) {
            const {
              output_success_count: _o1,
              last_output_at: _o2,
              ...baseUpdate
            } = updatePayload;
            const retry = await supabase
              .from('flashcards')
              .update(baseUpdate)
              .eq('id', card.id)
              .select()
              .maybeSingle();
            updatedCard = retry.data;
            updErr = retry.error;
          }

          if (!updErr && updatedCard) {
            const logRow = {
              card_id: card.id,
              rating: appliedRating,
              state: nextSchedule.state,
              due_date: nextSchedule.due_date,
              interval: nextSchedule.interval,
              ease_factor: nextSchedule.ease_factor,
              reviewed_at: nextSchedule.last_reviewed_at,
              source: 'manga_dub',
            };
            const { error: logErr } = await supabase.from('review_logs').insert([logRow]);
            if (logErr && logErr.message && logErr.message.includes('source')) {
              const { source: _s, ...legacyLogRow } = logRow;
              await supabase.from('review_logs').insert([legacyLogRow]);
            }

            boostedCards.push({
              card: enrichCardWithSrs(updatedCard, now),
              rating: appliedRating,
              nextIntervalLabel: nextSchedule.intervalLabel,
            });
          }
        }
      }
    }

    return res.status(200).json({
      evaluation: {
        ...evaluation,
        reference_audio_url: referenceAudioUrl,
      },
      boostedCards,
    });
  } catch (error) {
    console.error('Error in POST /api/manga/dub-challenge/evaluate:', error);
    return res.status(500).json({
      error: 'Failed to evaluate manga dubbing challenge',
      details: error.message,
    });
  }
});

// ============================================================================
// GET /api/manga/chapters/user/:userId — List user's manga chapters
// ============================================================================
router.get('/chapters/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('manga_chapters')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      const memChapters = [...inMemoryChaptersMap.values()].filter(
        (c) => c.user_id === userId
      );
      return res.status(200).json(memChapters);
    }

    return res.status(200).json(data || []);
  } catch (error) {
    console.error('Error in GET /api/manga/chapters/user/:userId:', error);
    return res.status(500).json({ error: 'Failed to fetch manga chapters' });
  }
});

// ============================================================================
// GET /api/manga/chapters/:id — Fetch single manga chapter with all pages
// ============================================================================
router.get('/chapters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { chapter } = await fetchChapterById(id);
    if (!chapter) {
      return res.status(404).json({ error: 'Manga chapter not found' });
    }
    return res.status(200).json(chapter);
  } catch (error) {
    console.error('Error in GET /api/manga/chapters/:id:', error);
    return res.status(500).json({ error: 'Failed to fetch manga chapter' });
  }
});

// ============================================================================
// DELETE /api/manga/chapters/:id — Delete chapter & clean up storage objects
// ============================================================================
router.delete('/chapters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { chapter } = await fetchChapterById(id);

    if (chapter && Array.isArray(chapter.pages)) {
      const storagePaths = chapter.pages
        .map((p) => p.storage_path)
        .filter(Boolean);
      if (storagePaths.length > 0) {
        await supabase.storage
          .from(MANGA_BUCKET)
          .remove(storagePaths)
          .catch(() => {});
      }
    }

    inMemoryChaptersMap.delete(id);
    await supabase.from('manga_chapters').delete().eq('id', id);

    return res.status(200).json({ message: 'Manga chapter deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/manga/chapters/:id:', error);
    return res.status(500).json({ error: 'Failed to delete manga chapter' });
  }
});

module.exports = router;
