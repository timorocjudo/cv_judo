import type { PalmaresEntry, MedalType } from '@/types/judoka'

interface PalmaresBlockProps {
  palmares: PalmaresEntry[]
}

const MEDAL_STYLES: Record<NonNullable<MedalType>, { border: string; dot: string; label: string }> = {
  gold:   { border: '#FFD700', dot: '#cba72f', label: 'Or' },
  silver: { border: '#C0C0C0', dot: '#767683', label: 'Argent' },
  bronze: { border: '#CD7F32', dot: '#8d6e63', label: 'Bronze' },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function PalmaresBlock({ palmares }: PalmaresBlockProps) {
  const byYear = palmares.reduce<Record<number, PalmaresEntry[]>>((acc, entry) => {
    const year = new Date(entry.date).getFullYear()
    if (!acc[year]) acc[year] = []
    acc[year].push(entry)
    return acc
  }, {})

  const years = Object.keys(byYear)
    .map(Number)
    .sort((a, b) => b - a)

  return (
    <section className="py-16 md:py-24 bg-surface-container-low">
      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
          <h2 className="font-montserrat text-headline-md font-bold text-primary uppercase tracking-tight">
            Mon Palmarès
          </h2>
        </div>

        <div className="space-y-12">
          {years.map((year, yearIdx) => (
            <div key={year} className="flex gap-6 relative">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-6 h-6 rounded-full border-2 border-primary bg-background z-10 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                {yearIdx < years.length - 1 && (
                  <div className="flex-1 w-px bg-primary/20 mt-1 min-h-[2rem]" />
                )}
              </div>

              <div className="flex-1 pb-4">
                <span className="font-montserrat text-5xl font-black text-primary-container block mb-6">
                  {year}
                </span>
                <div className="grid grid-cols-1 gap-3">
                  {byYear[year].map((entry, i) => {
                    const medal = entry.medal ? MEDAL_STYLES[entry.medal] : null
                    return (
                      <article
                        key={i}
                        className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden"
                        style={{ borderLeft: `4px solid ${medal?.border ?? '#c6c5d4'}` }}
                      >
                        <div className="p-5 flex justify-between items-start gap-4">
                          <div className="min-w-0">
                            <p className="font-inter text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                              {formatDate(entry.date)} · {entry.level}
                            </p>
                            <h3 className="font-inter text-base font-bold text-primary leading-snug">
                              {entry.result} — {entry.competition}
                            </h3>
                            <p className="font-inter text-sm text-on-surface-variant mt-1">
                              {entry.category}
                            </p>
                          </div>
                          {medal && (
                            <div
                              className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm text-white font-bold"
                              style={{ backgroundColor: medal.dot }}
                              aria-label={`Médaille ${medal.label}`}
                              role="img"
                            >
                              ★
                            </div>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
