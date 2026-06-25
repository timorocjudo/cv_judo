import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createAdminSetupClient,
  createAuthenticatedClient,
  createTestUser,
  deleteTestUser,
} from '../helpers/supabaseTestClient'

const TIMEOUT = 15_000
const isSupabaseAvailable = !!process.env.SUPABASE_SERVICE_ROLE_KEY

const OWNER_EMAIL   = 'owner-sharing-test@ipponid.test'
const OWNER_PASS    = 'Test1234!'
const MANAGER_EMAIL = 'manager-sharing-test@ipponid.test'
const MANAGER_PASS  = 'Test1234!'
const VIEWER_EMAIL  = 'viewer-sharing-test@ipponid.test'
const VIEWER_PASS   = 'Test1234!'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { addProfileAccess, removeProfileAccess } from '@/lib/profileAccessService'

;(isSupabaseAvailable ? describe : describe.skip)('Accès partagés — logique d\'invitation', () => {
  let admin: SupabaseClient
  let ownerId: string
  let managerId: string
  let viewerId: string
  let profileId: string
  let ownerClient: SupabaseClient
  let managerClient: SupabaseClient

  beforeAll(async () => {
    admin       = createAdminSetupClient()
    ownerId     = await createTestUser(admin, OWNER_EMAIL, OWNER_PASS)
    managerId   = await createTestUser(admin, MANAGER_EMAIL, MANAGER_PASS)
    viewerId    = await createTestUser(admin, VIEWER_EMAIL, VIEWER_PASS)
    ownerClient   = await createAuthenticatedClient(OWNER_EMAIL, OWNER_PASS)
    managerClient = await createAuthenticatedClient(MANAGER_EMAIL, MANAGER_PASS)
  }, TIMEOUT)

  afterAll(async () => {
    await deleteTestUser(admin, ownerId)
    await deleteTestUser(admin, managerId)
    await deleteTestUser(admin, viewerId)
  }, TIMEOUT)

  beforeEach(async () => {
    const { data, error } = await admin.from('profiles').insert({
      owner_id: ownerId,
      slug: `sharing-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      first_name: 'Test', last_name: 'Sharing',
      published: false, visibility: 'draft',
    }).select('id').single()
    if (error) throw new Error(error.message)
    profileId = data.id
  }, TIMEOUT)

  afterEach(async () => {
    vi.resetAllMocks()
    await admin.from('profiles').delete().eq('id', profileId)
  }, TIMEOUT)

  it('owner peut ajouter un manager', async () => {
    vi.mocked(createClient).mockReturnValue(ownerClient as never)
    const result = await addProfileAccess(profileId, managerId, 'manager', ownerId)
    expect(result).toEqual({ success: true, message: 'Accès ajouté.' })
    const { data } = await admin.from('profile_access').select('role').eq('profile_id', profileId).eq('account_id', managerId).single()
    expect(data?.role).toBe('manager')
  }, TIMEOUT)

  it('owner peut ajouter un viewer', async () => {
    vi.mocked(createClient).mockReturnValue(ownerClient as never)
    const result = await addProfileAccess(profileId, viewerId, 'viewer', ownerId)
    expect(result).toEqual({ success: true, message: 'Accès ajouté.' })
    const { data } = await admin.from('profile_access').select('role').eq('profile_id', profileId).eq('account_id', viewerId).single()
    expect(data?.role).toBe('viewer')
  }, TIMEOUT)

  it('un manager ne peut pas ajouter quelqu\'un', async () => {
    await admin.from('profile_access').insert({ profile_id: profileId, account_id: managerId, role: 'manager' })
    vi.mocked(createClient).mockReturnValue(managerClient as never)
    const result = await addProfileAccess(profileId, viewerId, 'viewer', managerId)
    expect(result.success).toBe(false)
    expect(result.message).toBe('Accès refusé.')
  }, TIMEOUT)

  it('owner ne peut pas s\'ajouter lui-même', async () => {
    vi.mocked(createClient).mockReturnValue(ownerClient as never)
    const result = await addProfileAccess(profileId, ownerId, 'manager', ownerId)
    expect(result.success).toBe(false)
    expect(result.message).toBe('Tu ne peux pas t\'ajouter toi-même.')
  }, TIMEOUT)

  it('owner peut retirer un manager', async () => {
    await admin.from('profile_access').insert({ profile_id: profileId, account_id: managerId, role: 'manager' })
    vi.mocked(createClient).mockReturnValue(ownerClient as never)
    const result = await removeProfileAccess(profileId, managerId, ownerId)
    expect(result).toEqual({ success: true, message: 'Accès retiré.' })
    const { data } = await admin.from('profile_access').select('id').eq('profile_id', profileId).eq('account_id', managerId).maybeSingle()
    expect(data).toBeNull()
  }, TIMEOUT)

  it('owner ne peut pas retirer l\'owner', async () => {
    vi.mocked(createClient).mockReturnValue(ownerClient as never)
    const result = await removeProfileAccess(profileId, ownerId, ownerId)
    expect(result.success).toBe(false)
    expect(result.message).toBe('Impossible de retirer le propriétaire du profil.')
  }, TIMEOUT)

  it('un manager ne peut pas retirer quelqu\'un', async () => {
    await admin.from('profile_access').insert({ profile_id: profileId, account_id: managerId, role: 'manager' })
    await admin.from('profile_access').insert({ profile_id: profileId, account_id: viewerId, role: 'viewer' })
    vi.mocked(createClient).mockReturnValue(managerClient as never)
    const result = await removeProfileAccess(profileId, viewerId, managerId)
    expect(result.success).toBe(false)
    expect(result.message).toBe('Accès refusé.')
  }, TIMEOUT)

  it('email déjà présent → message neutre (anti-énumération)', async () => {
    await admin.from('profile_access').insert({ profile_id: profileId, account_id: managerId, role: 'manager' })
    vi.mocked(createClient).mockReturnValue(ownerClient as never)
    const result = await addProfileAccess(profileId, managerId, 'viewer', ownerId)
    expect(result.success).toBe(false)
    expect(result.message).toBe('Aucun compte IpponId associé à cet email.')
  }, TIMEOUT)

  it('invited_by est défini lors de l\'ajout', async () => {
    vi.mocked(createClient).mockReturnValue(ownerClient as never)
    await addProfileAccess(profileId, managerId, 'manager', ownerId)
    const { data } = await admin.from('profile_access').select('invited_by').eq('profile_id', profileId).eq('account_id', managerId).single()
    expect(data?.invited_by).toBe(ownerId)
  }, TIMEOUT)
})
