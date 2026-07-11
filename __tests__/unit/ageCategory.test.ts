import { describe, it, expect } from 'vitest'
import { computeAgeCategory } from '@/lib/ageCategory'

describe('computeAgeCategory', () => {
  it('birthDate absent → ""', () => {
    expect(computeAgeCategory(undefined)).toBe('')
  })

  it('Anna Lucia (2017-04-15), saison 2025/2026 → Poussins 2', () => {
    // Saison 2025/2026 : referenceDate en juillet 2026 (mois 6 < 8, donc start = 2025, end = 2026)
    // age = 2026 - 2017 = 9 → Poussins 2
    expect(computeAgeCategory('2017-04-15', '2026-07-01')).toBe('Poussins 2')
  })

  it('Anna Lucia (2017-04-15), saison 2026/2027 → Benjamins 1', () => {
    // referenceDate en octobre 2026 (mois 9 >= 8, donc start = 2026, end = 2027)
    // age = 2027 - 2017 = 10 → Benjamins 1
    expect(computeAgeCategory('2017-04-15', '2026-10-01')).toBe('Benjamins 1')
  })

  it('4 ans → Éveil Judo', () => {
    expect(computeAgeCategory('2022-01-01', '2026-07-01')).toBe('Éveil Judo')
  })

  it('5 ans → Éveil Judo', () => {
    expect(computeAgeCategory('2021-01-01', '2026-07-01')).toBe('Éveil Judo')
  })

  it('6 ans → Pré-Poussins 1', () => {
    expect(computeAgeCategory('2020-01-01', '2026-07-01')).toBe('Pré-Poussins 1')
  })

  it('7 ans → Pré-Poussins 2', () => {
    expect(computeAgeCategory('2019-01-01', '2026-07-01')).toBe('Pré-Poussins 2')
  })

  it('8 ans → Poussins 1', () => {
    expect(computeAgeCategory('2018-01-01', '2026-07-01')).toBe('Poussins 1')
  })

  it('10 ans → Benjamins 1', () => {
    expect(computeAgeCategory('2016-01-01', '2026-07-01')).toBe('Benjamins 1')
  })

  it('11 ans → Benjamins 2', () => {
    expect(computeAgeCategory('2015-01-01', '2026-07-01')).toBe('Benjamins 2')
  })

  it('12 ans → Minimes 1', () => {
    expect(computeAgeCategory('2014-01-01', '2026-07-01')).toBe('Minimes 1')
  })

  it('13 ans → Minimes 2', () => {
    expect(computeAgeCategory('2013-01-01', '2026-07-01')).toBe('Minimes 2')
  })

  it('14 ans → Cadets 1', () => {
    expect(computeAgeCategory('2012-01-01', '2026-07-01')).toBe('Cadets 1')
  })

  it('15 ans → Cadets 2', () => {
    expect(computeAgeCategory('2011-01-01', '2026-07-01')).toBe('Cadets 2')
  })

  it('16 ans → Cadets 3', () => {
    expect(computeAgeCategory('2010-01-01', '2026-07-01')).toBe('Cadets 3')
  })

  it('17 ans → Juniors 1', () => {
    expect(computeAgeCategory('2009-01-01', '2026-07-01')).toBe('Juniors 1')
  })

  it('19 ans → Juniors 3', () => {
    expect(computeAgeCategory('2007-01-01', '2026-07-01')).toBe('Juniors 3')
  })

  it('20 ans → Séniors', () => {
    expect(computeAgeCategory('2006-01-01', '2026-07-01')).toBe('Séniors')
  })

  it('29 ans → Séniors', () => {
    expect(computeAgeCategory('1997-01-01', '2026-07-01')).toBe('Séniors')
  })

  it('30 ans → Vétérans', () => {
    expect(computeAgeCategory('1996-01-01', '2026-07-01')).toBe('Vétérans')
  })

  it('cas limite : né le 1er septembre — compte dans la nouvelle saison', () => {
    // ref = 2025-09-01 → mois 8 >= 8, donc start = 2025, end = 2026
    // age = 2026 - 2010 = 16 → Cadets 3
    expect(computeAgeCategory('2010-09-01', '2025-09-01')).toBe('Cadets 3')
  })

  it('cas limite : né le 31 août — compte dans l\'ancienne saison', () => {
    // ref = 2025-08-31 → mois 7 < 8, donc start = 2024, end = 2025
    // age = 2025 - 2010 = 15 → Cadets 2
    expect(computeAgeCategory('2010-08-31', '2025-08-31')).toBe('Cadets 2')
  })

  it('âge ≤ 3 → ""', () => {
    expect(computeAgeCategory('2023-01-01', '2026-07-01')).toBe('')
  })
})
