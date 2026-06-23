import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import {
  createAnonClient,
  createAdminSetupClient,
  createAuthenticatedClient,
  createTestUser,
  deleteTestUser,
} from '../helpers/supabaseTestClient'
import type { SupabaseClient } from '@supabase/supabase-js'

// Délai généreux pour les opérations réseau locales Supabase
const TIMEOUT = 10_000

const OWNER_EMAIL = 'owner-access-test@ipponid.test'
const OWNER_PASSWORD = 'Test1234!'
const OTHER_EMAIL = 'other-access-test@ipponid.test'
const OTHER_PASSWORD = 'Test1234!'

let admin: SupabaseClient
let ownerId: string
let otherId: string
let publishedProfileId: string
let unpublishedProfileId: string

async function insertProfile(
  admin: SupabaseClient,
  ownerId: string,
  published: boolean
): Promise<string> {
  const { data, error } = await admin
    .from('profiles')
    .insert({
      owner_id: ownerId,
      slug: `test-profile-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      first_name: 'Test',
      last_name: 'Judoka',
      published,
    })
    .select('id')
    .single()
  if (error) throw new Error(`Insertion profil échouée : ${error.message}`)
  return data.id
}

beforeAll(async () => {
  admin = createAdminSetupClient()
  ownerId = await createTestUser(admin, OWNER_EMAIL, OWNER_PASSWORD)
  otherId = await createTestUser(admin, OTHER_EMAIL, OTHER_PASSWORD)
}, TIMEOUT)

afterAll(async () => {
  await deleteTestUser(admin, ownerId)
  await deleteTestUser(admin, otherId)
}, TIMEOUT)

beforeEach(async () => {
  publishedProfileId = await insertProfile(admin, ownerId, true)
  unpublishedProfileId = await insertProfile(admin, ownerId, false)
}, TIMEOUT)

afterEach(async () => {
  await admin.from('profiles').delete().eq('id', publishedProfileId)
  await admin.from('profiles').delete().eq('id', unpublishedProfileId)
}, TIMEOUT)

describe('Profil publié (published = true)', () => {
  it('client anonyme peut lire', async () => {
    const anon = createAnonClient()
    const { data, error } = await anon
      .from('profiles')
      .select('id')
      .eq('id', publishedProfileId)
      .single()
    expect(error).toBeNull()
    expect(data?.id).toBe(publishedProfileId)
  }, TIMEOUT)

  it('client anonyme ne peut PAS modifier', async () => {
    const anon = createAnonClient()
    // RLS bloque silencieusement les UPDATEs non autorisés (0 lignes affectées)
    // On vérifie que la valeur n'a pas changé côté admin
    await anon
      .from('profiles')
      .update({ first_name: 'HACKER' })
      .eq('id', publishedProfileId)

    const { data } = await admin
      .from('profiles')
      .select('first_name')
      .eq('id', publishedProfileId)
      .single()
    expect(data?.first_name).not.toBe('HACKER')
  }, TIMEOUT)

  it('propriétaire peut lire', async () => {
    const owner = await createAuthenticatedClient(OWNER_EMAIL, OWNER_PASSWORD)
    const { data, error } = await owner
      .from('profiles')
      .select('id')
      .eq('id', publishedProfileId)
      .single()
    expect(error).toBeNull()
    expect(data?.id).toBe(publishedProfileId)
  }, TIMEOUT)

  it('propriétaire peut modifier', async () => {
    const owner = await createAuthenticatedClient(OWNER_EMAIL, OWNER_PASSWORD)
    const { error } = await owner
      .from('profiles')
      .update({ first_name: 'Modifié' })
      .eq('id', publishedProfileId)
    expect(error).toBeNull()

    const { data } = await admin
      .from('profiles')
      .select('first_name')
      .eq('id', publishedProfileId)
      .single()
    expect(data?.first_name).toBe('Modifié')
  }, TIMEOUT)

  it('autre utilisateur authentifié peut lire', async () => {
    const other = await createAuthenticatedClient(OTHER_EMAIL, OTHER_PASSWORD)
    const { data, error } = await other
      .from('profiles')
      .select('id')
      .eq('id', publishedProfileId)
      .single()
    expect(error).toBeNull()
    expect(data?.id).toBe(publishedProfileId)
  }, TIMEOUT)

  it('autre utilisateur authentifié ne peut PAS modifier', async () => {
    const other = await createAuthenticatedClient(OTHER_EMAIL, OTHER_PASSWORD)
    await other
      .from('profiles')
      .update({ first_name: 'USURPATEUR' })
      .eq('id', publishedProfileId)

    const { data } = await admin
      .from('profiles')
      .select('first_name')
      .eq('id', publishedProfileId)
      .single()
    expect(data?.first_name).not.toBe('USURPATEUR')
  }, TIMEOUT)
})

describe('Profil non-publié (published = false)', () => {
  it('[CRITIQUE] client anonyme ne peut PAS lire', async () => {
    const anon = createAnonClient()
    const { data } = await anon
      .from('profiles')
      .select('id')
      .eq('id', unpublishedProfileId)
      .single()
    // RLS bloque → data est null (pas d'erreur, juste aucune ligne retournée)
    expect(data).toBeNull()
  }, TIMEOUT)

  it('[CRITIQUE] autre utilisateur authentifié ne peut PAS lire', async () => {
    const other = await createAuthenticatedClient(OTHER_EMAIL, OTHER_PASSWORD)
    const { data } = await other
      .from('profiles')
      .select('id')
      .eq('id', unpublishedProfileId)
      .single()
    expect(data).toBeNull()
  }, TIMEOUT)

  it('propriétaire peut lire son profil non-publié', async () => {
    const owner = await createAuthenticatedClient(OWNER_EMAIL, OWNER_PASSWORD)
    const { data, error } = await owner
      .from('profiles')
      .select('id')
      .eq('id', unpublishedProfileId)
      .single()
    expect(error).toBeNull()
    expect(data?.id).toBe(unpublishedProfileId)
  }, TIMEOUT)

  it('propriétaire peut modifier son profil non-publié', async () => {
    const owner = await createAuthenticatedClient(OWNER_EMAIL, OWNER_PASSWORD)
    const { error } = await owner
      .from('profiles')
      .update({ first_name: 'BrouillonModifié' })
      .eq('id', unpublishedProfileId)
    expect(error).toBeNull()

    const { data } = await admin
      .from('profiles')
      .select('first_name')
      .eq('id', unpublishedProfileId)
      .single()
    expect(data?.first_name).toBe('BrouillonModifié')
  }, TIMEOUT)
})
