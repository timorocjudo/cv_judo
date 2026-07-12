import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ipponid.com'

const STATIC_PAGES: MetadataRoute.Sitemap = [
  {
    url: siteUrl,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1.0,
  },
  {
    url: `${siteUrl}/mentions-legales`,
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  {
    url: `${siteUrl}/confidentialite`,
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  {
    url: `${siteUrl}/cgu`,
    changeFrequency: 'yearly',
    priority: 0.3,
  },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('slug, updated_at')
    .eq('published', true)
    .eq('visibility', 'public')

  const profilePages: MetadataRoute.Sitemap = (profiles ?? []).map((p) => ({
    url: `${siteUrl}/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  // Competition pages: public profiles, palmares with slug, at least one photo
  const { data: competitionEntries } = await supabase
    .from('palmares')
    .select(`
      competition_slug,
      competition_photos (created_at),
      profiles!inner (slug, visibility)
    `)
    .eq('profiles.visibility', 'public')
    .not('competition_slug', 'is', null)

  type CompetitionEntry = {
    competition_slug: string
    competition_photos: { created_at: string }[]
    profiles: { slug: string }
  }

  const competitionPages: MetadataRoute.Sitemap = ((competitionEntries ?? []) as unknown as CompetitionEntry[])
    .filter((e) => e.competition_photos.length > 0)
    .map((e) => {
      const latestPhoto = e.competition_photos.reduce(
        (latest, p) => (p.created_at > latest ? p.created_at : latest),
        e.competition_photos[0]?.created_at ?? new Date().toISOString()
      )
      return {
        url: `${siteUrl}/${e.profiles.slug}/competition/${e.competition_slug}`,
        lastModified: new Date(latestPhoto),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }
    })

  return [...STATIC_PAGES, ...profilePages, ...competitionPages]
}
