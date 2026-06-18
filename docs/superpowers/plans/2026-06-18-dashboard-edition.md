# Dashboard d'édition judoka — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire le tableau de bord d'édition permettant au judoka connecté de gérer son profil, palmarès, vidéos et galerie, et d'en contrôler la visibilité publique.

**Architecture:** Middleware Supabase SSR existant étendu pour protéger `/dashboard/*` + layout garde-barrière qui redirige vers `/dashboard/setup` si pas de profil. Server Actions colocalisées par section (`app/dashboard/<section>/actions.ts`). Pages Server Components délèguent l'état interactif à des Client Components colocalisés.

**Tech Stack:** Next.js 14.2.35 App Router, React 18, Supabase SSR (`@supabase/ssr` 0.12), TypeScript 5, Tailwind CSS 3.

## Global Constraints

- Pas de librairie d'icônes — SVG inline uniquement (paths Heroicons v2 outline fournis dans chaque tâche)
- Pas de test suite — vérifier avec `npx tsc --noEmit` après chaque tâche
- `'use server'` en tête de tous les fichiers `actions.ts`
- `'use client'` en tête de tous les Client Components
- Client Supabase serveur : `import { createClient } from '@/lib/supabase/server'`
- Client Supabase navigateur : `import { createClient } from '@/lib/supabase/client'`
- Toutes les mutations DB passent par RLS — pas besoin de `service_role` dans le dashboard
- Médailles stockées en anglais en DB : `'gold' | 'silver' | 'bronze'` (cohérent avec `MedalType` dans `types/judoka.ts`)
- Design tokens Tailwind existants : `primary`, `tertiary-container`, `surface`, `on-surface`, `on-surface-variant`, `outline-variant`, `surface-container`

---

## File Map

**Modifiés :**
- `middleware.ts` — ajouter auth-guard + header `x-pathname`
- `types/judoka.ts` — ajouter `ownerId` et `published` à `JudokaData`
- `lib/judokaService.ts` — exposer `id`, `owner_id`, `published` ; ajouter option `allowDraft`
- `app/dashboard/page.tsx` — réécriture complète (résumé profil + toggle publier)
- `app/[slug]/page.tsx` — ajouter restriction draft + bandeau propriétaire

**Créés :**
- `app/dashboard/layout.tsx`
- `app/dashboard/actions.ts`
- `app/dashboard/setup/page.tsx`
- `app/dashboard/setup/actions.ts`
- `app/dashboard/profil/page.tsx`
- `app/dashboard/profil/ProfileForm.tsx`
- `app/dashboard/profil/actions.ts`
- `app/dashboard/palmares/page.tsx`
- `app/dashboard/palmares/PalmaresManager.tsx`
- `app/dashboard/palmares/actions.ts`
- `app/dashboard/videos/page.tsx`
- `app/dashboard/videos/VideoManager.tsx`
- `app/dashboard/videos/actions.ts`
- `app/dashboard/galerie/page.tsx`
- `app/dashboard/galerie/GalerieManager.tsx`
- `app/dashboard/galerie/actions.ts`
- `components/dashboard/DashboardNav.tsx`
- `components/dashboard/ImageUploader.tsx`

---

## Task 1 — Étendre `JudokaData` + `judokaService`

**Files:**
- Modify: `types/judoka.ts`
- Modify: `lib/judokaService.ts`

**Interfaces:**
- Produces: `JudokaData.ownerId: string`, `JudokaData.published: boolean`
- Produces: `getJudokaBySlug(slug, options?: { allowDraft?: boolean })`

- [ ] **Step 1 — Ajouter `ownerId` et `published` à `JudokaData`**

Remplacer dans `types/judoka.ts` :

```ts
export interface JudokaData {
  slug: string
  identity: Identity
```

par :

```ts
export interface JudokaData {
  slug: string
  ownerId: string
  published: boolean
  identity: Identity
```

- [ ] **Step 2 — Mettre à jour `ProfileRow` dans `judokaService.ts`**

Remplacer le type `ProfileRow` existant par :

```ts
type ProfileRow = {
  id: string
  owner_id: string
  published: boolean
  slug: string
  first_name: string
  last_name: string
  club: string | null
  category: string | null
  grade: string | null
  bio: string | null
  birth_date: string | null
  profile_photo_url: string | null
  cover_photo_url: string | null
  layout: unknown
  palmares: PalmaresRow[] | null
  videos: VideoRow[] | null
  gallery_photos: GalleryRow[] | null
}
```

- [ ] **Step 3 — Mettre à jour `mapProfile`**

Remplacer le début du `return` dans `mapProfile` :

```ts
function mapProfile(row: ProfileRow): JudokaData {
  const palmares = [...(row.palmares ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const videos = [...(row.videos ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const gallery = [...(row.gallery_photos ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

  return {
    slug: row.slug,
    ownerId: row.owner_id,
    published: row.published,
    identity: {
      firstName: row.first_name,
      lastName: row.last_name,
      club: row.club ?? '',
      birthDate: row.birth_date ?? undefined,
      weightCategory: row.category ?? '',
      grade: row.grade ?? '',
      profilePhoto: row.profile_photo_url ?? '',
      coverPhoto: row.cover_photo_url ?? '',
    },
    bio: row.bio ?? '',
    palmares: palmares.map((p) => ({
      date: p.date ?? '',
      competition: p.competition ?? '',
      result: p.result ?? '',
      category: p.category ?? '',
      level: p.level ?? '',
      medal: (p.medal as MedalType) ?? null,
      city: p.city ?? undefined,
    })),
    videos: videos.map((v) => ({
      title: v.title ?? '',
      youtubeUrl: v.youtube_url ?? '',
      description: v.description ?? '',
    })),
    gallery: gallery.map((g) => ({
      src: g.photo_url ?? '',
      caption: g.caption ?? '',
    })),
    techniques: [],
    social: [],
    layout: (row.layout as BlockName[]) ?? [],
  }
}
```

- [ ] **Step 4 — Ajouter le paramètre `allowDraft` à `getJudokaBySlug`**

Remplacer la fonction `getJudokaBySlug` par :

```ts
export async function getJudokaBySlug(
  slug: string,
  options?: { allowDraft?: boolean }
): Promise<JudokaData | null> {
  const supabase = createClient()
  let query = supabase
    .from('profiles')
    .select(`
      *,
      palmares (*),
      videos (*),
      gallery_photos (*)
    `)
    .eq('slug', slug)

  if (!options?.allowDraft) {
    query = query.eq('published', true)
  }

  const { data, error } = await query.maybeSingle()
  if (error || !data) return null
  return mapProfile(data as unknown as ProfileRow)
}
```

- [ ] **Step 5 — Vérifier le typage**

```bash
npx tsc --noEmit
```

Attendu : 0 erreurs. Si des erreurs apparaissent dans `blockRegistry.tsx` ou dans les pages qui utilisent `JudokaData`, elles signalent des usages de `ownerId`/`published` non encore gérés — ce sera corrigé en Task 10.

- [ ] **Step 6 — Commit**

```bash
git add types/judoka.ts lib/judokaService.ts
git commit -m "feat: expose ownerId, published in JudokaData; add allowDraft option"
```

---

## Task 2 — Middleware (auth-guard + header) + Layout + DashboardNav

**Files:**
- Modify: `middleware.ts`
- Create: `components/dashboard/DashboardNav.tsx`
- Create: `app/dashboard/layout.tsx`

**Interfaces:**
- Produces: header `x-pathname` lisible dans les Server Components via `headers()`
- Produces: shell `/dashboard/*` avec sidebar desktop + bottom tabs mobile

- [ ] **Step 1 — Modifier `middleware.ts`**

Remplacer le contenu de `middleware.ts` par :

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  supabaseResponse.headers.set('x-pathname', request.nextUrl.pathname)

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 2 — Créer `components/dashboard/DashboardNav.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoutButton from '@/components/auth/LogoutButton'

const NAV_ITEMS = [
  {
    href: '/dashboard/profil',
    label: 'Profil',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/palmares',
    label: 'Palmarès',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
      </svg>
    ),
  },
  {
    href: '/dashboard/videos',
    label: 'Vidéos',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-15.91-.563 5.603 3.113a.375.375 0 0 0 .557-.328V8.887a.375.375 0 0 0-.557-.328L5.09 11.672a.375.375 0 0 0 0 .656Z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/galerie',
    label: 'Galerie',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      </svg>
    ),
  },
]

export default function DashboardNav() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-60 flex-col bg-surface border-r border-outline-variant z-40">
        <Link href="/dashboard" className="p-6 flex items-center gap-2">
          <span className="font-montserrat text-lg font-black text-primary">IpponId</span>
        </Link>

        <div className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-tertiary-container/20 text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-tertiary-container rounded-r-full" />
                )}
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </div>

        <div className="p-4 border-t border-outline-variant">
          <LogoutButton />
        </div>
      </nav>

      {/* Mobile bottom tabs */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-outline-variant z-40 flex">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                isActive ? 'text-primary' : 'text-on-surface-variant'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
```

- [ ] **Step 3 — Créer `app/dashboard/layout.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import DashboardNav from '@/components/dashboard/DashboardNav'

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
    </div>
  )
}
```

- [ ] **Step 4 — Vérifier le typage**

```bash
npx tsc --noEmit
```

Attendu : 0 erreurs.

- [ ] **Step 5 — Commit**

```bash
git add middleware.ts components/dashboard/DashboardNav.tsx app/dashboard/layout.tsx
git commit -m "feat: add dashboard layout with auth guard, sidebar nav, and mobile bottom tabs"
```

---

## Task 3 — Page de setup profil

**Files:**
- Create: `app/dashboard/setup/page.tsx`
- Create: `app/dashboard/setup/actions.ts`

**Interfaces:**
- Consumes: `generateSlug` depuis `@/lib/slugify`
- Produces: row `profiles` insérée avec `published = false`

- [ ] **Step 1 — Créer `app/dashboard/setup/actions.ts`**

```ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/slugify'

async function findUniqueSlug(
  supabase: ReturnType<typeof createClient>,
  firstName: string,
  lastName: string
): Promise<string> {
  const base = generateSlug(firstName, lastName)
  let slug = base
  for (let i = 2; i <= 10; i++) {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('slug', slug)
    if (count === 0) return slug
    slug = `${base}-${i}`
  }
  throw new Error('Impossible de générer un slug unique après 10 tentatives.')
}

export async function createProfile(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const firstName = (formData.get('firstName') as string).trim()
  const lastName = (formData.get('lastName') as string).trim()
  if (!firstName || !lastName) return

  // Idempotence : vérifie si un profil existe déjà
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (existing) {
    redirect('/dashboard')
  }

  const slug = await findUniqueSlug(supabase, firstName, lastName)

  await supabase.from('profiles').insert({
    owner_id: user.id,
    slug,
    first_name: firstName,
    last_name: lastName,
    published: false,
    parental_consent: false,
  })

  redirect('/dashboard')
}
```

- [ ] **Step 2 — Créer `app/dashboard/setup/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import { createProfile } from './actions'

export default async function SetupPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const meta = user?.user_metadata ?? {}
  const defaultFirst: string = meta.given_name ?? meta.full_name?.split(' ')[0] ?? ''
  const defaultLast: string =
    meta.family_name ?? meta.full_name?.split(' ').slice(1).join(' ') ?? ''

  return (
    <div className="min-h-screen flex items-center justify-center px-margin-mobile">
      <div className="w-full max-w-md">
        <h1 className="font-montserrat text-headline-md font-bold text-primary mb-2">
          Complète ton profil
        </h1>
        <p className="text-on-surface-variant text-body-md mb-8">
          Ces informations seront visibles sur ta page publique.
        </p>
        <form action={createProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="firstName">
              Prénom
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              defaultValue={defaultFirst}
              required
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="lastName">
              Nom
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              defaultValue={defaultLast}
              required
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-on-primary font-semibold py-3 rounded-lg hover:bg-primary-container transition-colors"
          >
            Créer mon profil
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3 — Vérifier le typage**

```bash
npx tsc --noEmit
```

- [ ] **Step 4 — Commit**

```bash
git add app/dashboard/setup/
git commit -m "feat: add profile setup page with auto-slug generation"
```

---

## Task 4 — Page d'accueil du dashboard + toggle publier

**Files:**
- Create: `app/dashboard/actions.ts`
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: profil DB row avec `id, slug, first_name, last_name, profile_photo_url, published`
- Produces: `togglePublished(profileId, slug, currentValue)` Server Action

- [ ] **Step 1 — Créer `app/dashboard/actions.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function togglePublished(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const profileId = formData.get('profileId') as string
  const slug = formData.get('slug') as string
  const next = formData.get('next') === 'true'

  await supabase
    .from('profiles')
    .update({ published: next })
    .eq('id', profileId)
    .eq('owner_id', user.id)

  revalidatePath('/dashboard')
  revalidatePath(`/${slug}`)
  revalidatePath('/', 'layout')
}
```

- [ ] **Step 2 — Réécrire `app/dashboard/page.tsx`**

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { togglePublished } from './actions'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, slug, first_name, last_name, profile_photo_url, published')
    .eq('owner_id', user.id)
    .single()

  if (!profile) redirect('/dashboard/setup')

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

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={`/${profile.slug}`}
          target="_blank"
          className="flex items-center justify-center gap-2 border border-outline-variant text-on-surface font-semibold px-6 py-3 rounded-lg hover:bg-surface-container transition-colors text-sm"
        >
          Voir ma page publique ↗
        </Link>

        <form action={togglePublished}>
          <input type="hidden" name="profileId" value={profile.id} />
          <input type="hidden" name="slug" value={profile.slug} />
          <input type="hidden" name="next" value={String(!profile.published)} />
          <button
            type="submit"
            className={`w-full sm:w-auto font-semibold px-6 py-3 rounded-lg text-sm transition-colors ${
              profile.published
                ? 'border border-secondary text-secondary hover:bg-secondary/5'
                : 'bg-primary text-on-primary hover:bg-primary-container'
            }`}
          >
            {profile.published ? 'Dépublier' : 'Publier mon profil'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3 — Vérifier le typage**

```bash
npx tsc --noEmit
```

- [ ] **Step 4 — Commit**

```bash
git add app/dashboard/actions.ts app/dashboard/page.tsx
git commit -m "feat: dashboard home with profile summary and publish toggle"
```

---

## Task 5 — Composant `ImageUploader`

**Files:**
- Create: `components/dashboard/ImageUploader.tsx`

**Interfaces:**
- Props: `fieldName: string`, `currentUrl: string`, `ownerId: string`, `onUpload: (url: string) => void`, `bucket?: string`
- Produit une URL publique Supabase Storage après upload

- [ ] **Step 1 — Créer `components/dashboard/ImageUploader.tsx`**

```tsx
'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ImageUploaderProps {
  fieldName: string
  currentUrl: string
  ownerId: string
  onUpload: (url: string) => void
  bucket?: string
  aspectRatio?: 'square' | 'wide'
}

export default function ImageUploader({
  fieldName,
  currentUrl,
  ownerId,
  onUpload,
  bucket = 'media',
  aspectRatio = 'square',
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState(currentUrl)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('Fichier trop lourd (max 5 Mo).')
      return
    }

    setError(null)
    setUploading(true)

    const ext = file.name.split('.').pop()
    const path = `${ownerId}/${fieldName}-${Date.now()}.${ext}`
    const supabase = createClient()

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError("Erreur lors de l'upload. Réessaie.")
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    setPreview(data.publicUrl)
    onUpload(data.publicUrl)
    setUploading(false)
  }

  return (
    <div className="space-y-2">
      <div
        className={`relative overflow-hidden rounded-lg bg-surface-container border border-outline-variant ${
          aspectRatio === 'wide' ? 'aspect-[3/1]' : 'aspect-square w-32'
        }`}
      >
        {preview ? (
          <img src={preview} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-on-surface-variant text-xs">
            Aucune image
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-sm">Envoi…</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
      >
        {preview ? 'Changer' : 'Ajouter une image'}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />

      {error && <p className="text-sm text-secondary">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2 — Vérifier le typage**

```bash
npx tsc --noEmit
```

- [ ] **Step 3 — Commit**

```bash
git add components/dashboard/ImageUploader.tsx
git commit -m "feat: add ImageUploader client component with Supabase Storage upload"
```

---

## Task 6 — Page Profil (identité + bio + photos)

**Files:**
- Create: `app/dashboard/profil/page.tsx`
- Create: `app/dashboard/profil/ProfileForm.tsx`
- Create: `app/dashboard/profil/actions.ts`

**Interfaces:**
- Consumes: `ImageUploader` depuis `@/components/dashboard/ImageUploader`
- Produces: `saveProfile(formData)` Server Action

- [ ] **Step 1 — Créer `app/dashboard/profil/actions.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function saveProfile(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, slug')
    .eq('owner_id', user.id)
    .single()

  if (!profile) redirect('/')

  await supabase
    .from('profiles')
    .update({
      club: formData.get('club') as string || null,
      category: formData.get('category') as string || null,
      grade: formData.get('grade') as string || null,
      bio: formData.get('bio') as string || null,
      profile_photo_url: formData.get('profile_photo_url') as string || null,
      cover_photo_url: formData.get('cover_photo_url') as string || null,
    })
    .eq('id', profile.id)
    .eq('owner_id', user.id)

  revalidatePath('/dashboard/profil')
  revalidatePath(`/${profile.slug}`)
  revalidatePath('/dashboard')
}
```

- [ ] **Step 2 — Créer `app/dashboard/profil/ProfileForm.tsx`**

```tsx
'use client'

import { useState } from 'react'
import ImageUploader from '@/components/dashboard/ImageUploader'
import { saveProfile } from './actions'

const GRADES = [
  '6e kyu', '5e kyu', '4e kyu', '3e kyu', '2e kyu', '1er kyu',
  '1er dan', '2e dan', '3e dan+',
]

interface Profile {
  first_name: string
  last_name: string
  club: string | null
  category: string | null
  grade: string | null
  bio: string | null
  profile_photo_url: string | null
  cover_photo_url: string | null
  owner_id: string
}

export default function ProfileForm({ profile }: { profile: Profile }) {
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(profile.profile_photo_url ?? '')
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(profile.cover_photo_url ?? '')

  return (
    <form action={saveProfile} className="space-y-6 max-w-xl">
      <fieldset className="space-y-4">
        <legend className="font-montserrat font-bold text-primary text-lg mb-2">Identité</legend>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Prénom</label>
            <input
              type="text"
              value={profile.first_name}
              readOnly
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 bg-surface-container text-on-surface-variant text-sm cursor-not-allowed"
            />
            <p className="text-xs text-on-surface-variant mt-1">Modifiable via les paramètres Google</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Nom</label>
            <input
              type="text"
              value={profile.last_name}
              readOnly
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 bg-surface-container text-on-surface-variant text-sm cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="club">Club</label>
          <input
            id="club"
            name="club"
            type="text"
            defaultValue={profile.club ?? ''}
            className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="category">
              Catégorie de poids
            </label>
            <input
              id="category"
              name="category"
              type="text"
              defaultValue={profile.category ?? ''}
              placeholder="-66 kg"
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="grade">Grade</label>
            <select
              id="grade"
              name="grade"
              defaultValue={profile.grade ?? ''}
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">— Sélectionner —</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-montserrat font-bold text-primary text-lg mb-2">Bio</legend>
        <div>
          <textarea
            name="bio"
            defaultValue={profile.bio ?? ''}
            rows={4}
            maxLength={500}
            placeholder="Présente-toi en quelques mots…"
            className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-montserrat font-bold text-primary text-lg mb-2">Photos</legend>

        <div>
          <p className="text-sm font-medium text-on-surface mb-2">Photo de profil</p>
          <ImageUploader
            fieldName="profile_photo"
            currentUrl={profilePhotoUrl}
            ownerId={profile.owner_id}
            onUpload={setProfilePhotoUrl}
          />
          <input type="hidden" name="profile_photo_url" value={profilePhotoUrl} />
        </div>

        <div>
          <p className="text-sm font-medium text-on-surface mb-2">Photo de couverture</p>
          <ImageUploader
            fieldName="cover_photo"
            currentUrl={coverPhotoUrl}
            ownerId={profile.owner_id}
            onUpload={setCoverPhotoUrl}
            aspectRatio="wide"
          />
          <input type="hidden" name="cover_photo_url" value={coverPhotoUrl} />
        </div>
      </fieldset>

      <button
        type="submit"
        className="bg-primary text-on-primary font-semibold px-8 py-3 rounded-lg hover:bg-primary-container transition-colors"
      >
        Enregistrer
      </button>
    </form>
  )
}
```

- [ ] **Step 3 — Créer `app/dashboard/profil/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileForm from './ProfileForm'

export default async function ProfilPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, club, category, grade, bio, profile_photo_url, cover_photo_url, owner_id')
    .eq('owner_id', user.id)
    .single()

  if (!profile) redirect('/dashboard/setup')

  return (
    <div className="px-margin-mobile md:px-margin-desktop py-10 max-w-container-max">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
        <h1 className="font-montserrat text-headline-md font-bold text-primary uppercase">
          Mon profil
        </h1>
      </div>
      <ProfileForm profile={profile} />
    </div>
  )
}
```

- [ ] **Step 4 — Vérifier le typage**

```bash
npx tsc --noEmit
```

- [ ] **Step 5 — Commit**

```bash
git add app/dashboard/profil/
git commit -m "feat: add profile edit page with ImageUploader for photos"
```

---

## Task 7 — Page Palmarès (CRUD complet)

**Files:**
- Create: `app/dashboard/palmares/page.tsx`
- Create: `app/dashboard/palmares/PalmaresManager.tsx`
- Create: `app/dashboard/palmares/actions.ts`

**Interfaces:**
- Produces: `addPalmares`, `updatePalmares`, `deletePalmares` Server Actions
- Place → médaille dérivée côté serveur : 1→gold, 2→silver, 3→bronze, sinon null

- [ ] **Step 1 — Créer `app/dashboard/palmares/actions.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type MedalValue = 'gold' | 'silver' | 'bronze' | null

function deriveFromPosition(position: number): { medal: MedalValue; result: string } {
  if (position === 1) return { medal: 'gold', result: "1re place — Médaille d'or" }
  if (position === 2) return { medal: 'silver', result: '2e place — Médaille d\'argent' }
  if (position === 3) return { medal: 'bronze', result: '3e place — Médaille de bronze' }
  return { medal: null, result: `${position}e place` }
}

async function getProfileId(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', userId)
    .single()
  return data?.id ?? null
}

export async function addPalmares(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const profileId = await getProfileId(supabase, user.id)
  if (!profileId) redirect('/')

  const position = Number(formData.get('position'))
  const { medal, result } = deriveFromPosition(position)

  await supabase.from('palmares').insert({
    profile_id: profileId,
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
}

export async function updatePalmares(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const id = formData.get('id') as string
  const position = Number(formData.get('position'))
  const { medal, result } = deriveFromPosition(position)

  // RLS vérifie ownership via join profiles
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

  revalidatePath('/dashboard/palmares')
}

export async function deletePalmares(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // RLS s'assure que seul le propriétaire peut supprimer
  await supabase.from('palmares').delete().eq('id', id)

  revalidatePath('/dashboard/palmares')
}
```

- [ ] **Step 2 — Créer `app/dashboard/palmares/PalmaresManager.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { addPalmares, updatePalmares, deletePalmares } from './actions'

const LEVELS = ['Départemental', 'Régional', 'National', 'International']
const POSITIONS = [
  { value: 1, label: '1re place' },
  { value: 2, label: '2e place' },
  { value: 3, label: '3e place' },
  { value: 5, label: '5e place' },
  { value: 7, label: '7e place' },
  { value: 9, label: '9e place' },
]

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
}

function MedalBadge({ medal }: { medal: string | null }) {
  if (!medal) return null
  const colors: Record<string, string> = {
    gold: 'bg-medal-gold/20 text-tertiary border-medal-gold/40',
    silver: 'bg-medal-silver/20 text-on-surface-variant border-medal-silver/40',
    bronze: 'bg-medal-bronze/20 text-on-surface border-medal-bronze/40',
  }
  const labels: Record<string, string> = { gold: 'Or', silver: 'Argent', bronze: 'Bronze' }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${colors[medal] ?? ''}`}>
      {labels[medal] ?? medal}
    </span>
  )
}

function PalmaresForm({
  initial,
  onDone,
}: {
  initial?: PalmaresRow
  onDone: () => void
}) {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (initial) {
      await updatePalmares(fd)
    } else {
      await addPalmares(fd)
      e.currentTarget.reset()
    }
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface-container-low rounded-xl p-5 border border-outline-variant">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div>
        <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="palm-date">Date</label>
        <input
          id="palm-date"
          name="date"
          type="date"
          defaultValue={initial?.date ?? ''}
          className="w-full border border-outline-variant rounded-lg px-3 py-2 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="palm-competition">Compétition</label>
        <input
          id="palm-competition"
          name="competition"
          type="text"
          defaultValue={initial?.competition ?? ''}
          placeholder="Championnat de France"
          className="w-full border border-outline-variant rounded-lg px-3 py-2 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="palm-city">Ville</label>
        <input
          id="palm-city"
          name="city"
          type="text"
          defaultValue={initial?.city ?? ''}
          className="w-full border border-outline-variant rounded-lg px-3 py-2 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="palm-category">Catégorie de poids</label>
        <input
          id="palm-category"
          name="category"
          type="text"
          defaultValue={initial?.category ?? ''}
          placeholder="-66 kg"
          className="w-full border border-outline-variant rounded-lg px-3 py-2 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="palm-level">Niveau</label>
        <select
          id="palm-level"
          name="level"
          defaultValue={initial?.level ?? ''}
          className="w-full border border-outline-variant rounded-lg px-3 py-2 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        >
          <option value="">— Sélectionner —</option>
          {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="palm-position">Place</label>
        <select
          id="palm-position"
          name="position"
          defaultValue={initial?.position ?? ''}
          className="w-full border border-outline-variant rounded-lg px-3 py-2 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        >
          <option value="">— Sélectionner —</option>
          {POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      <div className="sm:col-span-2 flex gap-3">
        <button
          type="submit"
          className="bg-primary text-on-primary font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-primary-container transition-colors"
        >
          {initial ? 'Mettre à jour' : 'Ajouter'}
        </button>
        {initial && (
          <button
            type="button"
            onClick={onDone}
            className="border border-outline-variant text-on-surface-variant font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-surface-container transition-colors"
          >
            Annuler
          </button>
        )}
      </div>
    </form>
  )
}

export default function PalmaresManager({ entries }: { entries: PalmaresRow[] }) {
  const [editing, setEditing] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <h2 className="font-montserrat font-bold text-primary text-lg">Ajouter une entrée</h2>
      <PalmaresForm onDone={() => {}} />

      {entries.length > 0 && (
        <div className="space-y-3 pt-4">
          <h2 className="font-montserrat font-bold text-primary text-lg">Mes résultats</h2>
          {entries.map((entry) => (
            <div key={entry.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
              {editing === entry.id ? (
                <div className="p-4">
                  <PalmaresForm
                    initial={entry}
                    onDone={() => setEditing(null)}
                  />
                </div>
              ) : (
                <div className="p-4 flex justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <MedalBadge medal={entry.medal} />
                      <span className="text-sm font-bold text-on-surface">{entry.result}</span>
                    </div>
                    <p className="text-sm text-on-surface">{entry.competition}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {entry.date} · {entry.level}{entry.city ? ` · ${entry.city}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {confirming === entry.id ? (
                      <>
                        <button
                          onClick={async () => { await deletePalmares(entry.id); setConfirming(null) }}
                          className="text-xs font-semibold text-secondary hover:underline"
                        >
                          Confirmer
                        </button>
                        <button
                          onClick={() => setConfirming(null)}
                          className="text-xs text-on-surface-variant hover:underline"
                        >
                          Annuler
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditing(entry.id)}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => setConfirming(entry.id)}
                          className="text-xs font-medium text-secondary hover:underline"
                        >
                          Supprimer
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3 — Créer `app/dashboard/palmares/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PalmaresManager from './PalmaresManager'

export default async function PalmaresPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!profile) redirect('/dashboard/setup')

  const { data: entries } = await supabase
    .from('palmares')
    .select('id, date, competition, city, category, level, position, result, medal')
    .eq('profile_id', profile.id)
    .order('date', { ascending: false })

  return (
    <div className="px-margin-mobile md:px-margin-desktop py-10 max-w-container-max">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
        <h1 className="font-montserrat text-headline-md font-bold text-primary uppercase">
          Mon Palmarès
        </h1>
      </div>
      <PalmaresManager entries={entries ?? []} />
    </div>
  )
}
```

- [ ] **Step 4 — Vérifier le typage**

```bash
npx tsc --noEmit
```

- [ ] **Step 5 — Commit**

```bash
git add app/dashboard/palmares/
git commit -m "feat: add palmares CRUD with position-to-medal derivation"
```

---

## Task 8 — Page Vidéos (CRUD + validation YouTube)

**Files:**
- Create: `app/dashboard/videos/page.tsx`
- Create: `app/dashboard/videos/VideoManager.tsx`
- Create: `app/dashboard/videos/actions.ts`

**Interfaces:**
- Produces: `addVideo(formData)`, `deleteVideo(id)` Server Actions
- Regex YouTube : `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/shorts/`

- [ ] **Step 1 — Créer `app/dashboard/videos/actions.ts`**

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

export async function addVideo(
  _state: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const profileId = await getProfileId(supabase, user.id)
  if (!profileId) redirect('/')

  const youtubeUrl = (formData.get('youtube_url') as string).trim()
  if (!YOUTUBE_RE.test(youtubeUrl)) {
    return { error: 'Lien YouTube invalide. Utilise un lien youtube.com/watch?v=… ou youtu.be/…' }
  }

  await supabase.from('videos').insert({
    profile_id: profileId,
    title: formData.get('title') as string || null,
    youtube_url: youtubeUrl,
    description: formData.get('description') as string || null,
  })

  revalidatePath('/dashboard/videos')
  return { error: null }
}

export async function deleteVideo(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  await supabase.from('videos').delete().eq('id', id)
  revalidatePath('/dashboard/videos')
}
```

- [ ] **Step 2 — Créer `app/dashboard/videos/VideoManager.tsx`**

```tsx
'use client'

import { useFormState } from 'react-dom'
import { useState } from 'react'
import { addVideo, deleteVideo } from './actions'

interface VideoRow {
  id: string
  title: string | null
  youtube_url: string | null
  description: string | null
}

const initialState = { error: null }

export default function VideoManager({ videos }: { videos: VideoRow[] }) {
  const [state, formAction] = useFormState(addVideo, initialState)
  const [confirming, setConfirming] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-montserrat font-bold text-primary text-lg mb-4">Ajouter une vidéo</h2>
        <form action={formAction} className="space-y-4 bg-surface-container-low rounded-xl p-5 border border-outline-variant max-w-xl">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="vid-title">Titre</label>
            <input
              id="vid-title"
              name="title"
              type="text"
              placeholder="Mon passage en finale"
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="vid-url">Lien YouTube *</label>
            <input
              id="vid-url"
              name="youtube_url"
              type="url"
              required
              placeholder="https://youtube.com/watch?v=..."
              className={`w-full border rounded-lg px-3 py-2 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm ${
                state.error ? 'border-secondary' : 'border-outline-variant'
              }`}
            />
            {state.error && (
              <p className="text-sm text-secondary mt-1">{state.error}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="vid-desc">Description</label>
            <textarea
              id="vid-desc"
              name="description"
              rows={2}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm resize-none"
            />
          </div>
          <button
            type="submit"
            className="bg-primary text-on-primary font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-primary-container transition-colors"
          >
            Ajouter
          </button>
        </form>
      </div>

      {videos.length > 0 && (
        <div>
          <h2 className="font-montserrat font-bold text-primary text-lg mb-3">Mes vidéos</h2>
          <div className="space-y-3">
            {videos.map((v) => (
              <div
                key={v.id}
                className="flex justify-between items-start gap-4 bg-surface-container-lowest rounded-xl border border-outline-variant p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-on-surface text-sm">{v.title}</p>
                  <a
                    href={v.youtube_url ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline break-all"
                  >
                    {v.youtube_url}
                  </a>
                  {v.description && (
                    <p className="text-xs text-on-surface-variant mt-1">{v.description}</p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {confirming === v.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={async () => { await deleteVideo(v.id); setConfirming(null) }}
                        className="text-xs font-semibold text-secondary hover:underline"
                      >
                        Confirmer
                      </button>
                      <button
                        onClick={() => setConfirming(null)}
                        className="text-xs text-on-surface-variant hover:underline"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirming(v.id)}
                      className="text-xs font-medium text-secondary hover:underline"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3 — Créer `app/dashboard/videos/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import VideoManager from './VideoManager'

export default async function VideosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!profile) redirect('/dashboard/setup')

  const { data: videos } = await supabase
    .from('videos')
    .select('id, title, youtube_url, description')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false })

  return (
    <div className="px-margin-mobile md:px-margin-desktop py-10 max-w-container-max">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
        <h1 className="font-montserrat text-headline-md font-bold text-primary uppercase">
          Mes Vidéos
        </h1>
      </div>
      <VideoManager videos={videos ?? []} />
    </div>
  )
}
```

- [ ] **Step 4 — Vérifier le typage**

```bash
npx tsc --noEmit
```

- [ ] **Step 5 — Commit**

```bash
git add app/dashboard/videos/
git commit -m "feat: add videos CRUD with YouTube URL validation"
```

---

## Task 9 — Page Galerie (upload + suppression)

**Files:**
- Create: `app/dashboard/galerie/page.tsx`
- Create: `app/dashboard/galerie/GalerieManager.tsx`
- Create: `app/dashboard/galerie/actions.ts`

**Interfaces:**
- Consumes: `ImageUploader` avec `onUpload` callback
- Produces: `addPhoto(url, caption, profileId)`, `deletePhoto(id)` Server Actions

- [ ] **Step 1 — Créer `app/dashboard/galerie/actions.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function addPhoto(url: string, caption: string, profileId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  await supabase.from('gallery_photos').insert({
    profile_id: profileId,
    photo_url: url,
    caption: caption || null,
  })

  revalidatePath('/dashboard/galerie')
}

export async function deletePhoto(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // L'objet Storage n'est pas supprimé (v1) — seule la ligne DB est retirée
  await supabase.from('gallery_photos').delete().eq('id', id)
  revalidatePath('/dashboard/galerie')
}
```

- [ ] **Step 2 — Créer `app/dashboard/galerie/GalerieManager.tsx`**

```tsx
'use client'

import { useState } from 'react'
import ImageUploader from '@/components/dashboard/ImageUploader'
import { addPhoto, deletePhoto } from './actions'

interface Photo {
  id: string
  photo_url: string | null
  caption: string | null
}

export default function GalerieManager({
  photos,
  ownerId,
  profileId,
}: {
  photos: Photo[]
  ownerId: string
  profileId: string
}) {
  const [pendingUrl, setPendingUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [confirming, setConfirming] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!pendingUrl) return
    setSaving(true)
    await addPhoto(pendingUrl, caption, profileId)
    setPendingUrl('')
    setCaption('')
    setSaving(false)
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-montserrat font-bold text-primary text-lg mb-4">Ajouter une photo</h2>
        <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant max-w-sm space-y-3">
          <ImageUploader
            fieldName="gallery"
            currentUrl={pendingUrl}
            ownerId={ownerId}
            onUpload={setPendingUrl}
            bucket="media"
          />
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="gal-caption">
              Légende (optionnelle)
            </label>
            <input
              id="gal-caption"
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!pendingUrl || saving}
            className="bg-primary text-on-primary font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-primary-container transition-colors disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Ajouter à la galerie'}
          </button>
        </div>
      </div>

      {photos.length > 0 && (
        <div>
          <h2 className="font-montserrat font-bold text-primary text-lg mb-4">Ma galerie</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group aspect-square rounded-xl overflow-hidden bg-surface-container">
                {photo.photo_url && (
                  <img
                    src={photo.photo_url}
                    alt={photo.caption ?? ''}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors md:flex hidden items-center justify-center opacity-0 group-hover:opacity-100">
                  {confirming === photo.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={async () => { await deletePhoto(photo.id); setConfirming(null) }}
                        className="text-xs font-semibold bg-secondary text-white px-3 py-1.5 rounded-lg"
                      >
                        Confirmer
                      </button>
                      <button
                        onClick={() => setConfirming(null)}
                        className="text-xs bg-white/80 text-on-surface px-3 py-1.5 rounded-lg"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirming(photo.id)}
                      className="text-xs font-semibold bg-secondary text-white px-3 py-1.5 rounded-lg"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
                {/* Mobile: toujours visible */}
                <div className="md:hidden absolute top-1 right-1">
                  {confirming === photo.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={async () => { await deletePhoto(photo.id); setConfirming(null) }}
                        className="text-xs font-semibold bg-secondary text-white px-2 py-1 rounded"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setConfirming(null)}
                        className="text-xs bg-white/80 text-on-surface px-2 py-1 rounded"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirming(photo.id)}
                      className="text-xs font-semibold bg-secondary/80 text-white px-2 py-1 rounded"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3 — Créer `app/dashboard/galerie/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GalerieManager from './GalerieManager'

export default async function GaleriePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, owner_id')
    .eq('owner_id', user.id)
    .single()

  if (!profile) redirect('/dashboard/setup')

  const { data: photos } = await supabase
    .from('gallery_photos')
    .select('id, photo_url, caption')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false })

  return (
    <div className="px-margin-mobile md:px-margin-desktop py-10 max-w-container-max">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
        <h1 className="font-montserrat text-headline-md font-bold text-primary uppercase">
          Ma Galerie
        </h1>
      </div>
      <GalerieManager
        photos={photos ?? []}
        ownerId={profile.owner_id}
        profileId={profile.id}
      />
    </div>
  )
}
```

- [ ] **Step 4 — Vérifier le typage**

```bash
npx tsc --noEmit
```

- [ ] **Step 5 — Commit**

```bash
git add app/dashboard/galerie/
git commit -m "feat: add gallery management with ImageUploader reuse"
```

---

## Task 10 — Restriction page publique (draft + bandeau propriétaire)

**Files:**
- Modify: `app/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getJudokaBySlug(slug, { allowDraft: true })` (défini en Task 1)
- Consumes: `JudokaData.ownerId`, `JudokaData.published` (définis en Task 1)

- [ ] **Step 1 — Modifier `app/[slug]/page.tsx`**

Remplacer le fichier complet par :

```tsx
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getJudokaBySlug } from '@/lib/judokaService'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import MobileNav from '@/components/layout/MobileNav'
import { blockRegistry } from '@/lib/blockRegistry'

type Props = { params: { slug: string } }

export async function generateStaticParams() {
  const { createClient: createBrowserClient } = await import('@/lib/supabase/client')
  const supabase = createBrowserClient()
  const { data } = await supabase.from('profiles').select('slug').eq('published', true)
  return (data ?? []).map((row) => ({ slug: row.slug as string }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const judoka = await getJudokaBySlug(params.slug, { allowDraft: true })
  if (!judoka) return {}
  return {
    title: `${judoka.identity.firstName} ${judoka.identity.lastName} — ${judoka.identity.club} · IpponId`,
    description: judoka.bio.slice(0, 155) + '…',
    openGraph: {
      title: `${judoka.identity.firstName} ${judoka.identity.lastName} — IpponId`,
      description: judoka.bio.slice(0, 155) + '…',
      images: [{ url: judoka.identity.coverPhoto, width: 1200, height: 630, alt: `${judoka.identity.firstName} ${judoka.identity.lastName} en compétition` }],
      type: 'profile',
      locale: 'fr_FR',
      siteName: 'IpponId',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${judoka.identity.firstName} ${judoka.identity.lastName} — IpponId`,
      description: judoka.bio.slice(0, 155) + '…',
      images: [judoka.identity.coverPhoto],
    },
  }
}

export default async function JudokaPage({ params }: Props) {
  const [judoka, { data: { user } }] = await Promise.all([
    getJudokaBySlug(params.slug, { allowDraft: true }),
    createClient().auth.getUser(),
  ])

  const isOwner = !!user && !!judoka && judoka.ownerId === user.id

  if (!judoka) notFound()
  if (!judoka.published && !isOwner) notFound()

  return (
    <>
      {!judoka.published && isOwner && (
        <div className="sticky top-0 z-50 bg-surface-container border-b border-outline-variant px-margin-mobile md:px-margin-desktop py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-on-surface-variant font-medium">
            Brouillon — cette page n&apos;est pas visible publiquement.
          </p>
          <a
            href="/dashboard"
            className="text-sm font-semibold text-primary hover:underline whitespace-nowrap"
          >
            Gérer →
          </a>
        </div>
      )}
      <Header identity={judoka.identity} social={judoka.social} isLoggedIn={!!user} />
      <main>
        {judoka.layout.map((blockName) => {
          const render = blockRegistry[blockName]
          if (!render) return null
          return (
            <div key={blockName} id={blockName} className="scroll-mt-20">
              {render(judoka)}
            </div>
          )
        })}
        <div className="h-16 md:hidden" aria-hidden="true" />
      </main>
      <Footer identity={judoka.identity} social={judoka.social} />
      <MobileNav />
    </>
  )
}
```

- [ ] **Step 2 — Vérifier le typage**

```bash
npx tsc --noEmit
```

Attendu : 0 erreurs sur l'ensemble du projet.

- [ ] **Step 3 — Build de vérification finale**

```bash
npm run build
```

Attendu : build réussi sans erreurs. Les warnings Next.js sur `dynamicParams` sont normaux.

- [ ] **Step 4 — Commit**

```bash
git add app/[slug]/page.tsx
git commit -m "feat: restrict public page to published profiles; show draft banner to owner"
```

---

## Checklist de test manuel

Après avoir démarré le serveur dev (`npm run dev`) :

1. **Auth guard** : visiter `/dashboard` sans être connecté → redirigé vers `/`.
2. **Setup flow** : se connecter avec Google pour la première fois → redirigé vers `/dashboard/setup` → formulaire pré-rempli avec le nom Google → valider → profil créé → redirigé vers `/dashboard`.
3. **Dashboard home** : carte avec photo/initiales, badge "Brouillon", lien "Voir ma page publique", bouton "Publier".
4. **Toggle publier** : cliquer "Publier mon profil" → badge passe à "Publié" → visiter `/{slug}` → page visible. Re-cliquer "Dépublier" → badge revient à "Brouillon" → visiter `/{slug}` sans être connecté → 404.
5. **Page publique brouillon propriétaire** : visiter `/{slug}` en étant connecté en tant que propriétaire → bandeau "Brouillon" visible en haut.
6. **Profil** : modifier club/catégorie/grade/bio → enregistrer → visiter la page publique → changements visibles.
7. **Photos** : uploader une photo de profil et une couverture → vérifier l'aperçu dans l'uploader et sur la page publique.
8. **Palmarès** : ajouter une entrée 1re place → vérifier médaille "Or" dans la liste. Ajouter 5e place → pas de médaille. Modifier une entrée → supprimer une entrée (confirmation inline).
9. **Vidéos** : ajouter un lien YouTube valide → succès. Ajouter un lien invalide → erreur sous le champ, pas de redirection.
10. **Galerie** : uploader une photo → légende → ajouter. Supprimer avec confirmation. Vérifier la grille 2/3 colonnes.
11. **Navigation** : tester sidebar desktop + bottom tabs mobile sur toutes les sections.
