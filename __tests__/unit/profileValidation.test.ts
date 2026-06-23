import { describe, it, expect } from 'vitest'
import { getMissingFieldsForPublishing, type PublishableProfile } from '@/lib/profileValidation'

const COMPLETE_PROFILE: PublishableProfile = {
  club: 'Judo Club Paris',
  category: '-66kg',
  grade: 'Ceinture noire 1er dan',
  bio: 'Judoka passionné depuis 10 ans.',
  profile_photo_url: 'https://cdn.example.com/photo.jpg',
  birth_date: '2010-04-02',
}

describe('getMissingFieldsForPublishing', () => {
  it('profil complet → retourne tableau vide', () => {
    const result = getMissingFieldsForPublishing(COMPLETE_PROFILE)
    expect(result).toEqual([])
  })

  it('sans photo de profil → "Photo de profil" dans les manquants', () => {
    const profile = { ...COMPLETE_PROFILE, profile_photo_url: null }
    expect(getMissingFieldsForPublishing(profile)).toContain('Photo de profil')
  })

  it('sans bio → "Bio" dans les manquants', () => {
    const profile = { ...COMPLETE_PROFILE, bio: null }
    expect(getMissingFieldsForPublishing(profile)).toContain('Bio')
  })

  it('sans club → "Club" dans les manquants', () => {
    const profile = { ...COMPLETE_PROFILE, club: null }
    expect(getMissingFieldsForPublishing(profile)).toContain('Club')
  })

  it('sans catégorie → "Catégorie" dans les manquants', () => {
    const profile = { ...COMPLETE_PROFILE, category: null }
    expect(getMissingFieldsForPublishing(profile)).toContain('Catégorie')
  })

  it('sans grade → "Grade" dans les manquants', () => {
    const profile = { ...COMPLETE_PROFILE, grade: null }
    expect(getMissingFieldsForPublishing(profile)).toContain('Grade')
  })

  it('sans date de naissance → "Date de naissance" dans les manquants', () => {
    const profile = { ...COMPLETE_PROFILE, birth_date: null }
    expect(getMissingFieldsForPublishing(profile)).toContain('Date de naissance')
  })

  it('profil entièrement vide → tous les 6 champs manquants', () => {
    const emptyProfile: PublishableProfile = {
      club: null,
      category: null,
      grade: null,
      bio: null,
      profile_photo_url: null,
      birth_date: null,
    }
    const result = getMissingFieldsForPublishing(emptyProfile)
    expect(result).toHaveLength(6)
    expect(result).toContain('Club')
    expect(result).toContain('Catégorie')
    expect(result).toContain('Grade')
    expect(result).toContain('Bio')
    expect(result).toContain('Photo de profil')
    expect(result).toContain('Date de naissance')
  })

  it('champ présent mais vide (chaîne vide) → considéré manquant', () => {
    const profile = { ...COMPLETE_PROFILE, bio: '' }
    expect(getMissingFieldsForPublishing(profile)).toContain('Bio')
  })

  it('champ présent mais espaces seulement → considéré manquant', () => {
    const profile = { ...COMPLETE_PROFILE, club: '   ' }
    expect(getMissingFieldsForPublishing(profile)).toContain('Club')
  })
})
