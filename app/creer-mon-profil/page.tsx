import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Bientôt disponible — IpponId',
}

export default function CreerMonProfilPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-margin-mobile text-center">
      <span className="text-5xl mb-6" role="img" aria-label="Bientôt">🥋</span>
      <h1 className="font-montserrat text-headline-md font-bold text-primary mb-4">
        Bientôt disponible
      </h1>
      <p className="text-on-surface-variant text-body-lg mb-8 max-w-md">
        La création de profil arrive prochainement. Revenez nous voir très bientôt !
      </p>
      <Link
        href="/"
        className="bg-primary text-on-primary px-8 py-3 rounded-lg font-semibold hover:bg-primary-container transition-colors"
      >
        Retour à l&apos;accueil
      </Link>
    </main>
  )
}
