# Supabase Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supabase as backend — Google OAuth authentication and relational database schema with RLS — without migrating existing JSON data or building any editing UI.

**Architecture:** Browser and server Supabase clients live in `lib/supabase/`. A middleware refreshes session cookies on every request. Auth state flows from Server Components down to navbars as an `isLoggedIn: boolean` prop. Two small Client Components (`LoginButton`, `LogoutButton`) encapsulate the auth actions to avoid converting Server Components to Client Components.

**Tech Stack:** Next.js 14.2 App Router, `@supabase/supabase-js`, `@supabase/ssr`, TypeScript, Tailwind CSS

## Global Constraints

- Next.js version: 14.2.35 — `cookies()` from `next/headers` is **synchronous** (not async, unlike Next.js 15)
- No test suite — verification is `npx tsc --noEmit` + `npm run build` + manual browser smoke test
- All components follow existing Tailwind design tokens: `bg-primary text-on-primary`, `font-montserrat`, `font-inter`, `px-margin-mobile md:px-margin-desktop`
- `.env.local` is already in `.gitignore` via `.env*.local` — do not modify `.gitignore`
- Never import `judokas.json` directly in new files — only `judokaService.ts` and `blockRegistry.tsx` touch it

---

### Task 1: Install packages and create `.env.local`

**Files:**
- Modify: `package.json` (via npm install)
- Create: `.env.local`

**Interfaces:**
- Produces: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars available to all subsequent tasks

- [ ] **Step 1: Install Supabase packages**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

Expected output: packages added to `node_modules`, `package.json` updated with both dependencies.

- [ ] **Step 2: Create `.env.local` with placeholder values**

Create `.env.local` at the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

These are placeholders. The real values come from the Supabase dashboard after the project is created (see manual steps at the end of this plan).

- [ ] **Step 3: Verify TypeScript still compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. If you see errors about missing types, run `npm install` again.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install @supabase/supabase-js and @supabase/ssr"
```

Do NOT commit `.env.local` — it is gitignored.

---

### Task 2: Browser Supabase client (`lib/supabase/client.ts`)

**Files:**
- Create: `lib/supabase/client.ts`

**Interfaces:**
- Produces: `createClient(): SupabaseBrowserClient` — imported by Client Components that need to call Supabase (auth actions, future data mutations)

- [ ] **Step 1: Create `lib/supabase/client.ts`**

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/client.ts
git commit -m "feat: add Supabase browser client"
```

---

### Task 3: Server Supabase client (`lib/supabase/server.ts`)

**Files:**
- Create: `lib/supabase/server.ts`

**Interfaces:**
- Produces: `createClient(): SupabaseServerClient` — imported by Server Components, Route Handlers, and Server Actions. Must be called once per request (not a singleton).

- [ ] **Step 1: Create `lib/supabase/server.ts`**

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — cookie writes are a no-op here,
            // the middleware handles token refresh instead.
          }
        },
      },
    }
  )
}
```

**Why the try/catch:** Server Components can read cookies but not write them. The `setAll` silently no-ops when called from a Server Component. The middleware (Task 4) is the one that actually refreshes tokens by writing cookies on the response.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/server.ts
git commit -m "feat: add Supabase server client"
```

---

### Task 4: Middleware (`middleware.ts`)

**Files:**
- Create: `middleware.ts` (at project root, same level as `next.config.js`)

**Interfaces:**
- Produces: refreshed Supabase session cookies on every matched request. No redirects — route protection is handled per-page.

- [ ] **Step 1: Create `middleware.ts`**

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

  // Refreshes the session token if expired. Must not be removed.
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: add Supabase session refresh middleware"
```

---

### Task 5: Auth Client Components (`LoginButton` + `LogoutButton`)

**Files:**
- Create: `components/auth/LoginButton.tsx`
- Create: `components/auth/LogoutButton.tsx`

**Interfaces:**
- Consumes: `createClient()` from `@/lib/supabase/client`
- Produces:
  - `<LoginButton />` — renders a button, on click triggers Google OAuth redirect
  - `<LogoutButton />` — renders a button, on click signs out and redirects to `/`

- [ ] **Step 1: Create `components/auth/LoginButton.tsx`**

```tsx
'use client'
import { createClient } from '@/lib/supabase/client'

export default function LoginButton() {
  async function handleLogin() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <button
      onClick={handleLogin}
      className="bg-primary text-on-primary px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors active:scale-95"
    >
      Se connecter avec Google
    </button>
  )
}
```

- [ ] **Step 2: Create `components/auth/LogoutButton.tsx`**

```tsx
'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <button
      onClick={handleLogout}
      className="bg-surface-container text-on-surface px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-outline-variant transition-colors active:scale-95"
    >
      Se déconnecter
    </button>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/auth/LoginButton.tsx components/auth/LogoutButton.tsx
git commit -m "feat: add LoginButton and LogoutButton client components"
```

---

### Task 6: OAuth callback route (`app/auth/callback/route.ts`)

**Files:**
- Create: `app/auth/callback/route.ts`

**Interfaces:**
- Consumes: `createClient()` from `@/lib/supabase/server`
- Produces: exchanges the OAuth `code` for a Supabase session, sets cookies, redirects to `/dashboard`

- [ ] **Step 1: Create `app/auth/callback/route.ts`**

```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/auth/callback/route.ts
git commit -m "feat: add OAuth callback route handler"
```

---

### Task 7: Dashboard page (`app/dashboard/page.tsx`)

**Files:**
- Create: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `createClient()` from `@/lib/supabase/server`, `<LogoutButton />` from `@/components/auth/LogoutButton`
- Produces: protected page — redirects to `/` if no session, otherwise shows email + logout

- [ ] **Step 1: Create `app/dashboard/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/auth/LogoutButton'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-margin-mobile gap-6">
      <h1 className="font-montserrat text-headline-md font-bold text-primary">
        Tableau de bord
      </h1>
      <p className="text-on-surface-variant text-body-lg">
        Connecté en tant que <strong className="text-on-surface">{user.email}</strong>
      </p>
      <LogoutButton />
    </main>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: add minimal dashboard page with auth check"
```

---

### Task 8: Wire auth state into navbars

**Files:**
- Modify: `components/landing/LandingNav.tsx`
- Modify: `components/layout/Header.tsx`
- Modify: `app/page.tsx`
- Modify: `app/[slug]/page.tsx`

**Interfaces:**
- Consumes: `createClient()` from `@/lib/supabase/server` (in page files), `<LoginButton />` from `@/components/auth/LoginButton`
- Produces: navbars that show "Se connecter avec Google" when logged out, "Tableau de bord" link when logged in

**Context on `LandingNav`:** it is already `'use client'` (needs `useState` for the mobile toggle). It will receive `isLoggedIn: boolean` as a prop serialized across the Server→Client boundary — this is safe for a primitive boolean.

**Context on `Header`:** it is a Server Component. It can directly import `LoginButton` (a Client Component) — this is standard App Router pattern.

- [ ] **Step 1: Update `components/landing/LandingNav.tsx`**

Replace the entire file content:

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import LoginButton from '@/components/auth/LoginButton'

interface LandingNavProps {
  isLoggedIn: boolean
}

export default function LandingNav({ isLoggedIn }: LandingNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-md shadow-sm">
      <nav className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop h-20 max-w-container-max mx-auto">
        <span className="font-montserrat text-2xl font-black text-primary tracking-tight">IpponId</span>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="text-on-surface-variant text-sm font-semibold hover:text-secondary transition-colors">
            Comment ça marche
          </a>
          <a href="#profiles" className="text-on-surface-variant text-sm font-semibold hover:text-secondary transition-colors">
            Exemples de profils
          </a>
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="bg-primary text-on-primary px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors active:scale-95"
            >
              Tableau de bord
            </Link>
          ) : (
            <LoginButton />
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-primary p-2"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={open ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
            />
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-surface shadow-lg py-6 flex flex-col items-center gap-5 border-t border-outline-variant">
          <a href="#how-it-works" onClick={() => setOpen(false)} className="text-on-surface-variant text-sm font-semibold">
            Comment ça marche
          </a>
          <a href="#profiles" onClick={() => setOpen(false)} className="text-on-surface-variant text-sm font-semibold">
            Exemples de profils
          </a>
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="bg-primary text-on-primary px-6 py-3 rounded-lg text-sm font-semibold w-11/12 text-center"
            >
              Tableau de bord
            </Link>
          ) : (
            <div className="w-11/12 flex justify-center">
              <LoginButton />
            </div>
          )}
        </div>
      )}
    </header>
  )
}
```

- [ ] **Step 2: Update `components/layout/Header.tsx`**

Replace the entire file content:

```tsx
import Link from 'next/link'
import type { Identity, Social } from '@/types/judoka'
import LoginButton from '@/components/auth/LoginButton'

interface HeaderProps {
  identity: Identity
  social: Social
  isLoggedIn: boolean
}

export default function Header({ identity, isLoggedIn }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur-sm border-b border-outline-variant">
      <div className="flex justify-between items-center px-margin-mobile md:px-margin-desktop h-16 max-w-container-max mx-auto">
        <Link
          href="/"
          className="font-montserrat text-xl font-black text-primary tracking-tighter"
        >
          IpponId
        </Link>

        <nav className="hidden md:flex gap-8 items-center" aria-label="Navigation principale">
          <a href="#bio" className="font-inter text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">
            Profil
          </a>
          <a href="#palmares" className="font-inter text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">
            Palmarès
          </a>
          <a href="#videos" className="font-inter text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">
            Highlights
          </a>
          <a href="#gallery" className="font-inter text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">
            Galerie
          </a>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <span className="font-inter text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            {identity.firstName} {identity.lastName}
          </span>
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="font-inter text-xs font-bold uppercase tracking-widest text-primary hover:text-primary-container transition-colors"
            >
              Tableau de bord
            </Link>
          ) : (
            <LoginButton />
          )}
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Update `app/page.tsx`**

Replace the entire file content:

```tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import LandingNav from '@/components/landing/LandingNav'
import LandingMobileNav from '@/components/landing/LandingMobileNav'
import HeroSection from '@/components/landing/HeroSection'
import MockupSection from '@/components/landing/MockupSection'
import HowItWorksSection from '@/components/landing/HowItWorksSection'
import SocialProofSection from '@/components/landing/SocialProofSection'
import CtaSection from '@/components/landing/CtaSection'
import LandingFooter from '@/components/landing/LandingFooter'

export const metadata: Metadata = {
  title: 'IpponId — Crée ton CV judoka en ligne | Partage ton palmarès',
  description:
    'Crée gratuitement ta page de judoka en quelques secondes. Partage tes grades, compétitions et victoires avec ton URL personnalisée.',
  openGraph: {
    title: 'IpponId — Crée ton CV judoka en ligne',
    description:
      'Crée gratuitement ta page de judoka en quelques secondes. Partage tes grades, compétitions et victoires avec ton URL personnalisée.',
    type: 'website',
    locale: 'fr_FR',
    siteName: 'IpponId',
  },
}

export default async function LandingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <>
      <LandingNav isLoggedIn={!!user} />
      <main className="mt-20">
        <HeroSection />
        <MockupSection />
        <HowItWorksSection />
        <SocialProofSection />
        <CtaSection />
        <div className="h-16 md:hidden" aria-hidden="true" />
      </main>
      <LandingFooter />
      <LandingMobileNav />
    </>
  )
}
```

- [ ] **Step 4: Update `app/[slug]/page.tsx`**

Replace the entire file content:

```tsx
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getJudokaBySlug } from '@/lib/judokaService'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import MobileNav from '@/components/layout/MobileNav'
import { blockRegistry } from '@/lib/blockRegistry'
import judokasData from '@/data/judokas.json'

type Props = { params: { slug: string } }

export async function generateStaticParams() {
  return (judokasData as { slug: string }[]).map((j) => ({ slug: j.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const judoka = await getJudokaBySlug(params.slug)
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
    getJudokaBySlug(params.slug),
    createClient().auth.getUser(),
  ])

  if (!judoka) notFound()

  return (
    <>
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

- [ ] **Step 5: Type-check and build**

```bash
npx tsc --noEmit
```

Expected: no errors.

```bash
npm run build
```

Expected: build succeeds. If it fails with "cookies() is not callable" or similar, double-check that `lib/supabase/server.ts` calls `cookies()` synchronously (Next.js 14, not async).

- [ ] **Step 6: Commit**

```bash
git add components/landing/LandingNav.tsx components/layout/Header.tsx app/page.tsx app/[slug]/page.tsx
git commit -m "feat: wire Supabase auth state into LandingNav and Header"
```

---

### Task 9: SQL migration (`supabase/migrations/0001_init.sql`)

**Files:**
- Create: `supabase/migrations/0001_init.sql`

This file contains the SQL to run in the Supabase SQL Editor. It is committed to the repo for history but is not executed automatically — see manual steps.

- [ ] **Step 1: Create `supabase/migrations/0001_init.sql`**

```sql
-- 0001_init.sql
-- Run in the Supabase SQL Editor after creating your project.

-- ─── Tables ───────────────────────────────────────────────────────────────────

create table public.profiles (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references auth.users(id) on delete cascade,
  slug              text unique not null,
  first_name        text not null,
  last_name         text not null,
  club              text,
  category          text,
  grade             text,
  bio               text,
  profile_photo_url text,
  cover_photo_url   text,
  layout            jsonb,
  published         boolean not null default false,
  parental_consent  boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table public.palmares (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  date        date,
  competition text,
  result      text,
  category    text,
  position    int,
  created_at  timestamptz not null default now()
);

create table public.videos (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  title       text,
  youtube_url text,
  description text,
  position    int,
  created_at  timestamptz not null default now()
);

create table public.gallery_photos (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  photo_url  text,
  caption    text,
  position   int,
  created_at timestamptz not null default now()
);

-- ─── Auto-update updated_at on profiles ───────────────────────────────────────

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- ─── Row Level Security ────────────────────────────────────────────────────────

alter table public.profiles      enable row level security;
alter table public.palmares      enable row level security;
alter table public.videos        enable row level security;
alter table public.gallery_photos enable row level security;

-- profiles
create policy "public_read_profiles"
  on public.profiles for select
  to anon
  using (published = true);

create policy "owner_all_profiles"
  on public.profiles for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- palmares
create policy "public_read_palmares"
  on public.palmares for select
  to anon
  using (
    exists (
      select 1 from public.profiles
      where id = profile_id and published = true
    )
  );

create policy "owner_all_palmares"
  on public.palmares for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = profile_id and owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = profile_id and owner_id = auth.uid()
    )
  );

-- videos
create policy "public_read_videos"
  on public.videos for select
  to anon
  using (
    exists (
      select 1 from public.profiles
      where id = profile_id and published = true
    )
  );

create policy "owner_all_videos"
  on public.videos for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = profile_id and owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = profile_id and owner_id = auth.uid()
    )
  );

-- gallery_photos
create policy "public_read_gallery_photos"
  on public.gallery_photos for select
  to anon
  using (
    exists (
      select 1 from public.profiles
      where id = profile_id and published = true
    )
  );

create policy "owner_all_gallery_photos"
  on public.gallery_photos for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = profile_id and owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = profile_id and owner_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0001_init.sql
git commit -m "feat: add initial database schema and RLS policies"
```

---

## Manual Steps in Supabase Dashboard

After completing all tasks above, do these steps in order:

**1. Créer le projet Supabase**
- Aller sur [supabase.com](https://supabase.com) → New Project
- Choisir une région EU (ex: Frankfurt) pour la conformité RGPD
- Copier `Project URL` et `anon public key` depuis Project Settings → API
- Coller ces valeurs dans `.env.local` (remplacer les placeholders)

**2. Exécuter le SQL**
- Dans le dashboard Supabase → SQL Editor → New query
- Coller le contenu de `supabase/migrations/0001_init.sql`
- Cliquer Run

**3. Activer le provider Google**
- Authentication → Providers → Google → Enable
- Copier le **Callback URL** affiché par Supabase (format `https://<projet>.supabase.co/auth/v1/callback`)

**4. Configurer Google OAuth dans Google Cloud Console**
- Aller sur [console.cloud.google.com](https://console.cloud.google.com)
- APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
- Application type: Web application
- Authorized redirect URIs: coller le Callback URL Supabase de l'étape précédente
- Copier le **Client ID** et **Client Secret** générés

**5. Coller les credentials Google dans Supabase**
- Retour dans Supabase → Authentication → Providers → Google
- Coller Client ID et Client Secret → Save

**6. Configurer l'URL du site**
- Supabase → Authentication → URL Configuration
- Site URL: `http://localhost:3000` (dev) — à changer pour le domaine de production plus tard
- Redirect URLs: ajouter `http://localhost:3000/auth/callback`

**7. Tester le flux complet**
- `npm run dev`
- Aller sur `http://localhost:3000`
- Cliquer "Se connecter avec Google"
- Vérifier la redirection vers Google puis vers `/dashboard`
- Vérifier que l'email est affiché
- Cliquer "Se déconnecter" → vérifier la redirection vers `/`
