import { describe, it, expect, vi, beforeEach } from 'vitest'

// Les vi.mock() sont hoistés avant les imports par Vitest
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('next/navigation', () => ({
  redirect: vi.fn().mockImplementation((url: string) => {
    const err = Object.assign(new Error(`Redirect to ${url}`), { digest: 'NEXT_REDIRECT' })
    throw err
  }),
}))

const mockGetUser = vi.fn()
const mockSignOut = vi.fn()
const mockServerSupabase = {
  auth: {
    getUser: mockGetUser,
    signOut: mockSignOut,
  },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockServerSupabase,
}))

const mockStorageFrom = vi.fn()
const mockDeleteUser = vi.fn()
const mockAdminClient = {
  storage: { from: mockStorageFrom },
  auth: { admin: { deleteUser: mockDeleteUser } },
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockAdminClient,
}))

import { deleteAccount } from '@/app/dashboard/[profileId]/profil/actions'

beforeEach(() => {
  vi.clearAllMocks()
  mockSignOut.mockResolvedValue({ error: null })
  mockDeleteUser.mockResolvedValue({ error: null })
})

describe('deleteAccount', () => {
  it('supprime les fichiers storage, le compte utilisateur, puis redirige', async () => {
    const userId = 'user-abc-123'
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } } })

    const listMock = vi.fn().mockResolvedValue({
      data: [{ name: 'photo.jpg' }, { name: 'cover.jpg' }],
      error: null,
    })
    const removeMock = vi.fn().mockResolvedValue({ error: null })
    mockStorageFrom.mockReturnValue({ list: listMock, remove: removeMock })

    // deleteAccount se termine toujours par redirect → on attend l'erreur NEXT_REDIRECT
    await expect(deleteAccount()).rejects.toMatchObject({ digest: 'NEXT_REDIRECT' })

    // Vérifier que les fichiers ont été listés dans le bon dossier
    expect(listMock).toHaveBeenCalledWith(userId)

    // Vérifier que les fichiers ont été supprimés avec les bons chemins
    expect(removeMock).toHaveBeenCalledWith([
      `${userId}/photo.jpg`,
      `${userId}/cover.jpg`,
    ])

    // Vérifier que l'utilisateur a été supprimé via l'admin client
    expect(mockDeleteUser).toHaveBeenCalledWith(userId)

    // Vérifier que la session a été terminée
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('suppression réussie même si le dossier storage est vide', async () => {
    const userId = 'user-no-files'
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } } })

    const listMock = vi.fn().mockResolvedValue({ data: [], error: null })
    const removeMock = vi.fn()
    mockStorageFrom.mockReturnValue({ list: listMock, remove: removeMock })

    await expect(deleteAccount()).rejects.toMatchObject({ digest: 'NEXT_REDIRECT' })

    // Aucun fichier → remove ne doit pas être appelé
    expect(removeMock).not.toHaveBeenCalled()
    // Mais l'utilisateur doit quand même être supprimé
    expect(mockDeleteUser).toHaveBeenCalledWith(userId)
  })

  it('utilisateur non authentifié → redirect immédiat', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    await expect(deleteAccount()).rejects.toMatchObject({ digest: 'NEXT_REDIRECT' })

    // Aucune suppression ne doit avoir eu lieu
    expect(mockDeleteUser).not.toHaveBeenCalled()
    expect(mockSignOut).not.toHaveBeenCalled()
  })
})
