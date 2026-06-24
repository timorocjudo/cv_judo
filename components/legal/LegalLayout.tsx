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
            Ippon<span className="text-tertiary-container">Id</span>
          </Link>
          <Link
            href="/"
            className="font-inter text-sm text-on-surface-variant hover:text-primary transition-colors"
          >
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-[70ch] mx-auto px-margin-mobile md:px-margin-desktop py-12">
        <header className="mb-10">
          <h1 className="font-montserrat text-headline-md font-bold text-primary mb-2">
            {title}
          </h1>
          <p className="font-inter text-sm text-on-surface-variant">
            Dernière mise à jour : {lastUpdated}
          </p>
        </header>
        <div className="space-y-10 font-inter text-on-surface leading-relaxed text-justify">
          {children}
        </div>
      </main>
    </div>
  )
}
