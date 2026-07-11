const JUDOKA_STEPS = [
  {
    step: '1',
    title: 'Crée ton compte judoka',
    body: 'Connecte-toi avec Google et choisis le type "Je suis judoka".',
  },
  {
    step: '2',
    title: 'Remplis ton profil',
    body: 'Ajoute ton grade, ton club, ton palmarès et tes vidéos en quelques minutes.',
  },
  {
    step: '3',
    title: 'Partage ton URL',
    body: 'Envoie ton lien à tes partenaires, sponsors ou intègre-le dans ta bio.',
  },
]

const PARENT_STEPS = [
  {
    step: '1',
    title: 'Crée ton compte parent',
    body: 'Connecte-toi avec Google et choisis "Je gère les profils de mes enfants".',
  },
  {
    step: '2',
    title: 'Crée le profil de ton enfant',
    body: 'Renseigne son prénom, son club, ses grades et ses résultats de compétition.',
  },
  {
    step: '3',
    title: 'Partage sa page',
    body: 'Envoie le lien à sa famille, à son coach ou télécharge son QR code.',
  },
]

function Journey({
  title,
  emoji,
  steps,
}: {
  title: string
  emoji: string
  steps: { step: string; title: string; body: string }[]
}) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-8">
      <h3 className="font-montserrat font-bold text-primary text-lg mb-6 flex items-center gap-2">
        <span role="img" aria-hidden>{emoji}</span>
        {title}
      </h3>
      <ol className="space-y-5">
        {steps.map(({ step, title: stepTitle, body }) => (
          <li key={step} className="flex gap-4">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-on-primary text-xs font-bold flex items-center justify-center mt-0.5">
              {step}
            </span>
            <div>
              <p className="font-semibold text-on-surface mb-0.5">{stepTitle}</p>
              <p className="text-sm text-on-surface-variant">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

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
          <p className="text-on-surface-variant text-body-lg">Deux parcours, une même simplicité.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Journey title="Tu es judoka" emoji="🥋" steps={JUDOKA_STEPS} />
          <Journey title="Tu es parent" emoji="👨‍👧" steps={PARENT_STEPS} />
        </div>
      </div>
    </section>
  )
}
