# Toast Notifications Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add sonner toast notifications (success + error) to every dashboard action so users always receive clear visual feedback after each operation.

**Architecture:** Server Actions are modified to return a structured result `{ ok: boolean, ... }` instead of returning void or redirecting on validation errors. Client components read these results either via `useFormState` (for `action=` form patterns) or directly by awaiting the call (for `onSubmit`/onClick handlers), then call `toast.success` / `toast.error`. A single `<Toaster />` lives in the dashboard layout.

**Tech Stack:** sonner ^1.x, `react-dom` `useFormState` + `useFormStatus`, Next.js 14 App Router Server Actions, TypeScript

## Global Constraints

- No test suite — verify each task by running `npm run dev` and testing manually in the browser
- All user-facing messages are in French
- Do NOT break `useFormStatus` in `SubmitButton` — `useFormState` is composable with it; both can coexist on the same form
- Reuse `getMissingFieldsForPublishing` from `lib/profileValidation.ts` — never copy or rewrite its logic
- Slug editing action does not yet exist — skip that spec item; add the toast when the slug form is built
- `redirect()` in Server Actions throws a special Next.js error (`digest` starting with `'NEXT_REDIRECT'`) — always rethrow it from any `catch` block or the redirect will be swallowed

---

### Task 1 — Install sonner + `<Toaster />` in dashboard layout

**Files:**
- Modify: `app/dashboard/layout.tsx`

**Interfaces:**
- Produces: `toast` importable from `'sonner'` throughout the dashboard; visible `<Toaster />` rendered exactly once

- [ ] **Step 1 — Install sonner**

```bash
npm install sonner
```

Expected: `"sonner"` appears in `package.json` dependencies.

- [ ] **Step 2 — Add `<Toaster />` to layout**

Full replacement of `app/dashboard/layout.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import DashboardNav from '@/components/dashboard/DashboardNav'
import { Toaster } from 'sonner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const pathname = headers().get('x-pathname') ?? ''

  if (pathname !== '/dashboard/setup') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!profile) redirect('/dashboard/setup')
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="md:pl-60 pb-16 md:pb-0">
        {children}
      </main>
      <Toaster richColors position="top-center" />
    </div>
  )
}
```

- [ ] **Step 3 — Verify**

Run `npm run dev`. Open `http://localhost:3000/dashboard`. No console errors. Inspect DOM: `[data-sonner-toaster]` element is present.

---

### Task 2 — Modify all Server Actions to return structured results

**Files:**
- Modify: `app/dashboard/profil/actions.ts`
- Modify: `app/dashboard/actions.ts`
- Modify: `app/dashboard/palmares/actions.ts`
- Modify: `app/dashboard/videos/actions.ts`
- Modify: `app/dashboard/galerie/actions.ts`

**Interfaces — produced by this task, consumed by Tasks 3–7:**
- `saveProfile(prevState: { ok: boolean | null }, formData: FormData): Promise<{ ok: boolean | null }>`
- `togglePublished(prevState: ToggleResult, formData: FormData): Promise<ToggleResult>` where `ToggleResult = { ok: boolean | null; missing: string[]; unpublished: boolean }`
- `addPalmares(formData: FormData): Promise<{ ok: boolean }>`
- `updatePalmares(formData: FormData): Promise<{ ok: boolean }>`
- `deletePalmares(id: string): Promise<{ ok: boolean }>`
- `addVideo(_state: VideoState, formData: FormData): Promise<VideoState>` where `VideoState = { ok: boolean | null; error: string | null }`
- `deleteVideo(id: string): Promise<{ ok: boolean }>`
- `addPhoto(url: string, caption: string, profileId: string): Promise<{ ok: boolean }>`
- `deletePhoto(id: string): Promise<{ ok: boolean }>`

**Why `ok: boolean | null`:** Using `null` as the initial state lets client components distinguish "never submitted" (null → no toast) from "submitted and failed" (false → error toast) without tracking a separate boolean.

- [ ] **Step 1 — `app/dashboard/profil/actions.ts` — update `saveProfile`**

`saveProfile` must accept `(prevState, formData)` to work with `useFormState`. `deleteAccount` is unchanged.

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function saveProfile(
  _prevState: { ok: boolean | null },
  formData: FormData
): Promise<{ ok: boolean | null }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, slug, first_name, last_name')
      .eq('owner_id', user.id)
      .single()

    if (!profile) redirect('/')

    await supabase
      .from('profiles')
      .update({
        first_name: formData.get('first_name') as string || profile.first_name,
        last_name: formData.get('last_name') as string || profile.last_name,
        club: formData.get('club') as string || null,
        category: formData.get('category') as string || null,
        grade: formData.get('grade') as string || null,
        bio: formData.get('bio') as string || null,
        birth_date: formData.get('birth_date') as string || null,
        profile_photo_url: formData.get('profile_photo_url') as string || null,
        cover_photo_url: formData.get('cover_photo_url') as string || null,
      })
      .eq('id', profile.id)
      .eq('owner_id', user.id)

    revalidatePath('/dashboard/profil')
    revalidatePath(`/${profile.slug}`)
    revalidatePath('/dashboard')
    return { ok: true }
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
    return { ok: false }
  }
}

export async function deleteAccount() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const uid = user.id
  const adminClient = createAdminClient()

  const { data: files, error: listError } = await adminClient.storage.from('media').list(uid)
  if (listError) throw new Error(`Échec liste fichiers : ${listError.message}`)
  if (files && files.length > 0) {
    const paths = files.map((f) => `${uid}/${f.name}`)
    const { error: removeError } = await adminClient.storage.from('media').remove(paths)
    if (removeError) throw new Error(`Échec suppression fichiers : ${removeError.message}`)
  }

  const { error } = await adminClient.auth.admin.deleteUser(uid)
  if (error) throw new Error(`Échec suppression compte : ${error.message}`)

  await supabase.auth.signOut({ scope: 'local' })

  redirect('/')
}
```

- [ ] **Step 2 — `app/dashboard/actions.ts` — update `togglePublished`**

Replace redirect-on-error with a returned result. Export the `ToggleResult` type so `PublishForm.tsx` (Task 4) can import it.

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMissingFieldsForPublishing } from '@/lib/profileValidation'

export type ToggleResult = {
  ok: boolean | null
  missing: string[]
  unpublished: boolean
}

export async function togglePublished(
  _prevState: ToggleResult,
  formData: FormData
): Promise<ToggleResult> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const profileId = formData.get('profileId') as string
    const slug = formData.get('slug') as string
    const next = formData.get('next') === 'true'

    if (next) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('club, category, grade, bio, profile_photo_url, birth_date')
        .eq('id', profileId)
        .eq('owner_id', user.id)
        .single()

      if (!profile) redirect('/')

      const missing = getMissingFieldsForPublishing(profile)
      if (missing.length > 0) {
        return { ok: false, missing, unpublished: false }
      }
    }

    await supabase
      .from('profiles')
      .update({ published: next })
      .eq('id', profileId)
      .eq('owner_id', user.id)

    revalidatePath('/dashboard')
    revalidatePath(`/${slug}`)
    revalidatePath('/', 'layout')
    return { ok: true, missing: [], unpublished: !next }
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
    return { ok: false, missing: [], unpublished: false }
  }
}
```

- [ ] **Step 3 — `app/dashboard/palmares/actions.ts` — add return types**

Full file replacement (logic unchanged, only return values added):

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type MedalValue = 'gold' | 'silver' | 'bronze' | null

function deriveFromPosition(position: number): { medal: MedalValue; result: string } {
  if (position === 1) return { medal: 'gold', result: "1re place — Médaille d'or" }
  if (position === 2) return { medal: 'silver', result: "2e place — Médaille d'argent" }
  if (position === 3) return { medal: 'bronze', result: '3e place — Médaille de bronze' }
  return { medal: null, result: `${position}e place` }
}

async function getProfile(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('id, slug')
    .eq('owner_id', userId)
    .single()
  return data ?? null
}

export async function addPalmares(formData: FormData): Promise<{ ok: boolean }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const profile = await getProfile(supabase, user.id)
    if (!profile) redirect('/')

    const position = Number(formData.get('position'))
    const { medal, result } = deriveFromPosition(position)

    await supabase.from('palmares').insert({
      profile_id: profile.id,
      date: formData.get('date') as string || null,
      competition: formData.get('competition') as string || null,
      city: formData.get('city') as string || null,
      category: formData.get('category') as string || null,
      level: formData.get('level') as string || null,
      position,
      medal,
      result,
    })

    revalidatePath('/dashboard/palmares')
    revalidatePath(`/${profile.slug}`)
    return { ok: true }
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
    return { ok: false }
  }
}

export async function updatePalmares(formData: FormData): Promise<{ ok: boolean }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const profile = await getProfile(supabase, user.id)
    if (!profile) return { ok: false }

    const id = formData.get('id') as string
    const position = Number(formData.get('position'))
    const { medal, result } = deriveFromPosition(position)

    await supabase
      .from('palmares')
      .update({
        date: formData.get('date') as string || null,
        competition: formData.get('competition') as string || null,
        city: formData.get('city') as string || null,
        category: formData.get('category') as string || null,
        level: formData.get('level') as string || null,
        position,
        medal,
        result,
      })
      .eq('id', id)
      .eq('profile_id', profile.id)

    revalidatePath('/dashboard/palmares')
    revalidatePath(`/${profile.slug}`)
    return { ok: true }
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
    return { ok: false }
  }
}

export async function deletePalmares(id: string): Promise<{ ok: boolean }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const profile = await getProfile(supabase, user.id)

    await supabase.from('palmares').delete().eq('id', id)

    revalidatePath('/dashboard/palmares')
    if (profile) revalidatePath(`/${profile.slug}`)
    return { ok: true }
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
    return { ok: false }
  }
}
```

- [ ] **Step 4 — `app/dashboard/videos/actions.ts` — add `ok` field + wrap `deleteVideo`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const YOUTUBE_RE =
  /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=[\w-]+|youtu\.be\/[\w-]+|youtube\.com\/shorts\/[\w-]+)/

async function getProfileId(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', userId)
    .single()
  return data?.id ?? null
}

export type VideoState = { ok: boolean | null; error: string | null }

export async function addVideo(
  _state: VideoState,
  formData: FormData
): Promise<VideoState> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const profileId = await getProfileId(supabase, user.id)
    if (!profileId) redirect('/')

    const youtubeUrl = (formData.get('youtube_url') as string).trim()
    if (!YOUTUBE_RE.test(youtubeUrl)) {
      return { ok: false, error: 'Lien YouTube invalide. Utilise un lien youtube.com/watch?v=… ou youtu.be/…' }
    }

    await supabase.from('videos').insert({
      profile_id: profileId,
      title: formData.get('title') as string || null,
      youtube_url: youtubeUrl,
      description: formData.get('description') as string || null,
    })

    revalidatePath('/dashboard/videos')
    return { ok: true, error: null }
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
    return { ok: false, error: 'Une erreur est survenue, réessaie' }
  }
}

export async function deleteVideo(id: string): Promise<{ ok: boolean }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const profileId = await getProfileId(supabase, user.id)
    if (!profileId) return { ok: false }

    await supabase
      .from('videos')
      .delete()
      .eq('id', id)
      .eq('profile_id', profileId)

    revalidatePath('/dashboard/videos')
    return { ok: true }
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
    return { ok: false }
  }
}
```

- [ ] **Step 5 — `app/dashboard/galerie/actions.ts` — add return types**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function addPhoto(
  url: string,
  caption: string,
  profileId: string
): Promise<{ ok: boolean }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    await supabase.from('gallery_photos').insert({
      profile_id: profileId,
      photo_url: url,
      caption: caption || null,
    })

    revalidatePath('/dashboard/galerie')
    return { ok: true }
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
    return { ok: false }
  }
}

export async function deletePhoto(id: string): Promise<{ ok: boolean }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!profile) return { ok: false }

    await supabase
      .from('gallery_photos')
      .delete()
      .eq('id', id)
      .eq('profile_id', profile.id)

    revalidatePath('/dashboard/galerie')
    return { ok: true }
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
    return { ok: false }
  }
}
```

- [ ] **Step 6 — Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors related to action signatures. Fix any type mismatches before continuing.

---

### Task 3 — ProfileForm.tsx — useFormState + toast

**Files:**
- Modify: `app/dashboard/profil/ProfileForm.tsx`

**Interfaces:**
- Consumes: `saveProfile(prevState: { ok: boolean | null }, formData): Promise<{ ok: boolean | null }>` (Task 2)
- Consumes: `toast` from `'sonner'`

- [ ] **Step 1 — Switch to `useFormState` and add toast**

Change the imports block at the top of the file:

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useFormState } from 'react-dom'
import { toast } from 'sonner'
import ImageUploader from '@/components/dashboard/ImageUploader'
import { BeltBadge } from '@/components/dashboard/BeltBadge'
import { SubmitButton } from '@/components/dashboard/SubmitButton'
import { BELTS } from '@/lib/judo-belts'
import { computeAgeCategory } from '@/lib/ageCategory'
import { saveProfile } from './actions'
```

Replace the `export default function ProfileForm` body opening (everything from the function signature through the first `return`):

```tsx
export default function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useFormState(saveProfile, { ok: null })
  const isFirstRender = useRef(true)
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(profile.profile_photo_url ?? '')
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(profile.cover_photo_url ?? '')
  const [selectedGrade, setSelectedGrade] = useState(profile.grade ?? '')
  const [birthDate, setBirthDate] = useState(profile.birth_date ?? '')
  const computedCategory = computeAgeCategory(birthDate || undefined)
  const initialAgeGroup = getAgeGroupFromCategory(computedCategory)
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(initialAgeGroup)

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    if (state.ok) toast.success('Profil mis à jour')
    else toast.error('Une erreur est survenue, réessaie')
  }, [state])

  return (
    <form action={formAction} className="space-y-6 max-w-xl">
```

The `<SubmitButton>` at the bottom stays as-is (no changes needed — `useFormStatus` works inside `useFormState` forms).

- [ ] **Step 2 — Verify**

`npm run dev` → go to `/dashboard/profil` → save the form → a green toast "Profil mis à jour" appears. Cause a failure (e.g., temporarily break the action) → red toast "Une erreur est survenue, réessaie" appears.

---

### Task 4 — Extract PublishForm client component + toast + clean up searchParams banner

**Files:**
- Create: `app/dashboard/PublishForm.tsx`
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `togglePublished(prevState: ToggleResult, formData): Promise<ToggleResult>`, `ToggleResult` (Task 2)
- Consumes: `toast` from `'sonner'`
- `PublishForm` props: `{ profileId: string; slug: string; published: boolean; isPublishable: boolean; missingFields: string[] }`

- [ ] **Step 1 — Create `app/dashboard/PublishForm.tsx`**

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { useFormState } from 'react-dom'
import { toast } from 'sonner'
import { togglePublished, type ToggleResult } from './actions'
import { SubmitButton } from '@/components/dashboard/SubmitButton'

const INITIAL: ToggleResult = { ok: null, missing: [], unpublished: false }

export default function PublishForm({
  profileId,
  slug,
  published,
  isPublishable,
  missingFields,
}: {
  profileId: string
  slug: string
  published: boolean
  isPublishable: boolean
  missingFields: string[]
}) {
  const [state, formAction] = useFormState(togglePublished, INITIAL)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    if (state.ok === true) {
      if (state.unpublished) {
        toast.success("Ta page n'est plus visible publiquement")
      } else {
        toast.success('Ta page est maintenant en ligne !')
      }
    } else if (state.ok === false) {
      if (state.missing.length > 0) {
        toast.error(`Champs manquants : ${state.missing.join(', ')}`)
      } else {
        toast.error('Une erreur est survenue, réessaie')
      }
    }
  }, [state])

  return (
    <form action={formAction}>
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="next" value={String(!published)} />
      <SubmitButton
        disabled={!published && !isPublishable}
        pendingText={published ? 'Dépublication…' : 'Publication…'}
        title={
          !published && !isPublishable
            ? `Champs manquants : ${missingFields.join(', ')}`
            : undefined
        }
        className={`w-full sm:w-auto font-semibold px-6 py-3 rounded-lg text-sm ${
          published
            ? 'border border-secondary text-secondary hover:bg-secondary/5'
            : isPublishable
              ? 'bg-primary text-on-primary hover:bg-primary-container'
              : 'bg-primary/30 text-on-primary'
        }`}
      >
        {published ? 'Dépublier' : 'Publier mon profil'}
      </SubmitButton>
    </form>
  )
}
```

- [ ] **Step 2 — Update `app/dashboard/page.tsx`**

Remove `searchParams` prop, `errorFields` logic, error banner, and the old `<form action={togglePublished}>` block. Replace with `<PublishForm>`. Full replacement:

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMissingFieldsForPublishing, REQUIRED_FIELD_LABELS } from '@/lib/profileValidation'
import PublishForm from './PublishForm'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, slug, first_name, last_name, profile_photo_url, published, club, category, grade, bio, birth_date')
    .eq('owner_id', user.id)
    .single()

  if (!profile) redirect('/dashboard/setup')

  const missingFields = getMissingFieldsForPublishing(profile)
  const isPublishable = missingFields.length === 0

  const initials =
    (profile.first_name?.[0] ?? '') + (profile.last_name?.[0] ?? '')

  return (
    <div className="px-margin-mobile md:px-margin-desktop py-10 max-w-container-max">

      {/* Carte résumé */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6 flex items-center gap-5 mb-8">
        {profile.profile_photo_url ? (
          <img
            src={profile.profile_photo_url}
            alt={`${profile.first_name} ${profile.last_name}`}
            className="w-16 h-16 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
            <span className="font-montserrat font-black text-on-primary text-lg">
              {initials.toUpperCase()}
            </span>
          </div>
        )}
        <div className="min-w-0">
          <p className="font-montserrat font-bold text-primary text-xl">
            {profile.first_name} {profile.last_name}
          </p>
          <p className="text-on-surface-variant text-sm">@{profile.slug}</p>
          <span
            className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
              profile.published
                ? 'bg-tertiary-container/20 text-tertiary'
                : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            {profile.published ? 'Publié' : 'Brouillon'}
          </span>
        </div>
      </div>

      {/* Checklist avant publication */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 mb-6">
        <p className="font-montserrat font-bold text-primary text-sm mb-3 uppercase tracking-wide">
          Avant de publier
        </p>
        <ul className="space-y-2">
          {REQUIRED_FIELD_LABELS.map((label) => {
            const isMissing = missingFields.includes(label)
            return (
              <li key={label} className="flex items-center gap-2 text-sm">
                <span className={isMissing ? 'text-secondary' : 'text-tertiary'}>
                  {isMissing ? '✗' : '✓'}
                </span>
                <span className={isMissing ? 'text-on-surface font-medium' : 'text-on-surface-variant'}>
                  {label}
                </span>
                {isMissing && (
                  <Link
                    href="/dashboard/profil"
                    className="ml-auto text-xs text-primary underline hover:no-underline"
                  >
                    Compléter →
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={`/${profile.slug}`}
          target="_blank"
          className="flex items-center justify-center gap-2 border border-outline-variant text-on-surface font-semibold px-6 py-3 rounded-lg hover:bg-surface-container transition-colors text-sm"
        >
          Voir ma page publique ↗
        </Link>

        <PublishForm
          profileId={profile.id}
          slug={profile.slug}
          published={profile.published}
          isPublishable={isPublishable}
          missingFields={missingFields}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3 — Verify**

- Publish with all fields filled → toast "Ta page est maintenant en ligne !"
- Publish with missing fields → toast "Champs manquants : …" (lists them)
- Unpublish → toast "Ta page n'est plus visible publiquement"
- The old `?error=` URL mechanism and banner are gone

---

### Task 5 — PalmaresManager.tsx — toast from direct await

**Files:**
- Modify: `app/dashboard/palmares/PalmaresManager.tsx`

**Interfaces:**
- Consumes: `addPalmares`, `updatePalmares`, `deletePalmares` now returning `{ ok: boolean }` (Task 2)
- Consumes: `toast` from `'sonner'`

- [ ] **Step 1 — Add toast import and wire results in `PalmaresForm`**

Add `toast` import:
```tsx
import { toast } from 'sonner'
```

Replace the `handleSubmit` body in `PalmaresForm`:

```tsx
function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault()
  const fd = new FormData(e.currentTarget)
  const form = e.currentTarget
  startTransition(async () => {
    try {
      const result = initial ? await updatePalmares(fd) : await addPalmares(fd)
      if (result.ok) {
        toast.success(initial ? 'Résultat mis à jour' : 'Ajouté avec succès')
        if (!initial) form.reset()
        onDone()
      } else {
        toast.error('Une erreur est survenue, réessaie')
      }
    } catch {
      toast.error('Une erreur est survenue, réessaie')
    }
  })
}
```

- [ ] **Step 2 — Wire toast on delete in `PalmaresManager`**

Replace the `onClick` of the "Confirmer" delete button:

```tsx
onClick={async () => {
  setDeleting(entry.id)
  try {
    const result = await deletePalmares(entry.id)
    if (result.ok) toast.success('Supprimé')
    else toast.error('Une erreur est survenue, réessaie')
  } catch {
    toast.error('Une erreur est survenue, réessaie')
  } finally {
    setConfirming(null)
    setDeleting(null)
  }
}}
```

- [ ] **Step 3 — Verify**

- Add a palmarès entry → toast "Ajouté avec succès"
- Edit an entry → toast "Résultat mis à jour"
- Delete an entry → toast "Supprimé"

---

### Task 6 — VideoManager.tsx — useEffect for add toast + inline for delete

**Files:**
- Modify: `app/dashboard/videos/VideoManager.tsx`

**Interfaces:**
- Consumes: `addVideo` returning `VideoState = { ok: boolean | null; error: string | null }` (Task 2)
- Consumes: `deleteVideo` returning `{ ok: boolean }` (Task 2)
- Consumes: `toast` from `'sonner'`

- [ ] **Step 1 — Add imports and useEffect for add toast**

Add to the import block:
```tsx
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import type { VideoState } from './actions'
```

Update the initial state and add `useEffect`:

```tsx
const initialState: VideoState = { ok: null, error: null }

export default function VideoManager({ videos }: { videos: VideoRow[] }) {
  const [state, formAction] = useFormState(addVideo, initialState)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    if (state.ok === true) toast.success('Ajouté avec succès')
    else if (state.ok === false) toast.error(state.error ?? 'Une erreur est survenue, réessaie')
  }, [state])
```

Remove the inline `{state.error && <p>...}` display block — the toast replaces it. Also remove the conditional `border-secondary` on the YouTube URL input (or keep it — both are fine; the inline error in the form is now redundant since we have a toast, but keeping it for accessibility is fine too).

- [ ] **Step 2 — Wire toast on delete**

Replace the `onClick` of the "Confirmer" delete button:

```tsx
onClick={async () => {
  setDeleting(v.id)
  try {
    const result = await deleteVideo(v.id)
    if (result.ok) toast.success('Supprimé')
    else toast.error('Une erreur est survenue, réessaie')
  } catch {
    toast.error('Une erreur est survenue, réessaie')
  } finally {
    setConfirming(null)
    setDeleting(null)
  }
}}
```

- [ ] **Step 3 — Verify**

- Add a video with a valid YouTube URL → toast "Ajouté avec succès"
- Add a video with an invalid URL → toast with the validation message
- Delete a video → toast "Supprimé"

---

### Task 7 — GalerieManager.tsx — inline toast for add + delete

**Files:**
- Modify: `app/dashboard/galerie/GalerieManager.tsx`

**Interfaces:**
- Consumes: `addPhoto`, `deletePhoto` returning `{ ok: boolean }` (Task 2)
- Consumes: `toast` from `'sonner'`

- [ ] **Step 1 — Add toast import and wire `handleAdd`**

Add import:
```tsx
import { toast } from 'sonner'
```

Replace `handleAdd`:

```tsx
async function handleAdd() {
  if (!pendingUrl) return
  setSaving(true)
  try {
    const result = await addPhoto(pendingUrl, caption, profileId)
    if (result.ok) {
      toast.success('Ajouté avec succès')
      setPendingUrl('')
      setCaption('')
    } else {
      toast.error('Une erreur est survenue, réessaie')
    }
  } catch {
    toast.error('Une erreur est survenue, réessaie')
  } finally {
    setSaving(false)
  }
}
```

- [ ] **Step 2 — Wire toast on delete (desktop overlay)**

Replace the `onClick` of the desktop "Confirmer" button:

```tsx
onClick={async () => {
  try {
    const result = await deletePhoto(photo.id)
    if (result.ok) toast.success('Supprimé')
    else toast.error('Une erreur est survenue, réessaie')
  } catch {
    toast.error('Une erreur est survenue, réessaie')
  } finally {
    setConfirming(null)
  }
}}
```

- [ ] **Step 3 — Wire toast on delete (mobile ✓ button)**

Replace the `onClick` of the mobile "✓" button with the same pattern as Step 2.

- [ ] **Step 4 — Verify**

- Upload a photo then click "Ajouter à la galerie" → toast "Ajouté avec succès"
- Delete a photo (desktop overlay and mobile button) → toast "Supprimé"

---

### Task 8 — Final verification checklist

What to test manually (run `npm run dev`):

**Profile (`/dashboard/profil`)**
- [ ] Save with valid data → green "Profil mis à jour"
- [ ] (Simulate error: temporarily return `{ ok: false }` from `saveProfile`) → red "Une erreur est survenue, réessaie"

**Dashboard (`/dashboard`)**
- [ ] Click "Publier mon profil" with all required fields → green "Ta page est maintenant en ligne !"
- [ ] Click "Publier" with missing fields (e.g., delete bio first) → red "Champs manquants : Bio"
- [ ] Click "Dépublier" → green "Ta page n'est plus visible publiquement"
- [ ] Verify old `?error=` URL + banner mechanism is gone (URL stays clean)

**Palmarès (`/dashboard/palmares`)**
- [ ] Add an entry → green "Ajouté avec succès"
- [ ] Edit an entry → green "Résultat mis à jour"
- [ ] Delete an entry (confirm) → green "Supprimé"

**Vidéos (`/dashboard/videos`)**
- [ ] Add a video with a valid YouTube URL → green "Ajouté avec succès"
- [ ] Add a video with an invalid URL → red validation message
- [ ] Delete a video → green "Supprimé"

**Galerie (`/dashboard/galerie`)**
- [ ] Upload and add a photo → green "Ajouté avec succès"
- [ ] Delete a photo (desktop) → green "Supprimé"
- [ ] Delete a photo (mobile) → green "Supprimé"

**TypeScript**
- [ ] `npx tsc --noEmit` returns zero errors
