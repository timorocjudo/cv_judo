import judokasData from '@/data/judokas.seed.json'
import type { JudokaData } from '@/types/judoka'
import { normalizeText } from '@/lib/slugify'

const judokas = judokasData as JudokaData[]

export async function getJudokaBySlug(slug: string): Promise<JudokaData | null> {
  return judokas.find((j) => j.slug === slug) ?? null
}

export async function searchJudokas(query: string): Promise<JudokaData[]> {
  const normalized = normalizeText(query)
  if (!normalized) return []
  return judokas.filter((j) => {
    const fullName = normalizeText(`${j.identity.firstName} ${j.identity.lastName}`)
    return fullName.includes(normalized)
  })
}
