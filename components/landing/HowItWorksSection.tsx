const STEPS = [
  {
    title: '1. Crée ton profil',
    body: 'Choisis ton URL personnalisée et remplis tes informations de base en quelques clics.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
  {
    title: '2. Ajoute ton palmarès',
    body: 'Intègre tes médailles, tes grades et tes vidéos de combats pour prouver ton talent.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    title: '3. Partage ton URL',
    body: 'Envoie ton lien à tes partenaires, sponsors ou intègre-le dans ta bio Instagram.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
    ),
  },
]

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="px-margin-mobile md:px-margin-desktop py-16 bg-surface-container">
      <div className="max-w-container-max mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-1 h-8 bg-tertiary-container hidden md:block" />
            <h2 className="font-montserrat text-headline-md font-bold text-primary uppercase">
              Comment ça marche ?
            </h2>
          </div>
          <p className="text-on-surface-variant text-body-lg">En trois étapes, tu es prêt à briller.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map(({ title, body, icon }) => (
            <div key={title} className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-5 group-hover:scale-110 transition-transform">
                {icon}
              </div>
              <h3 className="font-montserrat text-lg font-bold text-primary mb-2">{title}</h3>
              <p className="text-on-surface-variant">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
