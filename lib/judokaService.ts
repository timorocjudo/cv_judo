'use server'

import { createClient } from '@/lib/supabase/server'
import type { JudokaData, BlockName, MedalType } from '@/types/judoka'
import { normalizeText } from '@/lib/slugify'

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
  slug: string
  first_name: string
  last_name: string
  club: string | null
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
    identity: {
      firstName: row.first_name,
      lastName: row.last_name,
      club: row.club ?? '',
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
  options?: { allowDraft?: boolean }
): Promise<JudokaData | null> {
  const supabase = createClient()
  let query = supabase
    .from('profiles')
    .select(`
      *,
      palmares (*),
      videos (*),
      gallery_photos (*)
    `)
    .eq('slug', slug)

  if (!options?.allowDraft) {
    query = query.eq('published', true)
  }

  const { data, error } = await query.maybeSingle()
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
    .select('slug, first_name, last_name, club, grade, category, profile_photo_url')
    .eq('published', true)

  if (error || !data) return []

  return data
    .filter((row) => {
      const fullName = normalizeText(`${row.first_name} ${row.last_name}`)
      return fullName.includes(normalized)
    })
    .slice(0, 8)
}

export async function searchJudokas(query: string): Promise<JudokaData[]> {
  const normalized = normalizeText(query)
  if (!normalized) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('published', true)

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
