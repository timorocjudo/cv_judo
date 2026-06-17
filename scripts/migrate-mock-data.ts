#!/usr/bin/env node
/**
 * Seed script: migrate mock judoka data from data/judokas.seed.json to Supabase.
 *
 * Usage (run from project root):
 *   npx tsx scripts/migrate-mock-data.ts <owner-uuid>
 *
 * <owner-uuid> = Timothé's Supabase Auth UUID.
 *   Find it in Supabase dashboard → Authentication → Users after his first Google login,
 *   or read it from the /dashboard page after he signs in.
 *
 * Prerequisites in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
 *
 * SQL migrations that must be executed in Supabase SQL Editor first:
 *   supabase/migrations/0001_init.sql
 *   supabase/migrations/0002_palmares_columns.sql
 *   supabase/migrations/0003_storage.sql
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

// Load .env.local — not loaded automatically outside the Next.js runtime
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const ROOT = process.cwd()

// ─── Validate args ────────────────────────────────────────────────────────────

const ownerIdArg = process.argv[2]
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

if (!ownerIdArg || !UUID_REGEX.test(ownerIdArg)) {
  console.error('Usage: npx tsx scripts/migrate-mock-data.ts <owner-uuid>')
  console.error('Example: npx tsx scripts/migrate-mock-data.ts 550e8400-e29b-41d4-a716-446655440000')
  process.exit(1)
}

const ownerId = ownerIdArg

// ─── Supabase client (service role — bypasses RLS) ───────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY')
  console.error('Make sure both are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

// ─── Local types (mirrors judokas.seed.json structure) ───────────────────────

interface PalmaresEntry {
  date: string
  competition: string
  result: string
  category: string
  level: string
  medal: string | null
  city: string
  podiumPhoto?: string
}

interface Video {
  title: string
  youtubeUrl: string
  description: string
}

interface GalleryImage {
  src: string
  caption: string
}

interface JudokaSeed {
  slug: string
  identity: {
    firstName: string
    lastName: string
    club: string
    weightCategory: string
    grade: string
    profilePhoto: string
    coverPhoto: string
  }
  bio: string
  palmares: PalmaresEntry[]
  videos: Video[]
  gallery: GalleryImage[]
  layout: string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  }
  return map[ext] ?? 'application/octet-stream'
}

async function uploadImage(
  localRelativePath: string,
  storagePath: string,
): Promise<string | null> {
  // localRelativePath is like "/images/profile.jpg" — resolved from public/
  const fullPath = path.join(ROOT, 'public', localRelativePath)
  if (!fs.existsSync(fullPath)) {
    console.warn(`  ⚠  Image not found, skipping: ${localRelativePath}`)
    return null
  }
  const buffer = fs.readFileSync(fullPath)
  const { error } = await supabase.storage
    .from('media')
    .upload(storagePath, buffer, { contentType: mimeType(localRelativePath), upsert: true })
  if (error) throw new Error(`Storage upload failed for ${storagePath}: ${error.message}`)
  const { data } = supabase.storage.from('media').getPublicUrl(storagePath)
  return data.publicUrl
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nMigrating mock data for owner: ${ownerId}\n`)

  // 1. Read seed data
  const seedPath = path.join(ROOT, 'data', 'judokas.seed.json')
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf-8')) as JudokaSeed[]
  const judoka = seed[0]
  console.log(`Judoka: ${judoka.identity.firstName} ${judoka.identity.lastName} (${judoka.slug})`)

  // 2. Upload images
  console.log('\nUploading images...')
  const profileUrl = await uploadImage(judoka.identity.profilePhoto, `${ownerId}/profile.jpg`)
  const coverUrl   = await uploadImage(judoka.identity.coverPhoto,   `${ownerId}/cover.jpg`)
  console.log(`  profile : ${profileUrl ?? 'skipped'}`)
  console.log(`  cover   : ${coverUrl ?? 'skipped'}`)

  const galleryUrls: (string | null)[] = []
  for (let i = 0; i < judoka.gallery.length; i++) {
    const img = judoka.gallery[i]
    const filename = path.basename(img.src)
    const url = await uploadImage(img.src, `${ownerId}/${filename}`)
    galleryUrls.push(url)
    console.log(`  gallery[${i}]: ${url ?? 'skipped'}`)
  }

  // 3. Insert profile
  console.log('\nInserting profile...')
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .insert({
      owner_id:          ownerId,
      slug:              judoka.slug,
      first_name:        judoka.identity.firstName,
      last_name:         judoka.identity.lastName,
      club:              judoka.identity.club,
      category:          judoka.identity.weightCategory,
      grade:             judoka.identity.grade,
      bio:               judoka.bio,
      profile_photo_url: profileUrl,
      cover_photo_url:   coverUrl,
      layout:            judoka.layout,
      published:         true,
      parental_consent:  false,
    })
    .select('id')
    .single()

  if (profileErr) throw new Error(`Insert profile failed: ${profileErr.message}`)
  const profileId = (profile as { id: string }).id
  console.log(`  Profile UUID: ${profileId}`)

  // 4. Insert palmares
  console.log('\nInserting palmares...')
  const palmaresRows = judoka.palmares.map((p, i) => ({
    profile_id:  profileId,
    date:        p.date || null,
    competition: p.competition,
    result:      p.result,
    category:    p.category || null,
    level:       p.level ?? null,
    medal:       p.medal ?? null,
    city:        p.city ?? null,
    position:    i,
  }))
  const { error: palErr } = await supabase.from('palmares').insert(palmaresRows)
  if (palErr) throw new Error(`Insert palmares failed: ${palErr.message}`)

  // 5. Insert videos
  console.log('Inserting videos...')
  const videoRows = judoka.videos.map((v, i) => ({
    profile_id:  profileId,
    title:       v.title,
    youtube_url: v.youtubeUrl,
    description: v.description,
    position:    i,
  }))
  const { error: vidErr } = await supabase.from('videos').insert(videoRows)
  if (vidErr) throw new Error(`Insert videos failed: ${vidErr.message}`)

  // 6. Insert gallery_photos
  console.log('Inserting gallery photos...')
  const galleryRows = judoka.gallery.map((g, i) => ({
    profile_id: profileId,
    photo_url:  galleryUrls[i],
    caption:    g.caption,
    position:   i,
  }))
  const { error: galErr } = await supabase.from('gallery_photos').insert(galleryRows)
  if (galErr) throw new Error(`Insert gallery_photos failed: ${galErr.message}`)

  // 7. Summary
  console.log('\n─────────────────────────────────────────────')
  console.log('Migration complete')
  console.log(`  Profile UUID   : ${profileId}`)
  console.log(`  palmares       : ${palmaresRows.length} rows`)
  console.log(`  videos         : ${videoRows.length} rows`)
  console.log(`  gallery_photos : ${galleryRows.length} rows`)
  console.log('\n⚠  parental_consent is FALSE.')
  console.log('   Set it to true in Supabase → Table Editor → profiles once consent is obtained.')
}

main().catch((err: Error) => {
  console.error('\n✗ Migration failed:', err.message)
  process.exit(1)
})
