-- ============================================================================
-- Yomi-AI: Phase 2 — Context-First Flashcards (Sentence Mining)
-- Run this script in the Supabase SQL Editor. It is 100% idempotent.
-- ============================================================================

-- 1. Add Sentence Mining & Dual Cached Audio columns to `flashcards`
ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS lemma               TEXT,
  ADD COLUMN IF NOT EXISTS context_sentence    TEXT,
  ADD COLUMN IF NOT EXISTS context_translation TEXT,
  ADD COLUMN IF NOT EXISTS context_furigana    JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS word_audio_url      TEXT,
  ADD COLUMN IF NOT EXISTS sentence_audio_url  TEXT;

-- 2. Backfill `lemma` from `kanji` for any existing flashcards
UPDATE public.flashcards
SET lemma = btrim(kanji)
WHERE lemma IS NULL OR btrim(lemma) = '';

-- 3. Safely remove any pre-existing duplicate (user_id, lemma) rows
--    (keeps the card with the most reviews / highest mastery / earliest creation)
DELETE FROM public.flashcards a
USING public.flashcards b
WHERE a.user_id IS NOT NULL
  AND a.user_id = b.user_id
  AND a.lemma   = b.lemma
  AND a.ctid <> b.ctid
  AND (
    COALESCE(a.reps, 0) < COALESCE(b.reps, 0)
    OR (
      COALESCE(a.reps, 0) = COALESCE(b.reps, 0)
      AND COALESCE(a.mastery_level, 0) < COALESCE(b.mastery_level, 0)
    )
    OR (
      COALESCE(a.reps, 0) = COALESCE(b.reps, 0)
      AND COALESCE(a.mastery_level, 0) = COALESCE(b.mastery_level, 0)
      AND a.id::text > b.id::text
    )
  );

-- 4. Ensure optimal indexes & uniqueness per (user_id, lemma)
CREATE INDEX IF NOT EXISTS idx_flashcards_user_due
  ON public.flashcards (user_id, due_date ASC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_flashcards_user_lemma_unique
  ON public.flashcards (user_id, lemma)
  WHERE user_id IS NOT NULL AND lemma IS NOT NULL;

