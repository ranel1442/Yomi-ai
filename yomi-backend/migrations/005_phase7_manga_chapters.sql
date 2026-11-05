-- ============================================================================
-- Yomi-AI: Phase 7 — Full Manga Chapter Vision & Reverse-Immersion Studio (`/manga`)
-- Run this script in the Supabase SQL Editor. It is 100% idempotent.
-- ============================================================================

-- 1. Create public Storage bucket `manga_pages` + public read RLS policy
INSERT INTO storage.buckets (id, name, public)
VALUES ('manga_pages', 'manga_pages', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Public read access for manga_pages'
  ) THEN
    CREATE POLICY "Public read access for manga_pages"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'manga_pages');
  END IF;
END $$;

-- 2. Create `public.manga_chapters` table
CREATE TABLE IF NOT EXISTS public.manga_chapters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  source_language TEXT NOT NULL DEFAULT 'he_en_translated'
                    CHECK (source_language IN ('he_en_translated', 'ja_raw')),
  jlpt_target     TEXT NOT NULL DEFAULT 'N4',
  total_pages     INTEGER NOT NULL DEFAULT 0,
  characters      JSONB NOT NULL DEFAULT '[]'::jsonb,
  pages           JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manga_chapters_user_created
  ON public.manga_chapters (user_id, created_at DESC);

-- 3. Link mined flashcards optionally to `manga_chapters`
ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS manga_chapter_id UUID REFERENCES public.manga_chapters(id) ON DELETE SET NULL;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

