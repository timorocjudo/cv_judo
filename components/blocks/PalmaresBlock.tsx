import type { PalmaresEntry, MedalType } from '@/types/judoka'
import { computeAgeCategory } from '@/lib/ageCategory'
import { computePalmaresStats } from '@/lib/palmaresStats'
import PodiumPhotoButton from '@/components/blocks/PodiumPhotoButton'
import PalmaresShareButton from '@/components/blocks/PalmaresShareButton'
import PalmaresStatsCounter from '@/components/blocks/PalmaresStatsCounter'

interface PalmaresBlockProps {
  palmares: PalmaresEntry[]
  birthDate: string | undefined
  slug: string
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

export default function PalmaresBlock({ palmares, birthDate, slug }: PalmaresBlockProps) {
  const bySeason = palmares.reduce<Record<number, PalmaresEntry[]>>((acc, entry) => {
    const startYear = getSeasonStartYear(entry.date)
    if (!acc[startYear]) acc[startYear] = []
    acc[startYear].push(entry)
    return acc
  }, {})

  const seasons = Object.keys(bySeason)
    .map(Number)
    .sort((a, b) => b - a)

  for (const season of seasons) {
    bySeason[season].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  const stats = palmares.length >= 3 ? computePalmaresStats(palmares) : null

  return (
    <section className="py-10 md:py-14 bg-surface-container-lowest">
      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
          <h2 className="font-montserrat text-headline-md font-bold text-primary">
            Mon Palmarès
          </h2>
        </div>

        {stats && (
          <PalmaresStatsCounter
            totalCompetitions={stats.totalCompetitions}
            totalPodiums={stats.totalPodiums}
          />
        )}

        <div className="space-y-10">
          {seasons.map((startYear) => (
            <div key={startYear}>
              {/* Season header */}
              <div className="flex items-center gap-4 mb-5">
                <span className="font-montserrat text-3xl md:text-5xl font-black text-primary-container flex-shrink-0">
                  {getSeasonLabel(startYear)}
                </span>
                <div className="flex-1 h-px bg-primary/20" />
              </div>

              <div className="grid grid-cols-1 gap-3">
                {bySeason[startYear].map((entry, i) => {
                  const medal = entry.medal ? MEDAL_STYLES[entry.medal] : null
                  return (
                    <article
                      key={i}
                      id={entry.id ? `result-${entry.id}` : undefined}
                      className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden"
                      style={{ borderLeft: `4px solid ${medal?.border ?? '#c6c5d4'}` }}
                    >
                      <div className="px-4 py-5 flex justify-between items-start gap-3">
                        <div className="min-w-0 flex-1">
                          {/* Ligne 1: date · niveau · lieu */}
                          <p className="font-inter text-xs uppercase tracking-widest text-on-surface-variant mb-1 leading-snug">
                            {formatDate(entry.date)} · {entry.level}{entry.city ? ` · ${entry.city}` : ''}
                          </p>
                          {/* Ligne 2: rang uniquement, large, bold, couleur accent ou discret */}
                          {medal ? (
                            <p
                              className="font-montserrat text-xl font-black leading-tight mb-1"
                              style={{ color: medal.dot }}
                            >
                              {entry.result}
                            </p>
                          ) : (
                            <p className="font-inter text-sm font-semibold text-on-surface-variant leading-tight mb-1">
                              {entry.result}
                            </p>
                          )}
                          {/* Ligne 3: nom de la compétition seul */}
                          <h3 className="font-inter text-base font-semibold text-primary leading-snug mb-3">
                            {entry.competition}
                          </h3>
                          {/* Ligne 4: badge poids + badge catégorie côte à côte */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
                              {entry.category}
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
                              {computeAgeCategory(birthDate, entry.date)}
                            </span>
                          </div>
                        </div>

                        {/* Colonne droite: partage + médaille */}
                        <div className="flex flex-col items-center gap-2 flex-shrink-0">
                          {entry.id && process.env.NEXT_PUBLIC_SITE_URL && (
                            <PalmaresShareButton slug={slug} resultId={entry.id} />
                          )}
                          {entry.podiumPhoto && (
                            <PodiumPhotoButton
                              photo={entry.podiumPhoto}
                              alt={`Photo du podium — ${entry.competition} ${entry.result}`}
                            />
                          )}
                          {medal && (
                            <div
                              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 font-montserrat text-base font-black text-white shadow-md"
                              style={{
                                background: `radial-gradient(circle at 35% 35%, ${medal.border}, ${medal.dot})`,
                              }}
                              aria-label={`Médaille ${medal.label}`}
                              role="img"
                            >
                              {medal.rank}
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
