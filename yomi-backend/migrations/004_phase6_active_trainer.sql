-- ============================================================================
-- Yomi-AI: Phase 6 — Active Output & Speech Trainer (`/trainer`)
-- Run this script in the Supabase SQL Editor. It is 100% idempotent.
-- ============================================================================

-- 1. Track active production count & timestamp directly on `flashcards`
ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS output_success_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_output_at       TIMESTAMPTZ;

-- 2. Tag `review_logs` with review source ('flashcard' vs 'active_trainer')
ALTER TABLE public.review_logs
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'flashcard';

-- 3. Create `output_challenges` table to persist Active Output prompts & AI evaluations
CREATE TABLE IF NOT EXISTS public.output_challenges (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id                  TEXT,
  target_kanji             TEXT NOT NULL,
  target_lemma             TEXT NOT NULL,
  target_reading           TEXT,
  target_meaning_hebrew    TEXT,
  challenge_mode           TEXT NOT NULL DEFAULT 'translation'
                             CHECK (challenge_mode IN ('translation', 'scenario')),
  prompt_hebrew            TEXT NOT NULL,
  scenario_context_hebrew  TEXT,
  grammar_hint_hebrew      TEXT,
  reference_japanese       TEXT NOT NULL,
  reference_reading        TEXT,
  helper_vocab             JSONB NOT NULL DEFAULT '[]'::jsonb,
  user_sentence_japanese   TEXT,
  is_correct               BOOLEAN,
  grammar_score            INTEGER,
  naturalness_score        INTEGER,
  corrected_user_sentence  TEXT,
  feedback_hebrew          TEXT,
  native_alternative       TEXT,
  native_alternative_audio TEXT,
  srs_rating_applied       INTEGER,
  completed_at             TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_output_challenges_user_created
  ON public.output_challenges (user_id, created_at DESC);

