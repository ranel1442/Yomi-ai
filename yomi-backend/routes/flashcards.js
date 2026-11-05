const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient');
const { scheduleReview, enrichCardWithSrs } = require('../services/srsService');
const { generateAudio } = require('../services/audioService');
const { buildContextFurigana } = require('../services/morphologyService');

async function safeSynthesizeUrl(text) {
  const cleaned = String(text || '').trim();
  if (!cleaned) return null;
  try {
    const result = await generateAudio(cleaned);
    return result?.audioUrl || null;
  } catch (err) {
    console.warn(`[Flashcards] Automatic TTS cache generation failed for "${cleaned.slice(0, 24)}":`, err.message);
    return null;
  }
}

/**
 * Shared handler for POST /api/flashcards and POST /api/flashcards/add.
 * Enforces (user_id, lemma) deduplication and automatically generates + caches
 * both `word_audio_url` and `sentence_audio_url` via Phase 0's `tts_cache`.
 */
async function addFlashcardHandler(req, res) {
  try {
    const {
      userId,
      storyId,
      songId,
      dialogueId,
      mangaChapterId,
      kanji,
      reading,
      lemma,
      meaning_hebrew,
      type,
      context_sentence,
      context_translation,
      context_furigana,
    } = req.body;

    if (!kanji || !meaning_hebrew) {
      return res.status(400).json({ error: 'Kanji and meaning are required' });
    }

    const trimmedKanji = String(kanji).trim();
    const resolvedLemma = String(lemma || trimmedKanji).trim() || trimmedKanji;
    const trimmedContextSentence = context_sentence ? String(context_sentence).trim() : null;
    const trimmedContextTranslation = context_translation ? String(context_translation).trim() : null;

    // 1. Check for existing card by (user_id, lemma) to prevent duplicates
    if (userId && userId !== 'anonymous') {
      const safeLemma = resolvedLemma.replace(/"/g, '\\"');
      const { data: existingRows, error: dupCheckError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', userId)
        .or(`lemma.eq."${safeLemma}",kanji.eq."${safeLemma}"`)
        .limit(1);

      if (!dupCheckError && existingRows && existingRows.length > 0) {
        const existingCard = existingRows[0];

        // If the existing card was a bare word without sentence context and we now have context, enrich it!
        const needsContextUpgrade =
          (!existingCard.context_sentence && trimmedContextSentence) ||
          !existingCard.word_audio_url ||
          (trimmedContextSentence && !existingCard.sentence_audio_url);

        if (needsContextUpgrade) {
          let resolvedFurigana = existingCard.context_furigana;
          if (!Array.isArray(resolvedFurigana) || resolvedFurigana.length === 0) {
            if (Array.isArray(context_furigana) && context_furigana.length > 0) {
              resolvedFurigana = context_furigana;
            } else if (trimmedContextSentence) {
              resolvedFurigana = await buildContextFurigana(trimmedContextSentence);
            }
          }

          const targetSentence = existingCard.context_sentence || trimmedContextSentence;
          const [wordAudioUrl, sentenceAudioUrl] = await Promise.all([
            existingCard.word_audio_url
              ? Promise.resolve(existingCard.word_audio_url)
              : safeSynthesizeUrl(existingCard.kanji),
            existingCard.sentence_audio_url
              ? Promise.resolve(existingCard.sentence_audio_url)
              : safeSynthesizeUrl(targetSentence),
          ]);

          const { data: upgraded } = await supabase
            .from('flashcards')
            .update({
              lemma: existingCard.lemma || resolvedLemma,
              context_sentence: targetSentence,
              context_translation: existingCard.context_translation || trimmedContextTranslation,
              context_furigana: resolvedFurigana || [],
              word_audio_url: wordAudioUrl,
              sentence_audio_url: sentenceAudioUrl,
            })
            .eq('id', existingCard.id)
            .select()
            .single();

          return res.status(200).json({
            message: 'Flashcard already in SRS (context enriched)',
            alreadyExists: true,
            flashcard: enrichCardWithSrs(upgraded || existingCard),
          });
        }

        return res.status(200).json({
          message: 'Flashcard already exists in SRS',
          alreadyExists: true,
          flashcard: enrichCardWithSrs(existingCard),
        });
      }
    }

    // 2. Build structured furigana tokens if context_sentence was provided without context_furigana
    let resolvedContextFurigana = [];
    if (Array.isArray(context_furigana) && context_furigana.length > 0) {
      resolvedContextFurigana = context_furigana;
    } else if (trimmedContextSentence) {
      resolvedContextFurigana = await buildContextFurigana(trimmedContextSentence);
    }

    // 3. Automatically trigger cached Google Neural2 TTS twice in parallel:
    //    (a) single word audio, (b) full context sentence audio
    const [wordAudioUrl, sentenceAudioUrl] = await Promise.all([
      safeSynthesizeUrl(trimmedKanji),
      trimmedContextSentence ? safeSynthesizeUrl(trimmedContextSentence) : Promise.resolve(null),
    ]);

    const nowIso = new Date().toISOString();
    const basePayload = {
      user_id: userId || null,
      story_id: storyId || null,
      song_id: songId || null,
      kanji: trimmedKanji,
      reading: reading || '',
      meaning_hebrew,
      type: type || null,
    };

    const fullPayload = {
      ...basePayload,
      ...(dialogueId ? { dialogue_id: dialogueId } : {}),
      ...(mangaChapterId ? { manga_chapter_id: mangaChapterId } : {}),
      lemma: resolvedLemma,
      context_sentence: trimmedContextSentence,
      context_translation: trimmedContextTranslation,
      context_furigana: resolvedContextFurigana,
      word_audio_url: wordAudioUrl,
      sentence_audio_url: sentenceAudioUrl,
      state: 'new',
      stability: 0,
      difficulty: 0,
      interval: 0,
      ease_factor: 2.5,
      reps: 0,
      lapses: 0,
      mastery_level: 0,
      due_date: nowIso,
      last_reviewed_at: null,
    };

    let { data, error } = await supabase
      .from('flashcards')
      .insert([fullPayload])
      .select();

    // If `dialogue_id` or `manga_chapter_id` column hasn't been migrated yet, retry keeping all Phase 2 fields intact
    if (
      error &&
      error.message &&
      (error.message.includes('dialogue_id') || error.message.includes('manga_chapter_id'))
    ) {
      const {
        dialogue_id: _omittedDialogue,
        manga_chapter_id: _omittedManga,
        ...payloadWithoutOptionalLinks
      } = fullPayload;
      const retryResult = await supabase
        .from('flashcards')
        .insert([payloadWithoutOptionalLinks])
        .select();
      data = retryResult.data;
      error = retryResult.error;
    }

    // Graceful fallback if Phase 2 SQL columns haven't been added yet
    if (error && error.message && error.message.includes('column')) {
      const fallbackResult = await supabase
        .from('flashcards')
        .insert([basePayload])
        .select();
      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) throw error;

    return res.status(201).json({
      message: 'Flashcard saved successfully',
      alreadyExists: false,
      flashcard: enrichCardWithSrs(data[0]),
    });
  } catch (error) {
    console.error('Error saving flashcard:', error);
    return res.status(500).json({ error: 'Failed to save flashcard', details: error.message });
  }
}

// Support both POST /api/flashcards (Phase 2 canonical) and POST /api/flashcards/add (legacy compat)
router.post('/', addFlashcardHandler);
router.post('/add', addFlashcardHandler);

// GET /api/flashcards/due/:userId - Fetch cards where due_date <= NOW() ordered by due_date ASC
router.get('/due/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const now = new Date();
    const nowIso = now.toISOString();

    let { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('user_id', userId)
      .lte('due_date', nowIso)
      .order('due_date', { ascending: true });

    if (error && error.message && error.message.includes('due_date')) {
      const fallback = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;

    const enriched = (data || []).map((card) => enrichCardWithSrs(card, now));
    res.status(200).json(enriched);
  } catch (error) {
    console.error('Error fetching due flashcards:', error);
    res.status(500).json({ error: 'Failed to fetch due flashcards' });
  }
});

// POST /api/flashcards/review - Grade a card (1-4), update FSRS state, and log review
router.post('/review', async (req, res) => {
  try {
    const { cardId, rating } = req.body;
    const numericRating = Number(rating);

    if (!cardId || ![1, 2, 3, 4].includes(numericRating)) {
      return res.status(400).json({ error: 'Valid cardId and rating (1-4) are required' });
    }

    const { data: currentCard, error: fetchError } = await supabase
      .from('flashcards')
      .select('*')
      .eq('id', cardId)
      .single();

    if (fetchError || !currentCard) {
      return res.status(404).json({ error: 'Flashcard not found' });
    }

    const now = new Date();
    const nextSchedule = scheduleReview(currentCard, numericRating, now);

    const updateFields = {
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
    };

    const { data: updatedCard, error: updateError } = await supabase
      .from('flashcards')
      .update(updateFields)
      .eq('id', cardId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    const reviewLogPayload = {
      card_id: cardId,
      rating: numericRating,
      state: nextSchedule.state,
      due_date: nextSchedule.due_date,
      interval: nextSchedule.interval,
      ease_factor: nextSchedule.ease_factor,
      reviewed_at: nextSchedule.last_reviewed_at,
    };

    const { data: logData, error: logError } = await supabase
      .from('review_logs')
      .insert([reviewLogPayload])
      .select()
      .maybeSingle();

    if (logError) {
      console.warn('[SRS] Updated card, but failed to insert into review_logs:', logError.message);
    }

    return res.status(200).json({
      message: 'Review processed successfully',
      card: enrichCardWithSrs(updatedCard, now),
      reviewLog: logData || reviewLogPayload,
    });
  } catch (error) {
    console.error('Error reviewing flashcard:', error);
    return res.status(500).json({ error: 'Failed to record flashcard review', details: error.message });
  }
});

// GET /api/flashcards/:userId - Fetch all flashcards for Deck Browser / Vocabulary Map
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const now = new Date();

    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const enriched = (data || []).map((card) => enrichCardWithSrs(card, now));
    res.status(200).json(enriched);
  } catch (error) {
    console.error('Error fetching flashcards:', error);
    res.status(500).json({ error: 'Failed to fetch flashcards' });
  }
});

// DELETE /api/flashcards/:cardId - Delete a flashcard
router.delete('/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;

    const { error } = await supabase
      .from('flashcards')
      .delete()
      .eq('id', cardId);

    if (error) throw error;

    res.status(200).json({ message: 'Flashcard deleted successfully' });
  } catch (error) {
    console.error('Error deleting flashcard:', error);
    res.status(500).json({ error: 'Failed to delete flashcard' });
  }
});

module.exports = router;
