/**
 * Computes the French judo age category for a given birth date.
 * Category is fixed for the entire season (September to August) based on birth year.
 * age = season_start_year - birth_year
 * @param referenceDate - ISO date string to determine the season (defaults to today)
 */
export function computeAgeCategory(birthDate: string, referenceDate?: string): string {
  const birthYear = new Date(birthDate).getFullYear()
  const ref = referenceDate ? new Date(referenceDate) : new Date()
  const seasonStartYear = ref.getMonth() >= 8 ? ref.getFullYear() : ref.getFullYear() - 1
  const age = seasonStartYear - birthYear

  if (age <= 10) return 'Benjamin 1'
  if (age === 11) return 'Benjamin 2'
  if (age === 12) return 'Minime 1'
  if (age === 13) return 'Minime 2'
  if (age === 14) return 'Cadet 1'
  if (age === 15) return 'Cadet 2'
  if (age === 16) return 'Cadet 3'
  if (age === 17) return 'Junior 1'
  if (age === 18) return 'Junior 2'
  if (age === 19) return 'Junior 3'
  return 'Sénior'
}
