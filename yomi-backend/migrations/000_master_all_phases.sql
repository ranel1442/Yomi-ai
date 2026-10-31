-- ============================================================================
-- Yomi-AI: MASTER PRODUCTION MIGRATION (Phases 0, 1, 2, 4, 5 & 6 Combined)
-- Project: rivecwzwaeuzkjzbltta
-- Instructions: Paste this entire file into Supabase SQL Editor and click "Run".
-- Safe & 100% Idempotent (can be re-run anytime without losing data).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PHASE 0: God Mode on `profiles`
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

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
-- 3. PHASE 1: FSRS v4.5 Columns on `flashcards` & `review_logs` Table
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
      reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      source      TEXT NOT NULL DEFAULT 'flashcard'
    );
  $sql$, v_id_type);
END $$;

ALTER TABLE public.review_logs
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'flashcard';

CREATE INDEX IF NOT EXISTS idx_review_logs_card_reviewed
  ON public.review_logs (card_id, reviewed_at DESC);

-- ----------------------------------------------------------------------------
-- 4. PHASE 2: Context-First Sentence Mining & Dual Cached Audio on `flashcards`
-- ----------------------------------------------------------------------------
ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS lemma               TEXT,
  ADD COLUMN IF NOT EXISTS context_sentence    TEXT,
  ADD COLUMN IF NOT EXISTS context_translation TEXT,
  ADD COLUMN IF NOT EXISTS context_furigana    JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS word_audio_url      TEXT,
  ADD COLUMN IF NOT EXISTS sentence_audio_url  TEXT;

UPDATE public.flashcards
SET lemma = btrim(kanji)
WHERE lemma IS NULL OR btrim(lemma) = '';

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_flashcards_user_lemma_unique
  ON public.flashcards (user_id, lemma)
  WHERE user_id IS NOT NULL AND lemma IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 5. PHASE 4 & 5: Multi-Voice Manga Dialogues (`dialogues` Table)
-- ----------------------------------------------------------------------------
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

ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS dialogue_id UUID REFERENCES public.dialogues(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 6. PHASE 6: Active Output & Speech Trainer (`output_challenges` Table)
-- ----------------------------------------------------------------------------
ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS output_success_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_output_at       TIMESTAMPTZ;

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

-- Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';

