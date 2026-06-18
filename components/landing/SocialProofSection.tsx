import Image from 'next/image'
import Link from 'next/link'
import type { ProfileCard } from '@/app/page'

interface Props {
  profiles: ProfileCard[]
}

export default function SocialProofSection({ profiles }: Props) {
  const placeholders = Math.max(0, 6 - profiles.length)

  return (
    <section id="profiles" className="px-margin-mobile md:px-margin-desktop py-16">
      <div className="max-w-container-max mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
          <div className="text-center md:text-left">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-8 bg-tertiary-container hidden md:block" />
              <h2 className="font-montserrat text-headline-md font-bold text-primary uppercase">
                Ils ont déjà leur IpponId
              </h2>
            </div>
            <p className="text-on-surface-variant text-body-lg">Rejoins la première communauté de profils judo.</p>
          </div>
          <div className="flex -space-x-3 flex-shrink-0">
            {profiles.slice(0, 3).map((p) => (
              <div key={p.slug} className="w-12 h-12 rounded-full border-2 border-white bg-primary-container overflow-hidden flex items-center justify-center">
                {p.profile_photo_url ? (
                  <Image src={p.profile_photo_url} alt={`${p.first_name} ${p.last_name}`} width={48} height={48} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-montserrat font-black text-on-primary text-xs uppercase">
                    {(p.first_name?.[0] ?? '') + (p.last_name?.[0] ?? '')}
                  </span>
                )}
              </div>
            ))}
            <div className="w-12 h-12 rounded-full border-2 border-white bg-primary text-on-primary flex items-center justify-center text-xs font-bold">
              +450
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {profiles.map((p) => (
            <Link
              key={p.slug}
              href={`/${p.slug}`}
              className="group relative aspect-square bg-primary-container rounded-xl border border-outline-variant overflow-hidden hover:border-primary transition-colors"
              aria-label={`Voir le profil de ${p.first_name} ${p.last_name}`}
            >
              {p.profile_photo_url ? (
                <Image
                  src={p.profile_photo_url}
                  alt={`${p.first_name} ${p.last_name}`}
                  fill
                  className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="font-montserrat font-black text-on-primary text-3xl uppercase">
                    {(p.first_name?.[0] ?? '') + (p.last_name?.[0] ?? '')}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                <span className="font-montserrat text-on-primary text-xs font-bold leading-tight">
                  {p.first_name} {p.last_name}
                </span>
              </div>
            </Link>
          ))}
          {Array.from({ length: placeholders }, (_, i) => (
            <div key={i} className="aspect-square bg-surface-container rounded-xl border border-outline-variant" />
          ))}
        </div>

        <p className="text-center text-on-surface-variant text-sm mt-6 italic">
          « Enfin un outil qui comprend la réalité de notre discipline. »
        </p>
      </div>
    </section>
  )
}
