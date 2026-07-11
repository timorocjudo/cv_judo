'use server'

import { createClient } from '@/lib/supabase/server'
import { normalizeText } from '@/lib/slugify'

export type Club = {
  id: string
  name: string
  slug: string
  city: string | null
  department: string | null
  verified: boolean
}

export async function searchClubs(query: string): Promise<Club[]> {
  if (query.length < 2) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from('clubs')
    .select('id, name, slug, city, department, verified')

  if (error || !data) return []

  const normalized = normalizeText(query)

  return data
    .filter((club) => normalizeText(club.name).includes(normalized))
    .sort((a, b) => {
      if (a.verified && !b.verified) return -1
      if (!a.verified && b.verified) return 1
      return a.name.localeCompare(b.name, 'fr')
    })
    .slice(0, 8) as Club[]
}

export async function createClub(name: string): Promise<Club> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('UNAUTHENTICATED')

  const { data: allClubs } = await supabase
    .from('clubs')
    .select('name')

  const normalizedName = normalizeText(name.trim())
  const duplicate = (allClubs ?? []).find(
    (c) => normalizeText(c.name) === normalizedName
  )
  if (duplicate) throw new Error('CLUB_ALREADY_EXISTS')

  let slug = normalizeText(name.trim())
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const { data: slugCheck } = await supabase
    .from('clubs')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle()

  if (slugCheck) {
    let i = 2
    while (true) {
      const candidate = `${slug}-${i}`
      const { data: candidateCheck } = await supabase
        .from('clubs')
        .select('slug')
        .eq('slug', candidate)
        .maybeSingle()
      if (!candidateCheck) {
        slug = candidate
        break
      }
      i++
    }
  }

  const { data, error } = await supabase
    .from('clubs')
    .insert({ name: name.trim(), slug, created_by: user.id })
    .select('id, name, slug, city, department, verified')
    .single()

  if (error || !data) throw new Error('CREATE_FAILED')
  return data as Club
}

export async function getClubBySlug(slug: string): Promise<Club | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clubs')
    .select('id, name, slug, city, department, verified')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data) return null
  return data as Club
}
