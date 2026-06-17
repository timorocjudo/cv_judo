import Link from 'next/link'
import type { Identity, Social } from '@/types/judoka'
import LoginButton from '@/components/auth/LoginButton'

interface HeaderProps {
  identity: Identity
  social: Social
  isLoggedIn: boolean
}

export default function Header({ identity, isLoggedIn }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur-sm border-b border-outline-variant">
      <div className="flex justify-between items-center px-margin-mobile md:px-margin-desktop h-16 max-w-container-max mx-auto">
        <Link
          href="/"
          className="font-montserrat text-xl font-black text-primary tracking-tighter"
        >
          IpponId
        </Link>

        <nav className="hidden md:flex gap-8 items-center" aria-label="Navigation principale">
          <a href="#bio" className="font-inter text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">
            Profil
          </a>
          <a href="#palmares" className="font-inter text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">
            Palmarès
          </a>
          <a href="#videos" className="font-inter text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">
            Highlights
          </a>
          <a href="#gallery" className="font-inter text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">
            Galerie
          </a>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <span className="font-inter text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            {identity.firstName} {identity.lastName}
          </span>
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="font-inter text-xs font-bold uppercase tracking-widest text-primary hover:text-primary-container transition-colors"
            >
              Tableau de bord
            </Link>
          ) : (
            <LoginButton />
          )}
        </div>
      </div>
    </header>
  )
}
