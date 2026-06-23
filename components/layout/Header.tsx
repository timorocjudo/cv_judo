import type { Identity, Social } from '@/types/judoka'
import LogoLink from '@/components/layout/LogoLink'
import NavUserAvatar from '@/components/NavUserAvatar'

interface HeaderProps {
  identity: Identity
  social: Social
  isLoggedIn: boolean
}

export default function Header({ isLoggedIn }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur-sm border-b border-outline-variant">
      <div className="flex justify-between items-center px-margin-mobile md:px-margin-desktop h-16 max-w-container-max mx-auto">
        <LogoLink />

        <nav className="hidden md:flex gap-8 items-center" aria-label="Navigation principale">
          {[
            { href: '#bio',      label: 'Profil' },
            { href: '#palmares', label: 'Palmarès' },
            { href: '#videos',   label: 'Vidéos' },
            { href: '#gallery',  label: 'Galerie' },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="relative font-inter text-sm font-medium text-on-surface-variant hover:text-primary transition-colors pb-0.5 after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-tertiary-container after:transition-[width] after:duration-300 hover:after:w-full"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <NavUserAvatar initialIsLoggedIn={isLoggedIn} />
        </div>
      </div>
    </header>
  )
}
