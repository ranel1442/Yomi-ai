-- ============================================================================
-- Yomi-AI: Phase 0 (God Mode & TTS Audio Cache) + Phase 1 (True FSRS Engine)
-- Run this entire script in the Supabase SQL Editor. It is 100% idempotent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PHASE 0: God Mode on `profiles`
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Promote personal admin account (matches auth.users email -> profiles.user_id)
UPDATE public.profiles p
SET is_admin = TRUE,
    is_pro   = TRUE
FROM auth.users u
WHERE p.user_id = u.id
  AND lower(u.email) IN ('lenar121249@gmail.com');

INSERT INTO public.profiles (user_id, is_pro, is_admin)
SELECT u.id, TRUE, TRUE
FROM auth.users u
WHERE lower(u.email) IN ('lenar121249@gmail.com')
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = u.id
  );

-- ----------------------------------------------------------------------------
-- 2. PHASE 0: Public Storage Bucket `tts_audio` & `tts_cache` Table
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('tts_audio', 'tts_audio', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Public read access for tts_audio'
  ) THEN
    CREATE POLICY "Public read access for tts_audio"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'tts_audio');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.tts_cache (
  hash_key   TEXT PRIMARY KEY,
  audio_url  TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. PHASE 1: FSRS Columns on `flashcards`
-- ----------------------------------------------------------------------------
ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS state            TEXT NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS stability        DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS difficulty       DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interval         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ease_factor      DOUBLE PRECISION NOT NULL DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS reps             INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lapses           INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mastery_level    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_date         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'flashcards_state_check'
  ) THEN
    ALTER TABLE public.flashcards
      ADD CONSTRAINT flashcards_state_check
      CHECK (state IN ('new', 'learning', 'review', 'relearning'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'flashcards_mastery_level_check'
  ) THEN
    ALTER TABLE public.flashcards
      ADD CONSTRAINT flashcards_mastery_level_check
      CHECK (mastery_level BETWEEN 0 AND 5);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_flashcards_user_due
  ON public.flashcards (user_id, due_date ASC);

-- ----------------------------------------------------------------------------
-- 4. PHASE 1: `review_logs` Table (dynamically matches flashcards.id type)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_id_type TEXT;
BEGIN
  SELECT CASE
           WHEN data_type = 'uuid' THEN 'UUID'
           WHEN data_type IN ('bigint', 'integer', 'smallint') THEN 'BIGINT'
           ELSE 'TEXT'
         END
  INTO v_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'flashcards'
    AND column_name  = 'id';

  IF v_id_type IS NULL THEN
    v_id_type := 'UUID';
  END IF;

  EXECUTE format($sql$
    CREATE TABLE IF NOT EXISTS public.review_logs (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      card_id     %s NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
      rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 4),
      state       TEXT NOT NULL,
      due_date    TIMESTAMPTZ NOT NULL,
      interval    INTEGER NOT NULL,
      ease_factor DOUBLE PRECISION NOT NULL,
      reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  $sql$, v_id_type);
END $$;

CREATE INDEX IF NOT EXISTS idx_review_logs_card_reviewed
  ON public.review_logs (card_id, reviewed_at DESC);

