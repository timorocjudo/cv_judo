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
    const chain = makeChain({ data: [profiles[0]], error: null })
    mockFrom.mockReturnValue(chain)

    const result = await searchJudokasAdvanced({ grade: 'marron' })
    expect(result.total).toBe(1)
    expect(result.results[0].slug).toBe('marron-1')

    // Assert .in('grade', [...]) was called with DB values for 'marron'
    const inCalls = (chain.in as ReturnType<typeof vi.fn>).mock.calls
    expect(inCalls.some((args: unknown[]) => args[0] === 'grade' && Array.isArray(args[1]) && (args[1] as string[]).includes('1er kyu'))).toBe(true)
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
    const profileChain = makeChain({ data: profiles, error: null })
    mockFrom
      .mockReturnValueOnce(makeChain({ data: club, error: null }))  // club lookup
      .mockReturnValueOnce(profileChain)                             // profiles

    const result = await searchJudokasAdvanced({ clubSlug: 'roc-judo', categorie: 'cadets' })
    expect(result.total).toBe(1)
    expect(result.resolvedClub?.slug).toBe('roc-judo')

    // Assert .eq('club_id', ...) was called
    const eqCalls = (profileChain.eq as ReturnType<typeof vi.fn>).mock.calls
    expect(eqCalls.some((args: unknown[]) => args[0] === 'club_id' && args[1] === 'club-1')).toBe(true)

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

  it('filtre par poids "-73kg" → .in("category", ["-73 kg"]) appelé', async () => {
    const profiles = [makeProfile({ slug: 'p73', category: '-73 kg' })]
    const chain = makeChain({ data: profiles, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await searchJudokasAdvanced({ poids: '-73kg' })
    expect(result.total).toBe(1)

    const inCalls = (chain.in as ReturnType<typeof vi.fn>).mock.calls
    expect(inCalls.some((args: unknown[]) => args[0] === 'category' && Array.isArray(args[1]) && (args[1] as string[]).includes('-73 kg'))).toBe(true)
  })

  it('profils privés et drafts absents — Supabase RLS gère le filtre, le service ajoute eq visibility=public', async () => {
    // We verify that .eq('visibility', 'public') is always called
    const chain = makeChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)

    await searchJudokasAdvanced({})

    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls
    expect(eqCalls.some((args: unknown[]) => args[0] === 'visibility' && args[1] === 'public')).toBe(true)
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
