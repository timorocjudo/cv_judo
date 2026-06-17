import Image from 'next/image'
import type { Identity } from '@/types/judoka'
import { computeAgeCategory } from '@/lib/ageCategory'

interface HeroBlockProps {
  identity: Identity
}

export default function HeroBlock({ identity }: HeroBlockProps) {
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
