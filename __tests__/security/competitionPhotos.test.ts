import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// These tests verify RLS policies on competition_photos.
// Run: npx supabase start
// Then: npm test __tests__/security/competitionPhotos.test.ts

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const anonClient = createClient(SUPABASE_URL, ANON_KEY)
const adminClient = createClient(SUPABASE_URL, SERVICE_KEY)

// State created during setup — cleaned up in afterAll
let publicProfileId: string
let draftProfileId: string
let publicPalmaresId: string
let draftPalmaresId: string
let testOwnerId: string

beforeAll(async () => {
  // Create a test user via admin
  const { data: ownerData } = await adminClient.auth.admin.createUser({
    email: `test-comp-photos-${Date.now()}@test.com`,
    password: 'test-password-123',
    email_confirm: true,
  })
  testOwnerId = ownerData.user!.id

  // Create public profile
  const { data: pub } = await adminClient
    .from('profiles')
    .insert({ owner_id: testOwnerId, slug: `test-pub-${Date.now()}`, first_name: 'Test', last_name: 'Pub', visibility: 'public', published: true })
    .select('id')
    .single()
  publicProfileId = pub!.id

  // Create draft profile
  const { data: draft } = await adminClient
    .from('profiles')
    .insert({ owner_id: testOwnerId, slug: `test-draft-${Date.now()}`, first_name: 'Test', last_name: 'Draft', visibility: 'draft', published: false })
    .select('id')
    .single()
  draftProfileId = draft!.id

  // Create palmares entries
  const { data: pubPalm } = await adminClient
    .from('palmares')
    .insert({ profile_id: publicProfileId, competition: 'Test Open', date: '2025-01-01', result: '1re place', competition_slug: 'test-open-2025' })
    .select('id')
    .single()
  publicPalmaresId = pubPalm!.id

  const { data: draftPalm } = await adminClient
    .from('palmares')
    .insert({ profile_id: draftProfileId, competition: 'Draft Open', date: '2025-01-01', result: '1re place', competition_slug: 'draft-open-2025' })
    .select('id')
    .single()
  draftPalmaresId = draftPalm!.id

  // Insert a competition photo for each
  await adminClient.from('competition_photos').insert({
    palmares_id: publicPalmaresId,
    profile_id: publicProfileId,
    photo_url: 'https://example.com/public-photo.jpg',
    position: 0,
  })
  await adminClient.from('competition_photos').insert({
    palmares_id: draftPalmaresId,
    profile_id: draftProfileId,
    photo_url: 'https://example.com/draft-photo.jpg',
    position: 0,
  })

  // Insert profile_access rows for owner
  await adminClient.from('profile_access').upsert({ profile_id: publicProfileId, account_id: testOwnerId, role: 'owner' })
  await adminClient.from('profile_access').upsert({ profile_id: draftProfileId, account_id: testOwnerId, role: 'owner' })
})

afterAll(async () => {
  await adminClient.from('profiles').delete().in('id', [publicProfileId, draftProfileId])
  await adminClient.auth.admin.deleteUser(testOwnerId)
})

describe('competition_photos RLS', () => {
  it('anon can read photos of a public profile', async () => {
    const { data, error } = await anonClient
      .from('competition_photos')
      .select('id')
      .eq('palmares_id', publicPalmaresId)

    expect(error).toBeNull()
    expect(data?.length).toBe(1)
  })

  it('anon cannot read photos of a draft profile', async () => {
    const { data, error } = await anonClient
      .from('competition_photos')
      .select('id')
      .eq('palmares_id', draftPalmaresId)

    // RLS filters rows silently — no error, but empty result
    expect(error).toBeNull()
    expect(data?.length).toBe(0)
  })

  it('anon cannot INSERT a competition photo', async () => {
    const { error } = await anonClient
      .from('competition_photos')
      .insert({ palmares_id: publicPalmaresId, profile_id: publicProfileId, photo_url: 'https://example.com/hack.jpg', position: 99 })

    expect(error).not.toBeNull()
  })

  it('cascade delete: removing a palmares entry removes its photos', async () => {
    // Insert a temp palmares entry with a photo
    const { data: palm } = await adminClient
      .from('palmares')
      .insert({ profile_id: publicProfileId, competition: 'Temp', date: '2025-06-01', result: '1re place' })
      .select('id')
      .single()
    const tempPalmaresId = palm!.id

    await adminClient.from('competition_photos').insert({
      palmares_id: tempPalmaresId,
      profile_id: publicProfileId,
      photo_url: 'https://example.com/temp.jpg',
      position: 0,
    })

    // Delete the palmares entry
    await adminClient.from('palmares').delete().eq('id', tempPalmaresId)

    // Verify photos are gone via CASCADE DELETE
    const { data } = await adminClient
      .from('competition_photos')
      .select('id')
      .eq('palmares_id', tempPalmaresId)

    expect(data?.length).toBe(0)
  })
})
