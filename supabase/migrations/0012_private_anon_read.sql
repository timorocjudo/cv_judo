-- supabase/migrations/0012_private_anon_read.sql
-- Redéfinition de la visibilité "private" : accessible par URL directe sans connexion,
-- absent des moteurs de recherche (noindex côté app). Seul "draft" est invisible.

-- profiles: anon peut lire public ET private
DROP POLICY IF EXISTS "anon_read_public_profiles" ON public.profiles;
CREATE POLICY "anon_read_accessible_profiles"
  ON public.profiles FOR SELECT TO anon
  USING (visibility IN ('public', 'private'));

-- palmares
DROP POLICY IF EXISTS "anon_read_public_palmares" ON public.palmares;
CREATE POLICY "anon_read_accessible_palmares"
  ON public.palmares FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = profile_id AND visibility IN ('public', 'private')
    )
  );

-- videos
DROP POLICY IF EXISTS "anon_read_public_videos" ON public.videos;
CREATE POLICY "anon_read_accessible_videos"
  ON public.videos FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = profile_id AND visibility IN ('public', 'private')
    )
  );

-- gallery_photos
DROP POLICY IF EXISTS "anon_read_public_gallery_photos" ON public.gallery_photos;
CREATE POLICY "anon_read_accessible_gallery_photos"
  ON public.gallery_photos FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = profile_id AND visibility IN ('public', 'private')
    )
  );
