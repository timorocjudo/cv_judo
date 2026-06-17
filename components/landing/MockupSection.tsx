import Image from 'next/image'
import Link from 'next/link'

const STATS = [
  { value: '14', label: "Médailles d'or" },
  { value: '28', label: 'Podiums nationaux' },
  { value: '-81kg', label: 'Catégorie' },
  { value: '15', label: 'Âge' },
]

const PALMARES_PREVIEW = [
  { competition: 'Championnat de France Individuel', result: 'Champion de France', accent: 'border-secondary', badge: 'bg-secondary/10 text-secondary' },
  { competition: 'Championnat de France Cadet Espoir', result: 'Médaille de bronze', accent: 'border-primary-container', badge: 'bg-primary/10 text-primary' },
]

export default function MockupSection() {
  return (
    <section className="px-margin-mobile md:px-margin-desktop py-10 max-w-container-max mx-auto">
      <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
        {/* Browser chrome */}
        <div className="bg-surface-container-high px-4 py-2 flex items-center gap-2 border-b border-outline-variant">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-300/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-300/70" />
            <div className="w-3 h-3 rounded-full bg-green-300/70" />
          </div>
          <div className="flex-1 flex justify-center">
            <span className="bg-white/60 px-6 py-1 rounded-full text-xs text-outline">
              🔒 ipponid.com/timothe-francois
            </span>
          </div>
        </div>

        {/* Profile content */}
        <div className="bg-white p-6 md:p-10">
          <div className="flex items-end gap-4 mb-6">
            <div className="w-20 h-20 md:w-28 md:h-28 rounded-xl overflow-hidden shadow-lg border-2 border-white flex-shrink-0 bg-surface-container">
              <Image
                src="/images/profile.jpg"
                alt="Timothé François"
                width={112}
                height={112}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="font-montserrat text-xl md:text-2xl font-bold text-primary">Timothé François</h2>
              <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider mt-0.5">
                Ceinture Noire · -81kg · ROC Judo
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {STATS.map(({ value, label }) => (
              <div key={label} className="bg-surface-container rounded-xl p-3 border border-outline-variant">
                <div className="font-montserrat font-bold text-xl text-primary">{value}</div>
                <div className="text-xs text-outline uppercase mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          <div className="hidden md:flex flex-col gap-2">
            {PALMARES_PREVIEW.map(({ competition, result, accent, badge }) => (
              <div key={competition} className={`bg-surface-container-low rounded-lg p-3 flex justify-between items-center border-l-4 ${accent}`}>
                <span className="font-semibold text-primary text-sm">{competition}</span>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${badge}`}>{result}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="text-center mt-4">
        <Link href="/timothe-francois" className="text-primary font-semibold text-sm hover:underline">
          Voir le profil complet de Timothé →
        </Link>
      </div>
    </section>
  )
}
