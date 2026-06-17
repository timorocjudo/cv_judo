export default function SocialProofSection() {
  return (
    <section id="profiles" className="px-margin-mobile md:px-margin-desktop py-16">
      <div className="max-w-container-max mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
          <div className="text-center md:text-left">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-8 bg-tertiary-container hidden md:block" />
              <h2 className="font-montserrat text-headline-md font-bold text-primary uppercase">
                Ils ont déjà leur IpponId
              </h2>
            </div>
            <p className="text-on-surface-variant text-body-lg">Rejoins la première communauté de profils judo.</p>
          </div>
          <div className="flex -space-x-3 flex-shrink-0">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-12 h-12 rounded-full border-2 border-white bg-surface-container" />
            ))}
            <div className="w-12 h-12 rounded-full border-2 border-white bg-primary text-on-primary flex items-center justify-center text-xs font-bold">
              +450
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="aspect-square bg-surface-container rounded-xl border border-outline-variant"
              aria-label="Profil judoka"
            />
          ))}
        </div>

        <p className="text-center text-on-surface-variant text-sm mt-6 italic">
          « Enfin un outil qui comprend la réalité de notre discipline. »
        </p>
      </div>
    </section>
  )
}
