import Link from 'next/link'

interface LandingFooterProps {
  hasStickyBottomNav?: boolean
}

export default function LandingFooter({ hasStickyBottomNav = false }: LandingFooterProps) {
  return (
    <footer className={`bg-surface-container-highest border-t border-outline-variant ${hasStickyBottomNav ? 'pb-16 md:pb-0' : ''}`}>
      <div className="flex flex-col md:flex-row justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-10 max-w-container-max mx-auto gap-6">
        <div className="flex flex-col items-center md:items-start gap-1">
          <span className="font-montserrat text-lg font-black text-primary tracking-tight">Ippon<span className="text-tertiary-container">Id</span></span>
          <p className="text-on-surface-variant text-xs">© 2026 IpponId. Tous droits réservés.</p>
        </div>
        <div className="flex flex-nowrap justify-center gap-2 sm:gap-4 text-on-surface-variant text-xs whitespace-nowrap">
          <Link href="/mentions-legales" className="hover:text-secondary transition-colors">
            Mentions légales
          </Link>
          <Link href="/confidentialite" className="hover:text-secondary transition-colors">
            Confidentialité
          </Link>
          <Link href="/cgu" className="hover:text-secondary transition-colors">
            CGU
          </Link>
          <a
            href="mailto:oliv.francois@gmail.com"
            className="hover:text-secondary transition-colors"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  )
}
