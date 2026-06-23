import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import {
  createAnonClient,
  createAdminSetupClient,
  createAuthenticatedClient,
  createTestUser,
  deleteTestUser,
} from '../helpers/supabaseTestClient'
import type { SupabaseClient } from '@supabase/supabase-js'

const TIMEOUT = 10_000

const OWNER_EMAIL   = 'owner-vis-test@ipponid.test'
const OWNER_PASS    = 'Test1234!'
const MANAGER_EMAIL = 'manager-vis-test@ipponid.test'
const MANAGER_PASS  = 'Test1234!'

let admin: SupabaseClient
let ownerId: string
let managerId: string
let profileId: string

const COMPLETE_PROFILE = {
  first_name: 'Test', last_name: 'Judoka',
  club: 'Judo Club Test', category: '-66kg', grade: 'Ceinture noire',
  bio: 'Bio de test suffisamment longue.',
  profile_photo_url: 'https://example.com/photo.jpg',
  birth_date: '2005-01-01',
}

async function insertProfile(admin: SupabaseClient, ownerId: string, overrides = {}): Promise<string> {
  const { data, error } = await admin.from('profiles').insert({
    owner_id: ownerId,
    slug: `vis-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    published: false,
    visibility: 'draft',
    ...overrides,
  }).select('id').single()
  if (error) throw new Error(error.message)
  return data.id
}

const isSupabaseAvailable = !!process.env.SUPABASE_SERVICE_ROLE_KEY

;(isSupabaseAvailable ? describe : describe.skip)('Transitions de visibilité — RLS UPDATE', () => {
  beforeAll(async () => {
    try {
      admin = createAdminSetupClient()
      ownerId   = await createTestUser(admin, OWNER_EMAIL, OWNER_PASS)
      managerId = await createTestUser(admin, MANAGER_EMAIL, MANAGER_PASS)
    } catch (error) {
      // Gracefully skip if Supabase dependencies are not available
      if (error instanceof Error && (error.message.includes('Variable d\'environnement') || error.message.includes('WebSocket'))) {
        console.log('Skipping security tests: Supabase not available')
        return
      }
      throw error
    }
  }, TIMEOUT)

  afterAll(async () => {
    if (!admin) return
    try {
      await deleteTestUser(admin, ownerId)
      await deleteTestUser(admin, managerId)
    } catch (error) {
      // Ignore cleanup errors when Supabase was not initialized
    }
  }, TIMEOUT)

  beforeEach(async () => {
    if (!admin) return
    profileId = await insertProfile(admin, ownerId, COMPLETE_PROFILE)
  }, TIMEOUT)

  afterEach(async () => {
    if (!admin) return
    try {
      await admin.from('profiles').delete().eq('id', profileId)
    } catch (error) {
      // Ignore cleanup errors when Supabase was not initialized
    }
  }, TIMEOUT)
  it('owner peut passer de draft à public (UPDATE)', async () => {
    const owner = await createAuthenticatedClient(OWNER_EMAIL, OWNER_PASS)
    const { error } = await owner.from('profiles').update({ visibility: 'public', published: true }).eq('id', profileId)
    expect(error).toBeNull()
    const { data } = await admin.from('profiles').select('visibility').eq('id', profileId).single()
    expect(data?.visibility).toBe('public')
  }, TIMEOUT)

  it('owner peut passer de public à draft', async () => {
    await admin.from('profiles').update({ visibility: 'public', published: true }).eq('id', profileId)
    const owner = await createAuthenticatedClient(OWNER_EMAIL, OWNER_PASS)
    const { error } = await owner.from('profiles').update({ visibility: 'draft', published: false }).eq('id', profileId)
    expect(error).toBeNull()
    const { data } = await admin.from('profiles').select('visibility').eq('id', profileId).single()
    expect(data?.visibility).toBe('draft')
  }, TIMEOUT)

  it('manager peut modifier les champs du profil (restriction visibilité est au niveau applicatif)', async () => {
    // Grant manager access via admin (bypasses RLS)
    await admin.from('profile_access').insert({ profile_id: profileId, account_id: managerId, role: 'manager' })

    const manager = await createAuthenticatedClient(MANAGER_EMAIL, MANAGER_PASS)
    // Manager CAN update profile fields (allowed by access_update_profiles policy).
    // The restriction on visibility changes is enforced at application level via
    // isProfileOwner() in the setVisibility server action — NOT by RLS.
    const { error } = await manager.from('profiles').update({ first_name: 'Modifié' }).eq('id', profileId)
    expect(error).toBeNull()

    // Cleanup
    await admin.from('profile_access').delete().eq('profile_id', profileId).eq('account_id', managerId)
  }, TIMEOUT)

  it('owner peut passer de draft à private', async () => {
    const owner = await createAuthenticatedClient(OWNER_EMAIL, OWNER_PASS)
    const { error } = await owner.from('profiles').update({ visibility: 'private' }).eq('id', profileId)
    expect(error).toBeNull()
    const { data } = await admin.from('profiles').select('visibility').eq('id', profileId).single()
    expect(data?.visibility).toBe('private')
  }, TIMEOUT)

  it('[CRITIQUE] un anonyme ne peut pas modifier la visibilité', async () => {
    const anon = createAnonClient()
    await anon.from('profiles').update({ visibility: 'public' }).eq('id', profileId)
    const { data } = await admin.from('profiles').select('visibility').eq('id', profileId).single()
    expect(data?.visibility).toBe('draft')
  }, TIMEOUT)
})
