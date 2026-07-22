'use client'

import type { Identity, Social } from '@/types/judoka'
import LogoLink from '@/components/layout/LogoLink'
import NavUserAvatar from '@/components/NavUserAvatar'
import { useActiveSection } from '@/components/hooks/useActiveSection'

interface HeaderProps {
  identity: Identity
  social: Social
  isLoggedIn: boolean
}

const NAV_ITEMS = [
  { href: '#bio',      label: 'Profil' },
  { href: '#palmares', label: 'Palmarès' },
  { href: '#videos',   label: 'Vidéos' },
  { href: '#gallery',  label: 'Galerie' },
]

const SECTION_IDS = NAV_ITEMS.map((item) => item.href.slice(1))

export default function Header({ isLoggedIn }: HeaderProps) {
  const activeId = useActiveSection(SECTION_IDS)

  return (
    <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur-sm border-b border-outline-variant">
      <div className="flex justify-between items-center px-margin-mobile md:px-margin-desktop h-16 max-w-container-max mx-auto">
        <LogoLink />

        <nav className="hidden md:flex gap-8 items-center" aria-label="Navigation principale">
          {NAV_ITEMS.map(({ href, label }) => {
            const isActive = activeId === href.slice(1)
            return (
              <a
                key={href}
                href={href}
                className={`relative font-inter text-sm font-medium transition-colors pb-0.5 after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-0.5 after:bg-[#D4A017] after:transition-[width] after:duration-300 ${
                  isActive
                    ? 'text-[#D4A017] after:w-full'
                    : 'text-on-surface-variant hover:text-primary after:w-0 hover:after:w-full'
                }`}
              >
                {label}
              </a>
            )
          })}
        </nav>

        <div className="flex items-center gap-4">
          <NavUserAvatar initialIsLoggedIn={isLoggedIn} />
        </div>
      </div>
    </header>
  )
}
