'use server'

import { createClient } from '@/lib/supabase/server'
import type { JudokaData, BlockName, MedalType } from '@/types/judoka'
import { normalizeText, generateCompetitionSlug } from '@/lib/slugify'

// ─── Internal DB types ────────────────────────────────────────────────────────

type PalmaresRow = {
  id?: string | null
  date: string | null
  competition: string | null
  result: string | null
  category: string | null
  level: string | null
  medal: string | null
  city: string | null
  position: number | null
  competition_slug: string | null
  competition_photos: { id: string }[]
}

type VideoRow = {
  title: string | null
  youtube_url: string | null
  description: string | null
  position: number | null
}

type GalleryRow = {
  photo_url: string | null
  caption: string | null
  position: number | null
}

type ProfileRow = {
  id: string
  owner_id: string
  published: boolean
  visibility: 'draft' | 'private' | 'public'
  slug: string
  first_name: string
  last_name: string
  club: string | null
  club_id: string | null
  clubs: { id: string; name: string } | null
  category: string | null
  grade: string | null
  bio: string | null
  birth_date: string | null
  profile_photo_url: string | null
  cover_photo_url: string | null
  layout: unknown
  palmares: PalmaresRow[] | null
  videos: VideoRow[] | null
  gallery_photos: GalleryRow[] | null
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapProfile(row: ProfileRow): JudokaData {
  const palmares = [...(row.palmares ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const videos = [...(row.videos ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const gallery = [...(row.gallery_photos ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

  return {
    slug: row.slug,
    ownerId: row.owner_id,
    published: row.published,
    visibility: row.visibility ?? 'draft',
    identity: {
      firstName: row.first_name,
      lastName: row.last_name,
      club: (row.clubs as { name: string } | null)?.name ?? row.club ?? '',
      clubId: (row.clubs as { id: string } | null)?.id ?? row.club_id ?? null,
      birthDate: row.birth_date ?? undefined,
      weightCategory: row.category ?? '',
      grade: row.grade ?? '',
      profilePhoto: row.profile_photo_url ?? '',
      coverPhoto: row.cover_photo_url ?? '',
    },
    bio: row.bio ?? '',
    palmares: palmares.map((p) => ({
      id: p.id ?? undefined,
      date: p.date ?? '',
      competition: p.competition ?? '',
      result: p.result ?? '',
      category: p.category ?? '',
      level: p.level ?? '',
      medal: (p.medal as MedalType) ?? null,
      city: p.city ?? undefined,
      competitionSlug: p.competition_slug ??
        (p.competition && p.date ? generateCompetitionSlug(p.competition, p.date) : undefined),
      photosCount: p.competition_photos?.length ?? 0,
    })),
    videos: videos.map((v) => ({
      title: v.title ?? '',
      youtubeUrl: v.youtube_url ?? '',
      description: v.description ?? '',
    })),
    gallery: gallery.map((g) => ({
      src: g.photo_url ?? '',
      caption: g.caption ?? '',
    })),
    techniques: [],
    social: [],
    layout: (row.layout as BlockName[] | null)?.length
      ? (row.layout as BlockName[])
      : ['hero', 'bio', 'palmares', 'videos', 'gallery'],
  }
}

// ─── Exported functions ───────────────────────────────────────────────────────

export async function getJudokaBySlug(
  slug: string,
  _options?: { allowDraft?: boolean }
): Promise<JudokaData | null> {
  const supabase = createClient()
  // RLS on profiles handles visibility filtering — no need to filter by published.
  // allowDraft option is kept for API compatibility but is now a no-op
  // (RLS already shows drafts to their owners/managers).
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      clubs(id, name),
      palmares (*, competition_photos(id)),
      videos (*),
      gallery_photos (*)
    `)
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data) return null
  return mapProfile(data as unknown as ProfileRow)
}

export type JudokaAutocompleteResult = {
  slug: string
  first_name: string
  last_name: string
  club: string | null
  grade: string | null
  category: string | null
  profile_photo_url: string | null
}

export async function searchJudokasAutocomplete(
  query: string
): Promise<JudokaAutocompleteResult[]> {
  const normalized = normalizeText(query)
  if (normalized.length < 3) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('slug, first_name, last_name, club, clubs(id, name), grade, category, profile_photo_url')
    .eq('visibility', 'public')

  if (error || !data) return []

  return data
    .filter((row) => {
      const fullName = normalizeText(`${row.first_name} ${row.last_name}`)
      return fullName.includes(normalized)
    })
    .slice(0, 8)
    .map((row) => ({
      slug: row.slug,
      first_name: row.first_name,
      last_name: row.last_name,
      club: (row.clubs as unknown as { name: string } | null)?.name ?? row.club ?? null,
      grade: row.grade,
      category: row.category,
      profile_photo_url: row.profile_photo_url,
    }))
}

export async function searchJudokas(query: string): Promise<JudokaData[]> {
  const normalized = normalizeText(query)
  if (!normalized) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*, clubs(id, name)')
    .eq('visibility', 'public')

  if (error || !data) return []

  return data
    .filter((row) => {
      const fullName = normalizeText(`${row.first_name} ${row.last_name}`)
      return fullName.includes(normalized)
    })
    .map((row) =>
      mapProfile({ ...row, palmares: null, videos: null, gallery_photos: null } as ProfileRow)
    )
}
