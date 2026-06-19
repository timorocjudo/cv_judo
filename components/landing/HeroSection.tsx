import SearchAutocomplete from '@/components/SearchAutocomplete'

export default function HeroSection() {
  return (
    <section className="relative px-margin-mobile md:px-margin-desktop pt-16 pb-10 text-center">
      {/* Décorations de fond — overflow-hidden scoped au conteneur des blobs pour ne pas rogner le dropdown */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <h1 className="font-montserrat text-headline-lg-mobile md:text-headline-lg font-black text-primary mb-6 leading-tight">
          Ton palmarès judo mérite<br className="hidden md:block" /> sa propre page
        </h1>
        <p className="text-body-lg text-on-surface-variant mb-10 max-w-2xl mx-auto">
          Crée ta page CV de judoka gratuitement. Partage ton parcours, tes grades et tes victoires avec ton URL personnalisée.
        </p>

        <SearchAutocomplete className="max-w-2xl mx-auto" />
      </div>
    </section>
  )
}
