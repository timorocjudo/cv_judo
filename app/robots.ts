import type { MetadataRoute } from 'next'

// Mirrors NEXT_PUBLIC_SITE_INDEXABLE logic in layout.tsx.
// Keep Disallow: / until the site is officially open (legal pages live).
const isIndexable = process.env.NEXT_PUBLIC_SITE_INDEXABLE === 'true'
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ipponid.com'

export default function robots(): MetadataRoute.Robots {
  if (!isIndexable) {
    return {
      rules: { userAgent: '*', disallow: '/' },
      sitemap: `${siteUrl}/sitemap.xml`,
    }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/auth', '/api/og'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
