import Link from 'next/link'
import type { Identity, Social } from '@/types/judoka'

interface HeaderProps {
  identity: Identity
  social: Social
}

export default function Header({ identity }: HeaderProps) {
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
          <a
            href="#bio"
            className="font-inter text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
          >
            Profil
          </a>
          <a
            href="#palmares"
            className="font-inter text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
          >
            Palmarès
          </a>
          <a
            href="#videos"
            className="font-inter text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
          >
            Highlights
          </a>
          <a
            href="#gallery"
            className="font-inter text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
          >
            Galerie
          </a>
        </nav>

        <span className="font-inter text-xs font-bold uppercase tracking-widest text-on-surface-variant hidden md:block">
          {identity.firstName} {identity.lastName}
        </span>
      </div>
    </header>
  )
}
