import type { PalmaresEntry, MedalType } from '@/types/judoka'
import { computeAgeCategory } from '@/lib/ageCategory'
import PodiumPhotoButton from '@/components/blocks/PodiumPhotoButton'

interface PalmaresBlockProps {
  palmares: PalmaresEntry[]
  birthDate: string | undefined
}

const MEDAL_STYLES: Record<NonNullable<MedalType>, { border: string; dot: string; label: string; rank: string }> = {
  gold:   { border: '#FFD700', dot: '#cba72f', label: 'Or',     rank: '1' },
  silver: { border: '#C0C0C0', dot: '#767683', label: 'Argent', rank: '2' },
  bronze: { border: '#CD7F32', dot: '#8d6e63', label: 'Bronze', rank: '3' },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getSeasonStartYear(dateStr: string): number {
  const d = new Date(dateStr)
  return d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1
}

function getSeasonLabel(startYear: number): string {
  return `${startYear}/${startYear + 1}`
}

export default function PalmaresBlock({ palmares, birthDate }: PalmaresBlockProps) {
  const bySeason = palmares.reduce<Record<number, PalmaresEntry[]>>((acc, entry) => {
    const startYear = getSeasonStartYear(entry.date)
    if (!acc[startYear]) acc[startYear] = []
    acc[startYear].push(entry)
    return acc
  }, {})

  const seasons = Object.keys(bySeason)
    .map(Number)
    .sort((a, b) => b - a)

  return (
    <section className="py-10 md:py-14 bg-surface-container-low">
      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
          <h2 className="font-montserrat text-headline-md font-bold text-primary uppercase tracking-tight">
            Mon Palmarès
          </h2>
        </div>

        <div className="space-y-12">
          {seasons.map((startYear, seasonIdx) => (
            <div key={startYear} className="flex gap-6 relative">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="h-9 md:h-12 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-primary bg-background z-10 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                </div>
                {seasonIdx < seasons.length - 1 && (
                  <div className="flex-1 w-px bg-primary/20 mt-1 min-h-[2rem]" />
                )}
              </div>

              <div className="flex-1 pb-4">
                <span className="font-montserrat text-3xl md:text-5xl font-black text-primary-container block mb-6">
                  {getSeasonLabel(startYear)}
                </span>
                <div className="grid grid-cols-1 gap-3">
                  {bySeason[startYear].map((entry, i) => {
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
                              {formatDate(entry.date)} · {entry.level}{entry.city ? ` · ${entry.city}` : ''}
                            </p>
                            <h3 className="font-inter text-base font-bold text-primary leading-snug">
                              {entry.result} — {entry.competition}
                            </h3>
                            <p className="font-inter text-sm text-on-surface-variant mt-1 flex items-center gap-2 flex-wrap">
                              {entry.category}
                              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
                                {computeAgeCategory(birthDate, entry.date)}
                              </span>
                            </p>
                          </div>
                          <div className="flex flex-col items-center gap-2 flex-shrink-0">
                            {entry.podiumPhoto && (
                              <PodiumPhotoButton
                                photo={entry.podiumPhoto}
                                alt={`Photo du podium — ${entry.competition} ${entry.result}`}
                              />
                            )}
                            {medal && (
                              <svg
                                width="32"
                                height="40"
                                viewBox="0 0 32 40"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                aria-label={`Médaille ${medal.label}`}
                                role="img"
                                className="flex-shrink-0"
                              >
                                {/* Ruban gauche */}
                                <rect x="10" y="0" width="5" height="16" rx="1.5" fill={medal.border} opacity="0.85" transform="rotate(-10 10 0)" />
                                {/* Ruban droit */}
                                <rect x="17" y="0" width="5" height="16" rx="1.5" fill={medal.dot} opacity="0.85" transform="rotate(10 17 0)" />
                                {/* Disque */}
                                <circle cx="16" cy="28" r="11" fill={medal.dot} />
                                <circle cx="16" cy="28" r="9" fill={medal.border} opacity="0.4" />
                                <circle cx="16" cy="28" r="7" fill={medal.dot} />
                                <text x="16" y="32.5" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">{medal.rank}</text>
                              </svg>
                            )}
                          </div>
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
