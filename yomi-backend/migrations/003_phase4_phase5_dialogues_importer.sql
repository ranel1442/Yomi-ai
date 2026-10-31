-- ============================================================================
-- Yomi-AI: Phase 4 (Multi-Voice Manga Dialogues) & Phase 5 (Importer Support)
-- Run this script in the Supabase SQL Editor. It is 100% idempotent.
-- ============================================================================

-- 1. Create `dialogues` table for Manga & Dialogue Immersion Mode
CREATE TABLE IF NOT EXISTS public.dialogues (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title_japanese TEXT NOT NULL,
  title_hebrew   TEXT NOT NULL,
  prompt_topic   TEXT,
  setting_hebrew TEXT,
  style          TEXT NOT NULL DEFAULT 'casual_tameguchi'
                   CHECK (style IN ('shonen_fantasy', 'casual_tameguchi', 'slice_of_life', 'polite_daily')),
  jlpt_level     TEXT NOT NULL DEFAULT 'N4',
  characters     JSONB NOT NULL DEFAULT '[]'::jsonb,
  lines          JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dialogues_user_created
  ON public.dialogues (user_id, created_at DESC);

-- 2. Optional `dialogue_id` link on `flashcards` for words mined from Manga Dialogues
ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS dialogue_id UUID REFERENCES public.dialogues(id) ON DELETE SET NULL;

