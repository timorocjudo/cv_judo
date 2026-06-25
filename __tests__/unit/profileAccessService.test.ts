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
  getProfileAccesses,
  addProfileAccess,
  removeProfileAccess,
} from '@/lib/profileAccessService'

function makeChain(returnValue: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'in', 'maybeSingle', 'single', 'order', 'insert', 'delete']
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain)
  })
  chain.then = vi.fn((resolve: (v: unknown) => void) => Promise.resolve(returnValue).then(resolve))
  ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue(returnValue)
  ;(chain.single as ReturnType<typeof vi.fn>).mockResolvedValue(returnValue)
  return chain
}

beforeEach(() => vi.clearAllMocks())

describe('getProfileAccesses', () => {
  it('retourne toutes les lignes avec les bons rôles', async () => {
    const fakeRows = [
      { id: '1', account_id: 'u1', role: 'owner', invited_by: null, created_at: '2024-01-01T00:00:00Z' },
      { id: '2', account_id: 'u2', role: 'manager', invited_by: 'u1', created_at: '2024-02-01T00:00:00Z' },
    ]
    mockFrom.mockReturnValue(makeChain({ data: fakeRows, error: null }))

    const result = await getProfileAccesses('profile-1')
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ account_id: 'u1', role: 'owner' })
    expect(result[1]).toMatchObject({ account_id: 'u2', role: 'manager', invited_by: 'u1' })
  })

  it('retourne un tableau vide en cas d\'erreur', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }))
    const result = await getProfileAccesses('profile-1')
    expect(result).toEqual([])
  })
})

describe('addProfileAccess', () => {
  it('insère la ligne avec le bon rôle et invited_by', async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: { id: 'a1' }, error: null }))  // isProfileOwner → owner
      .mockReturnValueOnce(makeChain({ data: null, error: null }))            // pas de doublon
      .mockReturnValueOnce(makeChain({ error: null }))                        // insert OK
    const result = await addProfileAccess('profile-1', 'user-2', 'manager', 'user-1')
    expect(result).toEqual({ success: true, message: 'Accès ajouté.' })
    const insertCall = (mockFrom.mock.results[2].value.insert as ReturnType<typeof vi.fn>)
    expect(insertCall).toHaveBeenCalledWith({
      profile_id: 'profile-1',
      account_id: 'user-2',
      role: 'manager',
      invited_by: 'user-1',
    })
  })

  it('refuse si le demandeur n\'est pas owner', async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: null })) // isProfileOwner → false
    const result = await addProfileAccess('profile-1', 'user-2', 'manager', 'non-owner')
    expect(result).toEqual({ success: false, message: 'Accès refusé.' })
    expect(mockFrom).toHaveBeenCalledTimes(1)
  })

  it('refuse si le demandeur s\'ajoute lui-même', async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: { id: 'a1' }, error: null })) // isProfileOwner → true
    const result = await addProfileAccess('profile-1', 'user-1', 'manager', 'user-1')
    expect(result).toEqual({ success: false, message: 'Tu ne peux pas t\'ajouter toi-même.' })
    expect(mockFrom).toHaveBeenCalledTimes(1)
  })

  it('retourne message neutre si doublon', async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: { id: 'a1' }, error: null })) // isProfileOwner → true
      .mockReturnValueOnce(makeChain({ data: { id: 'existing' }, error: null })) // doublon trouvé
    const result = await addProfileAccess('profile-1', 'user-2', 'viewer', 'user-1')
    expect(result).toEqual({ success: false, message: 'Aucun compte IpponId associé à cet email.' })
  })
})

describe('removeProfileAccess', () => {
  it('supprime la ligne et retourne succès', async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: { id: 'a1' }, error: null }))           // isProfileOwner → true
      .mockReturnValueOnce(makeChain({ data: { id: 'row', role: 'manager' }, error: null })) // cible est manager
      .mockReturnValueOnce(makeChain({ error: null }))                                 // delete OK
    const result = await removeProfileAccess('profile-1', 'user-2', 'user-1')
    expect(result).toEqual({ success: true, message: 'Accès retiré.' })
  })

  it('refuse si la cible est owner', async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: { id: 'a1' }, error: null }))           // isProfileOwner → true
      .mockReturnValueOnce(makeChain({ data: { id: 'owner-row', role: 'owner' }, error: null })) // cible est owner
    const result = await removeProfileAccess('profile-1', 'user-owner', 'user-1')
    expect(result).toEqual({ success: false, message: 'Impossible de retirer le propriétaire du profil.' })
    expect(mockFrom).toHaveBeenCalledTimes(2)
  })

  it('refuse si le demandeur n\'est pas owner', async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: null })) // isProfileOwner → false
    const result = await removeProfileAccess('profile-1', 'user-2', 'non-owner')
    expect(result).toEqual({ success: false, message: 'Accès refusé.' })
    expect(mockFrom).toHaveBeenCalledTimes(1)
  })
})
