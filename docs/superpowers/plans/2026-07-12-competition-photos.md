# Competition Photos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-photo galleries to palmares entries with unique slugged URLs and public competition detail pages.

**Architecture:** New `competition_photos` table (FK → palmares → profiles) + `competition_slug` column on `palmares`. Server Actions for photo CRUD. Dashboard accordion per palmares entry for photo management. Public SSR page at `/[slug]/competition/[competitionSlug]`. Conditional `<Link>` wrappers in `PalmaresBlock` and `HeroBlock` when photos exist.

**Tech stack:** Next.js 14 App Router, TypeScript, Vitest (`npm test`), Supabase (PostgreSQL + Storage bucket `"media"`), Tailwind IpponId tokens, Server Actions.

## Global Constraints

- Design tokens only — never hardcode hex. Use: `primary`, `primary-container`, `tertiary-container`, `surface-container-lowest`, `on-surface-variant`, `on-surface`, `medal-gold`, `medal-silver`, `medal-bronze`, `outline-variant`
- Section headers: `w-1 h-8 bg-tertiary-container` accent bar + `font-montserrat text-headline-md font-bold text-primary uppercase`
- Layout spacing: `px-margin-mobile md:px-margin-desktop`, max-width `max-w-container-max mx-auto`
- Storage path for competition photos: `{owner_id}/competitions/{palmares_id}/{timestamp}.{ext}` in bucket `"media"`
- No new npm dependencies — `@dnd-kit` not installed → use ↑↓ buttons for reordering
- Next migration number: `0014`
- Fonts: `font-montserrat` (headlines/numbers), `font-inter` (body/labels)
- Server Actions: `'use server'` at file top, follow exact pattern of `app/dashboard/[profileId]/palmares/actions.ts`
- Test runner: `npx vitest run` or `npm test`

---

## File Map

| File | Action |
|---|---|
| `supabase/migrations/0014_competition_photos.sql` | CREATE |
| `lib/slugify.ts` | MODIFY — add `generateCompetitionSlug`, `resolveUniqueCompetitionSlug` |
| `types/judoka.ts` | MODIFY — add `competitionSlug?`, `photosCount?` to `PalmaresEntry` |
| `lib/judokaService.ts` | MODIFY — palmares query includes `competition_slug` + photo count |
| `lib/competitionService.ts` | CREATE |
| `app/dashboard/[profileId]/palmares/actions.ts` | MODIFY — slug in `addPalmares`/`updatePalmares` + 4 new photo actions |
| `app/dashboard/[profileId]/palmares/page.tsx` | MODIFY — add `owner_id`, `competition_slug`, photo count to SELECT |
| `components/dashboard/PalmaresManager.tsx` | MODIFY — add `ownerId` prop + accordion trigger per entry |
| `components/dashboard/CompetitionPhotoAccordion.tsx` | CREATE |
| `app/[slug]/competition/[competitionSlug]/page.tsx` | CREATE |
| `components/blocks/PalmaresBlock.tsx` | MODIFY — conditional Link wrapping |
| `components/blocks/HeroBlock.tsx` | MODIFY — conditional Link on highlights |
| `app/sitemap.ts` | MODIFY — add competition pages |
| `__tests__/unit/competitionSlug.test.ts` | CREATE |
| `__tests__/security/competitionPhotos.test.ts` | CREATE |

---

## Task 1: Slug utilities (TDD)

**Files:**
- Modify: `lib/slugify.ts`
- Create: `__tests__/unit/competitionSlug.test.ts`

**Interfaces:**
- Produces: `generateCompetitionSlug(competition: string, date: string): string`
- Produces: `resolveUniqueCompetitionSlug(baseSlug: string, existingSlugs: string[]): string`

- [ ] **Step 1: Write the failing test**

Create `__tests__/unit/competitionSlug.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateCompetitionSlug, resolveUniqueCompetitionSlug } from '@/lib/slugify'

describe('generateCompetitionSlug', () => {
  it('generates slug from competition name and year', () => {
    expect(generateCompetitionSlug('Open de Marseille', '2025-03-15'))
      .toBe('open-de-marseille-2025')
  })

  it('handles accents and special characters', () => {
    expect(generateCompetitionSlug('Championnat de France par équipe', '2026-05-02'))
      .toBe('championnat-de-france-par-equipe-2026')
  })

  it('collapses multiple spaces and symbols', () => {
    expect(generateCompetitionSlug('  Open  /  Lyon  ', '2025-01-10'))
      .toBe('open-lyon-2025')
  })
})

describe('resolveUniqueCompetitionSlug', () => {
  it('returns the base slug when no conflict', () => {
    expect(resolveUniqueCompetitionSlug('open-de-marseille-2025', []))
      .toBe('open-de-marseille-2025')
  })

  it('appends -2 when base slug is already taken', () => {
    expect(resolveUniqueCompetitionSlug('open-de-marseille-2025', ['open-de-marseille-2025']))
      .toBe('open-de-marseille-2025-2')
  })

  it('increments counter until a free slot is found', () => {
    const taken = ['open-de-marseille-2025', 'open-de-marseille-2025-2']
    expect(resolveUniqueCompetitionSlug('open-de-marseille-2025', taken))
      .toBe('open-de-marseille-2025-3')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```
npx vitest run __tests__/unit/competitionSlug.test.ts
```

Expected: `FAIL` — `generateCompetitionSlug` not found.

- [ ] **Step 3: Implement in `lib/slugify.ts`**

Add to the end of the existing file (after `generateSlug`):

```ts
export function generateCompetitionSlug(competition: string, date: string): string {
  const year = date.slice(0, 4)
  return normalizeText(`${competition} ${year}`)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function resolveUniqueCompetitionSlug(
  baseSlug: string,
  existingSlugs: string[]
): string {
  if (!existingSlugs.includes(baseSlug)) return baseSlug
  let counter = 2
  while (existingSlugs.includes(`${baseSlug}-${counter}`)) {
    counter++
  }
  return `${baseSlug}-${counter}`
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npx vitest run __tests__/unit/competitionSlug.test.ts
```

Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/slugify.ts __tests__/unit/competitionSlug.test.ts
git commit -m "feat: add generateCompetitionSlug and resolveUniqueCompetitionSlug"
```

---

## Task 2: DB Migration

**Files:**
- Create: `supabase/migrations/0014_competition_photos.sql`

**Interfaces:**
- Produces: `palmares.competition_slug` column
- Produces: `competition_photos` table with RLS

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/0014_competition_photos.sql`:

```sql
-- 0014_competition_photos.sql
-- Adds competition_slug to palmares + new competition_photos table with RLS.

-- ─── 1. competition_slug on palmares ─────────────────────────────────────────

ALTER TABLE public.palmares
  ADD COLUMN competition_slug text;

-- UNIQUE constraint: PostgreSQL allows multiple NULLs in a UNIQUE constraint
-- (NULL ≠ NULL in SQL), so existing entries without a slug are fine.
ALTER TABLE public.palmares
  ADD CONSTRAINT palmares_profile_competition_slug_unique
  UNIQUE (profile_id, competition_slug);

-- ─── 2. Table competition_photos ─────────────────────────────────────────────

CREATE TABLE public.competition_photos (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  palmares_id uuid        NOT NULL REFERENCES public.palmares(id) ON DELETE CASCADE,
  profile_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_url   text        NOT NULL,
  caption     text,
  position    int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX competition_photos_palmares_id_idx
  ON public.competition_photos (palmares_id);

ALTER TABLE public.competition_photos ENABLE ROW LEVEL SECURITY;

-- ─── 3. RLS policies ─────────────────────────────────────────────────────────

-- Anon: public and private profiles (same pattern as gallery_photos in 0012)
CREATE POLICY "anon_read_accessible_competition_photos"
  ON public.competition_photos FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = profile_id AND visibility IN ('public', 'private')
    )
  );

-- Auth: public/private/draft if owner or manager
CREATE POLICY "auth_read_accessible_competition_photos"
  ON public.competition_photos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = profile_id
        AND (
          visibility IN ('public', 'private')
          OR EXISTS (
            SELECT 1 FROM public.profile_access
            WHERE profile_id = profiles.id
              AND account_id = auth.uid()
              AND role IN ('owner', 'manager')
          )
        )
    )
  );

-- Auth write: owner or manager only
CREATE POLICY "access_write_competition_photos"
  ON public.competition_photos FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profile_access
      WHERE profile_id = competition_photos.profile_id
        AND account_id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profile_access
      WHERE profile_id = competition_photos.profile_id
        AND account_id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  );
```

- [ ] **Step 2: Apply the migration**

In the Supabase dashboard SQL editor, run the contents of `0014_competition_photos.sql`.

Or with the CLI (if supabase CLI is set up):
```
npx supabase db push
```

- [ ] **Step 3: Verify in dashboard**

Check that:
- `palmares` table has `competition_slug` column
- `competition_photos` table exists with the 7 columns
- 3 RLS policies exist on `competition_photos`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0014_competition_photos.sql
git commit -m "feat(db): add competition_photos table and competition_slug on palmares"
```

---

## Task 3: Types + judokaService

**Files:**
- Modify: `types/judoka.ts` lines 19-29
- Modify: `lib/judokaService.ts`

**Interfaces:**
- Modifies: `PalmaresEntry` — adds optional `competitionSlug?: string` and `photosCount?: number`
- Modifies: `getJudokaBySlug` — palmares now carries these new fields

- [ ] **Step 1: Update `types/judoka.ts`**

In `types/judoka.ts`, change the `PalmaresEntry` interface from:

```ts
export interface PalmaresEntry {
  id?: string
  date: string
  competition: string
  result: string
  category: string
  level: string
  medal: MedalType
  city?: string
  podiumPhoto?: string
}
```

to:

```ts
export interface PalmaresEntry {
  id?: string
  date: string
  competition: string
  result: string
  category: string
  level: string
  medal: MedalType
  city?: string
  podiumPhoto?: string
  competitionSlug?: string
  photosCount?: number
}
```

- [ ] **Step 2: Update `lib/judokaService.ts` — PalmaresRow type**

In `lib/judokaService.ts`, update the `PalmaresRow` type (around line 9) from:

```ts
type PalmaresRow = {
  id?: string | null
  date: string | null
  competition: string | null
  result: string | null
  category: string | null
  level: string | null
  medal: string | null
  city: string | null
  position: number | null
}
```

to:

```ts
type PalmaresRow = {
  id?: string | null
  date: string | null
  competition: string | null
  result: string | null
  category: string | null
  level: string | null
  medal: string | null
  city: string | null
  position: number | null
  competition_slug: string | null
  competition_photos: { id: string }[]
}
```

- [ ] **Step 3: Update `lib/judokaService.ts` — Supabase query**

In `getJudokaBySlug`, change the select string from:

```ts
.select(`
  *,
  clubs(id, name),
  palmares (*),
  videos (*),
  gallery_photos (*)
`)
```

to:

```ts
.select(`
  *,
  clubs(id, name),
  palmares (*, competition_photos(id)),
  videos (*),
  gallery_photos (*)
`)
```

- [ ] **Step 4: Update `lib/judokaService.ts` — mapper**

In the `mapProfile` function, change the palmares mapping from:

```ts
palmares: palmares.map((p) => ({
  id: p.id ?? undefined,
  date: p.date ?? '',
  competition: p.competition ?? '',
  result: p.result ?? '',
  category: p.category ?? '',
  level: p.level ?? '',
  medal: (p.medal as MedalType) ?? null,
  city: p.city ?? undefined,
})),
```

to:

```ts
palmares: palmares.map((p) => ({
  id: p.id ?? undefined,
  date: p.date ?? '',
  competition: p.competition ?? '',
  result: p.result ?? '',
  category: p.category ?? '',
  level: p.level ?? '',
  medal: (p.medal as MedalType) ?? null,
  city: p.city ?? undefined,
  competitionSlug: p.competition_slug ?? undefined,
  photosCount: p.competition_photos?.length ?? 0,
})),
```

- [ ] **Step 5: Type-check**

```
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add types/judoka.ts lib/judokaService.ts
git commit -m "feat: extend PalmaresEntry with competitionSlug and photosCount"
```

---

## Task 4: competitionService.ts

**Files:**
- Create: `lib/competitionService.ts`

**Interfaces:**
- Produces: `CompetitionPhoto { id, photo_url, caption, position }`
- Produces: `CompetitionPage { palmares, photos, profile }`
- Produces: `getCompetitionBySlug(profileSlug, competitionSlug): Promise<CompetitionPage | null>`
- Produces: `getCompetitionPhotos(palmaresId): Promise<CompetitionPhoto[]>`

- [ ] **Step 1: Create `lib/competitionService.ts`**

```ts
import { createClient } from '@/lib/supabase/server'

export interface CompetitionPhoto {
  id: string
  photo_url: string
  caption: string | null
  position: number
}

export interface CompetitionPage {
  palmares: {
    id: string
    competition: string
    date: string
    result: string
    category: string | null
    level: string | null
    medal: string | null
    city: string | null
    competition_slug: string
  }
  photos: CompetitionPhoto[]
  profile: {
    slug: string
    firstName: string
    lastName: string
    profilePhotoUrl: string | null
    visibility: 'public' | 'private'
  }
}

export async function getCompetitionBySlug(
  profileSlug: string,
  competitionSlug: string
): Promise<CompetitionPage | null> {
  const supabase = createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, slug, first_name, last_name, profile_photo_url, visibility')
    .eq('slug', profileSlug)
    .in('visibility', ['public', 'private'])
    .maybeSingle()

  if (!profile) return null

  const { data: entry } = await supabase
    .from('palmares')
    .select('id, competition, date, result, category, level, medal, city, competition_slug')
    .eq('profile_id', profile.id)
    .eq('competition_slug', competitionSlug)
    .maybeSingle()

  if (!entry || !entry.competition_slug) return null

  const { data: photos } = await supabase
    .from('competition_photos')
    .select('id, photo_url, caption, position')
    .eq('palmares_id', entry.id)
    .order('position', { ascending: true })

  return {
    palmares: entry as CompetitionPage['palmares'],
    photos: (photos ?? []) as CompetitionPhoto[],
    profile: {
      slug: profile.slug,
      firstName: profile.first_name,
      lastName: profile.last_name,
      profilePhotoUrl: profile.profile_photo_url,
      visibility: profile.visibility as 'public' | 'private',
    },
  }
}

export async function getCompetitionPhotos(
  palmaresId: string
): Promise<CompetitionPhoto[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('competition_photos')
    .select('id, photo_url, caption, position')
    .eq('palmares_id', palmaresId)
    .order('position', { ascending: true })
  return (data ?? []) as CompetitionPhoto[]
}
```

- [ ] **Step 2: Type-check**

```
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add lib/competitionService.ts
git commit -m "feat: add competitionService with getCompetitionBySlug"
```

---

## Task 5: Dashboard Server Actions

**Files:**
- Modify: `app/dashboard/[profileId]/palmares/actions.ts`

**Interfaces:**
- Modifies: `addPalmares` — now also sets `competition_slug`
- Modifies: `updatePalmares` — now also sets `competition_slug`
- Produces: `fetchCompetitionPhotos(palmaresId: string): Promise<CompetitionPhoto[]>`
- Produces: `addCompetitionPhoto(palmaresId, profileId, ownerId, photoUrl): Promise<{ ok: boolean; photo?: CompetitionPhoto }>`
- Produces: `deleteCompetitionPhoto(photoId, photoUrl): Promise<{ ok: boolean }>`
- Produces: `updateCompetitionPhotoCaption(photoId, caption): Promise<{ ok: boolean }>`
- Produces: `reorderCompetitionPhotos(orderedIds: string[]): Promise<{ ok: boolean }>`

- [ ] **Step 1: Add imports and the slug helper at top of actions.ts**

After the existing import block in `app/dashboard/[profileId]/palmares/actions.ts`, add:

```ts
import { generateCompetitionSlug, resolveUniqueCompetitionSlug } from '@/lib/slugify'
import type { CompetitionPhoto } from '@/lib/competitionService'
```

After `getSlug` helper function, add:

```ts
async function buildCompetitionSlug(
  supabase: ReturnType<typeof createClient>,
  profileId: string,
  competition: string,
  date: string,
  excludeId?: string
): Promise<string | null> {
  if (!competition || !date) return null
  const base = generateCompetitionSlug(competition, date)
  // Must use let + reassign: each Supabase chain method returns a new builder
  let queryBuilder = supabase
    .from('palmares')
    .select('competition_slug')
    .eq('profile_id', profileId)
    .not('competition_slug', 'is', null)
  if (excludeId) {
    queryBuilder = queryBuilder.neq('id', excludeId)
  }
  const { data: existing } = await queryBuilder
  const taken = (existing ?? [])
    .map((r: { competition_slug: string | null }) => r.competition_slug)
    .filter(Boolean) as string[]
  return resolveUniqueCompetitionSlug(base, taken)
}
```

- [ ] **Step 2: Update `addPalmares` to persist `competition_slug`**

In `addPalmares`, after `const { medal, result } = deriveFromPosition(position)` and before the insert, add:

```ts
const competition = (formData.get('competition') as string) || null
const date = (formData.get('date') as string) || null
const competitionSlug = competition && date
  ? await buildCompetitionSlug(supabase, profileId, competition, date)
  : null
```

Then in the `.insert({...})` object, add the `competition_slug` field:

```ts
.insert({
  profile_id: profileId,
  date: date,
  competition: competition,
  city: (formData.get('city') as string) || null,
  category: (formData.get('category') as string) || null,
  level: (formData.get('level') as string) || null,
  position,
  medal,
  result,
  competition_slug: competitionSlug,
})
```

Note: also remove the duplicate `date` and `competition` local variables that were previously inline in the insert call.

- [ ] **Step 3: Update `updatePalmares` to persist `competition_slug`**

In `updatePalmares`, after `const id = formData.get('id') as string`, add:

```ts
const competition = (formData.get('competition') as string) || null
const date = (formData.get('date') as string) || null
const competitionSlug = competition && date
  ? await buildCompetitionSlug(supabase, profileId, competition, date, id)
  : null
```

In the `.update({...})` object, add `competition_slug: competitionSlug`. Also replace the inline `formData.get('competition')` and `formData.get('date')` with the local variables `competition` and `date`.

The complete updated `updatePalmares`:

```ts
export async function updatePalmares(formData: FormData): Promise<{ ok: boolean }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const profileId = formData.get('profileId') as string
    if (!(await canEditProfile(profileId, user.id))) return { ok: false }

    const id = formData.get('id') as string
    const competition = (formData.get('competition') as string) || null
    const date = (formData.get('date') as string) || null
    const position = Number(formData.get('position'))
    const { medal, result } = deriveFromPosition(position)
    const competitionSlug = competition && date
      ? await buildCompetitionSlug(supabase, profileId, competition, date, id)
      : null

    await supabase
      .from('palmares')
      .update({
        date,
        competition,
        city: (formData.get('city') as string) || null,
        category: (formData.get('category') as string) || null,
        level: (formData.get('level') as string) || null,
        position,
        medal,
        result,
        competition_slug: competitionSlug,
      })
      .eq('id', id)
      .eq('profile_id', profileId)

    const slug = await getSlug(supabase, profileId)
    revalidatePath(`/dashboard/${profileId}/palmares`)
    if (slug) revalidatePath(`/${slug}`)
    return { ok: true }
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
    return { ok: false }
  }
}
```

- [ ] **Step 4: Add photo Server Actions at the end of actions.ts**

Append after `deletePalmares`:

```ts
// ─── Competition photo actions ────────────────────────────────────────────────

export async function fetchCompetitionPhotos(
  palmaresId: string
): Promise<CompetitionPhoto[]> {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('competition_photos')
      .select('id, photo_url, caption, position')
      .eq('palmares_id', palmaresId)
      .order('position', { ascending: true })
    return (data ?? []) as CompetitionPhoto[]
  } catch {
    return []
  }
}

export async function addCompetitionPhoto(
  palmaresId: string,
  profileId: string,
  photoUrl: string,
  position: number
): Promise<{ ok: boolean; photo?: CompetitionPhoto }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false }

    const { data, error } = await supabase
      .from('competition_photos')
      .insert({ palmares_id: palmaresId, profile_id: profileId, photo_url: photoUrl, position })
      .select('id, photo_url, caption, position')
      .single()

    if (error || !data) return { ok: false }
    return { ok: true, photo: data as CompetitionPhoto }
  } catch {
    return { ok: false }
  }
}

export async function deleteCompetitionPhoto(
  photoId: string,
  photoUrl: string
): Promise<{ ok: boolean }> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('competition_photos')
      .delete()
      .eq('id', photoId)

    if (error) return { ok: false }

    // Remove from Storage — extract path after /media/
    try {
      const url = new URL(photoUrl)
      const marker = '/object/public/media/'
      const idx = url.pathname.indexOf(marker)
      if (idx !== -1) {
        const storagePath = url.pathname.slice(idx + marker.length)
        await supabase.storage.from('media').remove([storagePath])
      }
    } catch {
      // Storage removal failure is non-fatal — DB row is already deleted
    }

    return { ok: true }
  } catch {
    return { ok: false }
  }
}

export async function updateCompetitionPhotoCaption(
  photoId: string,
  caption: string
): Promise<{ ok: boolean }> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('competition_photos')
      .update({ caption: caption || null })
      .eq('id', photoId)
    return { ok: !error }
  } catch {
    return { ok: false }
  }
}

export async function reorderCompetitionPhotos(
  orderedIds: string[]
): Promise<{ ok: boolean }> {
  try {
    const supabase = createClient()
    await Promise.all(
      orderedIds.map((id, i) =>
        supabase.from('competition_photos').update({ position: i }).eq('id', id)
      )
    )
    return { ok: true }
  } catch {
    return { ok: false }
  }
}
```

- [ ] **Step 5: Type-check**

```
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/[profileId]/palmares/actions.ts
git commit -m "feat: competition_slug in palmares actions + photo management actions"
```

---

## Task 6: Dashboard — accordion UI

**Files:**
- Modify: `app/dashboard/[profileId]/palmares/page.tsx`
- Modify: `components/dashboard/PalmaresManager.tsx`
- Create: `components/dashboard/CompetitionPhotoAccordion.tsx`

**Interfaces:**
- Consumes: `fetchCompetitionPhotos`, `addCompetitionPhoto`, `deleteCompetitionPhoto`, `updateCompetitionPhotoCaption`, `reorderCompetitionPhotos` from actions
- Consumes: `CompetitionPhoto` from `lib/competitionService`
- `CompetitionPhotoAccordion` props: `{ palmaresId: string, profileId: string, ownerId: string, initialCount: number }`

- [ ] **Step 1: Update `app/dashboard/[profileId]/palmares/page.tsx`**

Change the profile SELECT to include `owner_id`:

```ts
const { data: profile } = await supabase
  .from('profiles')
  .select('slug, visibility, owner_id')
  .eq('id', profileId)
  .single()
```

Change the palmares SELECT to include `competition_slug` and photo count:

```ts
const { data: entries } = await supabase
  .from('palmares')
  .select('id, date, competition, city, category, level, position, result, medal, competition_slug, competition_photos(id)')
  .eq('profile_id', profileId)
  .order('date', { ascending: true })
```

Pass `ownerId` to `PalmaresManager`:

```tsx
<PalmaresManager
  entries={entries ?? []}
  isPublished={profile.visibility === 'public'}
  profileSlug={profile.slug}
  profileId={profileId}
  ownerId={profile.owner_id}
/>
```

- [ ] **Step 2: Update `PalmaresRow` type and `PalmaresManager` props**

In `components/dashboard/PalmaresManager.tsx`, update the `PalmaresRow` interface:

```ts
interface PalmaresRow {
  id: string
  date: string | null
  competition: string | null
  city: string | null
  category: string | null
  level: string | null
  position: number | null
  result: string | null
  medal: string | null
  competition_slug: string | null
  competition_photos: { id: string }[]
}
```

Update the `PalmaresManager` props:

```ts
export default function PalmaresManager({
  entries,
  isPublished,
  profileSlug,
  profileId,
  ownerId,
}: {
  entries: PalmaresRow[]
  isPublished: boolean
  profileSlug: string
  profileId: string
  ownerId: string
})
```

- [ ] **Step 3: Add accordion trigger to each entry card in `PalmaresManager`**

In the entry card's action buttons area (the `<div className="flex items-center gap-2 flex-shrink-0">` block), add the photo accordion trigger after the share button and before the Modifier/Supprimer buttons:

```tsx
<CompetitionPhotoAccordion
  palmaresId={entry.id}
  profileId={profileId}
  ownerId={ownerId}
  initialCount={entry.competition_photos?.length ?? 0}
/>
```

Add import at the top of `PalmaresManager.tsx`:

```ts
import CompetitionPhotoAccordion from '@/components/dashboard/CompetitionPhotoAccordion'
```

The accordion must be rendered **outside** the `editing === entry.id` branch so it's always accessible. Place the entire card like this (showing the structure change):

```tsx
<div key={entry.id} className={`bg-surface-container-lowest rounded-xl border overflow-hidden ${...}`}>
  {editing === entry.id ? (
    <div className="p-4"><PalmaresForm ... /></div>
  ) : (
    <>
      <div className="p-4 flex justify-between items-start gap-4">
        {/* existing left content unchanged */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          {/* existing share button unchanged */}
          {/* ADD: */}
          <CompetitionPhotoAccordion
            palmaresId={entry.id}
            profileId={profileId}
            ownerId={ownerId}
            initialCount={entry.competition_photos?.length ?? 0}
          />
          {/* existing Modifier/Supprimer buttons unchanged */}
        </div>
      </div>
      {/* existing share banner unchanged */}
    </>
  )}
</div>
```

- [ ] **Step 4: Create `components/dashboard/CompetitionPhotoAccordion.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { CompetitionPhoto } from '@/lib/competitionService'
import {
  fetchCompetitionPhotos,
  addCompetitionPhoto,
  deleteCompetitionPhoto,
  updateCompetitionPhotoCaption,
  reorderCompetitionPhotos,
} from '@/app/dashboard/[profileId]/palmares/actions'

interface Props {
  palmaresId: string
  profileId: string
  ownerId: string
  initialCount: number
}

export default function CompetitionPhotoAccordion({ palmaresId, profileId, ownerId, initialCount }: Props) {
  const [open, setOpen] = useState(false)
  const [photos, setPhotos] = useState<CompetitionPhoto[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [captions, setCaptions] = useState<Record<string, string>>({})

  const count = photos !== null ? photos.length : initialCount

  async function handleToggle() {
    if (!open && photos === null) {
      setLoading(true)
      const fetched = await fetchCompetitionPhotos(palmaresId)
      setPhotos(fetched)
      setCaptions(Object.fromEntries(fetched.map((p) => [p.id, p.caption ?? ''])))
      setLoading(false)
    }
    setOpen((v) => !v)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Fichier trop lourd (max 5 Mo).'); return }

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${ownerId}/competitions/${palmaresId}/${Date.now()}.${ext}`
    const supabase = createClient()

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(path, file, { upsert: false })

    if (uploadError) { toast.error("Erreur lors de l'upload."); setUploading(false); return }

    const { data } = supabase.storage.from('media').getPublicUrl(path)
    const position = (photos?.length ?? 0)
    const result = await addCompetitionPhoto(palmaresId, profileId, data.publicUrl, position)

    if (result.ok && result.photo) {
      setPhotos((prev) => [...(prev ?? []), result.photo!])
      setCaptions((prev) => ({ ...prev, [result.photo!.id]: '' }))
      toast.success('Photo ajoutée')
    } else {
      toast.error('Erreur lors de la sauvegarde.')
    }
    setUploading(false)
    e.target.value = ''
  }

  async function handleDelete(photo: CompetitionPhoto) {
    const result = await deleteCompetitionPhoto(photo.id, photo.photo_url)
    if (result.ok) {
      setPhotos((prev) => prev?.filter((p) => p.id !== photo.id) ?? null)
      toast.success('Photo supprimée')
    } else {
      toast.error('Erreur lors de la suppression.')
    }
  }

  async function handleCaptionSave(id: string) {
    const caption = captions[id] ?? ''
    const result = await updateCompetitionPhotoCaption(id, caption)
    if (!result.ok) toast.error('Erreur lors de la sauvegarde.')
  }

  async function handleMove(id: string, direction: 'up' | 'down') {
    if (!photos) return
    const idx = photos.findIndex((p) => p.id === id)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === photos.length - 1) return

    const newPhotos = [...photos]
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    ;[newPhotos[idx], newPhotos[swapIdx]] = [newPhotos[swapIdx], newPhotos[idx]]
    setPhotos(newPhotos)
    await reorderCompetitionPhotos(newPhotos.map((p) => p.id))
  }

  return (
    <div className="w-full">
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant hover:text-primary transition-colors"
        aria-expanded={open}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
        </svg>
        {count > 0 ? `${count} photo${count > 1 ? 's' : ''}` : 'Photos'}
      </button>

      {/* Accordion panel */}
      {open && (
        <div className="mt-3 border-t border-outline-variant pt-3">
          {loading ? (
            <p className="text-xs text-on-surface-variant">Chargement…</p>
          ) : (
            <>
              {/* Photo grid */}
              {(photos ?? []).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {(photos ?? []).map((photo, idx) => (
                    <div key={photo.id} className="flex flex-col gap-1" style={{ width: 96 }}>
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-surface-container border border-outline-variant group">
                        <Image
                          src={photo.photo_url}
                          alt={photo.caption ?? `Photo ${idx + 1}`}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                        <button
                          type="button"
                          onClick={() => handleDelete(photo)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Supprimer cette photo"
                        >
                          ✕
                        </button>
                      </div>
                      {/* Reorder buttons */}
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleMove(photo.id, 'up')}
                          disabled={idx === 0}
                          className="text-xs px-1.5 py-0.5 rounded border border-outline-variant text-on-surface-variant hover:text-primary disabled:opacity-30 transition-colors"
                          aria-label="Déplacer vers la gauche"
                        >↑</button>
                        <button
                          type="button"
                          onClick={() => handleMove(photo.id, 'down')}
                          disabled={idx === (photos ?? []).length - 1}
                          className="text-xs px-1.5 py-0.5 rounded border border-outline-variant text-on-surface-variant hover:text-primary disabled:opacity-30 transition-colors"
                          aria-label="Déplacer vers la droite"
                        >↓</button>
                      </div>
                      {/* Caption */}
                      <input
                        type="text"
                        value={captions[photo.id] ?? ''}
                        onChange={(e) => setCaptions((prev) => ({ ...prev, [photo.id]: e.target.value }))}
                        onBlur={() => handleCaptionSave(photo.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur() } }}
                        placeholder="Légende…"
                        className="w-full text-xs border border-outline-variant rounded px-1.5 py-1 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button */}
              <label className={`inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                {uploading ? 'Envoi…' : 'Ajouter une photo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
            </>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Type-check**

```
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Manual test**

Start dev server (`npm run dev`). Go to `/dashboard/[profileId]/palmares`. Verify:
- Each palmares entry shows a "Photos" button
- Clicking opens the accordion (loads with spinner, then shows empty state)
- Uploading a photo adds it to the grid
- Delete button removes the photo (with hover reveal)
- ↑↓ buttons reorder photos
- Caption saves on blur

- [ ] **Step 7: Commit**

```bash
git add app/dashboard/[profileId]/palmares/page.tsx components/dashboard/PalmaresManager.tsx components/dashboard/CompetitionPhotoAccordion.tsx
git commit -m "feat: competition photo accordion in palmares dashboard"
```

---

## Task 7: Public competition page

**Files:**
- Create: `app/[slug]/competition/[competitionSlug]/page.tsx`

**Interfaces:**
- Consumes: `getCompetitionBySlug` from `lib/competitionService`
- Consumes: `Lightbox` from `components/Lightbox`
- Consumes: existing OG route `/api/og/result/[slug]/[resultId]`

- [ ] **Step 1: Create `app/[slug]/competition/[competitionSlug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getCompetitionBySlug } from '@/lib/competitionService'
import CompetitionPhotosGallery from '@/components/CompetitionPhotosGallery'

type Props = { params: { slug: string; competitionSlug: string } }

const MEDAL_STYLES: Record<string, { color: string; label: string; rank: string }> = {
  gold:   { color: '#FFD700', label: 'Médaille d\'or',    rank: '1' },
  silver: { color: '#C0C0C0', label: 'Médaille d\'argent', rank: '2' },
  bronze: { color: '#CD7F32', label: 'Médaille de bronze', rank: '3' },
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getCompetitionBySlug(params.slug, params.competitionSlug)
  if (!data) return {}

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ipponid.com'
  const year = data.palmares.date?.slice(0, 4) ?? ''
  const name = `${data.profile.firstName} ${data.profile.lastName}`
  const ogImageUrl = `${siteUrl}/api/og/result/${params.slug}/${data.palmares.id}`

  const base: Metadata = {
    title: `${name} — ${data.palmares.competition} ${year} · IpponId`,
    description: `Résultat et photos de ${name} à ${data.palmares.competition} ${year} — ${data.palmares.result}`,
    openGraph: {
      title: `${name} — ${data.palmares.competition} ${year}`,
      description: `${data.palmares.result} · IpponId`,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      type: 'article',
      locale: 'fr_FR',
      siteName: 'IpponId',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} — ${data.palmares.competition} ${year}`,
      images: [ogImageUrl],
    },
  }

  if (data.profile.visibility === 'private') {
    return { ...base, robots: { index: false, follow: false } }
  }
  return base
}

function buildSportsEventJsonLd(data: NonNullable<Awaited<ReturnType<typeof getCompetitionBySlug>>>) {
  if (!data.palmares.date) return null
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ipponid.com'
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: data.palmares.competition,
    startDate: data.palmares.date,
    ...(data.palmares.city ? { location: { '@type': 'Place', name: data.palmares.city } } : {}),
    url: `${siteUrl}/${data.profile.slug}/competition/${data.palmares.competition_slug}`,
  }
}

export default async function CompetitionPage({ params }: Props) {
  const data = await getCompetitionBySlug(params.slug, params.competitionSlug)
  if (!data) notFound()

  const year = data.palmares.date?.slice(0, 4) ?? ''
  const medal = data.palmares.medal ? MEDAL_STYLES[data.palmares.medal] : null
  const formattedDate = data.palmares.date
    ? new Date(data.palmares.date).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  const sportsEventJsonLd = buildSportsEventJsonLd(data)

  return (
    <>
      {sportsEventJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(sportsEventJsonLd) }}
        />
      )}

      <div className="min-h-screen bg-surface-container-lowest">
        {/* Breadcrumb */}
        <div className="bg-primary-container">
          <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto py-4">
            <Link
              href={`/${data.profile.slug}`}
              className="flex items-center gap-2 font-inter text-sm text-white/70 hover:text-white transition-colors w-fit"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Retour au profil de {data.profile.firstName} {data.profile.lastName}
            </Link>
          </div>
        </div>

        {/* Hero compact */}
        <div className="bg-primary-container pb-10 pt-2">
          <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
            {/* Competition name */}
            <h1 className="font-montserrat text-3xl md:text-5xl font-black text-white uppercase tracking-tight leading-tight mb-3">
              {data.palmares.competition}
            </h1>

            {/* Date + city */}
            {(formattedDate || data.palmares.city) && (
              <p className="font-inter text-sm text-white/60 mb-4">
                {[formattedDate, data.palmares.city].filter(Boolean).join(' · ')}
              </p>
            )}

            {/* Result badges */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {medal ? (
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-montserrat text-sm font-black text-white shadow-lg flex-shrink-0"
                    style={{ background: `radial-gradient(circle at 35% 35%, ${medal.color}, ${medal.color}99)` }}
                    aria-label={medal.label}
                  >
                    {medal.rank}
                  </div>
                  <span className="font-montserrat text-lg font-black text-white">
                    {data.palmares.result}
                  </span>
                </div>
              ) : (
                <span className="font-inter text-base font-semibold text-white/80">
                  {data.palmares.result}
                </span>
              )}
              {data.palmares.category && (
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10 text-white border border-white/20">
                  {data.palmares.category}
                </span>
              )}
              {data.palmares.level && (
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10 text-white border border-white/20">
                  {data.palmares.level}
                </span>
              )}
            </div>

            {/* Athlete credit */}
            <Link
              href={`/${data.profile.slug}`}
              className="inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20 transition-colors"
            >
              {data.profile.profilePhotoUrl ? (
                <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={data.profile.profilePhotoUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                  <span className="font-montserrat font-black text-white text-xs uppercase">
                    {data.profile.firstName[0]}{data.profile.lastName[0]}
                  </span>
                </div>
              )}
              <span className="font-inter text-sm font-semibold text-white">
                {data.profile.firstName} {data.profile.lastName}
              </span>
            </Link>
          </div>
        </div>

        {/* Photos section */}
        {data.photos.length > 0 && (
          <section className="py-10 md:py-14">
            <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
                <h2 className="font-montserrat text-headline-md font-bold text-primary uppercase">
                  Photos de la compétition
                </h2>
              </div>
              <CompetitionPhotosGallery
                photos={data.photos.map((p) => ({ src: p.photo_url, caption: p.caption ?? '' }))}
              />
            </div>
          </section>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Create `components/CompetitionPhotosGallery.tsx`**

This is a thin client wrapper around the existing `Lightbox` component to keep the competition page itself a server component:

```tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import Lightbox from '@/components/Lightbox'
import type { GalleryImage } from '@/types/judoka'

interface Props {
  photos: GalleryImage[]
}

export default function CompetitionPhotosGallery({ photos }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {photos.map((photo, i) => (
          <figure
            key={i}
            onClick={() => setLightboxIndex(i)}
            className="relative overflow-hidden rounded-xl bg-surface-container-high group cursor-pointer aspect-square"
          >
            <Image
              src={photo.src}
              alt={photo.caption}
              fill
              className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-105"
              sizes="(min-width: 768px) 25vw, 50vw"
            />
            {photo.caption && (
              <figcaption className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-primary/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <p className="font-inter text-xs font-bold uppercase tracking-wider text-white">
                  {photo.caption}
                </p>
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          images={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 3: Type-check**

```
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Manual test**

With the dev server running:
- Add a photo to a palmares entry in the dashboard (Task 6 must be done)
- Navigate to `/[slug]/competition/[competitionSlug]`
- Verify hero section shows competition name, date, result badge, athlete link
- Verify photo grid appears and Lightbox opens on click
- Test with a `private` profile: page should load but have `noindex` (check network tab response headers)
- Test with a non-existent slug: should 404

- [ ] **Step 5: Commit**

```bash
git add "app/[slug]/competition/[competitionSlug]/page.tsx" components/CompetitionPhotosGallery.tsx
git commit -m "feat: public competition detail page with photos and Lightbox"
```

---

## Task 8: Profile page — conditional links

**Files:**
- Modify: `components/blocks/PalmaresBlock.tsx`
- Modify: `components/blocks/HeroBlock.tsx`

**Interfaces:**
- Consumes: `PalmaresEntry.competitionSlug`, `PalmaresEntry.photosCount`

- [ ] **Step 1: Update `PalmaresBlock.tsx` — conditional link on entry cards**

In `SeasonGroup`, the `PalmaresBlock.tsx` renders each entry as an `<article>`. Wrap it in a `<Link>` when the entry has a `competition_slug` and at least one photo.

Add `Link` import at the top:

```ts
import Link from 'next/link'
```

Update `SeasonGroupProps` to include `slug`:

```ts
interface SeasonGroupProps {
  startYear: number
  entries: PalmaresEntry[]
  birthDate: string | undefined
  slug: string
}
```

In the `entries.map(...)` block, replace:

```tsx
<article
  key={i}
  id={entry.id ? `result-${entry.id}` : undefined}
  className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden"
  style={{ borderLeft: `4px solid ${medal?.border ?? '#c6c5d4'}` }}
>
```

with:

```tsx
{(() => {
  const competitionHref =
    entry.competitionSlug && (entry.photosCount ?? 0) > 0
      ? `/${slug}/competition/${entry.competitionSlug}`
      : null

  const Wrapper = competitionHref
    ? ({ children }: { children: React.ReactNode }) => (
        <Link href={competitionHref} className="block hover:opacity-95 transition-opacity">
          {children}
        </Link>
      )
    : ({ children }: { children: React.ReactNode }) => <>{children}</>

  return (
    <Wrapper>
      <article
        key={i}
        id={entry.id ? `result-${entry.id}` : undefined}
        className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden"
        style={{ borderLeft: `4px solid ${medal?.border ?? '#c6c5d4'}` }}
      >
        {/* ... existing article content ... */}
        {/* Add photo count badge next to medal circle when photos exist: */}
        {(entry.photosCount ?? 0) > 0 && competitionHref && (
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
            {entry.photosCount}
          </span>
        )}
      </article>
    </Wrapper>
  )
})()}
```

Note: the `key={i}` should be on the outer element (Wrapper or Link), not on the article. Move it to the wrapping `<div key={i}>` or use `entry.id` as key.

- [ ] **Step 2: Update `HeroBlock.tsx` — clickable highlights**

In `HeroBlock.tsx`, the highlights are rendered as `<motion.div>` elements. Add `Link` wrapper when `competitionSlug` and `photosCount > 0`:

Add import:
```ts
import Link from 'next/link'
```

In the highlights `.map()`:

```tsx
{highlights.map((entry, i) => {
  const m = entry.medal ? MEDAL_HIGHLIGHT[entry.medal] : HIGHLIGHT_DEFAULT
  const competitionHref =
    entry.competitionSlug && (entry.photosCount ?? 0) > 0
      ? `/${slug}/competition/${entry.competitionSlug}`
      : null

  const motionProps = { /* ... existing motionProps unchanged ... */ }

  const HighlightCard = (
    <motion.div
      key={`hl-${i}`}
      className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-3 border border-white/20"
      {...motionProps}
    >
      {/* ... existing highlight card content unchanged ... */}
    </motion.div>
  )

  return competitionHref ? (
    <Link key={`hl-${i}`} href={competitionHref} className="hover:opacity-90 transition-opacity">
      {HighlightCard}
    </Link>
  ) : (
    <div key={`hl-${i}`}>{HighlightCard}</div>
  )
})}
```

Note: the `key` prop must be on the outermost returned element (Link or div), remove `key` from `<motion.div>`.

- [ ] **Step 3: Type-check**

```
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Manual test**

On a public profile page:
- Verify entries without photos have no link behavior (clicking does nothing / stays on page)
- Verify entries with photos navigate to `/[slug]/competition/[competitionSlug]`
- Verify highlights in HeroBlock are clickable when they have photos
- Verify photo badge `📷 2` appears on entries with photos

- [ ] **Step 5: Commit**

```bash
git add components/blocks/PalmaresBlock.tsx components/blocks/HeroBlock.tsx
git commit -m "feat: conditional competition page links in PalmaresBlock and HeroBlock"
```

---

## Task 9: Sitemap

**Files:**
- Modify: `app/sitemap.ts`

**Interfaces:**
- Consumes: Supabase admin client (already imported)

- [ ] **Step 1: Update `app/sitemap.ts`**

After the existing `profilePages` query, add:

```ts
// Competition pages: public profiles, palmares with slug, at least one photo
const { data: competitionEntries } = await supabase
  .from('palmares')
  .select(`
    competition_slug,
    competition_photos (created_at),
    profiles!inner (slug, visibility)
  `)
  .eq('profiles.visibility', 'public')
  .not('competition_slug', 'is', null)

type CompetitionEntry = {
  competition_slug: string
  competition_photos: { created_at: string }[]
  profiles: { slug: string }
}

const competitionPages: MetadataRoute.Sitemap = ((competitionEntries ?? []) as unknown as CompetitionEntry[])
  .filter((e) => e.competition_photos.length > 0)
  .map((e) => {
    const latestPhoto = e.competition_photos.reduce(
      (latest, p) => (p.created_at > latest ? p.created_at : latest),
      e.competition_photos[0]?.created_at ?? new Date().toISOString()
    )
    return {
      url: `${siteUrl}/${e.profiles.slug}/competition/${e.competition_slug}`,
      lastModified: new Date(latestPhoto),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }
  })

return [...STATIC_PAGES, ...profilePages, ...competitionPages]
```

Replace the existing `return [...STATIC_PAGES, ...profilePages]` with the above.

- [ ] **Step 2: Type-check**

```
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Manual test**

```
curl http://localhost:3000/sitemap.xml
```

Verify competition page URLs appear for profiles with photos.

- [ ] **Step 4: Commit**

```bash
git add app/sitemap.ts
git commit -m "feat: add competition pages to sitemap"
```

---

## Task 10: Security tests

**Files:**
- Create: `__tests__/security/competitionPhotos.test.ts`

These tests verify RLS policies. They require a running local Supabase instance (`npx supabase start`). Look at an existing file in `__tests__/security/` (e.g., `profileAccess.test.ts`) to understand the test setup pattern (client initialization, test user creation, cleanup).

- [ ] **Step 1: Create `__tests__/security/competitionPhotos.test.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// These tests require a local Supabase instance.
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

  // Insert profile_access row for owner
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

    // RLS filters rows — no error, but empty result
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

    // Verify photos are gone
    const { data } = await adminClient
      .from('competition_photos')
      .select('id')
      .eq('palmares_id', tempPalmaresId)

    expect(data?.length).toBe(0)
  })
})
```

- [ ] **Step 2: Run the security tests** (requires local Supabase)

```
npx supabase start
npm test __tests__/security/competitionPhotos.test.ts
```

Expected: 4 tests PASS.

If Supabase is not running locally, tests will fail with a connection error — this is expected in CI without a Supabase instance.

- [ ] **Step 3: Run full unit test suite to confirm no regressions**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Final build check**

```
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add __tests__/security/competitionPhotos.test.ts
git commit -m "test: RLS security tests for competition_photos"
```

---

## Manual E2E Test Scenario

After all tasks are complete, run through this flow:

1. **Dashboard → Palmarès**
   - Open `/dashboard/[profileId]/palmares`
   - Add a new palmares entry ("Open de Lyon" + date "2025-04-10")
   - Verify the entry was saved (appears in the list)

2. **Upload photos via accordion**
   - Click the "Photos" button on the new entry
   - Upload 2-3 photos
   - Edit a caption on one photo, click outside → verify saved (refresh page, caption persists)
   - Reorder photos with ↑↓ buttons → verify order persists on refresh

3. **Public profile**
   - Navigate to `/[profile-slug]`
   - Verify the "Open de Lyon" palmares entry has a camera badge and is clickable
   - Click it → should navigate to `/[slug]/competition/open-de-lyon-2025`

4. **Competition page**
   - Verify hero section: competition name, date, result badge
   - Verify photos appear in grid
   - Click a photo → Lightbox opens, arrow navigation works, close works
   - Verify photos do NOT appear in the general gallery section of the profile

5. **Sitemap**
   - Open `/sitemap.xml`
   - Verify `/[slug]/competition/open-de-lyon-2025` appears

6. **Draft profile**
   - Set the profile to draft mode
   - Verify `/[slug]/competition/open-de-lyon-2025` returns 404
