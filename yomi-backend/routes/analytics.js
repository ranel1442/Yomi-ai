const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient');

/**
 * Formats a Date or ISO timestamp into YYYY-MM-DD (UTC date bucket for deterministic 30-day heatmaps).
 */
function toDateKey(input) {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Fetches all rows across PostgREST 1,000-row pages so large SRS decks never truncate.
 */
async function fetchAllRows(buildQuery, pageSize = 1000) {
  const allRows = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await buildQuery().range(from, to);
    if (error) {
      throw error;
    }
    const batch = data || [];
    allRows.push(...batch);
    if (batch.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  return allRows;
}

/**
 * Safely fetches an optional table, returning [] if the table does not exist yet.
 */
async function fetchOptionalRows(label, buildQuery) {
  try {
    return await fetchAllRows(buildQuery);
  } catch (err) {
    console.warn(`[Analytics] Skipping optional table "${label}": ${err.message}`);
    return [];
  }
}

/**
 * Fetches all `review_logs` belonging to the user's `flashcards` in safe ID chunks.
 */
async function fetchReviewLogsForCards(cardIds, chunkSize = 200) {
  if (!Array.isArray(cardIds) || cardIds.length === 0) {
    return [];
  }

  const allLogs = [];
  try {
    for (let i = 0; i < cardIds.length; i += chunkSize) {
      const chunk = cardIds.slice(i, i + chunkSize);
      const rows = await fetchAllRows(() =>
        supabase
          .from('review_logs')
          .select('*')
          .in('card_id', chunk)
          .order('reviewed_at', { ascending: true })
      );
      allLogs.push(...rows);
    }
  } catch (err) {
    console.warn(`[Analytics] Skipping review_logs: ${err.message}`);
    return [];
  }

  allLogs.sort((a, b) =>
    String(a.reviewed_at || '').localeCompare(String(b.reviewed_at || ''))
  );
  return allLogs;
}

/**
 * Builds the 30-day calendar window ending today (UTC).
 */
function build30DayWindow() {
  const days = [];
  const today = new Date();
  const baseUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );

  for (let offset = 29; offset >= 0; offset -= 1) {
    const dt = new Date(baseUtc - offset * 24 * 60 * 60 * 1000);
    const key = toDateKey(dt);
    days.push({
      date: key,
      reviews: 0,
      stories: 0,
      dialogues: 0,
      trainer: 0,
      manga: 0,
      cardsMined: 0,
      total: 0,
    });
  }

  return days;
}

/**
 * GET /api/analytics/summary/:userId
 * Aggregates FSRS mastery breakdown, 30-day immersion activity heatmap,
 * retention rate %, active output accuracy/successes, and library totals.
 */
router.get('/summary/:userId', async (req, res) => {
  try {
    const userId = String(req.params.userId || '').trim();
    const emptyHeatmap = build30DayWindow();

    if (!userId || userId === 'anonymous' || userId === 'test-user') {
      return res.status(200).json({
        userId,
        totalCards: 0,
        dueNowCount: 0,
        avgStability: 0,
        avgDifficulty: 0,
        fsrsBreakdown: {
          new: 0,
          learning: 0,
          review: 0,
          mastered: 0,
        },
        retentionRate: null,
        totalReviews: 0,
        passedReviews: 0,
        totalOutputSuccesses: 0,
        trainerCompletedCount: 0,
        trainerAccuracyRate: null,
        activeDaysLast30: 0,
        totalActionsLast30: 0,
        libraryTotals: {
          stories: 0,
          dialogues: 0,
          outputChallenges: 0,
          mangaChapters: 0,
        },
        heatmap30Days: emptyHeatmap,
      });
    }

    const [flashcards, stories, dialogues, outputChallenges, mangaChapters] =
      await Promise.all([
        fetchOptionalRows('flashcards', () =>
          supabase
            .from('flashcards')
            .select(
              'id, state, stability, difficulty, interval, mastery_level, reps, lapses, due_date, output_success_count, created_at'
            )
            .eq('user_id', userId)
        ),
        fetchOptionalRows('stories', () =>
          supabase.from('stories').select('id, created_at').eq('user_id', userId)
        ),
        fetchOptionalRows('dialogues', () =>
          supabase.from('dialogues').select('id, created_at').eq('user_id', userId)
        ),
        fetchOptionalRows('output_challenges', () =>
          supabase
            .from('output_challenges')
            .select('id, is_correct, grammar_score, naturalness_score, completed_at, created_at')
            .eq('user_id', userId)
        ),
        fetchOptionalRows('manga_chapters', () =>
          supabase
            .from('manga_chapters')
            .select('id, total_pages, created_at')
            .eq('user_id', userId)
        ),
      ]);

    const cardIds = flashcards.map((c) => c.id).filter(Boolean);
    const reviewLogs = await fetchReviewLogsForCards(cardIds);

    const nowMs = Date.now();
    const fsrsBreakdown = {
      new: 0,
      learning: 0,
      review: 0,
      mastered: 0,
    };

    let dueNowCount = 0;
    let stabilitySum = 0;
    let stabilityCount = 0;
    let difficultySum = 0;
    let difficultyCount = 0;
    let cardOutputSuccessSum = 0;

    for (const card of flashcards) {
      const state = card.state || 'new';
      const masteryLevel = Number(card.mastery_level || 0);
      const interval = Number(card.interval || 0);

      if (state === 'new') {
        fsrsBreakdown.new += 1;
      } else if (state === 'learning' || state === 'relearning') {
        fsrsBreakdown.learning += 1;
      } else if (masteryLevel >= 4 || interval >= 21) {
        fsrsBreakdown.mastered += 1;
      } else {
        fsrsBreakdown.review += 1;
      }

      const dueMs = card.due_date ? new Date(card.due_date).getTime() : 0;
      if (!dueMs || dueMs <= nowMs) {
        dueNowCount += 1;
      }

      if (Number(card.stability) > 0) {
        stabilitySum += Number(card.stability);
        stabilityCount += 1;
      }
      if (Number(card.difficulty) > 0) {
        difficultySum += Number(card.difficulty);
        difficultyCount += 1;
      }

      cardOutputSuccessSum += Number(card.output_success_count || 0);
    }

    const totalReviews = reviewLogs.length;
    const passedReviews = reviewLogs.filter((log) => Number(log.rating || 0) >= 2).length;
    const retentionRate =
      totalReviews > 0 ? Math.round((passedReviews / totalReviews) * 1000) / 10 : null;

    const completedChallenges = outputChallenges.filter(
      (ch) => ch.completed_at || typeof ch.is_correct === 'boolean'
    );
    const correctChallenges = completedChallenges.filter((ch) => ch.is_correct === true);
    const trainerAccuracyRate =
      completedChallenges.length > 0
        ? Math.round((correctChallenges.length / completedChallenges.length) * 1000) / 10
        : null;

    const totalOutputSuccesses = Math.max(cardOutputSuccessSum, correctChallenges.length);

    // Populate 30-day heatmap
    const heatmap30Days = build30DayWindow();
    const dayMap = new Map(heatmap30Days.map((entry) => [entry.date, entry]));

    for (const log of reviewLogs) {
      const key = toDateKey(log.reviewed_at);
      const bucket = key ? dayMap.get(key) : null;
      if (bucket) {
        bucket.reviews += 1;
        bucket.total += 1;
      }
    }

    for (const story of stories) {
      const key = toDateKey(story.created_at);
      const bucket = key ? dayMap.get(key) : null;
      if (bucket) {
        bucket.stories += 1;
        bucket.total += 1;
      }
    }

    for (const dlg of dialogues) {
      const key = toDateKey(dlg.created_at);
      const bucket = key ? dayMap.get(key) : null;
      if (bucket) {
        bucket.dialogues += 1;
        bucket.total += 1;
      }
    }

    for (const ch of outputChallenges) {
      const key = toDateKey(ch.completed_at || ch.created_at);
      const bucket = key ? dayMap.get(key) : null;
      if (bucket) {
        bucket.trainer += 1;
        bucket.total += 1;
      }
    }

    for (const manga of mangaChapters) {
      const key = toDateKey(manga.created_at);
      const bucket = key ? dayMap.get(key) : null;
      if (bucket) {
        bucket.manga += 1;
        bucket.total += 1;
      }
    }

    for (const card of flashcards) {
      const key = toDateKey(card.created_at);
      const bucket = key ? dayMap.get(key) : null;
      if (bucket) {
        bucket.cardsMined += 1;
      }
    }

    const activeDaysLast30 = heatmap30Days.filter((d) => d.total > 0).length;
    const totalActionsLast30 = heatmap30Days.reduce((acc, d) => acc + d.total, 0);

    return res.status(200).json({
      userId,
      totalCards: flashcards.length,
      dueNowCount,
      avgStability:
        stabilityCount > 0 ? Math.round((stabilitySum / stabilityCount) * 10) / 10 : 0,
      avgDifficulty:
        difficultyCount > 0 ? Math.round((difficultySum / difficultyCount) * 10) / 10 : 0,
      fsrsBreakdown,
      retentionRate,
      totalReviews,
      passedReviews,
      totalOutputSuccesses,
      trainerCompletedCount: completedChallenges.length,
      trainerAccuracyRate,
      activeDaysLast30,
      totalActionsLast30,
      libraryTotals: {
        stories: stories.length,
        dialogues: dialogues.length,
        outputChallenges: outputChallenges.length,
        mangaChapters: mangaChapters.length,
      },
      heatmap30Days,
    });
  } catch (err) {
    console.error('[Analytics] GET /summary/:userId error:', err.message);
    return res.status(500).json({
      error: 'Failed to aggregate mastery analytics',
      details: err.message,
    });
  }
});

/**
 * GET /api/analytics/export-backup/:userId
 * Streams a complete formatted JSON backup of the user's SRS flashcards, review logs,
 * stories, dialogues, output challenges, and manga chapters directly to the browser.
 */
router.get('/export-backup/:userId', async (req, res) => {
  try {
    const userId = String(req.params.userId || '').trim();
    if (!userId || userId === 'anonymous' || userId === 'test-user') {
      return res.status(400).json({ error: 'Valid authenticated userId is required for backup export' });
    }

    const [profiles, flashcards, stories, dialogues, outputChallenges, mangaChapters] =
      await Promise.all([
        fetchOptionalRows('profiles', () =>
          supabase.from('profiles').select('*').eq('user_id', userId)
        ),
        fetchOptionalRows('flashcards', () =>
          supabase
            .from('flashcards')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
        ),
        fetchOptionalRows('stories', () =>
          supabase
            .from('stories')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
        ),
        fetchOptionalRows('dialogues', () =>
          supabase
            .from('dialogues')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
        ),
        fetchOptionalRows('output_challenges', () =>
          supabase
            .from('output_challenges')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
        ),
        fetchOptionalRows('manga_chapters', () =>
          supabase
            .from('manga_chapters')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
        ),
      ]);

    const cardIds = flashcards.map((c) => c.id).filter(Boolean);
    const reviewLogs = await fetchReviewLogsForCards(cardIds);

    const dateStamp = toDateKey(new Date()) || 'snapshot';
    const fileName = `yomi_backup_${dateStamp}.json`;

    const payload = {
      metadata: {
        project: 'Yomi-AI',
        schema_version: 'phase8-complete-ecosystem',
        exported_at: new Date().toISOString(),
        user_id: userId,
        counts: {
          profiles: profiles.length,
          flashcards: flashcards.length,
          review_logs: reviewLogs.length,
          stories: stories.length,
          dialogues: dialogues.length,
          output_challenges: outputChallenges.length,
          manga_chapters: mangaChapters.length,
        },
      },
      data: {
        profiles,
        flashcards,
        review_logs: reviewLogs,
        stories,
        dialogues,
        output_challenges: outputChallenges,
        manga_chapters: mangaChapters,
      },
    };

    const jsonString = JSON.stringify(payload, null, 2);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    return res.status(200).send(jsonString);
  } catch (err) {
    console.error('[Analytics] GET /export-backup/:userId error:', err.message);
    return res.status(500).json({
      error: 'Failed to export JSON backup',
      details: err.message,
    });
  }
});

module.exports = router;
