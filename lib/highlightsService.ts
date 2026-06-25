import type { PalmaresEntry } from '@/types/judoka'

// Level detection uses the `level` field directly.
// Keyword detection on competition title is a future improvement (not implemented in v1).
type LevelCategory = 'national-individuel' | 'national' | 'régional' | 'départemental' | 'other'

function detectLevel(level: string): LevelCategory {
  const l = level.toLowerCase()
  if (l.includes('national')) {
    return l.includes('individuel') ? 'national-individuel' : 'national'
  }
  if (l.includes('régional') || l.includes('regional') || l.includes('région') || l.includes('region')) {
    return 'régional'
  }
  if (
    l.includes('départemental') || l.includes('departemental') ||
    l.includes('département') || l.includes('departement')
  ) {
    return 'départemental'
  }
  return 'other'
}

// Lower score = higher priority.
// 1 — National Individuel + or
// 2 — National (tout type) + or
// 3 — National (tout type) + autre podium
// 4 — Régional + or
// 5 — Régional + autre podium
// 6 — Départemental + or
// 7 — tout le reste
function entryPriority(entry: PalmaresEntry): number {
  const lvl = detectLevel(entry.level)
  const isGold = entry.medal === 'gold'
  const hasPodium = entry.medal != null

  if (lvl === 'national-individuel' && isGold) return 1
  if (lvl === 'national' && isGold) return 2
  if ((lvl === 'national-individuel' || lvl === 'national') && hasPodium) return 3
  if (lvl === 'régional' && isGold) return 4
  if (lvl === 'régional' && hasPodium) return 5
  if (lvl === 'départemental' && isGold) return 6
  return 7
}

export function getBestResults(palmares: PalmaresEntry[], count = 3): PalmaresEntry[] {
  if (palmares.length === 0) return []
  return [...palmares]
    .sort((a, b) => {
      const diff = entryPriority(a) - entryPriority(b)
      if (diff !== 0) return diff
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
    .slice(0, count)
}
