import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockAuth = { getUser: vi.fn() }
const mockSupabase = { from: mockFrom, auth: mockAuth }

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase,
}))

function makeChain(returnValue: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'insert', 'single', 'maybeSingle', 'order']
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain)
  })
  chain.then = vi.fn((resolve: (v: unknown) => void) =>
    Promise.resolve(returnValue).then(resolve)
  )
  ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue(returnValue)
  ;(chain.single as ReturnType<typeof vi.fn>).mockResolvedValue(returnValue)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

import { searchClubs, createClub } from '@/lib/clubService'

// ─── searchClubs ─────────────────────────────────────────────────────────────

describe('searchClubs', () => {
  it('retourne [] sans appel réseau si query < 2 chars', async () => {
    expect(await searchClubs('')).toEqual([])
    expect(await searchClubs('r')).toEqual([])
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('trouve "ROC Judo" avec "roc" (insensible casse)', async () => {
    const clubs = [
      { id: '1', name: 'ROC Judo', slug: 'roc-judo', city: 'Nice', department: '06', verified: true },
      { id: '2', name: 'Judo Club Paris', slug: 'judo-club-paris', city: 'Paris', department: '75', verified: false },
    ]
    mockFrom.mockReturnValue(makeChain({ data: clubs, error: null }))
    const result = await searchClubs('roc')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('ROC Judo')
  })

  it('trouve "ROC Judo" avec "röc" (insensible aux accents)', async () => {
    const clubs = [
      { id: '1', name: 'ROC Judo', slug: 'roc-judo', city: null, department: null, verified: true },
    ]
    mockFrom.mockReturnValue(makeChain({ data: clubs, error: null }))
    const result = await searchClubs('röc')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('ROC Judo')
  })

  it('retourne les clubs vérifiés en premier', async () => {
    const clubs = [
      { id: '1', name: 'Club Alpha', slug: 'club-alpha', city: null, department: null, verified: false },
      { id: '2', name: 'Club Beta', slug: 'club-beta', city: null, department: null, verified: true },
    ]
    mockFrom.mockReturnValue(makeChain({ data: clubs, error: null }))
    const result = await searchClubs('club')
    expect(result[0].verified).toBe(true)
    expect(result[0].name).toBe('Club Beta')
  })

  it('limite à 8 résultats', async () => {
    const clubs = Array.from({ length: 15 }, (_, i) => ({
      id: String(i),
      name: `Club ${i}`,
      slug: `club-${i}`,
      city: null,
      department: null,
      verified: false,
    }))
    mockFrom.mockReturnValue(makeChain({ data: clubs, error: null }))
    const result = await searchClubs('club')
    expect(result).toHaveLength(8)
  })
})

// ─── createClub ──────────────────────────────────────────────────────────────

describe('createClub', () => {
  it('throw CLUB_ALREADY_EXISTS si nom identique existe (insensible casse)', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const existingClubs = [
      { id: '1', name: 'ROC Judo', slug: 'roc-judo', city: null, department: null, verified: false },
    ]
    mockFrom.mockReturnValueOnce(makeChain({ data: existingClubs, error: null }))
    await expect(createClub('roc judo')).rejects.toThrow('CLUB_ALREADY_EXISTS')
  })

  it('génère un slug avec suffixe -2 si le slug de base est déjà pris', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const newClub = { id: 'new-id', name: 'ROC Judo', slug: 'roc-judo-2', city: null, department: null, verified: false }
    mockFrom
      .mockReturnValueOnce(makeChain({ data: [], error: null }))                               // pas de doublon
      .mockReturnValueOnce(makeChain({ data: { slug: 'roc-judo' }, error: null }))             // slug de base pris
      .mockReturnValueOnce(makeChain({ data: null, error: null }))                             // roc-judo-2 libre
      .mockReturnValueOnce(makeChain({ data: newClub, error: null }))                          // insert OK
    const result = await createClub('ROC Judo')
    expect(result.slug).toBe('roc-judo-2')
    expect(result.name).toBe('ROC Judo')
  })

  it('crée avec le slug de base quand il est disponible', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const newClub = { id: 'new-id', name: 'Judo Club Test', slug: 'judo-club-test', city: null, department: null, verified: false }
    mockFrom
      .mockReturnValueOnce(makeChain({ data: [], error: null }))             // pas de doublon
      .mockReturnValueOnce(makeChain({ data: null, error: null }))           // slug libre
      .mockReturnValueOnce(makeChain({ data: newClub, error: null }))        // insert OK
    const result = await createClub('Judo Club Test')
    expect(result.slug).toBe('judo-club-test')
  })
})
