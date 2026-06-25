import { describe, it, expect } from 'vitest'
import { getBestResults } from '@/lib/highlightsService'
import type { PalmaresEntry } from '@/types/judoka'

function makeEntry(overrides: Partial<PalmaresEntry> = {}): PalmaresEntry {
  return {
    date: '2024-01-01',
    competition: 'Championnat test',
    result: 'Champion',
    category: '-73kg',
    level: 'National Individuel',
    medal: 'gold',
    ...overrides,
  }
}

describe('getBestResults', () => {
  it('palmarès vide → tableau vide', () => {
    expect(getBestResults([])).toEqual([])
  })

  it('un seul résultat → retourné seul', () => {
    const entry = makeEntry({ level: 'Régional', medal: 'gold' })
    expect(getBestResults([entry])).toEqual([entry])
  })

  it('plusieurs résultats de même niveau → le plus récent en premier', () => {
    const older = makeEntry({ date: '2022-01-01', level: 'Régional', medal: 'gold' })
    const newer = makeEntry({ date: '2024-01-01', level: 'Régional', medal: 'gold' })
    const results = getBestResults([older, newer], 1)
    expect(results[0]).toBe(newer)
  })

  it('un national parmi des régionaux → le national en #1', () => {
    const regional = makeEntry({ level: 'Régional', medal: 'gold' })
    const national = makeEntry({ level: 'National', medal: 'gold' })
    const results = getBestResults([regional, national], 1)
    expect(results[0]).toBe(national)
  })

  it('plus de 3 résultats → exactement 3 retournés', () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      makeEntry({ date: `2024-0${i + 1}-01`, level: 'Régional', medal: 'gold' })
    )
    expect(getBestResults(entries)).toHaveLength(3)
  })

  it('uniquement des départementaux → 3 retournés sans erreur', () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      makeEntry({ date: `2024-0${i + 1}-01`, level: 'Départemental', medal: 'gold' })
    )
    const results = getBestResults(entries)
    expect(results).toHaveLength(3)
    results.forEach((r) => expect(r.level).toBe('Départemental'))
  })
})
