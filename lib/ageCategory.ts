/**
 * Computes the French judo age category (FFJudo) for a given birth date.
 * Reference age = age reached in the civil year that ends the season.
 * Season: September N → August N+1. Reference civil year = N+1.
 */
export function computeAgeCategory(birthDate: string | undefined, referenceDate?: string): string {
  if (!birthDate) return ''
  const birthYear = new Date(birthDate).getFullYear()
  const ref = referenceDate ? new Date(referenceDate) : new Date()
  const seasonStartYear = ref.getMonth() >= 8 ? ref.getFullYear() : ref.getFullYear() - 1
  const age = (seasonStartYear + 1) - birthYear

  if (age <= 3)  return ''
  if (age <= 5)  return 'Éveil Judo'
  if (age === 6) return 'Pré-Poussins 1'
  if (age === 7) return 'Pré-Poussins 2'
  if (age === 8) return 'Poussins 1'
  if (age === 9) return 'Poussins 2'
  if (age === 10) return 'Benjamins 1'
  if (age === 11) return 'Benjamins 2'
  if (age === 12) return 'Minimes 1'
  if (age === 13) return 'Minimes 2'
  if (age === 14) return 'Cadets 1'
  if (age === 15) return 'Cadets 2'
  if (age === 16) return 'Cadets 3'
  if (age === 17) return 'Juniors 1'
  if (age === 18) return 'Juniors 2'
  if (age === 19) return 'Juniors 3'
  if (age <= 29) return 'Séniors'
  return 'Vétérans'
}
