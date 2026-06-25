'use client'

import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
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

interface SeasonGroupProps {
  startYear: number
  entries: PalmaresEntry[]
  birthDate: string | undefined
  slug: string
}

function SeasonGroup({ startYear, entries, birthDate, slug }: SeasonGroupProps) {
  return (
    <div>
      {/* Season header */}
      <div className="flex items-center gap-4 mb-5">
        <span className="font-montserrat text-3xl md:text-5xl font-black text-primary-container flex-shrink-0">
          {getSeasonLabel(startYear)}
        </span>
        <div className="flex-1 h-px bg-primary/20" />
      </div>

      <div className="grid grid-cols-1 gap-3">
        {entries.map((entry, i) => {
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
                  <p className="font-inter text-xs uppercase tracking-widest text-on-surface-variant mb-1 leading-snug">
                    {formatDate(entry.date)} · {entry.level}{entry.city ? ` · ${entry.city}` : ''}
                  </p>
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
                  <h3 className="font-inter text-base font-semibold text-primary leading-snug mb-3">
                    {entry.competition}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
                      {entry.category}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
                      {computeAgeCategory(birthDate, entry.date)}
                    </span>
                  </div>
                </div>

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
  )
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

  const shouldReduceMotion = useReducedMotion()
  const [expanded, setExpanded] = useState(false)

  function handleReduce() {
    const target = document.getElementById('palmares')
    if (!target) { setExpanded(false); return }

    if (shouldReduceMotion) {
      target.scrollIntoView()
      setExpanded(false)
      return
    }

    target.scrollIntoView({ behavior: 'smooth' })

    let scrollEndTimer: ReturnType<typeof setTimeout>
    let scrollStarted = false

    function collapse() {
      window.removeEventListener('scroll', onScroll)
      setExpanded(false)
    }

    function onScroll() {
      scrollStarted = true
      clearTimeout(scrollEndTimer)
      scrollEndTimer = setTimeout(collapse, 150)
    }

    window.addEventListener('scroll', onScroll, { passive: true })

    // Si l'élément est déjà dans le viewport, aucun scroll ne se déclenche
    setTimeout(() => { if (!scrollStarted) collapse() }, 100)
  }

  const currentSeason = seasons[0]
  const previousSeasons = seasons.slice(1)
  const hiddenCount = previousSeasons.reduce((sum, s) => sum + bySeason[s].length, 0)
  const hasPreviousSeasons = previousSeasons.length > 0

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
          <>
            <PalmaresStatsCounter
              totalCompetitions={stats.totalCompetitions}
              totalPodiums={stats.totalPodiums}
            />
            {!expanded && hasPreviousSeasons && (
              <p className="font-inter text-xs text-on-surface-variant mb-8 -mt-6">
                sur {seasons.length} saisons
              </p>
            )}
          </>
        )}

        <div className="space-y-10">
          {/* Saison courante — toujours affichée */}
          {currentSeason !== undefined && (
            <SeasonGroup
              startYear={currentSeason}
              entries={bySeason[currentSeason]}
              birthDate={birthDate}
              slug={slug}
            />
          )}

          {/* Bouton dépliage — uniquement s'il y a des saisons précédentes et qu'elles sont repliées */}
          {hasPreviousSeasons && !expanded && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors"
              >
                Voir les saisons précédentes ({hiddenCount} résultat{hiddenCount > 1 ? 's' : ''})
                <svg
                  className="w-4 h-4 transition-transform duration-200"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
          )}

          {/* Saisons précédentes — visibles uniquement si expanded */}
          <AnimatePresence>
            {expanded && previousSeasons.map((startYear, i) => (
              <motion.div
                key={startYear}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
                transition={{ duration: 0.25, ease: 'easeOut', delay: i * 0.07 }}
              >
                <SeasonGroup
                  startYear={startYear}
                  entries={bySeason[startYear]}
                  birthDate={birthDate}
                  slug={slug}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Bouton repliage — en bas des saisons, uniquement si expanded */}
          {hasPreviousSeasons && expanded && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleReduce}
                className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors"
              >
                Réduire
                <svg
                  className="w-4 h-4 rotate-180 transition-transform duration-200"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
