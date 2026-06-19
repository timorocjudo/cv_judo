import Link from 'next/link'
import SearchAutocomplete from '@/components/SearchAutocomplete'

export default function CtaSection() {
  return (
    <section className="px-margin-mobile md:px-margin-desktop pb-16">
      <div className="max-w-container-max mx-auto">
        <div className="bg-primary rounded-3xl p-10 md:p-16 text-center relative">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 via-transparent to-primary-container/40 pointer-events-none" />
          <div className="relative z-10">
            <h2 className="font-montserrat text-headline-md font-bold text-on-primary mb-4">
              Prêt à créer ta vitrine ?
            </h2>
            <p className="text-on-primary/80 text-body-lg mb-8 max-w-xl mx-auto">
              Rejoins les judokas qui font passer leur carrière au niveau supérieur.
            </p>

            <SearchAutocomplete
              className="max-w-xl mx-auto mb-6"
              placeholder="Vérifie si ton profil existe déjà…"
            />

            <p className="text-on-primary/60 text-sm">
              Tu n&apos;as pas encore de profil ?{' '}
              <Link
                href="/creer-mon-profil"
                className="text-on-primary font-semibold underline underline-offset-2 hover:text-tertiary-container transition-colors"
              >
                Crée-le gratuitement →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
