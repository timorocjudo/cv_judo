# Visibility Behavior Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the three-state profile visibility system (draft/private/public) so that "private" means "accessible by URL without login but not indexed", and "draft" means "404 for everyone except owner/manager".

**Architecture:** A migration updates the anon RLS SELECT policies to allow reading private profiles. The profile page conditionally renders banners and injects `robots: noindex` for private profiles. The OG image route generates images for private profiles. The VisibilityForm gets updated copy and a downgrade confirmation.

**Tech Stack:** Next.js 14 App Router, Supabase (PostgreSQL + RLS), Tailwind CSS, Vitest for integration tests.

## Global Constraints

- No new DB columns or tables — only RLS policy changes and application behavior.
- `JudokaData` interface in `types/judoka.ts` is not modified — `profileId` is not added to it.
- All server actions use `'use server'` directive; all client components are marked `'use client'`.
- Tailwind classes must follow the existing token names (`bg-surface-container`, `text-on-surface-variant`, etc.).
- Supabase client: use `createClient()` from `@/lib/supabase/server` in server contexts; `createAdminClient()` from `@/lib/supabase/admin` only where RLS must be bypassed.

---

## State of the codebase before this plan

**Already correct — verify only, do not touch:**
- `app/sitemap.ts` — already filters `eq('visibility', 'public')` ✓
- `lib/judokaService.ts` — both `searchJudokas` and `searchJudokasAutocomplete` filter `eq('visibility', 'public')` ✓
- `app/api/qrcode/[slug]/route.ts` — already returns 404 for draft, generates for private/public ✓
- `app/[slug]/page.tsx:generateStaticParams` — only `visibility = 'public'` profiles pre-generated ✓
- `app/dashboard/[profileId]/actions.ts setVisibility` — already validates missing fields before allowing private or public ✓

**Current RLS for `anon` role (migration 0008):**
```sql
-- anon can only read public profiles
CREATE POLICY "anon_read_public_profiles" ON public.profiles FOR SELECT TO anon
  USING (visibility = 'public');
-- same restriction on palmares, videos, gallery_photos
```
This blocks anonymous users from reading private profiles — must be changed.

**Current private banner in `app/[slug]/page.tsx:96-102`:**
```tsx
{judoka.visibility === 'private' && user && (   // ← user && is WRONG per spec
  <div ...>
    <p>Profil privé — visible uniquement par les membres IpponId connectés.</p>
  </div>
)}
```

**Current OG image route (`app/api/og/profile/[slug]/route.tsx:40-47`):**
```typescript
.eq('visibility', 'public')   // ← must change to include 'private'
```

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `supabase/migrations/0012_private_anon_read.sql` | **Create** | Update anon SELECT policies to allow private profiles |
| `app/[slug]/actions.ts` | **Create** | `switchToPrivate` server action for draft-page banner button |
| `app/[slug]/page.tsx` | **Modify** | robots meta for private, draft banner text+button, private banner text+condition |
| `app/api/og/profile/[slug]/route.tsx` | **Modify** | Allow OG generation for private (not just public) |
| `app/dashboard/[profileId]/VisibilityForm.tsx` | **Modify** | Updated descriptions + downgrade confirmation dialog |
| `__tests__/security/profileAccess.test.ts` | **Modify** | Anon can now read private profiles; update affected tests |

---

## Task 1: Migration — Allow anon to read private profiles

**Files:**
- Create: `supabase/migrations/0012_private_anon_read.sql`

**Why:** New spec says private profiles are accessible by URL without login. Current RLS blocks anon from private profiles (only allows `visibility = 'public'`). Without this migration, the profile page and OG image route cannot serve private profiles to unauthenticated visitors.

**Interfaces:**
- Produces: RLS policy `anon_read_private_profiles` on `profiles`, `palmares`, `videos`, `gallery_photos`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/0012_private_anon_read.sql
-- Redéfinition de la visibilité "private" : accessible par URL directe sans connexion,
-- absent des moteurs de recherche (noindex côté app). Seul "draft" est invisible.

-- profiles: anon peut lire public ET private
DROP POLICY IF EXISTS "anon_read_public_profiles" ON public.profiles;
CREATE POLICY "anon_read_accessible_profiles"
  ON public.profiles FOR SELECT TO anon
  USING (visibility IN ('public', 'private'));

-- palmares
DROP POLICY IF EXISTS "anon_read_public_palmares" ON public.palmares;
CREATE POLICY "anon_read_accessible_palmares"
  ON public.palmares FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = profile_id AND visibility IN ('public', 'private')
    )
  );

-- videos
DROP POLICY IF EXISTS "anon_read_public_videos" ON public.videos;
CREATE POLICY "anon_read_accessible_videos"
  ON public.videos FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = profile_id AND visibility IN ('public', 'private')
    )
  );

-- gallery_photos
DROP POLICY IF EXISTS "anon_read_public_gallery_photos" ON public.gallery_photos;
CREATE POLICY "anon_read_accessible_gallery_photos"
  ON public.gallery_photos FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = profile_id AND visibility IN ('public', 'private')
    )
  );
```

- [ ] **Step 2: Apply the migration to local Supabase**

```bash
npx supabase db push
```
Expected: migration applied without errors. Run `npx supabase db diff` to confirm only the policy changes are shown.

- [ ] **Step 3: Smoke test in psql — confirm anon can read private**

```bash
npx supabase db reset --db-url "$DATABASE_URL" 2>/dev/null || true
# Then verify via supabase client test — done in Task 6
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0012_private_anon_read.sql
git commit -m "feat(rls): allow anon read on private profiles"
```

---

## Task 2: OG Image route — Generate for private profiles

**Files:**
- Modify: `app/api/og/profile/[slug]/route.tsx:44-47`

**Interfaces:**
- Consumes: Supabase server client (cookie-based — now backed by anon policy that allows private)
- Produces: ImageResponse for `visibility IN ('public', 'private')`; 404 for draft

- [ ] **Step 1: Change the visibility filter in the profile query**

In `app/api/og/profile/[slug]/route.tsx`, replace:
```typescript
    .eq('visibility', 'public')
```
with:
```typescript
    .in('visibility', ['public', 'private'])
```

The surrounding context (lines 40–51):
```typescript
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, club, grade, category, profile_photo_url')
    .eq('slug', params.slug)
    .in('visibility', ['public', 'private'])   // ← changed
    .maybeSingle()

  if (!profile) {
    return new Response('Not found', { status: 404 })
  }
  // ... rest unchanged
```

- [ ] **Step 2: Verify via curl (after dev server is running)**

```bash
# Replace SLUG with an actual private profile slug from local DB
curl -I http://localhost:3000/api/og/profile/SLUG
```
Expected: `200 OK` with `content-type: image/png` for private profiles.
For a draft profile slug: `404 Not Found`.

- [ ] **Step 3: Commit**

```bash
git add app/api/og/profile/[slug]/route.tsx
git commit -m "feat(og): generate OG image for private profiles"
```

---

## Task 3: Profile page — robots meta + private banner fix

**Files:**
- Modify: `app/[slug]/page.tsx`

**Interfaces:**
- Consumes: `judoka.visibility` from `getJudokaBySlug` (already returns visibility field)
- Produces: `robots: { index: false, follow: false }` in Metadata for private; correct banner JSX

- [ ] **Step 1: Update `generateMetadata` to add robots noindex for private profiles**

Replace the current `return { title: ..., openGraph: ..., twitter: ... }` block in `generateMetadata` with a version that conditionally adds `robots`:

```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const judoka = await getJudokaBySlug(params.slug, { allowDraft: true })
  if (!judoka) return {}

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const ogImageUrl = `${siteUrl}/api/og/profile/${params.slug}`

  const base: Metadata = {
    title: `${judoka.identity.firstName} ${judoka.identity.lastName} — ${judoka.identity.club} · IpponId`,
    description: judoka.bio.slice(0, 155) + '…',
    openGraph: {
      title: `${judoka.identity.firstName} ${judoka.identity.lastName} — IpponId`,
      description: judoka.bio.slice(0, 155) + '…',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: `${judoka.identity.firstName} ${judoka.identity.lastName} — IpponId` }],
      type: 'profile',
      locale: 'fr_FR',
      siteName: 'IpponId',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${judoka.identity.firstName} ${judoka.identity.lastName} — IpponId`,
      description: judoka.bio.slice(0, 155) + '…',
      images: [ogImageUrl],
    },
  }

  if (judoka.visibility === 'private') {
    return { ...base, robots: { index: false, follow: false } }
  }

  return base
}
```

- [ ] **Step 2: Update the draft banner JSX**

The draft banner must add a "Passer en Privé" form. First, add the import for `switchToPrivate` at the top of the file (it will be created in Task 4):

```typescript
import { switchToPrivate } from './actions'
```

Replace the current draft banner block (lines 86–95):
```tsx
{judoka.visibility === 'draft' && (
  <div className="sticky top-0 z-50 bg-surface-container border-b border-outline-variant px-margin-mobile md:px-margin-desktop py-3 flex items-center justify-between gap-4">
    <p className="text-sm text-on-surface-variant font-medium">
      Aperçu — Ce profil est en brouillon. Il n&apos;est visible que par toi.
    </p>
    <form action={switchToPrivate}>
      <input type="hidden" name="slug" value={judoka.slug} />
      <button
        type="submit"
        className="text-sm font-semibold text-primary hover:underline whitespace-nowrap"
      >
        Passer en Privé →
      </button>
    </form>
  </div>
)}
```

- [ ] **Step 3: Update the private banner JSX**

Replace the current private banner block (lines 96–102):
```tsx
{judoka.visibility === 'private' && (
  <div className="sticky top-0 z-50 bg-surface-container border-b border-outline-variant px-margin-mobile md:px-margin-desktop py-3">
    <p className="text-sm text-on-surface-variant font-medium">
      Profil privé — Cette page est accessible par lien direct mais n&apos;apparaît pas dans les moteurs de recherche.
    </p>
  </div>
)}
```
Note: removed the `user &&` condition — everyone sees this banner.

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors. (The `switchToPrivate` import will fail until Task 4 is done — complete Task 4 before this step.)

- [ ] **Step 5: Commit (after Task 4 is also done)**

```bash
git add app/[slug]/page.tsx app/[slug]/actions.ts
git commit -m "feat(profile): robots noindex for private, update banners"
```

---

## Task 4: Create `app/[slug]/actions.ts` — switchToPrivate server action

**Files:**
- Create: `app/[slug]/actions.ts`

**Interfaces:**
- Consumes: `formData.get('slug')` — the profile slug
- Produces: revalidates `/${slug}` and redirects on success; returns error message on failure
- Used by: `app/[slug]/page.tsx` draft banner button

**Why a separate file:** `JudokaData` doesn't carry `profileId`, so we look up the profile by slug inside the action. The action must also verify the caller is the profile owner before updating.

- [ ] **Step 1: Write the server action file**

```typescript
// app/[slug]/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getMissingFieldsForPublishing } from '@/lib/profileValidation'
import { isProfileOwner } from '@/lib/profileAccessService'

export async function switchToPrivate(formData: FormData): Promise<void> {
  const slug = formData.get('slug') as string
  if (!slug) return

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, club, category, grade, bio, profile_photo_url, birth_date')
    .eq('slug', slug)
    .maybeSingle()

  if (!profile) return

  const ownerCheck = await isProfileOwner(profile.id, user.id)
  if (!ownerCheck) return

  const missing = getMissingFieldsForPublishing(profile)
  if (missing.length > 0) return

  await supabase
    .from('profiles')
    .update({ visibility: 'private', published: false })
    .eq('id', profile.id)

  revalidatePath(`/${slug}`)
  revalidatePath(`/dashboard/${profile.id}`)
  revalidatePath('/', 'layout')
}
```

Note: `switchToPrivate` silently no-ops if conditions aren't met (not owner, missing fields) rather than throwing — the page continues to show. If missing fields would block the transition, the owner can use the full VisibilityForm in the dashboard. This is intentional: the banner button is a convenience shortcut, not the primary UI for visibility management.

- [ ] **Step 2: Verify the import works in `app/[slug]/page.tsx`**

```bash
npx tsc --noEmit
```
Expected: no errors. If `switchToPrivate` is used as a form action, TypeScript is satisfied by its `(formData: FormData) => Promise<void>` signature.

---

## Task 5: VisibilityForm — update descriptions + downgrade confirmation

**Files:**
- Modify: `app/dashboard/[profileId]/VisibilityForm.tsx`

**Interfaces:**
- Consumes: `currentVisibility`, `profileId`, `isOwner`, `missingFields` (props — unchanged)
- Produces: updated UI with new copy and confirmation dialog before downgrade

- [ ] **Step 1: Update the OPTIONS array with new descriptions**

Replace the current `OPTIONS` array (lines 9–18):
```typescript
const OPTIONS: Array<{
  value: 'draft' | 'private' | 'public'
  label: string
  description: string
  icon: string
}> = [
  {
    value: 'draft',
    label: 'Brouillon',
    description: "La page de ce judoka n'existe pas encore. Seuls toi et tes gestionnaires pouvez la prévisualiser depuis le dashboard.",
    icon: '🔒',
  },
  {
    value: 'private',
    label: 'Privé',
    description: "La page existe et est accessible via son URL directe. Tu peux la partager à la famille et aux proches. Elle n'apparaît pas dans les moteurs de recherche.",
    icon: '🔗',
  },
  {
    value: 'public',
    label: 'Public',
    description: "La page est visible par tout le monde et référencée sur Google. C'est l'objectif final pour que le palmarès ressorte dans les recherches.",
    icon: '🌍',
  },
]
```

- [ ] **Step 2: Add downgrade confirmation state**

Add a `pendingVisibility` state to hold the value selected during a downgrade, and a `confirm` state for the modal. The confirmation must trigger when `currentVisibility === 'public'` and the user selects `'private'` or `'draft'`.

Replace the full component body with:

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { useFormState } from 'react-dom'
import { toast } from 'sonner'
import { setVisibility, type SetVisibilityResult } from './actions'
import { SubmitButton } from '@/components/dashboard/SubmitButton'

const OPTIONS: Array<{
  value: 'draft' | 'private' | 'public'
  label: string
  description: string
  icon: string
}> = [
  {
    value: 'draft',
    label: 'Brouillon',
    description: "La page de ce judoka n'existe pas encore. Seuls toi et tes gestionnaires pouvez la prévisualiser depuis le dashboard.",
    icon: '🔒',
  },
  {
    value: 'private',
    label: 'Privé',
    description: "La page existe et est accessible via son URL directe. Tu peux la partager à la famille et aux proches. Elle n'apparaît pas dans les moteurs de recherche.",
    icon: '🔗',
  },
  {
    value: 'public',
    label: 'Public',
    description: "La page est visible par tout le monde et référencée sur Google. C'est l'objectif final pour que le palmarès ressorte dans les recherches.",
    icon: '🌍',
  },
]

const DOWNGRADE_MESSAGES: Record<'draft' | 'private', { title: string; body: string }> = {
  draft: {
    title: 'Repasser en brouillon ?',
    body: "La page ne sera plus accessible du tout. Les liens déjà partagés ne fonctionneront plus.",
  },
  private: {
    title: 'Repasser en privé ?',
    body: "La page ne sera plus référencée sur Google mais restera accessible par lien direct.",
  },
}

const INITIAL: SetVisibilityResult = { ok: null, missing: [] }

type Props = {
  profileId: string
  currentVisibility: 'draft' | 'private' | 'public'
  isOwner: boolean
  missingFields: string[]
  firstName?: string
}

export default function VisibilityForm({
  profileId,
  currentVisibility,
  isOwner,
  missingFields,
  firstName,
}: Props) {
  const [state, formAction] = useFormState(setVisibility, INITIAL)
  const isFirstRender = useRef(true)
  const [pendingValue, setPendingValue] = useState<'draft' | 'private' | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    if (state.ok === true) {
      toast.success('Visibilité mise à jour')
    } else if (state.ok === false) {
      if (state.missing.length > 0) {
        toast.error(`Champs manquants : ${state.missing.join(', ')}`)
      } else {
        toast.error('Une erreur est survenue')
      }
    }
  }, [state])

  if (!isOwner) {
    const current = OPTIONS.find((o) => o.value === currentVisibility)
    return (
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5">
        <p className="font-montserrat font-bold text-primary text-sm mb-2 uppercase tracking-wide">
          Visibilité
        </p>
        <p className="text-on-surface-variant text-sm">
          {current?.icon} {current?.label} — {current?.description}
        </p>
        <p className="text-xs text-on-surface-variant mt-2">Seul le propriétaire peut modifier la visibilité.</p>
      </div>
    )
  }

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5"
      >
        <p className="font-montserrat font-bold text-primary text-sm mb-4 uppercase tracking-wide">
          Visibilité
        </p>
        <input type="hidden" name="profileId" value={profileId} />
        <div className="space-y-2 mb-4">
          {OPTIONS.map((opt) => {
            const isDisabled = opt.value !== 'draft' && missingFields.length > 0
            return (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  currentVisibility === opt.value
                    ? 'border-primary bg-primary/5'
                    : 'border-outline-variant hover:bg-surface-container'
                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={opt.value}
                  defaultChecked={currentVisibility === opt.value}
                  disabled={isDisabled}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <span className="text-sm font-semibold text-on-surface">
                    {opt.icon} {opt.label}
                  </span>
                  <p className="text-xs text-on-surface-variant">{opt.description}</p>
                </div>
              </label>
            )
          })}
        </div>
        {missingFields.length > 0 && (
          <p className="text-xs text-secondary mb-3">
            Champs manquants pour Privé/Public : {missingFields.join(', ')}
          </p>
        )}
        <SubmitButton
          pendingText="Mise à jour…"
          className="bg-primary text-on-primary font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-primary-container transition-colors"
          onClick={(e) => {
            const form = formRef.current
            if (!form) return
            const selected = (form.elements.namedItem('visibility') as RadioNodeList | null)?.value as 'draft' | 'private' | 'public' | undefined
            if (currentVisibility === 'public' && selected && selected !== 'public') {
              e.preventDefault()
              setPendingValue(selected as 'draft' | 'private')
            }
          }}
        >
          Enregistrer
        </SubmitButton>
      </form>

      {pendingValue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-surface rounded-2xl border border-outline-variant p-6 max-w-sm w-full mx-4 shadow-lg">
            <p className="font-montserrat font-bold text-primary text-base mb-2">
              {DOWNGRADE_MESSAGES[pendingValue].title}
            </p>
            <p className="text-sm text-on-surface-variant mb-5">
              {DOWNGRADE_MESSAGES[pendingValue].body}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setPendingValue(null)}
                className="text-sm font-semibold text-on-surface-variant px-4 py-2 rounded-lg hover:bg-surface-container transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingValue(null)
                  formRef.current?.requestSubmit()
                }}
                className="text-sm font-semibold text-on-error bg-error px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

Note on `SubmitButton`: The `onClick` prop needs to be passed through in `components/dashboard/SubmitButton.tsx`. Check if it already accepts `onClick` via `...props`. If not, add `onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void` to its props interface and spread it on the `<button>`.

- [ ] **Step 3: Check SubmitButton accepts onClick**

Read `components/dashboard/SubmitButton.tsx`. If it doesn't forward `onClick`:

```tsx
// In SubmitButton.tsx, add onClick to the button element
<button
  type="submit"
  disabled={pending}
  onClick={props.onClick}   // add this
  {...rest}
>
```

Or replace spread to include all button attributes.

- [ ] **Step 4: Check `firstName` prop in dashboard page**

In `app/dashboard/[profileId]/page.tsx`, the `<VisibilityForm>` call at line 94–99. The `firstName` prop is optional (used in confirmation message). Pass it:
```tsx
<VisibilityForm
  profileId={profileId}
  currentVisibility={profile.visibility as 'draft' | 'private' | 'public'}
  isOwner={ownerStatus}
  missingFields={missingFields}
  firstName={profile.first_name}
/>
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/[profileId]/VisibilityForm.tsx app/dashboard/[profileId]/page.tsx
git commit -m "feat(dashboard): update visibility descriptions and add downgrade confirmation"
```

---

## Task 6: Update security tests for new private behavior

**Files:**
- Modify: `__tests__/security/profileAccess.test.ts`

**Why:** After migration 0012, anon users CAN read private profiles. The existing test `[CRITIQUE] client anonyme ne peut PAS lire` for private profiles is now wrong and must become the opposite assertion.

- [ ] **Step 1: Update the private profile test block**

Replace the `describe('Profil privé')` block (lines 109–129):

```typescript
  describe('Profil privé (visibility = private)', () => {
    it('client anonyme PEUT lire un profil privé par URL directe', async () => {
      const anon = createAnonClient()
      const { data } = await anon.from('profiles').select('id').eq('id', privateProfileId).single()
      expect(data?.id).toBe(privateProfileId)
    }, TIMEOUT)

    it('client anonyme ne peut PAS modifier un profil privé', async () => {
      const anon = createAnonClient()
      await anon.from('profiles').update({ first_name: 'HACKER' }).eq('id', privateProfileId)
      const { data } = await admin.from('profiles').select('first_name').eq('id', privateProfileId).single()
      expect(data?.first_name).not.toBe('HACKER')
    }, TIMEOUT)

    it('utilisateur authentifié (sans accès explicite) peut lire', async () => {
      const other = await createAuthenticatedClient(OTHER_EMAIL, OTHER_PASSWORD)
      const { data } = await other.from('profiles').select('id').eq('id', privateProfileId).single()
      expect(data?.id).toBe(privateProfileId)
    }, TIMEOUT)

    it('utilisateur authentifié ne peut PAS modifier', async () => {
      const other = await createAuthenticatedClient(OTHER_EMAIL, OTHER_PASSWORD)
      await other.from('profiles').update({ first_name: 'HACKER' }).eq('id', privateProfileId)
      const { data } = await admin.from('profiles').select('first_name').eq('id', privateProfileId).single()
      expect(data?.first_name).not.toBe('HACKER')
    }, TIMEOUT)
  })
```

- [ ] **Step 2: Run the tests (requires local Supabase with migration applied)**

```bash
npx vitest run __tests__/security/profileAccess.test.ts
```
Expected: all tests pass. If Supabase is not available locally, they skip automatically (`isSupabaseAvailable ? describe : describe.skip`).

- [ ] **Step 3: Run the full test suite**

```bash
npx vitest run
```
Expected: no regressions. All previously passing tests still pass.

- [ ] **Step 4: Commit**

```bash
git add __tests__/security/profileAccess.test.ts
git commit -m "test(security): update private profile access tests for new anon read policy"
```

---

## Task 7: Verify sitemap, QR code, search — no changes needed

**Files:** None (read-only verification)

- [ ] **Step 1: Verify sitemap**

Read `app/sitemap.ts`. Confirm it queries `.eq('visibility', 'public')`. ✓ Already correct.

- [ ] **Step 2: Verify searchJudokas**

Read `lib/judokaService.ts`. Confirm `searchJudokas` and `searchJudokasAutocomplete` both use `.eq('visibility', 'public')`. ✓ Already correct.

- [ ] **Step 3: Verify QR code route**

Read `app/api/qrcode/[slug]/route.ts`. Confirm it returns 404 when `data.visibility === 'draft'` and generates the QR otherwise. ✓ Already correct.

- [ ] **Step 4: Commit a verification note in git (optional — skip if no changes)**

No commit needed for verification-only tasks.

---

## Task 8: Manual end-to-end verification

**Files:** None — browser-based checks.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Draft profile — URL must return 404 for anonymous**

Using a fresh incognito window (no session), navigate to `http://localhost:3000/[draft-slug]`.
Expected: Next.js 404 page.

- [ ] **Step 3: Draft profile — owner sees banner with "Passer en Privé"**

Log in as the profile owner, navigate to `http://localhost:3000/[draft-slug]`.
Expected: page renders with sticky banner "Aperçu — Ce profil est en brouillon. Il n'est visible que par toi." and a "Passer en Privé →" button.

Click the button. Expected: page reloads showing the private banner instead.

- [ ] **Step 4: Private profile — anonymous can view with noindex banner**

Open incognito, navigate to `http://localhost:3000/[private-slug]`.
Expected: page renders normally with banner "Profil privé — Cette page est accessible par lien direct mais n'apparaît pas dans les moteurs de recherche."

Open "View Source" and search for `robots`. Expected: `<meta name="robots" content="noindex,nofollow">` present.

- [ ] **Step 5: Private profile — absent from search**

Use the search autocomplete on the landing page. Type the private profile's name.
Expected: does not appear in results.

- [ ] **Step 6: Private profile — OG image generates**

```bash
curl -I http://localhost:3000/api/og/profile/[private-slug]
```
Expected: `HTTP/1.1 200 OK` with `content-type: image/png`.

- [ ] **Step 7: Public profile → private downgrade confirmation**

In dashboard, open a public profile's settings. Select "Privé" radio and click "Enregistrer".
Expected: confirmation modal appears with message about downgrade.
Click "Confirmer". Expected: visibility updates, success toast shown.

- [ ] **Step 8: Public profile — visible in search**

Use search autocomplete with a public profile's name. Expected: appears in results.

- [ ] **Step 9: Type-check and lint**

```bash
npx tsc --noEmit && npm run lint
```
Expected: no errors.

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| Draft → 404 for anon/non-access | Already handled by RLS (no change needed) |
| Draft → page with banner + "Passer en Privé" for owner/manager | Task 3 (banner), Task 4 (action) |
| Private → accessible by URL without login | Task 1 (migration) |
| Private → noindex/nofollow meta | Task 3 (generateMetadata) |
| Private → banner for everyone | Task 3 (remove `user &&`) |
| Private → absent from sitemap | Already correct ✓ |
| Private → absent from search | Already correct ✓ |
| Public → full indexing, no banner | No change needed ✓ |
| OG image: draft → 404 | Already 404 (no match in DB) ✓ |
| OG image: private → generates | Task 2 |
| QR code: draft → 404 | Already correct ✓ |
| QR code: private → generates | Already correct ✓ |
| VisibilityForm descriptions updated | Task 5 |
| VisibilityForm downgrade confirmation | Task 5 |
| Validation before private (missing fields) | Already in `setVisibility` action ✓ |
| Tests: anon can read private | Task 6 |
| Tests: anon cannot read draft | Already in test file ✓ |
| Tests: draft OG → 404 | Covered by existing OG route logic |

**No gaps found.**
