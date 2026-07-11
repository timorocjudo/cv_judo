'use server'

import { createClient } from '@/lib/supabase/server'
import { normalizeText } from '@/lib/slugify'
import {
  GRADE_FILTER_OPTIONS,
  ageCategoryBirthYearRange,
  currentReferenceYear,
  normalizeWeightForDb,
  extractWeightNumber,
} from '@/lib/searchFilterConfig'

export interface SearchParams {
  q?: string
  clubSlug?: string
  categorie?: string   // comma-separated age category slugs, e.g. "cadets,juniors"
  grade?: string       // comma-separated grade slugs, e.g. "noire,marron"
  poids?: string       // comma-separated weight slugs, e.g. "-73kg,-81kg"
  ordre?: 'alpha-asc' | 'alpha-desc' | 'poids-asc' | 'poids-desc' | 'recent'
  page?: number
  perPage?: number
}

export interface JudokaCard {
  slug: string
  firstName: string
  lastName: string
  profilePhotoUrl: string | null
  club: { name: string; slug: string } | null
  ageCategory: string | null      // computed from birth_date via computeAgeCategory
  grade: string | null            // DB grade label, e.g. "1er kyu"
  weightCategory: string | null   // DB category column, e.g. "-73 kg"
}

export interface SearchResult {
  results: JudokaCard[]
  total: number
  resolvedClub: { id: string; name: string; slug: string } | null
}

type ProfileRow = {
  slug: string
  first_name: string
  last_name: string
  grade: string | null
  category: string | null      // weight category in DB
  birth_date: string | null
  profile_photo_url: string | null
  updated_at: string
  clubs: { id: string; name: string; slug: string } | null
}

export async function searchJudokasAdvanced(params: SearchParams): Promise<SearchResult> {
  const {
    q,
    clubSlug,
    categorie,
    grade,
    poids,
    ordre = 'alpha-asc',
    page = 1,
    perPage = 24,
  } = params

  const supabase = createClient()

  // Step 1: Resolve club slug → club ID
  let resolvedClub: { id: string; name: string; slug: string } | null = null
  if (clubSlug) {
    const { data: club } = await supabase
      .from('clubs')
      .select('id, name, slug')
      .eq('slug', clubSlug)
      .maybeSingle()
    if (!club) return { results: [], total: 0, resolvedClub: null }
    resolvedClub = club as { id: string; name: string; slug: string }
  }

  // Step 2: Build Supabase query with server-side filters
  let query = supabase
    .from('profiles')
    .select('slug, first_name, last_name, grade, category, birth_date, profile_photo_url, updated_at, clubs(id, name, slug)')
    .eq('visibility', 'public')

  if (resolvedClub) {
    query = query.eq('club_id', resolvedClub.id)
  }

  // Grade filter — server-side using .in()
  if (grade) {
    const gradeSlugs = grade.split(',').filter(Boolean)
    const dbValues = gradeSlugs.flatMap((slug) => {
      const found = GRADE_FILTER_OPTIONS.find((g) => g.slug === slug)
      return found?.dbValues ?? []
    })
    if (dbValues.length > 0) {
      query = query.in('grade', dbValues)
    }
  }

  // Weight filter — server-side using .in()
  if (poids) {
    const weightSlugs = poids.split(',').filter(Boolean)
    const dbWeights = weightSlugs.map(normalizeWeightForDb)
    if (dbWeights.length > 0) {
      query = query.in('category', dbWeights)
    }
  }

  const { data, error } = await query
  if (error || !data) return { results: [], total: 0, resolvedClub }

  let filtered = data as unknown as ProfileRow[]

  // Step 3: Client-side text filter (accent-insensitive)
  if (q) {
    const normalized = normalizeText(q)
    filtered = filtered.filter((row) =>
      normalizeText(`${row.first_name} ${row.last_name}`).includes(normalized)
    )
  }

  // Step 4: Client-side age category filter (computed from birth_date)
  if (categorie) {
    const categorySlugs = categorie.split(',').filter(Boolean)
    const refYear = currentReferenceYear()
    const ranges = categorySlugs
      .map((slug) => ageCategoryBirthYearRange(slug, refYear))
      .filter((r): r is { min: number; max: number } => r !== null)

    if (ranges.length > 0) {
      filtered = filtered.filter((row) => {
        if (!row.birth_date) return false
        const birthYear = new Date(row.birth_date).getFullYear()
        return ranges.some((range) => birthYear >= range.min && birthYear <= range.max)
      })
    }
  }

  // Step 5: Sort
  filtered = sortResults(filtered, ordre)

  // Step 6: Paginate
  const total = filtered.length
  const offset = (page - 1) * perPage
  const pageData = filtered.slice(offset, offset + perPage)

  // Step 7: Map to JudokaCard
  const results: JudokaCard[] = pageData.map((row) => {
    const clubData = row.clubs as { id: string; name: string; slug: string } | null
    return {
      slug: row.slug,
      firstName: row.first_name,
      lastName: row.last_name,
      profilePhotoUrl: row.profile_photo_url,
      club: clubData ? { name: clubData.name, slug: clubData.slug } : null,
      ageCategory: null, // computed in UI from birth_date if needed; omit here to avoid server-only lib import
      grade: row.grade,
      weightCategory: row.category,
    }
  })

  return { results, total, resolvedClub }
}

function sortResults(profiles: ProfileRow[], ordre: SearchParams['ordre']): ProfileRow[] {
  const copy = [...profiles]
  switch (ordre) {
    case 'alpha-asc':
      return copy.sort((a, b) =>
        a.last_name.localeCompare(b.last_name, 'fr') || a.first_name.localeCompare(b.first_name, 'fr')
      )
    case 'alpha-desc':
      return copy.sort((a, b) =>
        b.last_name.localeCompare(a.last_name, 'fr') || b.first_name.localeCompare(a.first_name, 'fr')
      )
    case 'poids-asc':
      return copy.sort((a, b) =>
        extractWeightNumber(a.category ?? '') - extractWeightNumber(b.category ?? '')
      )
    case 'poids-desc':
      return copy.sort((a, b) =>
        extractWeightNumber(b.category ?? '') - extractWeightNumber(a.category ?? '')
      )
    case 'recent':
      return copy.sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
    default:
      return copy.sort((a, b) =>
        a.last_name.localeCompare(b.last_name, 'fr') || a.first_name.localeCompare(b.first_name, 'fr')
      )
  }
}

export function parseSearchParams(raw: Record<string, string | string[] | undefined>): SearchParams {
  function str(key: string): string | undefined {
    const v = raw[key]
    if (Array.isArray(v)) return v[0] || undefined
    return v || undefined
  }
  const ordre = str('ordre') as SearchParams['ordre']
  return {
    q: str('q'),
    clubSlug: str('club'),
    categorie: str('categorie'),
    grade: str('grade'),
    poids: str('poids'),
    ordre: ordre ?? 'alpha-asc',
    page: str('page') ? parseInt(str('page')!, 10) : 1,
    perPage: 24,
  }
}
