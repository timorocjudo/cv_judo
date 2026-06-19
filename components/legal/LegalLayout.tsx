import Link from 'next/link'

interface LegalLayoutProps {
  title: string
  lastUpdated: string
  children: React.ReactNode
}

export default function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="border-b border-outline-variant bg-surface-container-highest">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-4 flex items-center justify-between">
          <Link
            href="/"
            className="font-montserrat text-lg font-black text-primary tracking-tight"
          >
            IpponId
          </Link>
          <Link
            href="/"
            className="font-inter text-sm text-on-surface-variant hover:text-primary transition-colors"
          >
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-[70ch] mx-auto px-margin-mobile md:px-8 py-12">
        <header className="mb-10">
          <h1 className="font-montserrat text-headline-md font-bold text-primary mb-2">
            {title}
          </h1>
          <p className="font-inter text-sm text-on-surface-variant">
            Dernière mise à jour : {lastUpdated}
          </p>
        </header>
        <div className="space-y-10 font-inter text-on-surface leading-relaxed">
          {children}
        </div>
      </main>

      <footer className="border-t border-outline-variant mt-auto">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8 flex flex-wrap gap-6 justify-center">
          <Link href="/mentions-legales" className="font-inter text-xs text-on-surface-variant hover:text-primary transition-colors">
            Mentions légales
          </Link>
          <Link href="/confidentialite" className="font-inter text-xs text-on-surface-variant hover:text-primary transition-colors">
            Politique de confidentialité
          </Link>
          <Link href="/cgu" className="font-inter text-xs text-on-surface-variant hover:text-primary transition-colors">
            CGU
          </Link>
        </div>
      </footer>
    </div>
  )
}
