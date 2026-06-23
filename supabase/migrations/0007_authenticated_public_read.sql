-- 0007_authenticated_public_read.sql
-- Fix: authenticated users could not read published profiles/palmares/videos/gallery_photos
-- owned by others. The existing public_read_* policies are scoped to `anon` only; once a
-- user logs in via Google (role becomes `authenticated`), those policies stop applying and
-- the owner_all_* policies only cover the owner's own data.

create policy "authenticated_read_published_profiles"
  on public.profiles for select
  to authenticated
  using (published = true);

create policy "authenticated_read_published_palmares"
  on public.palmares for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = profile_id and published = true
    )
  );

create policy "authenticated_read_published_videos"
  on public.videos for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = profile_id and published = true
    )
  );

create policy "authenticated_read_published_gallery_photos"
  on public.gallery_photos for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = profile_id and published = true
    )
  );
