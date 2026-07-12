export function normalizeText(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function generateSlug(firstName: string, lastName: string): string {
  return normalizeText(`${firstName} ${lastName}`)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function generateCompetitionSlug(competition: string, date: string): string {
  const year = date.slice(0, 4)
  return normalizeText(`${competition} ${year}`)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function resolveUniqueCompetitionSlug(
  baseSlug: string,
  existingSlugs: string[]
): string {
  if (!existingSlugs.includes(baseSlug)) return baseSlug
  let counter = 2
  while (existingSlugs.includes(`${baseSlug}-${counter}`)) {
    counter++
  }
  return `${baseSlug}-${counter}`
}
