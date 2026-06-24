import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockSupabase = { from: mockFrom }

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase,
}))

vi.mock('@/lib/judokaService', () => ({
  getJudokaBySlug: vi.fn(),
}))

import {
  getProfilesForAccount,
  canEditProfile,
  isProfileOwner,
  getAccessibleProfile,
} from '@/lib/profileAccessService'
import { getJudokaBySlug } from '@/lib/judokaService'

function makeChain(returnValue: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'in', 'maybeSingle', 'single', 'order']
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain)
  })
  // Make chain thenable so `await chain` works (used by getProfilesForAccount)
  chain.then = vi.fn((resolve: (v: unknown) => void) => Promise.resolve(returnValue).then(resolve))
  ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue(returnValue)
  ;(chain.single as ReturnType<typeof vi.fn>).mockResolvedValue(returnValue)
  return chain
}

beforeEach(() => vi.clearAllMocks())

describe('getProfilesForAccount', () => {
  it('returns empty array when no profiles exist', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }))
    const result = await getProfilesForAccount('user-1')
    expect(result).toEqual([])
  })

  it('returns profiles sorted by created_at with role attached', async () => {
    const rows = [
      { role: 'owner', profiles: { id: 'p1', slug: 'judoka-1', first_name: 'Alice', last_name: 'A', club: null, profile_photo_url: null, visibility: 'draft', created_at: '2024-01-01T00:00:00Z' } },
      { role: 'manager', profiles: { id: 'p2', slug: 'judoka-2', first_name: 'Bob', last_name: 'B', club: null, profile_photo_url: null, visibility: 'public', created_at: '2024-02-01T00:00:00Z' } },
    ]
    const chain = makeChain({ data: rows, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await getProfilesForAccount('user-1')
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ id: 'p1', role: 'owner' })
    expect(result[1]).toMatchObject({ id: 'p2', role: 'manager' })
  })
})

describe('canEditProfile', () => {
  it('returns true for owner', async () => {
    mockFrom.mockReturnValue(makeChain({ data: { id: 'access-1' }, error: null }))
    expect(await canEditProfile('profile-1', 'user-1')).toBe(true)
  })

  it('returns true for manager', async () => {
    mockFrom.mockReturnValue(makeChain({ data: { id: 'access-2' }, error: null }))
    expect(await canEditProfile('profile-1', 'user-1')).toBe(true)
  })

  it('returns false when no access row found', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }))
    expect(await canEditProfile('profile-1', 'stranger')).toBe(false)
  })
})

describe('isProfileOwner', () => {
  it('returns true when role is owner', async () => {
    mockFrom.mockReturnValue(makeChain({ data: { id: 'access-1' }, error: null }))
    expect(await isProfileOwner('profile-1', 'user-1')).toBe(true)
  })

  it('returns false when role is manager', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }))
    expect(await isProfileOwner('profile-1', 'manager-user')).toBe(false)
  })
})

describe('getAccessibleProfile', () => {
  it('delegates to getJudokaBySlug and returns its result', async () => {
    const fakeJudoka = { slug: 'alice', visibility: 'public' }
    vi.mocked(getJudokaBySlug).mockResolvedValue(fakeJudoka as never)

    const result = await getAccessibleProfile('alice', 'user-1')
    expect(result).toEqual(fakeJudoka)
    expect(getJudokaBySlug).toHaveBeenCalledWith('alice', { allowDraft: true })
  })

  it('returns null when getJudokaBySlug returns null', async () => {
    vi.mocked(getJudokaBySlug).mockResolvedValue(null)
    const result = await getAccessibleProfile('nonexistent')
    expect(result).toBeNull()
  })
})
