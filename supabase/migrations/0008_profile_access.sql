-- supabase/migrations/0008_profile_access.sql
-- Multi-profile system: profile_access table + visibility column.
-- owner_id and published are kept (deprecated) — not dropped.

-- ─── 1. profile_access table ─────────────────────────────────────────────────

CREATE TABLE public.profile_access (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('owner', 'manager', 'viewer')),
  invited_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, account_id)
);

ALTER TABLE public.profile_access ENABLE ROW LEVEL SECURITY;

-- A user sees only their own access rows
CREATE POLICY "pa_select_own"
  ON public.profile_access FOR SELECT TO authenticated
  USING (auth.uid() = account_id);

-- No INSERT policy for authenticated — only SECURITY DEFINER trigger and service role
-- A non-owner can remove themselves
CREATE POLICY "pa_delete_self_non_owner"
  ON public.profile_access FOR DELETE TO authenticated
  USING (auth.uid() = account_id AND role != 'owner');

-- ─── 2. Migrate existing owner_id relationships ───────────────────────────────

INSERT INTO public.profile_access (profile_id, account_id, role)
SELECT id, owner_id, 'owner'
FROM public.profiles
WHERE owner_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ─── 3. SECURITY DEFINER trigger: auto-creates owner row on profile insert ────

CREATE OR REPLACE FUNCTION public.handle_profile_owner_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profile_access (profile_id, account_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profile_owner_access
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profile_owner_access();

-- ─── 4. visibility column ─────────────────────────────────────────────────────

ALTER TABLE public.profiles
ADD COLUMN visibility text NOT NULL DEFAULT 'draft'
CHECK (visibility IN ('draft', 'private', 'public'));

UPDATE public.profiles SET visibility = 'public' WHERE published = true;
-- published = false rows stay at default 'draft'

COMMENT ON COLUMN public.profiles.published IS
  'DEPRECATED — use visibility instead. Will be removed in a future migration.';

-- ─── 5. Drop old RLS policies (profiles) ──────────────────────────────────────

DROP POLICY IF EXISTS "public_read_profiles"                    ON public.profiles;
DROP POLICY IF EXISTS "owner_all_profiles"                      ON public.profiles;
DROP POLICY IF EXISTS "authenticated_read_published_profiles"   ON public.profiles;

-- ─── 6. New RLS policies (profiles) ───────────────────────────────────────────

-- anon: public only
CREATE POLICY "anon_read_public_profiles"
  ON public.profiles FOR SELECT TO anon
  USING (visibility = 'public');

-- authenticated: public/private for everyone; draft only for owner/manager
CREATE POLICY "auth_read_accessible_profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    visibility IN ('public', 'private')
    OR EXISTS (
      SELECT 1 FROM public.profile_access
      WHERE profile_id = profiles.id
        AND account_id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  );

-- authenticated can INSERT their own profile (trigger creates profile_access row)
CREATE POLICY "auth_insert_profiles"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- owner or manager can UPDATE
CREATE POLICY "access_update_profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profile_access
      WHERE profile_id = profiles.id
        AND account_id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profile_access
      WHERE profile_id = profiles.id
        AND account_id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  );

-- only owner can DELETE
CREATE POLICY "owner_delete_profiles"
  ON public.profiles FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profile_access
      WHERE profile_id = profiles.id
        AND account_id = auth.uid()
        AND role = 'owner'
    )
  );

-- ─── 7. Drop old RLS policies (child tables) ──────────────────────────────────

DROP POLICY IF EXISTS "public_read_palmares"                       ON public.palmares;
DROP POLICY IF EXISTS "owner_all_palmares"                         ON public.palmares;
DROP POLICY IF EXISTS "authenticated_read_published_palmares"      ON public.palmares;

DROP POLICY IF EXISTS "public_read_videos"                         ON public.videos;
DROP POLICY IF EXISTS "owner_all_videos"                           ON public.videos;
DROP POLICY IF EXISTS "authenticated_read_published_videos"        ON public.videos;

DROP POLICY IF EXISTS "public_read_gallery_photos"                 ON public.gallery_photos;
DROP POLICY IF EXISTS "owner_all_gallery_photos"                   ON public.gallery_photos;
DROP POLICY IF EXISTS "authenticated_read_published_gallery_photos" ON public.gallery_photos;

-- ─── 8. New RLS policies (palmares) ───────────────────────────────────────────

CREATE POLICY "anon_read_public_palmares"
  ON public.palmares FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = profile_id AND visibility = 'public'
  ));

CREATE POLICY "auth_read_accessible_palmares"
  ON public.palmares FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = profile_id
      AND (
        visibility IN ('public', 'private')
        OR EXISTS (
          SELECT 1 FROM public.profile_access
          WHERE profile_id = profiles.id AND account_id = auth.uid()
            AND role IN ('owner', 'manager')
        )
      )
  ));

CREATE POLICY "access_write_palmares"
  ON public.palmares FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profile_access
    WHERE profile_id = palmares.profile_id
      AND account_id = auth.uid()
      AND role IN ('owner', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profile_access
    WHERE profile_id = palmares.profile_id
      AND account_id = auth.uid()
      AND role IN ('owner', 'manager')
  ));

-- ─── 9. New RLS policies (videos) ─────────────────────────────────────────────

CREATE POLICY "anon_read_public_videos"
  ON public.videos FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = profile_id AND visibility = 'public'
  ));

CREATE POLICY "auth_read_accessible_videos"
  ON public.videos FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = profile_id
      AND (
        visibility IN ('public', 'private')
        OR EXISTS (
          SELECT 1 FROM public.profile_access
          WHERE profile_id = profiles.id AND account_id = auth.uid()
            AND role IN ('owner', 'manager')
        )
      )
  ));

CREATE POLICY "access_write_videos"
  ON public.videos FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profile_access
    WHERE profile_id = videos.profile_id
      AND account_id = auth.uid()
      AND role IN ('owner', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profile_access
    WHERE profile_id = videos.profile_id
      AND account_id = auth.uid()
      AND role IN ('owner', 'manager')
  ));

-- ─── 10. New RLS policies (gallery_photos) ────────────────────────────────────

CREATE POLICY "anon_read_public_gallery_photos"
  ON public.gallery_photos FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = profile_id AND visibility = 'public'
  ));

CREATE POLICY "auth_read_accessible_gallery_photos"
  ON public.gallery_photos FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = profile_id
      AND (
        visibility IN ('public', 'private')
        OR EXISTS (
          SELECT 1 FROM public.profile_access
          WHERE profile_id = profiles.id AND account_id = auth.uid()
            AND role IN ('owner', 'manager')
        )
      )
  ));

CREATE POLICY "access_write_gallery_photos"
  ON public.gallery_photos FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profile_access
    WHERE profile_id = gallery_photos.profile_id
      AND account_id = auth.uid()
      AND role IN ('owner', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profile_access
    WHERE profile_id = gallery_photos.profile_id
      AND account_id = auth.uid()
      AND role IN ('owner', 'manager')
  ));
