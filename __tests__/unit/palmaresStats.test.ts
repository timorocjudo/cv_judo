import { describe, it, expect } from 'vitest'
import { computePalmaresStats } from '@/lib/palmaresStats'
import type { PalmaresEntry } from '@/types/judoka'

function entry(medal: PalmaresEntry['medal']): PalmaresEntry {
  return {
    date: '2024-03-25',
    competition: 'Championnat test',
    result: '1ère place',
    category: '-66kg',
    level: 'Régional',
    medal,
  }
}

describe('computePalmaresStats', () => {
  it('palmarès vide → tout à zéro, pas d\'erreur', () => {
    const stats = computePalmaresStats([])
    expect(stats.totalCompetitions).toBe(0)
    expect(stats.totalPodiums).toBe(0)
    expect(stats.goldCount).toBe(0)
    expect(stats.silverCount).toBe(0)
    expect(stats.bronzeCount).toBe(0)
  })

  it('3 premières places → totalPodiums = 3', () => {
    const palmares = [entry('gold'), entry('gold'), entry('gold')]
    expect(computePalmaresStats(palmares).totalPodiums).toBe(3)
  })

  it('totalCompetitions = nombre total d\'entrées', () => {
    const palmares = [entry('gold'), entry(null), entry('bronze')]
    expect(computePalmaresStats(palmares).totalCompetitions).toBe(3)
  })

  it('comptage correct or/argent/bronze', () => {
    const palmares = [
      entry('gold'),
      entry('gold'),
      entry('silver'),
      entry('bronze'),
      entry(null),
      entry(null),
    ]
    const stats = computePalmaresStats(palmares)
    expect(stats.goldCount).toBe(2)
    expect(stats.silverCount).toBe(1)
    expect(stats.bronzeCount).toBe(1)
    expect(stats.totalPodiums).toBe(4)
    expect(stats.totalCompetitions).toBe(6)
  })

  it('entrées sans médaille (null) ne comptent pas comme podium', () => {
    const palmares = [entry(null), entry(null), entry(null)]
    expect(computePalmaresStats(palmares).totalPodiums).toBe(0)
    expect(computePalmaresStats(palmares).totalCompetitions).toBe(3)
  })
})
