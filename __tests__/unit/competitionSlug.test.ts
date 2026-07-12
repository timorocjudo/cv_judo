import { describe, it, expect } from 'vitest'
import { generateCompetitionSlug, resolveUniqueCompetitionSlug } from '@/lib/slugify'

describe('generateCompetitionSlug', () => {
  it('generates slug from competition name and year', () => {
    expect(generateCompetitionSlug('Open de Marseille', '2025-03-15'))
      .toBe('open-de-marseille-2025')
  })

  it('handles accents and special characters', () => {
    expect(generateCompetitionSlug('Championnat de France par équipe', '2026-05-02'))
      .toBe('championnat-de-france-par-equipe-2026')
  })

  it('collapses multiple spaces and symbols', () => {
    expect(generateCompetitionSlug('  Open  /  Lyon  ', '2025-01-10'))
      .toBe('open-lyon-2025')
  })
})

describe('resolveUniqueCompetitionSlug', () => {
  it('returns the base slug when no conflict', () => {
    expect(resolveUniqueCompetitionSlug('open-de-marseille-2025', []))
      .toBe('open-de-marseille-2025')
  })

  it('appends -2 when base slug is already taken', () => {
    expect(resolveUniqueCompetitionSlug('open-de-marseille-2025', ['open-de-marseille-2025']))
      .toBe('open-de-marseille-2025-2')
  })

  it('increments counter until a free slot is found', () => {
    const taken = ['open-de-marseille-2025', 'open-de-marseille-2025-2']
    expect(resolveUniqueCompetitionSlug('open-de-marseille-2025', taken))
      .toBe('open-de-marseille-2025-3')
  })
})
