import Link from 'next/link'

export default function FooterLegal() {
  return (
    <footer className="border-t border-outline-variant bg-surface py-4 pb-20 md:pb-4">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="font-inter text-xs text-on-surface-variant opacity-60">
          © {new Date().getFullYear()} IpponId — Tous droits réservés
        </p>
        <nav className="flex items-center gap-3 font-inter text-xs text-on-surface-variant opacity-60" aria-label="Liens légaux">
          <Link href="/mentions-legales" className="hover:opacity-100 hover:text-primary transition-colors">
            Mentions légales
          </Link>
          <span aria-hidden="true">|</span>
          <Link href="/confidentialite" className="hover:opacity-100 hover:text-primary transition-colors">
            Confidentialité
          </Link>
          <span aria-hidden="true">|</span>
          <Link href="/cgu" className="hover:opacity-100 hover:text-primary transition-colors">
            CGU
          </Link>
        </nav>
      </div>
    </footer>
  )
}
