# Mock Data Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter les colonnes manquantes au schéma palmares, créer le bucket Storage "media", renommer le fichier seed, et créer le script de migration ponctuel `scripts/migrate-mock-data.ts`.

**Architecture:** Trois tâches indépendantes en séquence : d'abord les SQL migrations (schéma + storage), ensuite le rename + mise à jour des imports, enfin le script de migration TypeScript autonome (hors Next.js, utilise `@supabase/supabase-js` directement avec SERVICE_ROLE_KEY).

**Tech Stack:** TypeScript, `tsx`, `dotenv`, `@supabase/supabase-js`, Node.js `fs`/`path`

## Global Constraints

- Ne jamais modifier `supabase/migrations/0001_init.sql` — le schéma existant est figé
- `SUPABASE_SERVICE_ROLE_KEY` ne doit apparaître **que** dans `.env.local` (gitignorée) et être lue dans le script via `dotenv` — jamais dans l'app Next.js
- Le script ne doit **pas** être lancé pendant l'implémentation — uniquement créé
- Vérification : `npx tsc --noEmit` doit passer après chaque tâche TypeScript
- `npm run build` doit passer après la Task 2 (le rename casse les imports si mal fait)
- Toutes les images à uploader sont dans `public/images/` — le script lit `process.cwd()` comme racine
- `dotenv` doit être installé comme devDependency directe (pas de dépendance transitive implicite)

---

### Task 1: Migrations SQL — colonnes palmares + bucket Storage

**Files:**
- Create: `supabase/migrations/0002_palmares_columns.sql`
- Create: `supabase/migrations/0003_storage.sql`

**Interfaces:**
- Produces: deux fichiers SQL à exécuter manuellement dans l'éditeur SQL Supabase (dans cet ordre : 0002 puis 0003)

- [ ] **Step 1: Créer `supabase/migrations/0002_palmares_columns.sql`**

```sql
-- 0002_palmares_columns.sql
-- Ajoute les colonnes manquantes à la table palmares.
-- Run in the Supabase SQL Editor after 0001_init.sql.

alter table public.palmares add column level text;
alter table public.palmares add column medal text;
alter table public.palmares add column city  text;
```

- [ ] **Step 2: Créer `supabase/migrations/0003_storage.sql`**

```sql
-- 0003_storage.sql
-- Crée le bucket "media" (lecture publique) et la policy d'écriture.
-- Run in the Supabase SQL Editor after 0002_palmares_columns.sql.

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Chaque utilisateur authentifié peut gérer uniquement son propre dossier {uid}/
create policy "users_manage_own_folder"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_palmares_columns.sql supabase/migrations/0003_storage.sql
git commit -m "feat: add palmares columns and storage bucket migration"
```

---

### Task 2: Renommer `judokas.json` → `judokas.seed.json` et mettre à jour les imports

**Files:**
- Rename: `data/judokas.json` → `data/judokas.seed.json`
- Modify: `lib/judokaService.ts:1` (import path)
- Modify: `app/[slug]/page.tsx:9` (import path)

**Interfaces:**
- Consumes: rien de nouveau
- Produces: `data/judokas.seed.json` lisible par le script de migration (Task 3) et par l'app Next.js

- [ ] **Step 1: Renommer le fichier**

```bash
git mv data/judokas.json data/judokas.seed.json
```

- [ ] **Step 2: Mettre à jour `lib/judokaService.ts`**

Remplacer la ligne 1 :

```ts
import judokasData from '@/data/judokas.seed.json'
```

Le reste du fichier est inchangé :

```ts
import judokasData from '@/data/judokas.seed.json'
import type { JudokaData } from '@/types/judoka'
import { normalizeText } from '@/lib/slugify'

const judokas = judokasData as JudokaData[]

export async function getJudokaBySlug(slug: string): Promise<JudokaData | null> {
  return judokas.find((j) => j.slug === slug) ?? null
}

export async function searchJudokas(query: string): Promise<JudokaData[]> {
  const normalized = normalizeText(query)
  if (!normalized) return []
  return judokas.filter((j) => {
    const fullName = normalizeText(`${j.identity.firstName} ${j.identity.lastName}`)
    return fullName.includes(normalized)
  })
}
```

- [ ] **Step 3: Mettre à jour `app/[slug]/page.tsx`**

Remplacer uniquement la ligne 9 :

```ts
import judokasData from '@/data/judokas.seed.json'
```

Les autres lignes restent identiques.

- [ ] **Step 4: Type-check et build**

```bash
npx tsc --noEmit
```

Expected: no errors.

```bash
npm run build
```

Expected: build réussi, 9 routes générées. Si erreur `Cannot find module '@/data/judokas.json'`, vérifier que les deux imports ont été mis à jour.

- [ ] **Step 5: Commit**

```bash
git add data/judokas.seed.json lib/judokaService.ts app/[slug]/page.tsx
git commit -m "feat: rename judokas.json to judokas.seed.json"
```

---

### Task 3: Script de migration `scripts/migrate-mock-data.ts`

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `.env.local` (ajouter `SUPABASE_SERVICE_ROLE_KEY`)
- Create: `scripts/migrate-mock-data.ts`

**Interfaces:**
- Consumes:
  - `data/judokas.seed.json` (Task 2)
  - `public/images/*.jpg`
  - `NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` depuis `.env.local`
- Produces: script exécutable via `npx tsx scripts/migrate-mock-data.ts <owner-uuid>`

- [ ] **Step 1: Installer les devDependencies**

```bash
npm install -D tsx dotenv
```

Expected: `tsx` et `dotenv` apparaissent dans `devDependencies` de `package.json`.

- [ ] **Step 2: Ajouter `SUPABASE_SERVICE_ROLE_KEY` à `.env.local`**

Ajouter à la fin du fichier `.env.local` existant :

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Récupérer la vraie valeur dans Supabase → Settings → API → `service_role` (secret key). Ce fichier est gitignorée — ne pas le commiter.

- [ ] **Step 3: Créer `scripts/migrate-mock-data.ts`**

```ts
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
  for (const [i, img] of judoka.gallery.entries()) {
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
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. Si erreur `Cannot find module 'dotenv'`, vérifier que l'install de l'étape 1 a bien tourné.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json scripts/migrate-mock-data.ts
git commit -m "feat: add mock data migration script"
```

Ne pas commiter `.env.local` — il est gitignorée.

---

## Commande finale pour lancer la migration

Une fois que Timothé s'est connecté via Google et que tu as son UUID :

```bash
npx tsx scripts/migrate-mock-data.ts <uuid-timothe>
```

L'UUID de Timothé se trouve dans Supabase dashboard → Authentication → Users, ou dans la console de l'app après connexion sur `/dashboard`.
