import { describe, it, expect, vi, beforeEach } from 'vitest'

// Les vi.mock() sont hoistés avant les imports par Vitest
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn().mockImplementation((url: string) => {
    const err = Object.assign(new Error(`Redirect to ${url}`), { digest: 'NEXT_REDIRECT' })
    throw err
  }),
}))

const mockFrom = vi.fn()
const mockGetUser = vi.fn()
const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase,
}))

import { togglePublished, type ToggleResult } from '@/app/dashboard/actions'

const PREV_STATE: ToggleResult = { ok: null, missing: [], unpublished: false }

function makeFormData(opts: { profileId: string; slug: string; next: boolean }): FormData {
  const fd = new FormData()
  fd.set('profileId', opts.profileId)
  fd.set('slug', opts.slug)
  fd.set('next', String(opts.next))
  return fd
}

function makeProfileData(overrides: Partial<Record<string, string | null>> = {}) {
  return {
    club: 'Judo Club Paris',
    category: '-66kg',
    grade: 'Ceinture noire',
    bio: 'Judoka depuis 10 ans.',
    profile_photo_url: 'https://cdn.example.com/photo.jpg',
    birth_date: '2010-04-02',
    ...overrides,
  }
}

function setupMocks(opts: {
  userId?: string | null
  profileData?: Record<string, string | null> | null
}) {
  const userId = opts.userId !== undefined ? opts.userId : 'user-1'

  mockGetUser.mockResolvedValue({
    data: { user: userId ? { id: userId } : null },
  })

  mockFrom.mockImplementation(() => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: opts.profileData ?? null,
            error: opts.profileData === null ? { message: 'Not found' } : null,
          }),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  }))
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('togglePublished — publication (next = true)', () => {
  it('profil complet → publication réussie', async () => {
    setupMocks({ userId: 'user-1', profileData: makeProfileData() })

    const result = await togglePublished(
      PREV_STATE,
      makeFormData({ profileId: 'profile-1', slug: 'timothe-francois', next: true })
    )

    expect(result.ok).toBe(true)
    expect(result.missing).toEqual([])
    expect(result.unpublished).toBe(false)
  })

  it('profil incomplet (bio manquante) → refus avec champs manquants', async () => {
    setupMocks({ userId: 'user-1', profileData: makeProfileData({ bio: null }) })

    const result = await togglePublished(
      PREV_STATE,
      makeFormData({ profileId: 'profile-1', slug: 'timothe-francois', next: true })
    )

    expect(result.ok).toBe(false)
    expect(result.missing).toContain('Bio')
    expect(result.unpublished).toBe(false)
  })

  it('profil incomplet (photo + club manquants) → les deux champs listés', async () => {
    setupMocks({
      userId: 'user-1',
      profileData: makeProfileData({ profile_photo_url: null, club: null }),
    })

    const result = await togglePublished(
      PREV_STATE,
      makeFormData({ profileId: 'profile-1', slug: 'timothe-francois', next: true })
    )

    expect(result.ok).toBe(false)
    expect(result.missing).toContain('Photo de profil')
    expect(result.missing).toContain('Club')
  })
})

describe('togglePublished — dépublication (next = false)', () => {
  it('dépublication → succès sans vérification des champs', async () => {
    setupMocks({ userId: 'user-1' })

    const result = await togglePublished(
      PREV_STATE,
      makeFormData({ profileId: 'profile-1', slug: 'timothe-francois', next: false })
    )

    expect(result.ok).toBe(true)
    expect(result.unpublished).toBe(true)
    // La sélection du profil n'est PAS appelée pour la dépublication
    expect(mockFrom).toHaveBeenCalledTimes(1) // seulement update
  })
})

describe("togglePublished — cas d'erreur", () => {
  it('utilisateur non authentifié → redirect lancé', async () => {
    setupMocks({ userId: null })

    await expect(
      togglePublished(PREV_STATE, makeFormData({ profileId: 'p', slug: 's', next: true }))
    ).rejects.toMatchObject({ digest: 'NEXT_REDIRECT' })
  })

  it('profil non trouvé (autre propriétaire) → redirect lancé', async () => {
    setupMocks({ userId: 'user-1', profileData: null })

    await expect(
      togglePublished(PREV_STATE, makeFormData({ profileId: 'autre-profile', slug: 's', next: true }))
    ).rejects.toMatchObject({ digest: 'NEXT_REDIRECT' })
  })
})
