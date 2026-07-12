import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getCompetitionBySlug } from '@/lib/competitionService'
import CompetitionPhotosGallery from '@/components/CompetitionPhotosGallery'

type Props = { params: { slug: string; competitionSlug: string } }

const MEDAL_STYLES: Record<string, { color: string; label: string; rank: string }> = {
  gold:   { color: '#FFD700', label: 'Médaille d\'or',    rank: '1' },
  silver: { color: '#C0C0C0', label: 'Médaille d\'argent', rank: '2' },
  bronze: { color: '#CD7F32', label: 'Médaille de bronze', rank: '3' },
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getCompetitionBySlug(params.slug, params.competitionSlug)
  if (!data) return {}

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ipponid.com'
  const year = data.palmares.date?.slice(0, 4) ?? ''
  const name = `${data.profile.firstName} ${data.profile.lastName}`
  const ogImageUrl = `${siteUrl}/api/og/result/${params.slug}/${data.palmares.id}`

  const base: Metadata = {
    title: `${name} — ${data.palmares.competition} ${year} · IpponId`,
    description: `Résultat et photos de ${name} à ${data.palmares.competition} ${year} — ${data.palmares.result}`,
    openGraph: {
      title: `${name} — ${data.palmares.competition} ${year}`,
      description: `${data.palmares.result} · IpponId`,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      type: 'article',
      locale: 'fr_FR',
      siteName: 'IpponId',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} — ${data.palmares.competition} ${year}`,
      images: [ogImageUrl],
    },
  }

  if (data.profile.visibility === 'private') {
    return { ...base, robots: { index: false, follow: false } }
  }
  return base
}

function buildSportsEventJsonLd(data: NonNullable<Awaited<ReturnType<typeof getCompetitionBySlug>>>) {
  if (!data.palmares.date) return null
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ipponid.com'
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: data.palmares.competition,
    startDate: data.palmares.date,
    ...(data.palmares.city ? { location: { '@type': 'Place', name: data.palmares.city } } : {}),
    url: `${siteUrl}/${data.profile.slug}/competition/${data.palmares.competition_slug}`,
  }
}

export default async function CompetitionPage({ params }: Props) {
  const data = await getCompetitionBySlug(params.slug, params.competitionSlug)
  if (!data) notFound()

  const medal = data.palmares.medal ? MEDAL_STYLES[data.palmares.medal] : null
  const formattedDate = data.palmares.date
    ? new Date(data.palmares.date).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  const sportsEventJsonLd = buildSportsEventJsonLd(data)

  return (
    <>
      {sportsEventJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(sportsEventJsonLd) }}
        />
      )}

      <div className="min-h-screen bg-surface-container-lowest">
        {/* Breadcrumb */}
        <div className="bg-primary-container">
          <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto py-4">
            <Link
              href={`/${data.profile.slug}`}
              className="flex items-center gap-2 font-inter text-sm text-white/70 hover:text-white transition-colors w-fit"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Retour au profil de {data.profile.firstName} {data.profile.lastName}
            </Link>
          </div>
        </div>

        {/* Hero compact */}
        <div className="bg-primary-container pb-10 pt-2">
          <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
            {/* Competition name */}
            <h1 className="font-montserrat text-3xl md:text-5xl font-black text-white uppercase tracking-tight leading-tight mb-3">
              {data.palmares.competition}
            </h1>

            {/* Date + city */}
            {(formattedDate || data.palmares.city) && (
              <p className="font-inter text-sm text-white/60 mb-4">
                {[formattedDate, data.palmares.city].filter(Boolean).join(' · ')}
              </p>
            )}

            {/* Result badges */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {medal ? (
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-montserrat text-sm font-black text-white shadow-lg flex-shrink-0"
                    style={{ background: `radial-gradient(circle at 35% 35%, ${medal.color}, ${medal.color}99)` }}
                    aria-label={medal.label}
                  >
                    {medal.rank}
                  </div>
                  <span className="font-montserrat text-lg font-black text-white">
                    {data.palmares.result}
                  </span>
                </div>
              ) : (
                <span className="font-inter text-base font-semibold text-white/80">
                  {data.palmares.result}
                </span>
              )}
              {data.palmares.category && (
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10 text-white border border-white/20">
                  {data.palmares.category}
                </span>
              )}
              {data.palmares.level && (
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10 text-white border border-white/20">
                  {data.palmares.level}
                </span>
              )}
            </div>

            {/* Athlete credit */}
            <Link
              href={`/${data.profile.slug}`}
              className="inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20 transition-colors"
            >
              {data.profile.profilePhotoUrl ? (
                <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={data.profile.profilePhotoUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                  <span className="font-montserrat font-black text-white text-xs uppercase">
                    {data.profile.firstName[0]}{data.profile.lastName[0]}
                  </span>
                </div>
              )}
              <span className="font-inter text-sm font-semibold text-white">
                {data.profile.firstName} {data.profile.lastName}
              </span>
            </Link>
          </div>
        </div>

        {/* Photos section */}
        {data.photos.length > 0 && (
          <section className="py-10 md:py-14">
            <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
                <h2 className="font-montserrat text-headline-md font-bold text-primary uppercase">
                  Photos de la compétition
                </h2>
              </div>
              <CompetitionPhotosGallery
                photos={data.photos.map((p) => ({ src: p.photo_url, caption: p.caption ?? '' }))}
              />
            </div>
          </section>
        )}
      </div>
    </>
  )
}
