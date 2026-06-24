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

vi.mock('@/lib/profileAccessService', () => ({
  isProfileOwner: vi.fn(),
}))

import { setVisibility, type SetVisibilityResult } from '@/app/dashboard/[profileId]/actions'
import { isProfileOwner } from '@/lib/profileAccessService'

const mockIsProfileOwner = vi.mocked(isProfileOwner)

const PREV_STATE: SetVisibilityResult = { ok: null, missing: [] }

function makeFormData(opts: { profileId: string; slug: string; visibility: 'draft' | 'private' | 'public' }): FormData {
  const fd = new FormData()
  fd.set('profileId', opts.profileId)
  fd.set('slug', opts.slug)
  fd.set('visibility', opts.visibility)
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
    slug: 'timothe-francois',
    ...overrides,
  }
}

function setupMocks(opts: {
  userId?: string | null
  profileData?: Record<string, string | null> | null
  isOwner?: boolean
}) {
  const userId = opts.userId !== undefined ? opts.userId : 'user-1'

  mockGetUser.mockResolvedValue({
    data: { user: userId ? { id: userId } : null },
  })

  mockIsProfileOwner.mockResolvedValue(opts.isOwner ?? true)

  // Mock for profile data fetch (used when visibility !== 'draft')
  const singleMock = vi.fn().mockResolvedValue({
    data: opts.profileData ?? null,
    error: opts.profileData === null ? { message: 'Not found' } : null,
  })

  mockFrom.mockImplementation(() => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: opts.profileData ?? null,
          error: opts.profileData === null ? { message: 'Not found' } : null,
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        data: null,
        error: null,
      }),
    }),
  }))

  return singleMock
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('setVisibility — passage en public', () => {
  it('profil complet → publication réussie', async () => {
    setupMocks({ userId: 'user-1', profileData: makeProfileData(), isOwner: true })

    const result = await setVisibility(
      PREV_STATE,
      makeFormData({ profileId: 'profile-1', slug: 'timothe-francois', visibility: 'public' })
    )

    expect(result.ok).toBe(true)
    expect(result.missing).toEqual([])
  })

  it('profil incomplet (bio manquante) → refus avec champs manquants', async () => {
    setupMocks({ userId: 'user-1', profileData: makeProfileData({ bio: null }), isOwner: true })

    const result = await setVisibility(
      PREV_STATE,
      makeFormData({ profileId: 'profile-1', slug: 'timothe-francois', visibility: 'public' })
    )

    expect(result.ok).toBe(false)
    expect(result.missing).toContain('Bio')
  })

  it('profil incomplet (photo + club manquants) → les deux champs listés', async () => {
    setupMocks({
      userId: 'user-1',
      profileData: makeProfileData({ profile_photo_url: null, club: null }),
      isOwner: true,
    })

    const result = await setVisibility(
      PREV_STATE,
      makeFormData({ profileId: 'profile-1', slug: 'timothe-francois', visibility: 'public' })
    )

    expect(result.ok).toBe(false)
    expect(result.missing).toContain('Photo de profil')
    expect(result.missing).toContain('Club')
  })
})

describe('setVisibility — passage en draft', () => {
  it('dépublication → succès sans vérification des champs', async () => {
    setupMocks({ userId: 'user-1', isOwner: true })

    const result = await setVisibility(
      PREV_STATE,
      makeFormData({ profileId: 'profile-1', slug: 'timothe-francois', visibility: 'draft' })
    )

    expect(result.ok).toBe(true)
    expect(result.missing).toEqual([])
  })
})

describe("setVisibility — cas d'erreur", () => {
  it('utilisateur non authentifié → redirect lancé', async () => {
    setupMocks({ userId: null, isOwner: false })

    await expect(
      setVisibility(PREV_STATE, makeFormData({ profileId: 'p', slug: 's', visibility: 'public' }))
    ).rejects.toMatchObject({ digest: 'NEXT_REDIRECT' })
  })

  it('non propriétaire → retourne ok false', async () => {
    setupMocks({ userId: 'user-1', isOwner: false })

    const result = await setVisibility(
      PREV_STATE,
      makeFormData({ profileId: 'autre-profile', slug: 's', visibility: 'public' })
    )

    expect(result.ok).toBe(false)
  })
})
