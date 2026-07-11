import { describe, it, expect } from 'vitest'
import {
  validateTypeChange,
  canCreateMoreProfiles,
  maxProfilesForType,
} from '@/lib/accountService'

describe('maxProfilesForType', () => {
  it('retourne 1 pour judoka', () => {
    expect(maxProfilesForType('judoka')).toBe(1)
  })
  it('retourne -1 pour manager', () => {
    expect(maxProfilesForType('manager')).toBe(-1)
  })
  it('retourne -1 pour parent_judoka', () => {
    expect(maxProfilesForType('parent_judoka')).toBe(-1)
  })
})

describe('canCreateMoreProfiles', () => {
  it('[judoka] ne peut pas creer plus d\'un profil', () => {
    expect(canCreateMoreProfiles(1, 0)).toBe(true)
    expect(canCreateMoreProfiles(1, 1)).toBe(false)
  })
  it('[manager] peut creer plusieurs profils', () => {
    expect(canCreateMoreProfiles(-1, 0)).toBe(true)
    expect(canCreateMoreProfiles(-1, 5)).toBe(true)
  })
  it('[parent_judoka] peut creer plusieurs profils', () => {
    expect(canCreateMoreProfiles(-1, 1)).toBe(true)
    expect(canCreateMoreProfiles(-1, 10)).toBe(true)
  })
})

describe('validateTypeChange', () => {
  it('upgrade judoka → parent_judoka : toujours autorise', () => {
    expect(validateTypeChange('judoka', 'parent_judoka', 0)).toEqual({ allowed: true })
    expect(validateTypeChange('judoka', 'parent_judoka', 1)).toEqual({ allowed: true })
  })

  it('upgrade judoka → manager : toujours autorise', () => {
    expect(validateTypeChange('judoka', 'manager', 1)).toEqual({ allowed: true })
  })

  it('upgrade parent_judoka → manager : toujours autorise', () => {
    expect(validateTypeChange('parent_judoka', 'manager', 5)).toEqual({ allowed: true })
  })

  it('upgrade manager → parent_judoka : autorise', () => {
    expect(validateTypeChange('manager', 'parent_judoka', 3)).toEqual({ allowed: true })
  })

  it('[CRITIQUE] downgrade parent_judoka → judoka refuse si plusieurs profils actifs', () => {
    const result = validateTypeChange('parent_judoka', 'judoka', 2)
    expect(result.allowed).toBe(false)
    expect(result.error).toContain('2')
  })

  it('downgrade parent_judoka → judoka autorise si un seul profil actif', () => {
    expect(validateTypeChange('parent_judoka', 'judoka', 1)).toEqual({ allowed: true })
  })

  it('[CRITIQUE] downgrade manager → judoka refuse si plusieurs profils actifs', () => {
    const result = validateTypeChange('manager', 'judoka', 3)
    expect(result.allowed).toBe(false)
    expect(result.error).toContain('3')
  })

  it('downgrade manager → judoka autorise si un seul profil actif', () => {
    expect(validateTypeChange('manager', 'judoka', 1)).toEqual({ allowed: true })
  })

  it('meme type → autorise (no-op)', () => {
    expect(validateTypeChange('judoka', 'judoka', 1)).toEqual({ allowed: true })
  })
})
