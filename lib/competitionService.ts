import { createClient } from '@/lib/supabase/server'

export interface CompetitionPhoto {
  id: string
  photo_url: string
  caption: string | null
  position: number
}

export interface CompetitionPage {
  palmares: {
    id: string
    competition: string
    date: string
    result: string
    category: string | null
    level: string | null
    medal: string | null
    city: string | null
    competition_slug: string
  }
  photos: CompetitionPhoto[]
  profile: {
    slug: string
    firstName: string
    lastName: string
    profilePhotoUrl: string | null
    visibility: 'public' | 'private'
  }
}

export async function getCompetitionBySlug(
  profileSlug: string,
  competitionSlug: string
): Promise<CompetitionPage | null> {
  const supabase = createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, slug, first_name, last_name, profile_photo_url, visibility')
    .eq('slug', profileSlug)
    .in('visibility', ['public', 'private'])
    .maybeSingle()

  if (!profile) return null

  const { data: entry } = await supabase
    .from('palmares')
    .select('id, competition, date, result, category, level, medal, city, competition_slug')
    .eq('profile_id', profile.id)
    .eq('competition_slug', competitionSlug)
    .maybeSingle()

  if (!entry || !entry.competition_slug) return null

  const { data: photos } = await supabase
    .from('competition_photos')
    .select('id, photo_url, caption, position')
    .eq('palmares_id', entry.id)
    .order('position', { ascending: true })

  return {
    palmares: entry as CompetitionPage['palmares'],
    photos: (photos ?? []) as CompetitionPhoto[],
    profile: {
      slug: profile.slug,
      firstName: profile.first_name,
      lastName: profile.last_name,
      profilePhotoUrl: profile.profile_photo_url,
      visibility: profile.visibility as 'public' | 'private',
    },
  }
}

export async function getCompetitionPhotos(
  palmaresId: string
): Promise<CompetitionPhoto[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('competition_photos')
    .select('id, photo_url, caption, position')
    .eq('palmares_id', palmaresId)
    .order('position', { ascending: true })
  return (data ?? []) as CompetitionPhoto[]
}
