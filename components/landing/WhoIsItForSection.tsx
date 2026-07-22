const PERSONAS = [
  {
    emoji: '👨‍👧',
    title: 'Tu es parent',
    body: 'Ton enfant commence le judo et tu veux garder une trace de son parcours, de ses premières compétitions, de ses grades. IpponId te permet de créer et gérer son profil à sa place.',
  },
  {
    emoji: '🥋',
    title: 'Tu es judoka compétiteur',
    body: 'Tu accumules les médailles et tu veux partager ton palmarès avec tes partenaires, sponsors ou clubs. Une URL, tout ton parcours.',
  },
  {
    emoji: '🥋👨‍👧',
    title: 'Tu es les deux',
    body: 'Tu pratiques le judo et tu as des enfants judokas. IpponId gère les deux : ton profil et les leurs, dans le même espace.',
  },
]

export default function WhoIsItForSection() {
  return (
    <section id="cest-pour-qui" className="scroll-mt-24 px-margin-mobile md:px-margin-desktop py-12">
      <div className="max-w-container-max mx-auto">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-1 h-8 bg-tertiary-container hidden md:block" />
            <h2 className="font-montserrat text-headline-md font-bold text-primary uppercase">
              IpponId, c&apos;est pour qui&nbsp;?
            </h2>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PERSONAS.map(({ emoji, title, body }) => (
            <div
              key={title}
              className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-8"
            >
              <h3 className="font-montserrat font-bold text-primary text-lg mb-3 flex items-center gap-2">
                <span role="img" aria-hidden>{emoji}</span>
                {title}
              </h3>
              <p className="text-on-surface-variant leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
