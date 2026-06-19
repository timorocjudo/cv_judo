import Link from 'next/link'

export default function CtaSection() {
  return (
    <section className="px-margin-mobile md:px-margin-desktop pb-16">
      <div className="max-w-container-max mx-auto">
        <div className="bg-primary rounded-3xl p-10 md:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 via-transparent to-primary-container/40 pointer-events-none" />
          <div className="relative z-10">
            <h2 className="font-montserrat text-headline-md font-bold text-on-primary mb-4">
              Prêt à créer ta vitrine ?
            </h2>
            <p className="text-on-primary/80 text-body-lg mb-10 max-w-xl mx-auto">
              Rejoins les judokas qui font passer leur carrière au niveau supérieur.
            </p>
            <Link
              href="/creer-mon-profil"
              className="inline-block bg-secondary text-on-secondary px-10 py-4 rounded-lg font-semibold text-lg hover:bg-secondary-container transition-colors active:scale-95"
            >
              Créer mon profil gratuitement
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
