'use client'
import NavUserAvatar from '@/components/NavUserAvatar'

interface LandingNavProps {
  isLoggedIn: boolean
}

export default function LandingNav({ isLoggedIn }: LandingNavProps) {
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
          <a href="#how-it-works" className="text-on-surface-variant text-sm font-semibold hover:text-secondary transition-colors">
            Comment ça marche
          </a>
          <a href="#profiles" className="text-on-surface-variant text-sm font-semibold hover:text-secondary transition-colors">
            Exemples de profils
          </a>
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
