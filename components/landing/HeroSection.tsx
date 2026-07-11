import Link from 'next/link'
import SearchWithAdvancedLink from '@/components/landing/SearchWithAdvancedLink'

const PATHS = [
  {
    label: 'Je veux créer le profil de mon enfant',
    href: '/creer-mon-profil?type=manager',
    icon: '👨‍👧',
  },
  {
    label: "J'ai mon propre palmarès à partager",
    href: '/creer-mon-profil?type=judoka',
    icon: '🥋',
  },
  {
    label: "Je suis judoka et parent d'un judoka",
    href: '/creer-mon-profil?type=parent_judoka',
    icon: '🥋👨‍👧',
  },
]

export default function HeroSection() {
  return (
    <section className="relative px-margin-mobile md:px-margin-desktop pt-16 pb-10 text-center">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <h2 className="font-montserrat text-headline-lg-mobile md:text-headline-lg font-black text-primary mb-6 leading-tight">
          Le CV en ligne des judokas
        </h2>
        <p className="text-body-lg text-on-surface-variant mb-8 max-w-2xl mx-auto">
          Crée ta page gratuitement. Partage ton parcours, tes grades et tes victoires avec ton URL personnalisée.
        </p>

        {/* 3 chemins d'entrée */}
        <div className="grid sm:grid-cols-3 gap-3 mb-10 max-w-2xl mx-auto">
          {PATHS.map(({ label, href, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-outline-variant bg-surface-container-lowest hover:border-primary hover:shadow-md transition-all group"
            >
              <span className="text-2xl" role="img" aria-hidden>{icon}</span>
              <span className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors leading-snug">
                {label}
              </span>
            </Link>
          ))}
        </div>

        {/* Moteur de recherche — conservé */}
        <p className="text-xs text-on-surface-variant mb-4 uppercase tracking-wide font-semibold">
          Ou recherche un judoka
        </p>
        <SearchWithAdvancedLink />
      </div>
    </section>
  )
}
