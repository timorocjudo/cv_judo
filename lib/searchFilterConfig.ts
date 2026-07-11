export type GradeFilterOption = {
  slug: string
  label: string
  color: string
  dbValues: string[]
}

export const GRADE_FILTER_OPTIONS: GradeFilterOption[] = [
  { slug: 'blanche',    label: 'Blanche',    color: '#FFFFFF', dbValues: ['6e kyu', '6e/5e kyu'] },
  { slug: 'jaune',      label: 'Jaune',      color: '#FFD700', dbValues: ['5e kyu', '5e/4e kyu'] },
  { slug: 'orange',     label: 'Orange',     color: '#FF8C00', dbValues: ['4e kyu', '4e/3e kyu'] },
  { slug: 'verte',      label: 'Verte',      color: '#2e7d32', dbValues: ['3e kyu', '3e/2e kyu'] },
  { slug: 'bleue',      label: 'Bleue',      color: '#1565C0', dbValues: ['2e kyu', '2e/1er kyu'] },
  { slug: 'violette',   label: 'Violette',   color: '#6A0DAD', dbValues: ['Violette'] },
  { slug: 'marron',     label: 'Marron',     color: '#8B4513', dbValues: ['1er kyu'] },
  { slug: 'noire',      label: 'Noire',      color: '#1a1a1a', dbValues: ['1er dan', '2e dan', '3e dan+'] },
  { slug: 'superieure', label: 'Supérieure', color: '#C0A060', dbValues: [] },
]

export type AgeCategoryGroup = {
  slug: string
  label: string
}

export const AGE_CATEGORY_GROUPS: AgeCategoryGroup[] = [
  { slug: 'eveil-judo',   label: 'Éveil Judo' },
  { slug: 'pre-poussins', label: 'Pré-Poussins' },
  { slug: 'poussins',     label: 'Poussins' },
  { slug: 'benjamins',    label: 'Benjamins' },
  { slug: 'minimes',      label: 'Minimes' },
  { slug: 'cadets',       label: 'Cadets' },
  { slug: 'juniors',      label: 'Juniors' },
  { slug: 'seniors',      label: 'Séniors' },
  { slug: 'veterans',     label: 'Vétérans' },
]

// All weight categories across all FFJudo age groups (URL format: no space)
export const WEIGHT_FILTER_OPTIONS: string[] = [
  // Feminine
  '-28kg', '-32kg', '-36kg', '-40kg', '-44kg', '-48kg', '-52kg', '-57kg', '-63kg', '-70kg', '-78kg', '+78kg',
  // Masculine
  '-30kg', '-34kg', '-38kg', '-42kg', '-46kg', '-50kg', '-55kg', '-60kg', '-66kg', '-73kg', '-81kg', '-90kg', '-100kg', '+100kg',
]

export function extractWeightNumber(weightCategory: string): number {
  const match = weightCategory.match(/(\d+)/)
  if (!match) return 0
  const num = parseInt(match[1], 10)
  if (weightCategory.trim().startsWith('+')) return num + 0.5
  return num
}

// "-73kg" (URL) → "-73 kg" (DB)
export function normalizeWeightForDb(slug: string): string {
  return slug.replace(/(\d+)kg$/, '$1 kg')
}

// "-73 kg" (DB) → "-73kg" (URL)
export function normalizeWeightForUrl(dbWeight: string): string {
  return dbWeight.replace(/ kg$/, 'kg')
}

// Returns birth year range {min, max} for a given age category slug
// referenceYear = seasonStartYear + 1 where seasonStartYear = current year if month >= Aug, else current year - 1
export function ageCategoryBirthYearRange(
  slug: string,
  referenceYear: number
): { min: number; max: number } | null {
  const ranges: Record<string, { min: number; max: number }> = {
    'eveil-judo':   { min: referenceYear - 5,  max: referenceYear - 4 },
    'pre-poussins': { min: referenceYear - 7,  max: referenceYear - 6 },
    'poussins':     { min: referenceYear - 9,  max: referenceYear - 8 },
    'benjamins':    { min: referenceYear - 11, max: referenceYear - 10 },
    'minimes':      { min: referenceYear - 13, max: referenceYear - 12 },
    'cadets':       { min: referenceYear - 16, max: referenceYear - 14 },
    'juniors':      { min: referenceYear - 19, max: referenceYear - 17 },
    'seniors':      { min: referenceYear - 29, max: referenceYear - 20 },
    'veterans':     { min: 1900,               max: referenceYear - 30 },
  }
  return ranges[slug] ?? null
}

export function currentReferenceYear(): number {
  const now = new Date()
  const seasonStartYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
  return seasonStartYear + 1
}
