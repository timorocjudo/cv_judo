import Image from 'next/image'
import type { Identity, Social } from '@/types/judoka'
import { computeAgeCategory } from '@/lib/ageCategory'

const socialIcons: Record<string, { label: string; icon: React.ReactNode }> = {
  instagram: {
    label: 'Instagram',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
  },
  youtube: {
    label: 'YouTube',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  tiktok: {
    label: 'TikTok',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.27 8.27 0 0 0 4.84 1.55V6.79a4.85 4.85 0 0 1-1.07-.1z" />
      </svg>
    ),
  },
}

interface HeroBlockProps {
  identity: Identity
  social: Social
}

export default function HeroBlock({ identity, social }: HeroBlockProps) {
  return (
    <section className="relative min-h-[65vh] md:min-h-[75vh] bg-primary-container overflow-hidden flex items-end">
      {/* Cover photo with gradient overlay */}
      <div className="absolute inset-0">
        <Image
          src={identity.coverPhoto}
          alt={`${identity.firstName} ${identity.lastName} en compétition`}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/30 to-transparent" />
        <div className="absolute inset-0 gi-texture-dark" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
          {/* Profile photo */}
          <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white/20 flex-shrink-0 bg-surface-container">
            <Image
              src={identity.profilePhoto}
              alt={`Photo de profil de ${identity.firstName} ${identity.lastName}`}
              fill
              className="object-cover"
              sizes="128px"
            />
          </div>

          {/* Text */}
          <div>
            <p className="font-inter text-xs font-bold uppercase tracking-[0.25em] text-tertiary-fixed-dim mb-2">
              IpponId · Profil Athlete
            </p>
            <h1 className="font-montserrat text-5xl md:text-7xl font-black text-white uppercase tracking-tight leading-none">
              {identity.firstName}
              <br />
              {identity.lastName}
            </h1>
            <div className="flex flex-wrap gap-2 mt-5">
              <span className="bg-white/10 backdrop-blur-sm text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-white/20">
                {identity.club}
              </span>
              <span className="bg-tertiary-container text-on-tertiary-container text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">
                {computeAgeCategory(identity.birthDate)} · {identity.weightCategory}
              </span>
              <span className="bg-white/10 backdrop-blur-sm text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-white/20">
                {identity.grade}
              </span>
            </div>
            {social.length > 0 && (
              <div className="flex gap-3 mt-5">
                {social.map(({ network, url }) => {
                  const meta = socialIcons[network]
                  if (!meta) return null
                  return (
                    <a
                      key={network}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={meta.label}
                      className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-3 py-2 rounded-full border border-white/20 transition-colors"
                    >
                      {meta.icon}
                      <span className="font-inter text-xs font-bold uppercase tracking-wider hidden sm:inline">
                        {meta.label}
                      </span>
                    </a>
                  )
                })}
              </div>
            )}
            {(identity.height || identity.weight || identity.nationality) && (
              <div className="mt-6 flex flex-wrap gap-6">
                {identity.nationality && (
                  <div>
                    <p className="font-inter text-[10px] font-bold uppercase tracking-widest text-white/50 mb-0.5">Nationalité</p>
                    <div className="flex items-center gap-1.5">
                      <svg width="20" height="14" viewBox="0 0 20 14" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="rounded-sm flex-shrink-0">
                        <rect width="7" height="14" fill="#002395"/>
                        <rect x="7" width="6" height="14" fill="#EDEDED"/>
                        <rect x="13" width="7" height="14" fill="#ED2939"/>
                      </svg>
                      <p className="font-montserrat text-sm font-bold text-white uppercase">{identity.nationality}</p>
                    </div>
                  </div>
                )}
                {identity.height && (
                  <div>
                    <p className="font-inter text-[10px] font-bold uppercase tracking-widest text-white/50 mb-0.5">Taille</p>
                    <p className="font-montserrat text-sm font-bold text-white">{identity.height} cm</p>
                  </div>
                )}
                {identity.weight && (
                  <div>
                    <p className="font-inter text-[10px] font-bold uppercase tracking-widest text-white/50 mb-0.5">Poids</p>
                    <p className="font-montserrat text-sm font-bold text-white">{identity.weight} kg</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
