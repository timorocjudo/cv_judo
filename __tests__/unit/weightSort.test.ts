import { describe, it, expect } from 'vitest'
import { extractWeightNumber, normalizeWeightForDb, normalizeWeightForUrl } from '@/lib/searchFilterConfig'

describe('extractWeightNumber', () => {
  it('extrait la valeur numérique de "-73 kg"', () => {
    expect(extractWeightNumber('-73 kg')).toBe(73)
  })
  it('extrait la valeur de "-60 kg"', () => {
    expect(extractWeightNumber('-60 kg')).toBe(60)
  })
  it('donne 100.5 pour "+100 kg" (pour le trier après -100)', () => {
    expect(extractWeightNumber('+100 kg')).toBe(100.5)
  })
  it('donne 78.5 pour "+78 kg"', () => {
    expect(extractWeightNumber('+78 kg')).toBe(78.5)
  })
  it('retourne 0 pour une valeur vide', () => {
    expect(extractWeightNumber('')).toBe(0)
  })
  it('trie correctement un tableau mixte de catégories', () => {
    const categories = ['-81 kg', '-60 kg', '+100 kg', '-73 kg', '-100 kg']
    const sorted = [...categories].sort((a, b) => extractWeightNumber(a) - extractWeightNumber(b))
    expect(sorted).toEqual(['-60 kg', '-73 kg', '-81 kg', '-100 kg', '+100 kg'])
  })
})

describe('normalizeWeightForDb', () => {
  it('convertit "-73kg" (URL) en "-73 kg" (DB)', () => {
    expect(normalizeWeightForDb('-73kg')).toBe('-73 kg')
  })
  it('convertit "+100kg" en "+100 kg"', () => {
    expect(normalizeWeightForDb('+100kg')).toBe('+100 kg')
  })
})

describe('normalizeWeightForUrl', () => {
  it('convertit "-73 kg" (DB) en "-73kg" (URL)', () => {
    expect(normalizeWeightForUrl('-73 kg')).toBe('-73kg')
  })
})
