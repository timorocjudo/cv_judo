import Image from 'next/image'
import Link from 'next/link'
import type { FeaturedProfile } from '@/app/page'
import { BeltBadge } from '@/components/dashboard/BeltBadge'
import { getBeltByLabel } from '@/lib/judo-belts'

const MEDAL_BORDER: Record<string, string> = {
  gold:   'border-l-medal-gold',
  silver: 'border-l-medal-silver',
  bronze: 'border-l-medal-bronze',
}

interface Props {
  featured: FeaturedProfile | null
}

export default function MockupSection({ featured }: Props) {
  if (!featured) return null

  const initials = (featured.first_name?.[0] ?? '') + (featured.last_name?.[0] ?? '')
  const belt = getBeltByLabel(featured.grade ?? '')

  return (
    <section className="px-margin-mobile md:px-margin-desktop py-10 max-w-container-max mx-auto">
      <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white">

        {/* Browser chrome */}
        <div className="bg-surface-container-high px-4 py-2 flex items-center gap-2 border-b border-outline-variant">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-300/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-300/70" />
            <div className="w-3 h-3 rounded-full bg-green-300/70" />
          </div>
          <div className="flex-1 flex justify-center">
            <span className="bg-white/60 px-6 py-1 rounded-full text-xs text-outline">
              🔒 ipponid.com/{featured.slug}
            </span>
          </div>
        </div>

        {/* Hero — reproduction fidèle du HeroBlock */}
        <div className="relative min-h-[280px] md:min-h-[380px] bg-primary-container overflow-hidden flex items-end">
          {/* Cover photo */}
          <div className="absolute inset-0">
            {featured.cover_photo_url ? (
              <Image
                src={featured.cover_photo_url}
                alt={`${featured.first_name} ${featured.last_name} en compétition`}
                fill
                className="object-cover"
                sizes="100vw"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/30 to-transparent" />
            <div className="absolute inset-0 gi-texture-dark" />
          </div>

          {/* Contenu hero */}
          <div className="relative z-10 w-full px-6 md:px-10 py-8 md:py-12">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-4">

              {/* Photo de profil */}
              <div className="relative w-16 h-16 md:w-24 md:h-24 rounded-full overflow-hidden border-4 border-white/20 flex-shrink-0 bg-primary-container flex items-center justify-center">
                {featured.profile_photo_url ? (
                  <Image
                    src={featured.profile_photo_url}
                    alt={`${featured.first_name} ${featured.last_name}`}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                ) : (
                  <span className="font-montserrat font-black text-on-primary text-2xl uppercase">
                    {initials}
                  </span>
                )}
              </div>

              {/* Texte */}
              <div>
                <p className="font-inter text-[10px] font-bold uppercase tracking-[0.25em] text-tertiary-fixed-dim mb-1">
                  IpponId · Profil Athlete
                </p>
                <h2 className="font-montserrat text-3xl md:text-5xl font-black text-white uppercase tracking-tight leading-none">
                  {featured.first_name}<br />{featured.last_name}
                </h2>
                <div className="flex flex-wrap gap-2 mt-3">
                  {featured.club && (
                    <span className="bg-white/10 backdrop-blur-sm text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-white/20">
                      {featured.club}
                    </span>
                  )}
                  {(featured.ageCategory || featured.category) && (
                    <span className="bg-tertiary-container text-on-tertiary-container text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                      {[featured.ageCategory, featured.category].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  {belt && (
                    <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
                      <BeltBadge belt={belt} width={44} height={12} />
                      <span className="text-white text-xs font-bold uppercase tracking-wider">{featured.grade}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Palmares preview */}
        {featured.palmares.length > 0 && (
          <div className="bg-surface-container-low px-6 md:px-10 py-4 flex flex-col gap-2">
            {featured.palmares.map((entry, i) => (
              <div
                key={i}
                className={`bg-surface-container-lowest rounded-lg p-3 flex justify-between items-center border-l-4 ${MEDAL_BORDER[entry.medal ?? ''] ?? 'border-l-outline-variant'}`}
              >
                <span className="font-inter text-sm font-semibold text-primary truncate">{entry.competition}</span>
                <span className="font-inter text-xs font-bold text-on-surface-variant ml-4 whitespace-nowrap">{entry.result}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-center mt-4">
        <Link href={`/${featured.slug}`} className="text-primary font-semibold text-sm hover:underline">
          Voir le profil complet de {featured.first_name} →
        </Link>
      </div>
    </section>
  )
}
