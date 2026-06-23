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

const OWNER_EMAIL = 'owner-mutation-test@ipponid.test'
const OWNER_PASSWORD = 'Test1234!'
const ATTACKER_EMAIL = 'attacker-mutation-test@ipponid.test'
const ATTACKER_PASSWORD = 'Test1234!'

let admin: SupabaseClient
let ownerId: string
let attackerId: string
let profileId: string
let palmaresId: string

beforeAll(async () => {
  admin = createAdminSetupClient()
  ownerId = await createTestUser(admin, OWNER_EMAIL, OWNER_PASSWORD)
  attackerId = await createTestUser(admin, ATTACKER_EMAIL, ATTACKER_PASSWORD)
}, TIMEOUT)

afterAll(async () => {
  await deleteTestUser(admin, ownerId)
  await deleteTestUser(admin, attackerId)
}, TIMEOUT)

beforeEach(async () => {
  const slug = `mut-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .insert({ owner_id: ownerId, slug, first_name: 'Test', last_name: 'Owner', published: true })
    .select('id')
    .single()
  if (profileErr) throw new Error(profileErr.message)
  profileId = profile.id

  const { data: palmares, error: palmaresErr } = await admin
    .from('palmares')
    .insert({ profile_id: profileId, competition: 'Test compet', result: '1er' })
    .select('id')
    .single()
  if (palmaresErr) throw new Error(palmaresErr.message)
  palmaresId = palmares.id
}, TIMEOUT)

afterEach(async () => {
  await admin.from('palmares').delete().eq('id', palmaresId)
  await admin.from('profiles').delete().eq('id', profileId)
}, TIMEOUT)

describe('Protection UPDATE profiles', () => {
  it("un utilisateur ne peut pas modifier le profil d'un autre", async () => {
    const attacker = await createAuthenticatedClient(ATTACKER_EMAIL, ATTACKER_PASSWORD)
    await attacker
      .from('profiles')
      .update({ first_name: 'COMPROMIS' })
      .eq('id', profileId)

    const { data } = await admin
      .from('profiles')
      .select('first_name')
      .eq('id', profileId)
      .single()
    expect(data?.first_name).not.toBe('COMPROMIS')
  }, TIMEOUT)

  it('un utilisateur anonyme ne peut pas modifier un profil', async () => {
    const anon = createAnonClient()
    await anon
      .from('profiles')
      .update({ first_name: 'COMPROMIS' })
      .eq('id', profileId)

    const { data } = await admin
      .from('profiles')
      .select('first_name')
      .eq('id', profileId)
      .single()
    expect(data?.first_name).not.toBe('COMPROMIS')
  }, TIMEOUT)
})

describe('Protection DELETE profiles', () => {
  it("un utilisateur ne peut pas supprimer le profil d'un autre", async () => {
    const attacker = await createAuthenticatedClient(ATTACKER_EMAIL, ATTACKER_PASSWORD)
    await attacker.from('profiles').delete().eq('id', profileId)

    const { data } = await admin
      .from('profiles')
      .select('id')
      .eq('id', profileId)
      .single()
    expect(data?.id).toBe(profileId)
  }, TIMEOUT)

  it('un utilisateur anonyme ne peut pas supprimer un profil', async () => {
    const anon = createAnonClient()
    await anon.from('profiles').delete().eq('id', profileId)

    const { data } = await admin
      .from('profiles')
      .select('id')
      .eq('id', profileId)
      .single()
    expect(data?.id).toBe(profileId)
  }, TIMEOUT)
})

describe('Protection INSERT/UPDATE palmares', () => {
  it("un utilisateur ne peut pas ajouter une entrée palmarès sur le profil d'un autre", async () => {
    const attacker = await createAuthenticatedClient(ATTACKER_EMAIL, ATTACKER_PASSWORD)
    const { error } = await attacker
      .from('palmares')
      .insert({ profile_id: profileId, competition: 'Injection', result: 'Fraude' })
    // L'INSERT doit être bloqué par RLS (WITH CHECK échoue) → error non null
    expect(error).not.toBeNull()
  }, TIMEOUT)

  it('un utilisateur anonyme ne peut rien insérer dans palmares', async () => {
    const anon = createAnonClient()
    const { error } = await anon
      .from('palmares')
      .insert({ profile_id: profileId, competition: 'Injection anon', result: 'Fraude' })
    expect(error).not.toBeNull()
  }, TIMEOUT)

  it("un utilisateur ne peut pas modifier le palmarès d'un autre", async () => {
    const attacker = await createAuthenticatedClient(ATTACKER_EMAIL, ATTACKER_PASSWORD)
    await attacker
      .from('palmares')
      .update({ competition: 'HACKED' })
      .eq('id', palmaresId)

    const { data } = await admin
      .from('palmares')
      .select('competition')
      .eq('id', palmaresId)
      .single()
    expect(data?.competition).not.toBe('HACKED')
  }, TIMEOUT)
})
