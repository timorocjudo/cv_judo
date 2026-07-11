# Advanced Search Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/recherche` — a full advanced-search page with sidebar filters, grid results, pagination, and mobile drawer, accessible via a "Recherche avancée →" link on the landing page.

**Architecture:** RSC (`app/recherche/page.tsx`) reads `searchParams`, calls `searchJudokasAdvanced()`, and passes resolved data to `SearchPageClient` (Client Component). Filter changes call `router.push`, which triggers RSC re-render with new data; `app/recherche/loading.tsx` shows a skeleton during navigation. All filter state lives in the URL.

**Tech Stack:** Next.js 14 App Router, Supabase JS (server client), Vitest, Tailwind CSS design tokens from `tailwind.config.ts`.

## Global Constraints

- All components follow existing Tailwind token conventions: `primary`, `primary-container`, `tertiary-container`, `on-surface`, `outline-variant`, `surface-container`, `font-montserrat`/`font-inter`
- Layout spacing: `px-margin-mobile md:px-margin-desktop` (16px / 64px), max-width `max-w-container-max` (1280px)
- Section headers: `w-1 h-8 bg-tertiary-container` accent bar + `font-montserrat text-headline-md font-bold text-primary uppercase`
- Tests use Vitest with the mock pattern from `__tests__/unit/clubService.test.ts` (mockFrom chains)
- No new dependencies — everything uses existing packages
- `'use server'` at file level for all `lib/` services that use `createClient()` from `@/lib/supabase/server`
- Components never import `judoka.json` directly (irrelevant here, but consistency)

---

## File Map

**Create:**
- `lib/searchFilterConfig.ts` — pure config: grade groups, age groups, weight options, `extractWeightNumber()`
- `lib/advancedSearch.ts` — `'use server'` service: `searchJudokasAdvanced()`, `parseSearchParams()`
- `components/recherche/JudokaCard.tsx` — card for one judoka result
- `components/recherche/CardSkeleton.tsx` — animated skeleton matching card dimensions
- `components/recherche/Pagination.tsx` — numbered pagination (Prev · 1 · 2 · N · Next)
- `components/recherche/SearchFilters.tsx` — filter form UI (checkboxes, club picker, text) — no router logic, pure props
- `components/recherche/FiltersDrawer.tsx` — mobile bottom sheet wrapping `SearchFilters`
- `components/recherche/SearchPageClient.tsx` — client orchestrator: layout, URL sync, drawer state
- `components/landing/SearchWithAdvancedLink.tsx` — client wrapper: SearchAutocomplete + "Recherche avancée →" link
- `app/recherche/page.tsx` — RSC: fetches data, generates metadata
- `app/recherche/loading.tsx` — skeleton shown during URL navigation
- `__tests__/unit/weightSort.test.ts` — tests for `extractWeightNumber`
- `__tests__/unit/advancedSearch.test.ts` — tests for `searchJudokasAdvanced`

**Modify:**
- `components/ClubAutocomplete.tsx` — add `disableCreate?: boolean` prop; add `slug` as 3rd arg in `onChange`
- `components/SearchAutocomplete.tsx` — add optional `onQueryChange?: (q: string) => void` callback
- `components/landing/HeroSection.tsx` — replace `<Suspense><SearchAutocomplete /></Suspense>` block with `<SearchWithAdvancedLink />`

---

## Task 1: Filter Config + Weight Sort Tests

**Files:**
- Create: `lib/searchFilterConfig.ts`
- Create: `__tests__/unit/weightSort.test.ts`

**Interfaces:**
- Produces: `GRADE_FILTER_OPTIONS: GradeFilterOption[]`, `AGE_CATEGORY_GROUPS: AgeCategoryGroup[]`, `WEIGHT_FILTER_OPTIONS: string[]`, `extractWeightNumber(w: string): number`, `normalizeWeightForDb(slug: string): string`, `normalizeWeightForUrl(dbWeight: string): string`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/unit/weightSort.test.ts
import { describe, it, expect } from 'vitest'
import { extractWeightNumber, normalizeWeightForDb, normalizeWeightForUrl } from '@/lib/searchFilterConfig'

describe('extractWeightNumber', () => {
  it('extrait la valeur numérique de "-73 kg"', () => {
    expect(extractWeightNumber('-73 kg')).toBe(73)
  })
  it('extrait la valeur de "-60 kg"', () => {
    expect(extractWeightNumber('-60 kg')).toBe(60)
  })
  it('donne 100.5 pour "+100 kg" (pour le trier après -100)', () => {
    expect(extractWeightNumber('+100 kg')).toBe(100.5)
  })
  it('donne 78.5 pour "+78 kg"', () => {
    expect(extractWeightNumber('+78 kg')).toBe(78.5)
  })
  it('retourne 0 pour une valeur vide', () => {
    expect(extractWeightNumber('')).toBe(0)
  })
  it('trie correctement un tableau mixte de catégories', () => {
    const categories = ['-81 kg', '-60 kg', '+100 kg', '-73 kg', '-100 kg']
    const sorted = [...categories].sort((a, b) => extractWeightNumber(a) - extractWeightNumber(b))
    expect(sorted).toEqual(['-60 kg', '-73 kg', '-81 kg', '-100 kg', '+100 kg'])
  })
})

describe('normalizeWeightForDb', () => {
  it('convertit "-73kg" (URL) en "-73 kg" (DB)', () => {
    expect(normalizeWeightForDb('-73kg')).toBe('-73 kg')
  })
  it('convertit "+100kg" en "+100 kg"', () => {
    expect(normalizeWeightForDb('+100kg')).toBe('+100 kg')
  })
})

describe('normalizeWeightForUrl', () => {
  it('convertit "-73 kg" (DB) en "-73kg" (URL)', () => {
    expect(normalizeWeightForUrl('-73 kg')).toBe('-73kg')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL (module not found)**

```
npx vitest run __tests__/unit/weightSort.test.ts
```
Expected: FAIL with "Cannot find module '@/lib/searchFilterConfig'"

- [ ] **Step 3: Implement `lib/searchFilterConfig.ts`**

```typescript
// lib/searchFilterConfig.ts

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
```

- [ ] **Step 4: Run test — expect PASS**

```
npx vitest run __tests__/unit/weightSort.test.ts
```
Expected: all 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/searchFilterConfig.ts __tests__/unit/weightSort.test.ts
git commit -m "feat: add search filter config + weight sort utility"
```

---

## Task 2: Advanced Search Service + Tests

**Files:**
- Create: `lib/advancedSearch.ts`
- Create: `__tests__/unit/advancedSearch.test.ts`

**Interfaces:**
- Consumes: `GRADE_FILTER_OPTIONS`, `AGE_CATEGORY_GROUPS`, `ageCategoryBirthYearRange`, `currentReferenceYear`, `normalizeWeightForDb`, `extractWeightNumber` from `@/lib/searchFilterConfig`; `normalizeText` from `@/lib/slugify`; `createClient` from `@/lib/supabase/server`
- Produces:
  - `SearchParams` interface (exported type)
  - `JudokaCard` interface (exported type)
  - `SearchResult` interface `{ results: JudokaCard[]; total: number; resolvedClub: { id: string; name: string; slug: string } | null }`
  - `searchJudokasAdvanced(params: SearchParams): Promise<SearchResult>`
  - `parseSearchParams(raw: Record<string, string | string[] | undefined>): SearchParams`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/unit/advancedSearch.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockSupabase = { from: mockFrom }

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase,
}))

// Chain mock: handles both .maybeSingle() and direct await (via .then)
function makeChain(resolvedValue: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'in', 'order', 'limit', 'range', 'not']
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain)
  })
  chain.maybeSingle = vi.fn().mockResolvedValue(resolvedValue)
  // Make chain directly await-able (for queries that don't end with maybeSingle)
  ;(chain as { then: unknown }).then = (resolve: (v: unknown) => void) =>
    Promise.resolve(resolvedValue).then(resolve)
  return chain
}

function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    slug: 'test-judoka',
    first_name: 'Test',
    last_name: 'Judoka',
    grade: null,
    category: null,       // weight category in DB
    birth_date: null,
    profile_photo_url: null,
    updated_at: '2026-01-01T00:00:00Z',
    clubs: null,
    ...overrides,
  }
}

beforeEach(() => vi.clearAllMocks())

import { searchJudokasAdvanced, parseSearchParams } from '@/lib/advancedSearch'

describe('searchJudokasAdvanced', () => {
  it('sans filtres → retourne tous les profils publics', async () => {
    const profiles = [
      makeProfile({ slug: 'timothe-francois', first_name: 'Timothé', last_name: 'François' }),
      makeProfile({ slug: 'olivier-francois', first_name: 'Olivier', last_name: 'François' }),
    ]
    mockFrom.mockReturnValue(makeChain({ data: profiles, error: null }))

    const result = await searchJudokasAdvanced({})
    expect(result.total).toBe(2)
    expect(result.results).toHaveLength(2)
    expect(result.resolvedClub).toBeNull()
  })

  it('filtre par grade "marron" → retourne uniquement les ceintures marron', async () => {
    const profiles = [
      makeProfile({ slug: 'marron-1', grade: '1er kyu' }),
      makeProfile({ slug: 'bleue-1', grade: '2e kyu' }),
    ]
    // grade filter uses .in() server-side, but mock doesn't actually filter
    // so we simulate what Supabase would return after .in() filtering
    mockFrom.mockReturnValue(makeChain({ data: [profiles[0]], error: null }))

    const result = await searchJudokasAdvanced({ grade: 'marron' })
    expect(result.total).toBe(1)
    expect(result.results[0].slug).toBe('marron-1')
  })

  it('filtre par catégorie "cadets" → retourne uniquement les profils avec birth_date dans la tranche cadets', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15'))
    // ref year = 2026, cadets birth years = [2010, 2012]

    const profiles = [
      makeProfile({ slug: 'cadet-1', birth_date: '2011-03-10' }),  // cadets
      makeProfile({ slug: 'senior-1', birth_date: '1990-05-20' }), // sénior
    ]
    mockFrom.mockReturnValue(makeChain({ data: profiles, error: null }))

    const result = await searchJudokasAdvanced({ categorie: 'cadets' })
    expect(result.total).toBe(1)
    expect(result.results[0].slug).toBe('cadet-1')

    vi.useRealTimers()
  })

  it('filtre combiné catégorie + club → intersection correcte', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15'))

    const club = { id: 'club-1', name: 'ROC Judo', slug: 'roc-judo' }
    const profiles = [
      makeProfile({ slug: 'cadet-roc', birth_date: '2011-01-01', clubs: club }),
    ]
    mockFrom
      .mockReturnValueOnce(makeChain({ data: club, error: null }))     // club lookup
      .mockReturnValueOnce(makeChain({ data: profiles, error: null })) // profiles

    const result = await searchJudokasAdvanced({ clubSlug: 'roc-judo', categorie: 'cadets' })
    expect(result.total).toBe(1)
    expect(result.resolvedClub?.slug).toBe('roc-judo')

    vi.useRealTimers()
  })

  it('tri alpha-asc → ordre alphabétique lastName ASC', async () => {
    const profiles = [
      makeProfile({ slug: 'z', first_name: 'Zara', last_name: 'Zinc' }),
      makeProfile({ slug: 'a', first_name: 'Alice', last_name: 'Abel' }),
      makeProfile({ slug: 'm', first_name: 'Marc', last_name: 'Martin' }),
    ]
    mockFrom.mockReturnValue(makeChain({ data: profiles, error: null }))

    const result = await searchJudokasAdvanced({ ordre: 'alpha-asc' })
    expect(result.results.map(r => r.slug)).toEqual(['a', 'm', 'z'])
  })

  it('tri poids-asc → ordre croissant de catégorie de poids', async () => {
    const profiles = [
      makeProfile({ slug: 'p81', category: '-81 kg' }),
      makeProfile({ slug: 'p60', category: '-60 kg' }),
      makeProfile({ slug: 'p73', category: '-73 kg' }),
    ]
    mockFrom.mockReturnValue(makeChain({ data: profiles, error: null }))

    const result = await searchJudokasAdvanced({ ordre: 'poids-asc' })
    expect(result.results.map(r => r.slug)).toEqual(['p60', 'p73', 'p81'])
  })

  it('profils privés et drafts absents — Supabase RLS gère le filtre, le service ajoute eq visibility=public', async () => {
    // We verify that .eq('visibility', 'public') is always called
    const chain = makeChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)

    await searchJudokasAdvanced({})

    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls
    expect(eqCalls.some(([col, val]: [string, string]) => col === 'visibility' && val === 'public')).toBe(true)
  })

  it('pagination page 2 avec perPage 2 → retourne les bons éléments', async () => {
    const profiles = Array.from({ length: 5 }, (_, i) =>
      makeProfile({ slug: `judoka-${i}`, last_name: `Nom${i}` })
    )
    mockFrom.mockReturnValue(makeChain({ data: profiles, error: null }))

    const result = await searchJudokasAdvanced({ page: 2, perPage: 2 })
    expect(result.total).toBe(5)
    expect(result.results).toHaveLength(2)
    expect(result.results[0].slug).toBe('judoka-2')
    expect(result.results[1].slug).toBe('judoka-3')
  })

  it('club introuvable → retourne { results: [], total: 0 }', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }))

    const result = await searchJudokasAdvanced({ clubSlug: 'club-inexistant' })
    expect(result.results).toHaveLength(0)
    expect(result.total).toBe(0)
  })
})

describe('parseSearchParams', () => {
  it('convertit un objet brut en SearchParams typé', () => {
    const raw = { q: 'timothe', club: 'roc-judo', grade: 'noire', page: '2', ordre: 'alpha-desc' }
    const params = parseSearchParams(raw)
    expect(params.q).toBe('timothe')
    expect(params.clubSlug).toBe('roc-judo')
    expect(params.grade).toBe('noire')
    expect(params.page).toBe(2)
    expect(params.ordre).toBe('alpha-desc')
  })

  it('valeurs manquantes → defaults', () => {
    const params = parseSearchParams({})
    expect(params.page).toBe(1)
    expect(params.perPage).toBe(24)
    expect(params.ordre).toBe('alpha-asc')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```
npx vitest run __tests__/unit/advancedSearch.test.ts
```
Expected: FAIL with "Cannot find module '@/lib/advancedSearch'"

- [ ] **Step 3: Implement `lib/advancedSearch.ts`**

```typescript
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

  let filtered = data as ProfileRow[]

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
```

- [ ] **Step 4: Run tests — expect PASS**

```
npx vitest run __tests__/unit/advancedSearch.test.ts
```
Expected: all 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/advancedSearch.ts __tests__/unit/advancedSearch.test.ts
git commit -m "feat: add searchJudokasAdvanced service with filtering, sorting and pagination"
```

---

## Task 3: UI Atoms — JudokaCard, CardSkeleton, Pagination

**Files:**
- Create: `components/recherche/JudokaCard.tsx`
- Create: `components/recherche/CardSkeleton.tsx`
- Create: `components/recherche/Pagination.tsx`

**Interfaces:**
- Consumes: `JudokaCard` from `@/lib/advancedSearch`
- Produces: `<JudokaCard card={JudokaCard} />`, `<CardSkeleton />`, `<Pagination page total perPage onPageChange />`

- [ ] **Step 1: Create `components/recherche/JudokaCard.tsx`**

```tsx
import Link from 'next/link'
import Image from 'next/image'
import type { JudokaCard as JudokaCardType } from '@/lib/advancedSearch'

// Belt color swatch: 16×4px rectangle inline with grade badge
function GradeColor({ grade }: { grade: string }) {
  const colorMap: Record<string, string> = {
    '6e kyu': '#FFFFFF', '6e/5e kyu': '#FFD700',
    '5e kyu': '#FFD700', '5e/4e kyu': '#FF8C00',
    '4e kyu': '#FF8C00', '4e/3e kyu': '#2e7d32',
    '3e kyu': '#2e7d32', '3e/2e kyu': '#1565C0',
    '2e kyu': '#1565C0', '2e/1er kyu': '#8B4513',
    'Violette': '#6A0DAD',
    '1er kyu': '#8B4513',
    '1er dan': '#1a1a1a', '2e dan': '#1a1a1a', '3e dan+': '#1a1a1a',
  }
  const color = colorMap[grade]
  if (!color) return null
  return (
    <span
      className="inline-block w-4 h-1 rounded-sm border border-outline-variant/60 mr-1 align-middle"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  )
}

export default function JudokaCard({ card }: { card: JudokaCardType }) {
  const initials = (card.firstName[0] ?? '') + (card.lastName[0] ?? '')

  return (
    <Link
      href={`/${card.slug}`}
      className="group flex flex-col items-center p-5 bg-surface-container-lowest border border-outline-variant rounded-2xl
                 hover:shadow-md hover:border-tertiary-container transition-all duration-150"
    >
      {/* Photo / Initials */}
      <div className="mb-3">
        {card.profilePhotoUrl ? (
          <Image
            src={card.profilePhotoUrl}
            alt=""
            width={64}
            height={64}
            className="w-16 h-16 rounded-full object-cover object-top"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center">
            <span className="font-montserrat font-bold text-on-primary text-xl uppercase">
              {initials}
            </span>
          </div>
        )}
      </div>

      {/* Name */}
      <p className="font-montserrat font-bold text-on-surface text-sm text-center leading-tight mb-1 group-hover:text-primary transition-colors">
        {card.firstName} {card.lastName}
      </p>

      {/* Club */}
      {card.club && (
        <p className="text-xs text-on-surface-variant text-center mb-2 truncate max-w-full">
          {card.club.name}
        </p>
      )}

      {/* Badges */}
      <div className="flex flex-wrap justify-center gap-1 mt-auto">
        {card.grade && (
          <span className="inline-flex items-center text-xs bg-surface-container px-2 py-0.5 rounded-full text-on-surface-variant">
            <GradeColor grade={card.grade} />
            {card.grade}
          </span>
        )}
        {card.weightCategory && (
          <span className="text-xs bg-surface-container px-2 py-0.5 rounded-full text-on-surface-variant">
            {card.weightCategory}
          </span>
        )}
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Create `components/recherche/CardSkeleton.tsx`**

```tsx
export default function CardSkeleton() {
  return (
    <div className="flex flex-col items-center p-5 bg-surface-container-lowest border border-outline-variant rounded-2xl animate-pulse">
      <div className="w-16 h-16 rounded-full bg-surface-container mb-3" />
      <div className="h-4 w-24 bg-surface-container rounded mb-1" />
      <div className="h-3 w-20 bg-surface-container rounded mb-3" />
      <div className="flex gap-1">
        <div className="h-5 w-14 bg-surface-container rounded-full" />
        <div className="h-5 w-10 bg-surface-container rounded-full" />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `components/recherche/Pagination.tsx`**

```tsx
interface PaginationProps {
  page: number
  total: number
  perPage: number
  onPageChange: (page: number) => void
}

export default function Pagination({ page, total, perPage, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / perPage)
  if (totalPages <= 1) return null

  // Build page numbers with ellipsis
  function getPages(): (number | '…')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages: (number | '…')[] = [1]
    if (page > 3) pages.push('…')
    for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) {
      pages.push(p)
    }
    if (page < totalPages - 2) pages.push('…')
    pages.push(totalPages)
    return pages
  }

  const pages = getPages()

  return (
    <nav className="flex items-center justify-center gap-1 mt-8" aria-label="Pagination">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="px-3 py-1.5 text-sm font-medium text-on-surface-variant hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        ← Précédent
      </button>

      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-outline">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
              p === page
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="px-3 py-1.5 text-sm font-medium text-on-surface-variant hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Suivant →
      </button>
    </nav>
  )
}
```

- [ ] **Step 4: Verify TypeScript**

```
npx tsc --noEmit
```
Expected: no errors in the new files

- [ ] **Step 5: Commit**

```bash
git add components/recherche/JudokaCard.tsx components/recherche/CardSkeleton.tsx components/recherche/Pagination.tsx
git commit -m "feat: add JudokaCard, CardSkeleton and Pagination components"
```

---

## Task 4: Modify ClubAutocomplete + SearchAutocomplete

**Files:**
- Modify: `components/ClubAutocomplete.tsx`
- Modify: `components/SearchAutocomplete.tsx`

**Interfaces:**
- `ClubAutocomplete` onChange now: `(clubId: string | null, clubName: string | null, clubSlug?: string | null) => void`
- `ClubAutocomplete` new prop: `disableCreate?: boolean`
- `SearchAutocomplete` new prop: `onQueryChange?: (q: string) => void`
- Existing callers (`ProfileForm.tsx`) are unaffected (extra params are ignored by TypeScript)

- [ ] **Step 1: Modify `components/ClubAutocomplete.tsx`**

Add `disableCreate?: boolean` to the props interface:
```typescript
interface ClubAutocompleteProps {
  value: string | null
  valueName: string | null
  onChange: (clubId: string | null, clubName: string | null, clubSlug?: string | null) => void
  placeholder?: string
  disableCreate?: boolean  // ← add this
}
```

Change the `selectClub` callback to also pass slug:
```typescript
const selectClub = useCallback(
  (club: Club) => {
    onChange(club.id, club.name, club.slug)   // ← add club.slug as third arg
    setIsOpen(false)
    setQuery('')
    setResults([])
    setActiveIndex(-1)
  },
  [onChange]
)
```

Conditionally hide the create option:
```tsx
{showCreateOption && !disableCreate && (  // ← add && !disableCreate
  <button
    type="button"
    ...
  >
```

- [ ] **Step 2: Modify `components/SearchAutocomplete.tsx`**

Add `onQueryChange` to the props:
```typescript
export default function SearchAutocomplete({
  className = '',
  placeholder = 'Rechercher un judoka…',
  onQueryChange,           // ← add this
}: {
  className?: string
  placeholder?: string
  onQueryChange?: (q: string) => void  // ← add this
}) {
```

Call `onQueryChange` inside `handleChange`, right after `setQuery`:
```typescript
function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
  const value = e.target.value
  setQuery(value)
  onQueryChange?.(value)   // ← add this line
  // ... rest unchanged
}
```

- [ ] **Step 3: Verify TypeScript and existing usage**

```
npx tsc --noEmit
```
Expected: no errors. `ProfileForm.tsx` still works because its `onChange(clubId, clubName)` is compatible with the new signature (TS allows fewer params).

- [ ] **Step 4: Commit**

```bash
git add components/ClubAutocomplete.tsx components/SearchAutocomplete.tsx
git commit -m "feat: add disableCreate + slug to ClubAutocomplete, onQueryChange to SearchAutocomplete"
```

---

## Task 5: Filter UI — SearchFilters + FiltersDrawer

**Files:**
- Create: `components/recherche/SearchFilters.tsx`
- Create: `components/recherche/FiltersDrawer.tsx`

**Interfaces:**
- Consumes: `ClubAutocomplete`, `GRADE_FILTER_OPTIONS`, `AGE_CATEGORY_GROUPS`, `WEIGHT_FILTER_OPTIONS` from searchFilterConfig
- Produces:
  - `SearchFiltersProps` (exported interface)
  - `<SearchFilters ...props />` — pure UI, no router logic
  - `<FiltersDrawer isOpen onClose ...SearchFiltersProps />` — mobile bottom sheet

- [ ] **Step 1: Create `components/recherche/SearchFilters.tsx`**

```tsx
'use client'

import { useState } from 'react'
import ClubAutocomplete from '@/components/ClubAutocomplete'
import { GRADE_FILTER_OPTIONS, AGE_CATEGORY_GROUPS, WEIGHT_FILTER_OPTIONS } from '@/lib/searchFilterConfig'

export interface SearchFiltersProps {
  q: string
  onQChange: (q: string) => void
  clubId: string | null
  clubName: string | null
  onClubChange: (id: string | null, name: string | null, slug?: string | null) => void
  selectedCategories: string[]
  onCategoryToggle: (slug: string) => void
  selectedGrades: string[]
  onGradeToggle: (slug: string) => void
  selectedPoids: string[]
  onPoidsToggle: (slug: string) => void
  hasActiveFilters: boolean
  onReset: () => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border-b border-outline-variant pb-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-2 text-sm font-semibold text-on-surface"
      >
        <span>{title}</span>
        <svg
          className={`w-4 h-4 text-outline transition-transform ${open ? '' : '-rotate-90'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="mt-2 space-y-1">{children}</div>}
    </div>
  )
}

function CheckItem({
  label, checked, onToggle, color,
}: { label: string; checked: boolean; onToggle: () => void; color?: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group py-0.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
      />
      {color && (
        <span
          className="w-4 h-1 rounded-sm border border-outline-variant/60 flex-shrink-0"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      )}
      <span className="text-sm text-on-surface group-hover:text-primary transition-colors">{label}</span>
    </label>
  )
}

export default function SearchFilters({
  q, onQChange,
  clubId, clubName, onClubChange,
  selectedCategories, onCategoryToggle,
  selectedGrades, onGradeToggle,
  selectedPoids, onPoidsToggle,
  hasActiveFilters, onReset,
}: SearchFiltersProps) {
  const [localQ, setLocalQ] = useState(q)

  function handleQChange(value: string) {
    setLocalQ(value)
    onQChange(value)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-montserrat font-bold text-primary text-base uppercase tracking-wide">Filtres</h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-secondary hover:text-secondary-container transition-colors font-medium"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Text search */}
      <Section title="Recherche par nom">
        <input
          type="text"
          value={localQ}
          onChange={(e) => handleQChange(e.target.value)}
          placeholder="Prénom ou nom…"
          className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-outline bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </Section>

      {/* Club */}
      <Section title="Club">
        <ClubAutocomplete
          value={clubId}
          valueName={clubName}
          onChange={onClubChange}
          placeholder="Recherche un club…"
          disableCreate
        />
      </Section>

      {/* Age category */}
      <Section title="Catégorie d'âge">
        {AGE_CATEGORY_GROUPS.map((group) => (
          <CheckItem
            key={group.slug}
            label={group.label}
            checked={selectedCategories.includes(group.slug)}
            onToggle={() => onCategoryToggle(group.slug)}
          />
        ))}
      </Section>

      {/* Grade */}
      <Section title="Grade / Ceinture">
        {GRADE_FILTER_OPTIONS.map((g) => (
          <CheckItem
            key={g.slug}
            label={g.label}
            checked={selectedGrades.includes(g.slug)}
            onToggle={() => onGradeToggle(g.slug)}
            color={g.color}
          />
        ))}
      </Section>

      {/* Poids */}
      <Section title="Catégorie de poids">
        <div className="grid grid-cols-2 gap-x-2">
          {WEIGHT_FILTER_OPTIONS.map((w) => (
            <CheckItem
              key={w}
              label={w}
              checked={selectedPoids.includes(w)}
              onToggle={() => onPoidsToggle(w)}
            />
          ))}
        </div>
      </Section>
    </div>
  )
}
```

- [ ] **Step 2: Create `components/recherche/FiltersDrawer.tsx`**

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import SearchFilters, { type SearchFiltersProps } from '@/components/recherche/SearchFilters'

interface FiltersDrawerProps extends SearchFiltersProps {
  isOpen: boolean
  onClose: () => void
}

export default function FiltersDrawer({ isOpen, onClose, ...filterProps }: FiltersDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = original }
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Filtres de recherche"
      className={`fixed inset-0 z-[200] lg:hidden transition-opacity duration-200 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className={`absolute bottom-0 left-0 right-0 bg-surface-container-lowest rounded-t-2xl max-h-[85vh] flex flex-col
                    transition-transform duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-outline-variant rounded-full" />
        </div>

        {/* Scrollable filter content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <SearchFilters {...filterProps} />
        </div>

        {/* Sticky "Voir les résultats" button */}
        <div className="px-4 py-3 border-t border-outline-variant bg-surface-container-lowest">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-primary text-on-primary font-montserrat font-bold py-3 rounded-xl
                       hover:bg-primary-container transition-colors"
          >
            Voir les résultats
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```
npx tsc --noEmit
```
Expected: no errors in new files.

- [ ] **Step 4: Commit**

```bash
git add components/recherche/SearchFilters.tsx components/recherche/FiltersDrawer.tsx
git commit -m "feat: add SearchFilters and FiltersDrawer components"
```

---

## Task 6: SearchPageClient — Client Orchestrator

**Files:**
- Create: `components/recherche/SearchPageClient.tsx`

**Interfaces:**
- Consumes: `JudokaCard`, `SearchResult` from `@/lib/advancedSearch`; `SearchFilters`, `FiltersDrawer`, `JudokaCard` (component), `CardSkeleton`, `Pagination`
- Props: `{ results: JudokaCard[]; total: number; resolvedClub: SearchResult['resolvedClub'] }`

- [ ] **Step 1: Create `components/recherche/SearchPageClient.tsx`**

```tsx
'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import SearchFilters from '@/components/recherche/SearchFilters'
import FiltersDrawer from '@/components/recherche/FiltersDrawer'
import JudokaCardComponent from '@/components/recherche/JudokaCard'
import CardSkeleton from '@/components/recherche/CardSkeleton'
import Pagination from '@/components/recherche/Pagination'
import type { JudokaCard, SearchResult } from '@/lib/advancedSearch'

const SORT_OPTIONS = [
  { value: 'alpha-asc',  label: 'Alphabétique A→Z' },
  { value: 'alpha-desc', label: 'Alphabétique Z→A' },
  { value: 'poids-asc',  label: 'Poids croissant' },
  { value: 'poids-desc', label: 'Poids décroissant' },
  { value: 'recent',     label: 'Récemment mis à jour' },
]

interface SearchPageClientProps {
  results: JudokaCard[]
  total: number
  resolvedClub: SearchResult['resolvedClub']
}

export default function SearchPageClient({ results, total, resolvedClub }: SearchPageClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Derived state from URL
  const currentPage = parseInt(searchParams.get('page') ?? '1', 10)
  const activeQ = searchParams.get('q') ?? ''
  const activeCats = searchParams.get('categorie')?.split(',').filter(Boolean) ?? []
  const activeGrades = searchParams.get('grade')?.split(',').filter(Boolean) ?? []
  const activePoids = searchParams.get('poids')?.split(',').filter(Boolean) ?? []
  const activeOrdre = searchParams.get('ordre') ?? 'alpha-asc'

  const hasActiveFilters = !!(
    searchParams.get('q') ||
    searchParams.get('club') ||
    searchParams.get('categorie') ||
    searchParams.get('grade') ||
    searchParams.get('poids')
  )

  const activeFilterCount =
    (activeCats.length) +
    (activeGrades.length) +
    (activePoids.length) +
    (searchParams.get('club') ? 1 : 0) +
    (searchParams.get('q') ? 1 : 0)

  // Scroll to grid top when page changes
  const prevPage = useRef(currentPage)
  useEffect(() => {
    if (currentPage !== prevPage.current) {
      gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      prevPage.current = currentPage
    }
  }, [currentPage])

  // URL update helpers
  const pushUrl = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) params.delete(key)
      else params.set(key, value)
    }
    router.push(`/recherche?${params.toString()}`)
  }, [searchParams, router])

  function toggleMultiParam(paramName: string, value: string) {
    const current = searchParams.get(paramName)?.split(',').filter(Boolean) ?? []
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    const params = new URLSearchParams(searchParams.toString())
    if (next.length > 0) params.set(paramName, next.join(','))
    else params.delete(paramName)
    params.delete('page')
    router.push(`/recherche?${params.toString()}`)
  }

  // Filter callbacks
  function handleQChange(q: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (q) params.set('q', q)
      else params.delete('q')
      params.delete('page')
      router.push(`/recherche?${params.toString()}`)
    }, 400)
  }

  function handleClubChange(id: string | null, _name: string | null, slug?: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (slug) params.set('club', slug)
    else params.delete('club')
    params.delete('page')
    router.push(`/recherche?${params.toString()}`)
  }

  function handleOrdreChange(ordre: string) {
    pushUrl({ ordre, page: null })
  }

  function handlePageChange(page: number) {
    const params = new URLSearchParams(searchParams.toString())
    if (page === 1) params.delete('page')
    else params.set('page', String(page))
    router.push(`/recherche?${params.toString()}`)
  }

  function handleReset() {
    router.push('/recherche')
  }

  const filterProps = {
    q: activeQ,
    onQChange: handleQChange,
    clubId: resolvedClub?.id ?? null,
    clubName: resolvedClub?.name ?? null,
    onClubChange: handleClubChange,
    selectedCategories: activeCats,
    onCategoryToggle: (slug: string) => toggleMultiParam('categorie', slug),
    selectedGrades: activeGrades,
    onGradeToggle: (slug: string) => toggleMultiParam('grade', slug),
    selectedPoids: activePoids,
    onPoidsToggle: (slug: string) => toggleMultiParam('poids', slug),
    hasActiveFilters,
    onReset: handleReset,
  }

  return (
    <div className="flex gap-8 px-margin-mobile md:px-margin-desktop py-8 max-w-container-max mx-auto min-h-[60vh]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-[280px] shrink-0">
        <div className="sticky top-24">
          <SearchFilters {...filterProps} />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Mobile: filter button */}
        <div className="lg:hidden mb-4">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 border border-outline-variant rounded-xl px-4 py-2.5 text-sm font-semibold text-on-surface bg-surface-container-lowest hover:border-primary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 8h10M10 12h4" />
            </svg>
            Filtres
            {activeFilterCount > 0 && (
              <span className="bg-primary text-on-primary text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Results header: count + sort */}
        <div ref={gridRef} className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <p className="text-sm text-on-surface-variant">
            <span className="font-bold text-on-surface">{total}</span> judoka{total !== 1 ? 's' : ''} trouvé{total !== 1 ? 's' : ''}
          </p>
          <select
            value={activeOrdre}
            onChange={(e) => handleOrdreChange(e.target.value)}
            className="text-sm border border-outline-variant rounded-lg px-3 py-1.5 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Results grid */}
        {results.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-on-surface-variant mb-4">
              Aucun judoka ne correspond à ces critères — essaie d'élargir ta recherche.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="bg-primary text-on-primary px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary-container transition-colors"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((card) => (
              <JudokaCardComponent key={card.slug} card={card} />
            ))}
          </div>
        )}

        {/* Pagination */}
        <Pagination
          page={currentPage}
          total={total}
          perPage={24}
          onPageChange={handlePageChange}
        />
      </main>

      {/* Mobile drawer */}
      <FiltersDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        {...filterProps}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/recherche/SearchPageClient.tsx
git commit -m "feat: add SearchPageClient — client orchestrator for filter state and layout"
```

---

## Task 7: RSC Page + Loading Skeleton

**Files:**
- Create: `app/recherche/page.tsx`
- Create: `app/recherche/loading.tsx`

**Interfaces:**
- Consumes: `searchJudokasAdvanced`, `parseSearchParams`, `SearchResult` from `@/lib/advancedSearch`; `SearchPageClient`
- Produces: Next.js page at `/recherche` with `generateMetadata`

- [ ] **Step 1: Create `app/recherche/loading.tsx`**

```tsx
import CardSkeleton from '@/components/recherche/CardSkeleton'

export default function Loading() {
  return (
    <div className="flex gap-8 px-margin-mobile md:px-margin-desktop py-8 max-w-container-max mx-auto">
      {/* Sidebar skeleton */}
      <aside className="hidden lg:block w-[280px] shrink-0 space-y-4 animate-pulse">
        <div className="h-6 w-20 bg-surface-container rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-28 bg-surface-container rounded" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-4 w-full bg-surface-container rounded" />
            ))}
          </div>
        ))}
      </aside>

      {/* Grid skeleton */}
      <main className="flex-1 min-w-0">
        <div className="h-5 w-36 bg-surface-container rounded mb-6 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Create `app/recherche/page.tsx`**

```tsx
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { searchJudokasAdvanced, parseSearchParams } from '@/lib/advancedSearch'
import SearchPageClient from '@/components/recherche/SearchPageClient'
import Loading from './loading'
import { AGE_CATEGORY_GROUPS, GRADE_FILTER_OPTIONS } from '@/lib/searchFilterConfig'

type Props = {
  searchParams: Record<string, string | string[] | undefined>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const hasFilters = Object.values(searchParams).some((v) => v !== undefined)

  if (!hasFilters) {
    return {
      title: 'Annuaire des judokas — IpponId',
      description: 'Retrouve tous les judokas sur IpponId. Filtre par catégorie d\'âge, grade, poids et club.',
      robots: { index: true, follow: true },
    }
  }

  // Build dynamic title from active filters
  const parts: string[] = []
  const categorieSlug = (searchParams.categorie as string | undefined)?.split(',')[0]
  const gradeSlug = (searchParams.grade as string | undefined)?.split(',')[0]
  if (categorieSlug) {
    const label = AGE_CATEGORY_GROUPS.find((g) => g.slug === categorieSlug)?.label
    if (label) parts.push(label)
  }
  if (gradeSlug) {
    const label = GRADE_FILTER_OPTIONS.find((g) => g.slug === gradeSlug)?.label
    if (label) parts.push(`Ceinture ${label}`)
  }

  const title = parts.length > 0
    ? `Judokas ${parts.join(' · ')} — IpponId`
    : 'Recherche avancée — IpponId'

  return {
    title,
    description: `Recherche de judokas avec filtres sur IpponId.`,
    robots: { index: false },
  }
}

export default async function RecherchePage({ searchParams }: Props) {
  const params = parseSearchParams(searchParams)
  const { results, total, resolvedClub } = await searchJudokasAdvanced(params)

  return (
    <>
      {/* Page header */}
      <div className="px-margin-mobile md:px-margin-desktop pt-8 max-w-container-max mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-8 bg-tertiary-container" />
          <h1 className="font-montserrat text-headline-md font-bold text-primary uppercase">
            Annuaire des judokas
          </h1>
        </div>
      </div>

      <Suspense fallback={<Loading />}>
        <SearchPageClient results={results} total={total} resolvedClub={resolvedClub} />
      </Suspense>
    </>
  )
}
```

- [ ] **Step 3: Verify TypeScript and build**

```
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Start dev server and manually test `/recherche`**

```
npm run dev
```
Open http://localhost:3000/recherche — verify:
- Blank filters → shows all public profiles in alphabetical order
- No errors in console
- Sidebar visible on desktop, hidden on mobile

- [ ] **Step 5: Commit**

```bash
git add app/recherche/page.tsx app/recherche/loading.tsx
git commit -m "feat: add /recherche RSC page with metadata and loading skeleton"
```

---

## Task 8: Landing Page — "Recherche avancée →" Link

**Files:**
- Create: `components/landing/SearchWithAdvancedLink.tsx`
- Modify: `components/landing/HeroSection.tsx`

**Interfaces:**
- `SearchWithAdvancedLink` renders `SearchAutocomplete` (with `onQueryChange`) + a dynamic "Recherche avancée →" link
- HeroSection replaces its `<Suspense><SearchAutocomplete /></Suspense>` block with `<SearchWithAdvancedLink />`

- [ ] **Step 1: Create `components/landing/SearchWithAdvancedLink.tsx`**

```tsx
'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import SearchAutocomplete from '@/components/SearchAutocomplete'

function SearchFallback() {
  return (
    <div className="max-w-2xl mx-auto flex items-center bg-white rounded-xl shadow-xl border border-outline-variant p-2">
      <input
        type="text"
        disabled
        placeholder="Rechercher un judoka…"
        className="flex-1 border-none outline-none px-4 py-3 text-on-surface placeholder:text-outline bg-transparent"
      />
    </div>
  )
}

export default function SearchWithAdvancedLink() {
  const [query, setQuery] = useState('')

  const advancedHref = query.trim()
    ? `/recherche?q=${encodeURIComponent(query.trim())}`
    : '/recherche'

  return (
    <div>
      <Suspense fallback={<SearchFallback />}>
        <SearchAutocomplete className="max-w-2xl mx-auto" onQueryChange={setQuery} />
      </Suspense>
      <div className="mt-3 text-center">
        <Link
          href={advancedHref}
          className="text-sm text-on-surface-variant hover:text-primary transition-colors"
        >
          Recherche avancée →
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Modify `components/landing/HeroSection.tsx`**

Replace the Suspense block (lines 59-72 in the original file) with the new component.

Old code to remove:
```tsx
        <Suspense
          fallback={
            <div className="max-w-2xl mx-auto flex items-center bg-white rounded-xl shadow-xl border border-outline-variant p-2">
              <input
                type="text"
                disabled
                placeholder="Rechercher un judoka…"
                className="flex-1 border-none outline-none px-4 py-3 text-on-surface placeholder:text-outline bg-transparent"
              />
            </div>
          }
        >
          <SearchAutocomplete className="max-w-2xl mx-auto" />
        </Suspense>
```

Replace with:
```tsx
        <SearchWithAdvancedLink />
```

Also update imports at the top — remove `SearchAutocomplete` import, add `SearchWithAdvancedLink`:
```tsx
// Remove: import SearchAutocomplete from '@/components/SearchAutocomplete'
// Remove: import { Suspense } from 'react'  ← only if Suspense was only used here
import SearchWithAdvancedLink from '@/components/landing/SearchWithAdvancedLink'
```

- [ ] **Step 3: Verify TypeScript**

```
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Manual golden-path test**

Start dev server if not already running (`npm run dev`) and verify:
1. Landing page loads → search bar shows + "Recherche avancée →" link below it
2. Type "timothe" → autocomplete shows results + link updates to `/recherche?q=timothe`
3. Click "Recherche avancée →" → navigates to `/recherche?q=timothe` → search bar pre-filled
4. On `/recherche`: filter by "Cadets" → count updates; add club filter → narrows results
5. Change sort to "Alphabétique Z→A" → order reverses
6. Navigate to page 2 (if enough results) → URL has `?page=2`, grid scrolls into view
7. On mobile (< 1024px): sidebar hidden, "Filtres" button visible → click → drawer slides up from bottom → select a filter → "Voir les résultats" closes drawer → results update
8. Copy URL with active filters → paste in new tab → same results shown (URL state)
9. Click "Réinitialiser" → all filters cleared

- [ ] **Step 5: Commit**

```bash
git add components/landing/SearchWithAdvancedLink.tsx components/landing/HeroSection.tsx
git commit -m "feat: add SearchWithAdvancedLink and advanced search link on landing"
```

---

## Self-Review Spec Coverage Checklist

- [x] `/recherche?q=...&club=...&categorie=...&grade=...&ordre=...&page=...` URL shape — Task 2 + 6
- [x] Landing link "Recherche avancée →" under autocomplete — Task 8
- [x] Link pre-fills `?q=` from search input — Task 8
- [x] `searchJudokasAdvanced` function with full SearchParams/JudokaCard types — Task 2
- [x] Supabase query filters `visibility = 'public'` — Task 2
- [x] Club join for filter and display — Task 2
- [x] Accent-insensitive text search using `normalizeText` — Task 2
- [x] All 5 sort orders including numeric weight extraction — Tasks 1 + 2
- [x] Pagination with total count — Task 2 + 6
- [x] Desktop sidebar 280px + results grid — Task 6
- [x] "Réinitialiser" button (visible only with active filter) — Task 5
- [x] 5 filter sections as accordions, open by default — Task 5
- [x] Club filter reuses `ClubAutocomplete` with `disableCreate` — Tasks 4 + 5
- [x] Grade checkboxes with belt color swatch — Task 5
- [x] Instantaneous filter updates, 400ms debounce on text — Task 6
- [x] Count badge on mobile "Filtres" button — Task 6
- [x] Mobile drawer: bottom sheet, 85vh, scrollable, "Voir les résultats" button — Task 5
- [x] Body scroll lock on drawer open — Task 5
- [x] Empty state message + reset button — Task 6
- [x] Skeleton of 6 cards during loading — Tasks 3 + 7
- [x] Numbered pagination with Previous/Next and ellipsis — Task 3
- [x] Scroll to grid top on page change — Task 6
- [x] SEO: `noindex` when filters active, `index` on bare `/recherche` — Task 7
- [x] Dynamic title from active filters — Task 7
- [x] `weightSort.test.ts` — Task 1
- [x] `advancedSearch.test.ts` — Task 2 (8 tests covering all spec cases)
