'use client'
import Link from 'next/link'
import NavUserAvatar from '@/components/NavUserAvatar'
import { useActiveSection } from '@/components/hooks/useActiveSection'

interface LandingNavProps {
  isLoggedIn: boolean
}

const NAV_LINKS = [
  { href: '#rechercher', label: 'Rechercher' },
  { href: '#exemples', label: 'Exemples' },
  { href: '#cest-pour-qui', label: "C'est pour qui" },
  { href: '#how-it-works', label: 'Comment ça marche' },
]

const SECTION_IDS = NAV_LINKS.map((link) => link.href.slice(1))

export default function LandingNav({ isLoggedIn }: LandingNavProps) {
  const activeId = useActiveSection(SECTION_IDS)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-md shadow-sm">
      <nav className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop h-20 max-w-container-max mx-auto">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="font-montserrat text-2xl font-black text-primary tracking-tight"
          aria-label="Retour en haut de page"
        >
          Ippon<span className="text-tertiary-container">Id</span>
        </button>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = activeId === href.slice(1)
            return (
              <a
                key={href}
                href={href}
                className={`relative text-sm font-semibold pb-0.5 transition-colors after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-0.5 after:bg-[#D4A017] after:transition-[width] after:duration-300 ${
                  isActive
                    ? 'text-[#D4A017] after:w-full'
                    : 'text-on-surface-variant hover:text-secondary after:w-0 hover:after:w-full'
                }`}
              >
                {label}
              </a>
            )
          })}
          <Link
            href="/creer-mon-profil"
            className="bg-[#D4A017] text-[#1B3A6B] font-bold text-sm px-5 py-2 rounded-lg hover:shadow-md transition-all"
          >
            Créer mon profil
          </Link>
          <NavUserAvatar initialIsLoggedIn={isLoggedIn} />
        </div>

        {/* Mobile: login/avatar only, no burger — shortcuts already live in the sticky bottom nav */}
        <div className="md:hidden">
          <NavUserAvatar initialIsLoggedIn={isLoggedIn} hideLoginOnMobile={false} />
        </div>
      </nav>
    </header>
  )
}
