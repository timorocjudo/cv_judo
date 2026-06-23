import { describe, it, expect } from 'vitest'
import { generateSlug, normalizeText } from '@/lib/slugify'

describe('normalizeText', () => {
  it('supprime les accents et passe en lowercase', () => {
    expect(normalizeText('Timothé')).toBe('timothe')
    expect(normalizeText('François')).toBe('francois')
    expect(normalizeText('Élodie')).toBe('elodie')
  })

  it('supprime tous les types d\'accents courants', () => {
    expect(normalizeText('éèêàùçô')).toBe('eeeauco')
    // Note: à → a, ù → u
    expect(normalizeText('àùç')).toBe('auc')
  })

  it('passe en lowercase', () => {
    expect(normalizeText('DUPONT')).toBe('dupont')
    expect(normalizeText('Jean-Pierre')).toBe('jean-pierre')
  })

  it('conserve les tirets et chiffres', () => {
    expect(normalizeText('jean-pierre')).toBe('jean-pierre')
    expect(normalizeText('niveau2')).toBe('niveau2')
  })

  it('chaîne vide retourne chaîne vide', () => {
    expect(normalizeText('')).toBe('')
  })
})

describe('generateSlug', () => {
  it('génère le slug canonique', () => {
    expect(generateSlug('Timothé', 'François')).toBe('timothe-francois')
  })

  it('gère les prénoms composés', () => {
    expect(generateSlug('Jean-Pierre', 'Dupont')).toBe('jean-pierre-dupont')
  })

  it('espaces multiples dans le nom → tiret simple', () => {
    // normalizeText trim les espaces en bout de chaîne; les espaces internes deviennent des tirets
    expect(generateSlug('Marie  Claire', 'Lebrun')).toBe('marie-claire-lebrun')
  })

  it('supprime les caractères spéciaux', () => {
    expect(generateSlug("O'Brien", 'Smith')).toBe('o-brien-smith')
  })

  it('résultat toujours en lowercase', () => {
    expect(generateSlug('MARTIN', 'DUPONT')).toBe('martin-dupont')
  })

  it('pas de tiret en début ou fin', () => {
    const slug = generateSlug('Alice', 'Durand')
    expect(slug).not.toMatch(/^-/)
    expect(slug).not.toMatch(/-$/)
  })
})
