const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const supabase = require('../config/supabaseClient');
const {
  generateTrainerChallenge,
  evaluateTrainerOutput,
} = require('../services/geminiService');
const { scheduleReview, enrichCardWithSrs } = require('../services/srsService');
const { generateAudio } = require('../services/audioService');
const { getTokenizer, kata2Hira } = require('../services/morphologyService');

// In-memory LRU-like cache of active challenges (ensures zero-failure fallback before SQL 004 runs)
const recentChallengesMap = new Map();

function rememberChallenge(challengeObj) {
  if (recentChallengesMap.size > 300) {
    const oldestKey = recentChallengesMap.keys().next().value;
    if (oldestKey) recentChallengesMap.delete(oldestKey);
  }
  recentChallengesMap.set(challengeObj.id, challengeObj);
}

const STARTER_FALLBACK_WORDS = [
  { kanji: '食べる', lemma: '食べる', reading: 'たべる', meaning_hebrew: 'לאכול', state: 'learning', mastery_level: 1 },
  { kanji: '行く', lemma: '行く', reading: 'いく', meaning_hebrew: 'ללכת / לנסוע', state: 'learning', mastery_level: 1 },
  { kanji: '話す', lemma: '話す', reading: 'はなす', meaning_hebrew: 'לדבר', state: 'learning', mastery_level: 1 },
  { kanji: '買う', lemma: '買う', reading: 'かう', meaning_hebrew: 'לקנות', state: 'learning', mastery_level: 1 },
  { kanji: '忘れる', lemma: '忘れる', reading: 'わすれる', meaning_hebrew: 'לשכוח', state: 'learning', mastery_level: 1 },
];

function pickRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Selects a target flashcard from the user's SRS deck, prioritizing `learning` / `relearning` / `review` states.
 */
function selectTargetSrsCard(allCards = [], requestedCardId = null, excludeIds = []) {
  if (!Array.isArray(allCards) || allCards.length === 0) return null;

  if (requestedCardId) {
    const exact = allCards.find((c) => String(c.id) === String(requestedCardId));
    if (exact) return exact;
  }

  const excludedSet = new Set((excludeIds || []).map((id) => String(id)));
  const nonExcluded = allCards.filter((c) => !excludedSet.has(String(c.id)));
  const pool = nonExcluded.length > 0 ? nonExcluded : allCards;

  // Priority 1: Active SRS states ('learning', 'relearning', 'review') where mastery < 5
  const activePriority = pool.filter(
    (c) =>
      (c.state === 'learning' || c.state === 'relearning' || c.state === 'review') &&
      (Number(c.mastery_level) || 0) < 5
  );
  if (activePriority.length > 0) {
    return pickRandomItem(activePriority);
  }

  // Priority 2: Any card in 'learning' / 'relearning' / 'review'
  const anyActive = pool.filter(
    (c) => c.state === 'learning' || c.state === 'relearning' || c.state === 'review'
  );
  if (anyActive.length > 0) {
    return pickRandomItem(anyActive);
  }

  // Priority 3: 'new' cards in user's SRS deck
  return pickRandomItem(pool);
}

// POST /api/trainer/generate-challenge
router.post('/generate-challenge', async (req, res) => {
  try {
    const {
      userId,
      cardId = null,
      excludeCardIds = [],
      mode = 'mixed',
    } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const { data: userCards, error: cardsError } = await supabase
      .from('flashcards')
      .select('*')
      .eq('user_id', userId);

    if (cardsError) {
      throw cardsError;
    }

    let selectedCard = selectTargetSrsCard(userCards || [], cardId, excludeCardIds);
    let isStarterFallback = false;

    if (!selectedCard) {
      isStarterFallback = true;
      selectedCard = {
        id: null,
        ...pickRandomItem(STARTER_FALLBACK_WORDS),
      };
    }

    const enrichedTarget = selectedCard.id
      ? enrichCardWithSrs(selectedCard)
      : {
          ...selectedCard,
          output_success_count: 0,
        };

    // Ensure target word has cached Neural2 TTS URL
    let wordAudioUrl = enrichedTarget.word_audio_url || null;
    if (!wordAudioUrl) {
      try {
        const tts = await generateAudio(enrichedTarget.lemma || enrichedTarget.kanji);
        wordAudioUrl = tts.audioUrl;
      } catch (ttsErr) {
        console.warn('[Trainer] Target word TTS generation skipped:', ttsErr.message);
      }
    }

    const aiChallenge = await generateTrainerChallenge({
      targetCard: enrichedTarget,
      mode,
    });

    const dbPayload = {
      user_id: userId,
      card_id: enrichedTarget.id ? String(enrichedTarget.id) : null,
      target_kanji: enrichedTarget.kanji,
      target_lemma: enrichedTarget.lemma || enrichedTarget.kanji,
      target_reading: enrichedTarget.reading || '',
      target_meaning_hebrew: enrichedTarget.meaning_hebrew || '',
      challenge_mode: aiChallenge.challenge_mode,
      prompt_hebrew: aiChallenge.prompt_hebrew,
      scenario_context_hebrew: aiChallenge.scenario_context_hebrew,
      grammar_hint_hebrew: aiChallenge.grammar_hint_hebrew,
      reference_japanese: aiChallenge.reference_japanese,
      reference_reading: aiChallenge.reference_reading,
      helper_vocab: aiChallenge.helper_vocab,
    };

    let savedChallenge = null;
    const { data: inserted, error: insertErr } = await supabase
      .from('output_challenges')
      .insert([dbPayload])
      .select()
      .maybeSingle();

    if (!insertErr && inserted) {
      savedChallenge = inserted;
    } else {
      savedChallenge = {
        id: crypto.randomUUID(),
        ...dbPayload,
        created_at: new Date().toISOString(),
      };
    }

    rememberChallenge(savedChallenge);

    return res.status(200).json({
      challenge: savedChallenge,
      targetCard: {
        ...enrichedTarget,
        word_audio_url: wordAudioUrl,
      },
      isStarterFallback,
      deckSize: (userCards || []).length,
    });
  } catch (error) {
    console.error('Error in POST /api/trainer/generate-challenge:', error);
    return res.status(500).json({
      error: 'Failed to generate trainer challenge',
      details: error.message,
    });
  }
});

// POST /api/trainer/evaluate
router.post('/evaluate', async (req, res) => {
  try {
    const {
      challengeId,
      userId,
      cardId,
      userSentenceJapanese,
      targetWord,
      promptHebrew,
      scenarioContextHebrew,
      referenceJapanese,
      challengeMode,
    } = req.body;

    const cleanSentence = String(userSentenceJapanese || '').trim();
    if (!cleanSentence) {
      return res.status(400).json({ error: 'userSentenceJapanese is required' });
    }

    // 1. Resolve stored challenge metadata (DB -> in-memory -> request body fallback)
    let storedChallenge = challengeId ? recentChallengesMap.get(challengeId) : null;
    if (!storedChallenge && challengeId) {
      const { data: dbRow } = await supabase
        .from('output_challenges')
        .select('*')
        .eq('id', challengeId)
        .maybeSingle();
      if (dbRow) storedChallenge = dbRow;
    }

    const resolvedTarget = {
      kanji:
        targetWord?.kanji ||
        storedChallenge?.target_kanji ||
        (typeof targetWord === 'string' ? targetWord : ''),
      lemma:
        targetWord?.lemma ||
        storedChallenge?.target_lemma ||
        targetWord?.kanji ||
        (typeof targetWord === 'string' ? targetWord : ''),
      reading: targetWord?.reading || storedChallenge?.target_reading || '',
      meaning_hebrew:
        targetWord?.meaning_hebrew || storedChallenge?.target_meaning_hebrew || '',
    };

    const resolvedCardId = cardId || storedChallenge?.card_id || null;
    const resolvedUserId = userId || storedChallenge?.user_id || null;

    // 2. Deterministic Kuromoji tokenization of learner's sentence
    const tokenizer = await getTokenizer();
    const kuromojiTokens = tokenizer.tokenize(cleanSentence).map((t) => ({
      surface: t.surface_form,
      lemma: t.basic_form && t.basic_form !== '*' ? t.basic_form : t.surface_form,
      reading: t.reading ? kata2Hira(t.reading) : '',
      pos: t.pos,
    }));

    // 3. Gemini Sensei Evaluation (strict TRAINER_EVAL_SCHEMA)
    const evaluation = await evaluateTrainerOutput({
      challengeMode: challengeMode || storedChallenge?.challenge_mode || 'translation',
      promptHebrew: promptHebrew || storedChallenge?.prompt_hebrew || '',
      scenarioContextHebrew:
        scenarioContextHebrew || storedChallenge?.scenario_context_hebrew || '',
      referenceJapanese: referenceJapanese || storedChallenge?.reference_japanese || '',
      targetWord: resolvedTarget,
      userSentenceJapanese: cleanSentence,
      kuromojiTokens,
    });

    // 4. Pre-cache Neural2 TTS audio for `native_alternative`
    let nativeAudioUrl = null;
    if (evaluation.native_alternative) {
      try {
        const tts = await generateAudio(evaluation.native_alternative);
        nativeAudioUrl = tts.audioUrl;
      } catch (ttsErr) {
        console.warn('[Trainer] Native alternative TTS skipped:', ttsErr.message);
      }
    }

    // 5. If `is_correct === true`, automatically invoke FSRS to boost the target SRS card!
    let srsBoost = {
      applied: false,
      rating: null,
      previousMastery: null,
      newMastery: null,
      nextIntervalLabel: null,
      updatedCard: null,
    };

    if (evaluation.is_correct && (resolvedCardId || (resolvedUserId && resolvedTarget.lemma))) {
      let currentCard = null;

      if (resolvedCardId) {
        const { data } = await supabase
          .from('flashcards')
          .select('*')
          .eq('id', resolvedCardId)
          .maybeSingle();
        currentCard = data;
      }

      if (!currentCard && resolvedUserId && resolvedTarget.lemma) {
        const safeLemma = resolvedTarget.lemma.replace(/"/g, '\\"');
        const { data } = await supabase
          .from('flashcards')
          .select('*')
          .eq('user_id', resolvedUserId)
          .or(`lemma.eq."${safeLemma}",kanji.eq."${safeLemma}"`)
          .limit(1);
        currentCard = data && data[0] ? data[0] : null;
      }

      if (currentCard) {
        const now = new Date();
        // High accuracy & naturalness earns Rating 4 (Easy); solid pass earns Rating 3 (Good)
        const appliedRating =
          evaluation.grammar_score >= 90 && evaluation.naturalness_score >= 85 ? 4 : 3;

        const nextSchedule = scheduleReview(currentCard, appliedRating, now);
        const prevMastery = Number(currentCard.mastery_level) || 0;
        const nextOutputCount = (Number(currentCard.output_success_count) || 0) + 1;

        const fullUpdatePayload = {
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
          .update(fullUpdatePayload)
          .eq('id', currentCard.id)
          .select()
          .maybeSingle();

        // Fallback if migration 004 columns aren't added yet
        if (updErr && updErr.message && updErr.message.includes('output_')) {
          const {
            output_success_count: _o1,
            last_output_at: _o2,
            ...baseSrsUpdate
          } = fullUpdatePayload;
          const retry = await supabase
            .from('flashcards')
            .update(baseSrsUpdate)
            .eq('id', currentCard.id)
            .select()
            .maybeSingle();
          updatedCard = retry.data;
          updErr = retry.error;
        }

        if (!updErr && updatedCard) {
          // Record in `review_logs`
          const logRow = {
            card_id: currentCard.id,
            rating: appliedRating,
            state: nextSchedule.state,
            due_date: nextSchedule.due_date,
            interval: nextSchedule.interval,
            ease_factor: nextSchedule.ease_factor,
            reviewed_at: nextSchedule.last_reviewed_at,
            source: 'active_trainer',
          };

          const { error: logErr } = await supabase.from('review_logs').insert([logRow]);
          if (logErr && logErr.message && logErr.message.includes('source')) {
            const { source: _s, ...legacyLogRow } = logRow;
            await supabase.from('review_logs').insert([legacyLogRow]);
          }

          const enrichedUpdated = enrichCardWithSrs(updatedCard, now);
          srsBoost = {
            applied: true,
            rating: appliedRating,
            previousMastery: prevMastery,
            newMastery: enrichedUpdated.mastery_level,
            nextIntervalLabel: nextSchedule.intervalLabel,
            outputSuccessCount: nextOutputCount,
            updatedCard: enrichedUpdated,
          };
        }
      }
    }

    // 6. Best-effort update `output_challenges` record in DB
    if (challengeId) {
      await supabase
        .from('output_challenges')
        .update({
          user_sentence_japanese: cleanSentence,
          is_correct: evaluation.is_correct,
          grammar_score: evaluation.grammar_score,
          naturalness_score: evaluation.naturalness_score,
          corrected_user_sentence: evaluation.corrected_user_sentence,
          feedback_hebrew: evaluation.feedback_hebrew,
          native_alternative: evaluation.native_alternative,
          native_alternative_audio: nativeAudioUrl,
          srs_rating_applied: srsBoost.rating,
          completed_at: new Date().toISOString(),
        })
        .eq('id', challengeId);
    }

    return res.status(200).json({
      evaluation: {
        ...evaluation,
        native_alternative_audio_url: nativeAudioUrl,
      },
      srsBoost,
    });
  } catch (error) {
    console.error('Error in POST /api/trainer/evaluate:', error);
    return res.status(500).json({
      error: 'Failed to evaluate output challenge',
      details: error.message,
    });
  }
});

// GET /api/trainer/stats/:userId - Recent active output stats
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('output_challenges')
      .select('id, target_lemma, is_correct, grammar_score, naturalness_score, completed_at')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(50);

    if (error) {
      return res.status(200).json({
        completedCount: 0,
        correctCount: 0,
        avgGrammar: 0,
        avgNaturalness: 0,
      });
    }

    const rows = data || [];
    const completedCount = rows.length;
    const correctCount = rows.filter((r) => r.is_correct).length;
    const avgGrammar =
      completedCount > 0
        ? Math.round(rows.reduce((sum, r) => sum + (r.grammar_score || 0), 0) / completedCount)
        : 0;
    const avgNaturalness =
      completedCount > 0
        ? Math.round(
            rows.reduce((sum, r) => sum + (r.naturalness_score || 0), 0) / completedCount
          )
        : 0;

    return res.status(200).json({
      completedCount,
      correctCount,
      avgGrammar,
      avgNaturalness,
    });
  } catch {
    return res.status(200).json({
      completedCount: 0,
      correctCount: 0,
      avgGrammar: 0,
      avgNaturalness: 0,
    });
  }
});

module.exports = router;

