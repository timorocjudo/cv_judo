-- 0014_competition_photos.sql
-- Adds competition_slug to palmares + new competition_photos table with RLS.

-- ─── 1. competition_slug on palmares ─────────────────────────────────────────

ALTER TABLE public.palmares
  ADD COLUMN competition_slug text;

-- UNIQUE constraint: PostgreSQL allows multiple NULLs in a UNIQUE constraint
-- (NULL ≠ NULL in SQL), so existing entries without a slug are fine.
ALTER TABLE public.palmares
  ADD CONSTRAINT palmares_profile_competition_slug_unique
  UNIQUE (profile_id, competition_slug);

-- ─── 2. Table competition_photos ─────────────────────────────────────────────

CREATE TABLE public.competition_photos (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  palmares_id uuid        NOT NULL REFERENCES public.palmares(id) ON DELETE CASCADE,
  profile_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_url   text        NOT NULL,
  caption     text,
  position    int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX competition_photos_palmares_id_idx
  ON public.competition_photos (palmares_id);

ALTER TABLE public.competition_photos ENABLE ROW LEVEL SECURITY;

-- ─── 3. RLS policies ─────────────────────────────────────────────────────────

-- Anon: public and private profiles (same pattern as gallery_photos in 0012)
CREATE POLICY "anon_read_accessible_competition_photos"
  ON public.competition_photos FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = profile_id AND visibility IN ('public', 'private')
    )
  );

-- Auth: public/private/draft if owner or manager
CREATE POLICY "auth_read_accessible_competition_photos"
  ON public.competition_photos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = profile_id
        AND (
          visibility IN ('public', 'private')
          OR EXISTS (
            SELECT 1 FROM public.profile_access
            WHERE profile_id = profiles.id
              AND account_id = auth.uid()
              AND role IN ('owner', 'manager')
          )
        )
    )
  );

-- Auth write: owner or manager only
CREATE POLICY "access_write_competition_photos"
  ON public.competition_photos FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profile_access
      WHERE profile_id = competition_photos.profile_id
        AND account_id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profile_access
      WHERE profile_id = competition_photos.profile_id
        AND account_id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  );
