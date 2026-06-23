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

const OWNER_EMAIL   = 'owner-multi-test@ipponid.test'
const OWNER_PASS    = 'Test1234!'
const MANAGER_EMAIL = 'manager-multi-test@ipponid.test'
const MANAGER_PASS  = 'Test1234!'
const STRANGER_EMAIL = 'stranger-multi-test@ipponid.test'
const STRANGER_PASS  = 'Test1234!'

let admin: SupabaseClient
let ownerId: string
let managerId: string
let strangerId: string
let profileId: string

async function insertProfile(admin: SupabaseClient, ownerId: string, visibility: 'draft' | 'private' | 'public'): Promise<string> {
  const { data, error } = await admin.from('profiles').insert({
    owner_id: ownerId,
    slug: `multi-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    first_name: 'Test', last_name: 'Judoka',
    published: visibility === 'public',
    visibility,
  }).select('id').single()
  if (error) throw new Error(error.message)
  return data.id
}

async function grantAccess(admin: SupabaseClient, profileId: string, accountId: string, role: 'manager' | 'viewer') {
  const { error } = await admin.from('profile_access').insert({ profile_id: profileId, account_id: accountId, role })
  if (error) throw new Error(error.message)
}

const isSupabaseAvailable = !!process.env.SUPABASE_SERVICE_ROLE_KEY

;(isSupabaseAvailable ? describe : describe.skip)('Multi-profils — rôles', () => {
  beforeAll(async () => {
    try {
      admin = createAdminSetupClient()
      ownerId   = await createTestUser(admin, OWNER_EMAIL, OWNER_PASS)
      managerId = await createTestUser(admin, MANAGER_EMAIL, MANAGER_PASS)
      strangerId = await createTestUser(admin, STRANGER_EMAIL, STRANGER_PASS)
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
      await deleteTestUser(admin, strangerId)
    } catch (error) {
      // Ignore cleanup errors when Supabase was not initialized
    }
  }, TIMEOUT)

  beforeEach(async () => {
    if (!admin) return
    profileId = await insertProfile(admin, ownerId, 'draft')
  }, TIMEOUT)

  afterEach(async () => {
    if (!admin) return
    try {
      await admin.from('profiles').delete().eq('id', profileId)
    } catch (error) {
      // Ignore cleanup errors when Supabase was not initialized
    }
  }, TIMEOUT)
  it('un owner peut créer un deuxième profil', async () => {
    const secondId = await insertProfile(admin, ownerId, 'draft')
    const { data } = await admin.from('profile_access').select('role').eq('profile_id', secondId).eq('account_id', ownerId).single()
    expect(data?.role).toBe('owner')
    await admin.from('profiles').delete().eq('id', secondId)
  }, TIMEOUT)

  it('un manager peut modifier le palmarès (INSERT via RLS)', async () => {
    await grantAccess(admin, profileId, managerId, 'manager')
    const manager = await createAuthenticatedClient(MANAGER_EMAIL, MANAGER_PASS)
    const { error } = await manager.from('palmares').insert({
      profile_id: profileId, date: '2024-01-01', competition: 'Test', position: 1,
      medal: 'gold', result: "1re place — Médaille d'or", category: '-66kg', level: 'National',
    })
    expect(error).toBeNull()
  }, TIMEOUT)

  it('un manager ne peut pas supprimer le profil', async () => {
    await grantAccess(admin, profileId, managerId, 'manager')
    const manager = await createAuthenticatedClient(MANAGER_EMAIL, MANAGER_PASS)
    await manager.from('profiles').delete().eq('id', profileId)
    const { data } = await admin.from('profiles').select('id').eq('id', profileId).single()
    expect(data?.id).toBe(profileId)
  }, TIMEOUT)

  it('[CRITIQUE] un compte sans accès ne peut pas lire un profil en draft', async () => {
    const stranger = await createAuthenticatedClient(STRANGER_EMAIL, STRANGER_PASS)
    const { data } = await stranger.from('profiles').select('id').eq('id', profileId).single()
    expect(data).toBeNull()
  }, TIMEOUT)

  it('un compte connecté sans accès explicite peut lire un profil privé', async () => {
    await admin.from('profiles').update({ visibility: 'private' }).eq('id', profileId)
    const stranger = await createAuthenticatedClient(STRANGER_EMAIL, STRANGER_PASS)
    const { data } = await stranger.from('profiles').select('id').eq('id', profileId).single()
    expect(data?.id).toBe(profileId)
  }, TIMEOUT)

  it('[CRITIQUE] un anonyme ne peut pas lire un profil privé', async () => {
    await admin.from('profiles').update({ visibility: 'private' }).eq('id', profileId)
    const anon = createAnonClient()
    const { data } = await anon.from('profiles').select('id').eq('id', profileId).single()
    expect(data).toBeNull()
  }, TIMEOUT)
})
