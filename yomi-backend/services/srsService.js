/**
 * FSRS v4.5 (Free Spaced Repetition Scheduler) Engine for Yomi-AI
 *
 * Ratings:
 *   1 = Again
 *   2 = Hard
 *   3 = Good
 *   4 = Easy
 *
 * Card states: 'new' | 'learning' | 'review' | 'relearning'
 */

const FSRS_WEIGHTS = [
  0.4072, 1.1829, 3.1262, 15.4722, // w0..w3: initial stability S0(1..4)
  7.2102, 0.5316,                  // w4..w5: initial difficulty D0
  1.0651, 0.0234,                  // w6..w7: difficulty update & mean reversion
  1.616,  0.1544, 1.0824,          // w8..w10: recall stability growth
  1.9813, 0.0953, 0.2975, 2.2042,  // w11..w14: post-lapse stability
  0.2407, 2.9466,                  // w15..w16: hard penalty & easy bonus
];

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function roundTo(val, decimals = 4) {
  const factor = 10 ** decimals;
  return Math.round(val * factor) / factor;
}

function initialStability(rating) {
  return FSRS_WEIGHTS[rating - 1];
}

function initialDifficulty(rating) {
  const w4 = FSRS_WEIGHTS[4];
  const w5 = FSRS_WEIGHTS[5];
  return clamp(w4 - Math.exp(w5 * (rating - 1)) + 1, 1, 10);
}

function nextDifficulty(currentD, rating) {
  const w6 = FSRS_WEIGHTS[6];
  const w7 = FSRS_WEIGHTS[7];
  const deltaD = -w6 * (rating - 3);
  const damped = currentD + (deltaD * (10 - currentD)) / 9;
  const targetD0Easy = initialDifficulty(4);
  return clamp(w7 * targetD0Easy + (1 - w7) * damped, 1, 10);
}

function retrievability(elapsedDays, stability) {
  const safeS = Math.max(0.1, stability);
  return Math.pow(1 + (19 / 81) * (elapsedDays / safeS), -0.5);
}

function nextRecallStability(d, s, r, rating) {
  const w8 = FSRS_WEIGHTS[8];
  const w9 = FSRS_WEIGHTS[9];
  const w10 = FSRS_WEIGHTS[10];
  const hardPenalty = rating === 2 ? FSRS_WEIGHTS[15] : 1;
  const easyBonus = rating === 4 ? FSRS_WEIGHTS[16] : 1;

  const growth =
    Math.exp(w8) *
    (11 - d) *
    Math.pow(Math.max(0.1, s), -w9) *
    (Math.exp(w10 * (1 - r)) - 1) *
    hardPenalty *
    easyBonus;

  return Math.max(0.5, s * (1 + growth));
}

function nextForgetStability(d, s, r) {
  const w11 = FSRS_WEIGHTS[11];
  const w12 = FSRS_WEIGHTS[12];
  const w13 = FSRS_WEIGHTS[13];
  const w14 = FSRS_WEIGHTS[14];

  const raw =
    w11 *
    Math.pow(clamp(d, 1, 10), -w12) *
    (Math.pow(s + 1, w13) - 1) *
    Math.exp(w14 * (1 - r));

  return clamp(raw, 0.5, Math.max(0.5, s * 0.75));
}

function updateEaseFactor(currentEase, rating) {
  const base = Number.isFinite(currentEase) && currentEase > 0 ? currentEase : 2.5;
  const deltaMap = {
    1: -0.2,
    2: -0.15,
    3: 0.0,
    4: 0.15,
  };
  return roundTo(Math.max(1.3, base + (deltaMap[rating] || 0)), 2);
}

/**
 * Computes mastery level (0 to 5) based on FSRS state, reps, and interval.
 */
function computeMasteryLevel({ state, interval, reps }) {
  if (!reps || state === 'new') return 0;
  if (state === 'learning' || state === 'relearning' || interval < 3) return 1;
  if (interval < 7) return 2;
  if (interval < 21) return 3;
  if (interval < 60) return 4;
  return 5;
}

/**
 * Formats an interval in milliseconds into a concise Anki/FSRS label (e.g., "<1m", "10m", "3d", "1mo", "1y").
 */
function formatIntervalFromMs(deltaMs) {
  const minutes = Math.round(deltaMs / MINUTE_MS);
  if (minutes <= 1) return '<1m';
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.round(deltaMs / DAY_MS);
  if (days < 30) return `${days}d`;
  if (days < 365) {
    const months = Math.round((days / 30) * 10) / 10;
    return Number.isInteger(months) ? `${months}mo` : `${months.toFixed(1)}mo`;
  }

  const years = Math.round((days / 365) * 10) / 10;
  return Number.isInteger(years) ? `${years}y` : `${years.toFixed(1)}y`;
}

/**
 * Normalizes a database card object, filling defaults for any legacy rows.
 */
function normalizeCard(card = {}) {
  return {
    ...card,
    lemma: card.lemma || card.kanji || '',
    context_sentence: card.context_sentence || null,
    context_translation: card.context_translation || null,
    context_furigana: Array.isArray(card.context_furigana) ? card.context_furigana : [],
    word_audio_url: card.word_audio_url || null,
    sentence_audio_url: card.sentence_audio_url || null,
    state: card.state || 'new',
    stability: Number.isFinite(Number(card.stability)) ? Number(card.stability) : 0,
    difficulty: Number.isFinite(Number(card.difficulty)) ? Number(card.difficulty) : 0,
    interval: Number.isFinite(Number(card.interval)) ? Number(card.interval) : 0,
    ease_factor: Number.isFinite(Number(card.ease_factor)) && Number(card.ease_factor) > 0 ? Number(card.ease_factor) : 2.5,
    reps: Number.isFinite(Number(card.reps)) ? Number(card.reps) : 0,
    lapses: Number.isFinite(Number(card.lapses)) ? Number(card.lapses) : 0,
    mastery_level: Number.isFinite(Number(card.mastery_level)) ? Number(card.mastery_level) : 0,
    output_success_count: Number.isFinite(Number(card.output_success_count)) ? Number(card.output_success_count) : 0,
    last_output_at: card.last_output_at || null,
    due_date: card.due_date || card.created_at || new Date().toISOString(),
    last_reviewed_at: card.last_reviewed_at || null,
  };
}

/**
 * Core FSRS scheduling function.
 * Takes a card and rating (1: Again, 2: Hard, 3: Good, 4: Easy) and returns the next card state + interval label.
 */
function scheduleReview(rawCard, rating, nowDate = new Date()) {
  const r = Number(rating);
  if (![1, 2, 3, 4].includes(r)) {
    throw new Error('Invalid rating: must be 1 (Again), 2 (Hard), 3 (Good), or 4 (Easy)');
  }

  const now = nowDate instanceof Date ? nowDate : new Date(nowDate);
  const nowMs = now.getTime();
  const card = normalizeCard(rawCard);

  let nextState = card.state;
  let stability = card.stability;
  let difficulty = card.difficulty;
  let interval = card.interval;
  let lapses = card.lapses;
  const reps = card.reps + 1;
  const ease_factor = updateEaseFactor(card.ease_factor, r);
  let dueMs = nowMs;

  if (card.state === 'new' || card.reps === 0 || stability <= 0) {
    // First-time review: initialize FSRS stability & difficulty
    stability = initialStability(r);
    difficulty = initialDifficulty(r);

    if (r === 1) {
      nextState = 'learning';
      interval = 0;
      dueMs = nowMs + 1 * MINUTE_MS; // <1m
    } else if (r === 2) {
      nextState = 'learning';
      interval = 0;
      dueMs = nowMs + 10 * MINUTE_MS; // 10m
    } else if (r === 3) {
      nextState = 'review';
      interval = 1;
      stability = Math.max(1.5, stability);
      dueMs = nowMs + 1 * DAY_MS; // 1d
    } else {
      nextState = 'review';
      interval = 4;
      stability = Math.max(4.0, stability);
      dueMs = nowMs + 4 * DAY_MS; // 4d
    }
  } else if (card.state === 'learning' || card.state === 'relearning') {
    difficulty = nextDifficulty(difficulty || initialDifficulty(3), r);

    if (r === 1) {
      nextState = card.state;
      stability = Math.max(0.4, stability * 0.75);
      interval = 0;
      dueMs = nowMs + 1 * MINUTE_MS; // <1m
    } else if (r === 2) {
      nextState = card.state;
      stability = Math.max(0.8, stability * 0.9);
      interval = 0;
      dueMs = nowMs + 10 * MINUTE_MS; // 10m
    } else if (r === 3) {
      nextState = 'review';
      interval = card.state === 'relearning'
        ? Math.max(1, Math.round(stability))
        : Math.max(2, Math.round(stability));
      stability = Math.max(interval, stability * 1.3);
      dueMs = nowMs + interval * DAY_MS;
    } else {
      nextState = 'review';
      interval = Math.max(4, Math.round(Math.max(2, stability) * 2.2));
      stability = Math.max(interval, stability * 2.2);
      dueMs = nowMs + interval * DAY_MS;
    }
  } else {
    // Card is in 'review' state
    const lastMs = card.last_reviewed_at ? new Date(card.last_reviewed_at).getTime() : nowMs - Math.max(1, card.interval) * DAY_MS;
    const elapsedDays = Math.max(0.5, (nowMs - lastMs) / DAY_MS);
    const retr = retrievability(elapsedDays, stability);
    const updatedD = nextDifficulty(difficulty || initialDifficulty(3), r);
    difficulty = updatedD;

    if (r === 1) {
      // Lapse -> relearning
      lapses += 1;
      nextState = 'relearning';
      stability = nextForgetStability(updatedD, stability, retr);
      interval = 0;
      dueMs = nowMs + 10 * MINUTE_MS; // 10m
    } else {
      // Successful recall -> compute Hard / Good / Easy monotonically
      nextState = 'review';
      const sHard = nextRecallStability(updatedD, stability, retr, 2);
      const sGood = nextRecallStability(updatedD, stability, retr, 3);
      const sEasy = nextRecallStability(updatedD, stability, retr, 4);

      const prevInterval = Math.max(1, card.interval);
      const iHard = Math.max(1, Math.round(Math.max(prevInterval * 1.2, Math.min(sHard, prevInterval * 1.5))));
      const iGood = Math.max(iHard + 1, prevInterval + 1, Math.round(sGood));
      const iEasy = Math.max(iGood + 2, Math.round(sEasy));

      if (r === 2) {
        stability = sHard;
        interval = iHard;
      } else if (r === 3) {
        stability = sGood;
        interval = iGood;
      } else {
        stability = sEasy;
        interval = iEasy;
      }

      dueMs = nowMs + interval * DAY_MS;
    }
  }

  stability = roundTo(stability, 4);
  difficulty = roundTo(difficulty, 4);
  const mastery_level = computeMasteryLevel({ state: nextState, interval, reps });
  const due_date = new Date(dueMs).toISOString();
  const last_reviewed_at = now.toISOString();
  const intervalLabel = formatIntervalFromMs(dueMs - nowMs);

  return {
    state: nextState,
    stability,
    difficulty,
    interval,
    ease_factor,
    reps,
    lapses,
    mastery_level,
    due_date,
    last_reviewed_at,
    intervalLabel,
  };
}

/**
 * Returns a dictionary of human-readable next intervals for all 4 rating buttons.
 */
function previewRatings(card, now = new Date()) {
  return {
    1: scheduleReview(card, 1, now).intervalLabel,
    2: scheduleReview(card, 2, now).intervalLabel,
    3: scheduleReview(card, 3, now).intervalLabel,
    4: scheduleReview(card, 4, now).intervalLabel,
  };
}

function enrichCardWithSrs(card, now = new Date()) {
  const normalized = normalizeCard(card);
  const isDue = new Date(normalized.due_date).getTime() <= now.getTime();
  return {
    ...normalized,
    isDue,
    intervalPreviews: previewRatings(normalized, now),
  };
}

module.exports = {
  normalizeCard,
  scheduleReview,
  previewRatings,
  enrichCardWithSrs,
  formatIntervalFromMs,
};

