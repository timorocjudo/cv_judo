-- 0001_init.sql
-- Run in the Supabase SQL Editor after creating your project.

-- ─── Tables ───────────────────────────────────────────────────────────────────

create table public.profiles (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references auth.users(id) on delete cascade,
  slug              text unique not null,
  first_name        text not null,
  last_name         text not null,
  club              text,
  category          text,
  grade             text,
  bio               text,
  profile_photo_url text,
  cover_photo_url   text,
  layout            jsonb,
  published         boolean not null default false,
  parental_consent  boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table public.palmares (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  date        date,
  competition text,
  result      text,
  category    text,
  position    int,
  created_at  timestamptz not null default now()
);

create table public.videos (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  title       text,
  youtube_url text,
  description text,
  position    int,
  created_at  timestamptz not null default now()
);

create table public.gallery_photos (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  photo_url  text,
  caption    text,
  position   int,
  created_at timestamptz not null default now()
);

-- ─── Auto-update updated_at on profiles ───────────────────────────────────────

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- ─── Row Level Security ────────────────────────────────────────────────────────

alter table public.profiles      enable row level security;
alter table public.palmares      enable row level security;
alter table public.videos        enable row level security;
alter table public.gallery_photos enable row level security;

-- profiles
create policy "public_read_profiles"
  on public.profiles for select
  to anon
  using (published = true);

create policy "owner_all_profiles"
  on public.profiles for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- palmares
create policy "public_read_palmares"
  on public.palmares for select
  to anon
  using (
    exists (
      select 1 from public.profiles
      where id = profile_id and published = true
    )
  );

create policy "owner_all_palmares"
  on public.palmares for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = profile_id and owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = profile_id and owner_id = auth.uid()
    )
  );

-- videos
create policy "public_read_videos"
  on public.videos for select
  to anon
  using (
    exists (
      select 1 from public.profiles
      where id = profile_id and published = true
    )
  );

create policy "owner_all_videos"
  on public.videos for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = profile_id and owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = profile_id and owner_id = auth.uid()
    )
  );

-- gallery_photos
create policy "public_read_gallery_photos"
  on public.gallery_photos for select
  to anon
  using (
    exists (
      select 1 from public.profiles
      where id = profile_id and published = true
    )
  );

create policy "owner_all_gallery_photos"
  on public.gallery_photos for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = profile_id and owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = profile_id and owner_id = auth.uid()
    )
  );
