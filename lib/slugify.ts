export function normalizeText(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

export function generateSlug(firstName: string, lastName: string): string {
  return normalizeText(`${firstName} ${lastName}`)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
