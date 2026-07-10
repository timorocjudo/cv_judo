// __tests__/security/accountType.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createAdminSetupClient,
  createAuthenticatedClient,
  createTestUser,
  deleteTestUser,
} from '../helpers/supabaseTestClient'
import type { SupabaseClient } from '@supabase/supabase-js'

const TIMEOUT = 15_000

const JUDOKA_EMAIL   = 'judoka-actype-test@ipponid.test'
const JUDOKA_PASS    = 'Test1234!'
const MANAGER_EMAIL  = 'manager-actype-test@ipponid.test'
const MANAGER_PASS   = 'Test1234!'

let admin: SupabaseClient
let judokaId: string
let managerId: string

const isSupabaseAvailable = !!process.env.SUPABASE_SERVICE_ROLE_KEY

async function insertProfile(ownerId: string): Promise<string> {
  const { data, error } = await admin.from('profiles').insert({
    owner_id: ownerId,
    slug: `actype-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    first_name: 'Test', last_name: 'Judoka',
    published: false, visibility: 'draft',
  }).select('id').single()
  if (error) throw new Error(error.message)
  return data.id
}

async function setupAccount(userId: string, type: 'judoka' | 'manager' | 'parent_judoka', maxProfiles: number) {
  await admin.from('accounts').upsert({ id: userId, account_type: type, max_profiles: maxProfiles })
}

;(isSupabaseAvailable ? describe : describe.skip)('RLS — accounts & max_profiles', () => {
  beforeAll(async () => {
    admin = createAdminSetupClient()
    judokaId  = await createTestUser(admin, JUDOKA_EMAIL, JUDOKA_PASS)
    managerId = await createTestUser(admin, MANAGER_EMAIL, MANAGER_PASS)
  }, TIMEOUT)

  afterAll(async () => {
    await admin.from('profiles').delete().like('slug', 'actype-test-%')
    await admin.from('accounts').delete().in('id', [judokaId, managerId])
    await deleteTestUser(admin, judokaId)
    await deleteTestUser(admin, managerId)
  }, TIMEOUT)

  it('[CRITIQUE] un compte judoka (max_profiles=1) ne peut pas insérer un deuxième profil via RLS', async () => {
    await setupAccount(judokaId, 'judoka', 1)
    await insertProfile(judokaId)  // premier profil via admin (bypass RLS)

    const judoka = await createAuthenticatedClient(JUDOKA_EMAIL, JUDOKA_PASS)
    const { error } = await judoka.from('profiles').insert({
      owner_id: judokaId,
      slug: `actype-test-second-${Date.now()}`,
      first_name: 'Second', last_name: 'Profil',
      published: false, visibility: 'draft',
    })
    // La policy RESTRICTIVE doit bloquer cette insertion
    expect(error).not.toBeNull()
  }, TIMEOUT)

  it('[CRITIQUE] un compte manager (max_profiles=-1) peut insérer plusieurs profils', async () => {
    await setupAccount(managerId, 'manager', -1)
    await insertProfile(managerId) // premier profil

    const manager = await createAuthenticatedClient(MANAGER_EMAIL, MANAGER_PASS)
    const { error } = await manager.from('profiles').insert({
      owner_id: managerId,
      slug: `actype-test-manager2-${Date.now()}`,
      first_name: 'Enfant', last_name: 'Deux',
      published: false, visibility: 'draft',
    })
    expect(error).toBeNull()
  }, TIMEOUT)

  it('un utilisateur ne peut lire que son propre compte accounts', async () => {
    await setupAccount(judokaId, 'judoka', 1)
    const judoka = await createAuthenticatedClient(JUDOKA_EMAIL, JUDOKA_PASS)

    const { data: own } = await judoka.from('accounts').select('id').eq('id', judokaId).maybeSingle()
    expect(own?.id).toBe(judokaId)

    const { data: other } = await judoka.from('accounts').select('id').eq('id', managerId).maybeSingle()
    expect(other).toBeNull()
  }, TIMEOUT)

  it('un utilisateur peut insérer son propre compte accounts mais pas celui d\'un autre', async () => {
    const judoka = await createAuthenticatedClient(JUDOKA_EMAIL, JUDOKA_PASS)

    // Insérer pour soi-même (peut échouer si déjà existant — on ignore le conflit)
    await judoka.from('accounts').upsert({ id: judokaId, account_type: 'judoka', max_profiles: 1 })

    // Essayer d'insérer pour quelqu'un d'autre : doit être bloqué
    const { error } = await judoka.from('accounts').insert({
      id: managerId, account_type: 'judoka', max_profiles: 1,
    })
    expect(error).not.toBeNull()
  }, TIMEOUT)
})
