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

  return [...STATIC_PAGES, ...profilePages]
}
