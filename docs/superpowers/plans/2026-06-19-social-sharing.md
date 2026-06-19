# Social Sharing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Générer automatiquement des cartes Open Graph partageables (profil + résultat individuel) et exposer des boutons de partage WhatsApp/Facebook/Instagram-TikTok/copie sur la page publique et dans le dashboard.

**Architecture:** Deux routes Edge-agnostiques (Node.js runtime) avec `@vercel/og` génèrent des images 1200×630 depuis Supabase ; un composant client `ShareButtons` gère les canaux de partage avec détection de `navigator.share` ; les intégrations dans `HeroBlock`, `PalmaresBlock` et `PalmaresManager` consomment ce composant via des props minimales.

**Tech Stack:** Next.js 14 App Router, `@vercel/og`, Supabase JS v2, sonner (toasts), Tailwind CSS, TypeScript.

## Global Constraints

- Aucun test suite configuré — vérification manuelle dans le navigateur à chaque tâche
- Runtime Node.js (pas Edge) sur les routes OG pour accès `fs`
- Polices : `public/fonts/Montserrat-Black.ttf` et `public/fonts/Inter-Bold.ttf` (format TTF obligatoire pour `@vercel/og`)
- URL de base : `process.env.NEXT_PUBLIC_SITE_URL` (ex. `http://localhost:3000` en dev, `https://ipponid.com` en prod)
- Toasts via `sonner` — `import { toast } from 'sonner'`
- Couleurs de charte : primary `#000666`, primary-container `#1a237e`, tertiary-container `#cba72f`, white, on-surface-variant `rgba(255,255,255,0.55)`
- Pas de Tailwind dans les routes OG — styles inline uniquement (contrainte de `@vercel/og`)

---

## File Map

| Fichier | Action |
|---|---|
| `package.json` | + `@vercel/og` |
| `public/fonts/Montserrat-Black.ttf` | nouveau (télécharger) |
| `public/fonts/Inter-Bold.ttf` | nouveau (télécharger) |
| `.env.local` | + `NEXT_PUBLIC_SITE_URL` |
| `types/judoka.ts` | + `id?: string` sur `PalmaresEntry` |
| `lib/judokaService.ts` | propage `id` dans le mapper |
| `app/api/og/profile/[slug]/route.tsx` | nouveau |
| `app/api/og/result/[slug]/[resultId]/route.tsx` | nouveau |
| `app/[slug]/page.tsx` | og:image → route dynamique |
| `components/ShareButtons.tsx` | nouveau |
| `components/blocks/PalmaresShareButton.tsx` | nouveau |
| `lib/blockRegistry.tsx` | passe `slug` à HeroBlock et PalmaresBlock |
| `components/blocks/HeroBlock.tsx` | + prop `slug`, + section partage profil |
| `components/blocks/PalmaresBlock.tsx` | + prop `slug`, + id anchor, + PalmaresShareButton |
| `app/dashboard/palmares/actions.ts` | `addPalmares` retourne `{ ok: true; id: string } \| { ok: false }` |
| `app/dashboard/palmares/PalmaresManager.tsx` | + bouton persistant + bannière post-ajout + props `isPublished`, `profileSlug` |
| `app/dashboard/palmares/page.tsx` | passe `isPublished` et `profileSlug` à `PalmaresManager` |

---

### Task 1 : Prérequis — dépendance, polices, env, types

**Files:**
- Modify: `package.json`
- Create: `public/fonts/Montserrat-Black.ttf`
- Create: `public/fonts/Inter-Bold.ttf`
- Modify: `.env.local`
- Modify: `types/judoka.ts`
- Modify: `lib/judokaService.ts`

**Interfaces:**
- Produces: `PalmaresEntry.id?: string` — utilisé dans Tasks 2, 3, 7, 8

---

- [ ] **Step 1 : Installer `@vercel/og`**

```bash
npm install @vercel/og
```

Expected : `@vercel/og` apparaît dans `package.json` > `dependencies`.

- [ ] **Step 2 : Télécharger les polices TTF**

Aller sur [fonts.google.com/specimen/Montserrat](https://fonts.google.com/specimen/Montserrat) → "Get font" → "Download all" → extraire `static/Montserrat-Black.ttf`.

Aller sur [fonts.google.com/specimen/Inter](https://fonts.google.com/specimen/Inter) → "Get font" → "Download all" → extraire `static/Inter-Bold.ttf`.

Placer les deux fichiers dans `public/fonts/` :

```
public/
  fonts/
    Montserrat-Black.ttf
    Inter-Bold.ttf
```

- [ ] **Step 3 : Ajouter `NEXT_PUBLIC_SITE_URL` dans `.env.local`**

Ajouter à la fin de `.env.local` :

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 4 : Ajouter `id` à `PalmaresEntry`**

Dans `types/judoka.ts`, modifier l'interface `PalmaresEntry` :

```ts
export interface PalmaresEntry {
  id?: string          // UUID Supabase — présent sur les profils DB
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

- [ ] **Step 5 : Propager `id` dans le mapper**

Dans `lib/judokaService.ts`, la fonction `mapProfile`, modifier la section `palmares` :

```ts
palmares: palmares.map((p) => ({
  id: p.id ?? undefined,       // ligne ajoutée
  date: p.date ?? '',
  competition: p.competition ?? '',
  result: p.result ?? '',
  category: p.category ?? '',
  level: p.level ?? '',
  medal: (p.medal as MedalType) ?? null,
  city: p.city ?? undefined,
})),
```

Le type `PalmaresRow` en haut du fichier a déjà un champ `id` dans la DB — vérifier que la requête Supabase le sélectionne. Dans `getJudokaBySlug`, le `select('*')` inclut déjà tous les champs de la table `palmares`, donc `id` est bien récupéré.

- [ ] **Step 6 : Vérifier la compilation**

```bash
npx tsc --noEmit
```

Expected : aucune erreur.

- [ ] **Step 7 : Commit**

```bash
git add package.json package-lock.json public/fonts/ .env.local types/judoka.ts lib/judokaService.ts
git commit -m "feat: add @vercel/og, font files, and PalmaresEntry id field"
```

---

### Task 2 : Route OG profil (`/api/og/profile/[slug]`)

**Files:**
- Create: `app/api/og/profile/[slug]/route.tsx`

**Interfaces:**
- Consumes: Supabase `profiles` table (slug, published, first_name, last_name, club, grade, category, profile_photo_url) + `palmares` table (result, competition, medal)
- Produces: `GET /api/og/profile/[slug]` → `image/png` 1200×630

---

- [ ] **Step 1 : Créer la route**

Créer `app/api/og/profile/[slug]/route.tsx` avec le contenu complet suivant :

```tsx
import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import fs from 'fs'
import path from 'path'

const montserratBlack = fs.readFileSync(
  path.join(process.cwd(), 'public/fonts/Montserrat-Black.ttf')
)
const interBold = fs.readFileSync(
  path.join(process.cwd(), 'public/fonts/Inter-Bold.ttf')
)

const MEDAL_ORDER: Record<string, number> = { gold: 0, silver: 1, bronze: 2 }
const MEDAL_COLORS: Record<string, string> = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
}
const MEDAL_LABELS: Record<string, string> = {
  gold: 'OR',
  silver: 'ARG',
  bronze: 'BRZ',
}

type PRow = { result: string | null; competition: string | null; medal: string | null }

function sortByMedal(rows: PRow[]): PRow[] {
  return [...rows].sort((a, b) => {
    const oa = a.medal ? (MEDAL_ORDER[a.medal] ?? 3) : 3
    const ob = b.medal ? (MEDAL_ORDER[b.medal] ?? 3) : 3
    return oa - ob
  })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, club, grade, category, profile_photo_url')
    .eq('slug', params.slug)
    .eq('published', true)
    .maybeSingle()

  if (!profile) {
    return new Response('Not found', { status: 404 })
  }

  const { data: rawPalmares } = await supabase
    .from('palmares')
    .select('result, competition, medal')
    .eq('profile_id', profile.id)
    .limit(20)

  const top3 = sortByMedal(rawPalmares ?? []).slice(0, 3)
  const initials =
    (profile.first_name?.[0] ?? '') + (profile.last_name?.[0] ?? '')

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '1200px',
          height: '630px',
          backgroundColor: '#000666',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            padding: '64px',
            gap: '48px',
            alignItems: 'center',
          }}
        >
          {/* Left column */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              width: '380px',
              flexShrink: 0,
            }}
          >
            {/* Profile photo */}
            <div
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '60px',
                overflow: 'hidden',
                border: '3px solid rgba(255,255,255,0.2)',
                backgroundColor: '#1a237e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {profile.profile_photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.profile_photo_url}
                  alt=""
                  style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                />
              ) : (
                <span
                  style={{
                    fontFamily: 'Montserrat',
                    fontSize: '40px',
                    fontWeight: 900,
                    color: 'white',
                    textTransform: 'uppercase',
                  }}
                >
                  {initials}
                </span>
              )}
            </div>

            {/* Name */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'Montserrat',
                fontSize: '52px',
                fontWeight: 900,
                color: 'white',
                lineHeight: 1.05,
                textTransform: 'uppercase',
              }}
            >
              <span>{profile.first_name}</span>
              <span>{profile.last_name}</span>
            </div>

            {/* Club + grade */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span
                style={{
                  fontFamily: 'Inter',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#e9c349',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {profile.club ?? ''}
              </span>
              <span
                style={{
                  fontFamily: 'Inter',
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                {[profile.grade, profile.category].filter(Boolean).join(' · ')}
              </span>
            </div>
          </div>

          {/* Right column — palmarès */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              flex: 1,
            }}
          >
            {top3.length > 0 ? (
              top3.map((entry, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    backgroundColor: 'rgba(255,255,255,0.07)',
                    borderRadius: '12px',
                    padding: '18px 24px',
                    borderLeft: `4px solid ${entry.medal ? (MEDAL_COLORS[entry.medal] ?? '#c6c5d4') : '#c6c5d4'}`,
                  }}
                >
                  {entry.medal && (
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '18px',
                        backgroundColor: MEDAL_COLORS[entry.medal] ?? '#c6c5d4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'Inter',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#000',
                        }}
                      >
                        {MEDAL_LABELS[entry.medal]}
                      </span>
                    </div>
                  )}
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
                  >
                    <span
                      style={{
                        fontFamily: 'Inter',
                        fontSize: '18px',
                        fontWeight: 700,
                        color: 'white',
                      }}
                    >
                      {entry.result ?? ''}
                    </span>
                    <span
                      style={{
                        fontFamily: 'Inter',
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {entry.competition ?? ''}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                }}
              >
                <span
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '20px',
                    color: 'rgba(255,255,255,0.3)',
                    fontStyle: 'italic',
                  }}
                >
                  Athlète IpponId
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Gold bar bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '8px',
            backgroundColor: '#cba72f',
          }}
        />

        {/* Watermark */}
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '64px',
            fontFamily: 'Inter',
            fontSize: '13px',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
          }}
        >
          ipponid.com
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Montserrat',
          data: montserratBlack as unknown as ArrayBuffer,
          weight: 900,
          style: 'normal',
        },
        {
          name: 'Inter',
          data: interBold as unknown as ArrayBuffer,
          weight: 700,
          style: 'normal',
        },
      ],
      headers: { 'Cache-Control': 'public, max-age=86400' },
    }
  )
}
```

- [ ] **Step 2 : Vérifier le rendu**

Démarrer le serveur (`npm run dev`). Naviguer vers `http://localhost:3000/api/og/profile/[slug]` en remplaçant `[slug]` par un slug de profil publié.

Expected : image PNG 1200×630 affichée dans le navigateur avec le nom du judoka, son club, et ses médailles.

- [ ] **Step 3 : Vérifier le 404**

Naviguer vers `http://localhost:3000/api/og/profile/profil-inexistant`.

Expected : réponse HTTP 404.

- [ ] **Step 4 : Commit**

```bash
git add app/api/og/profile/
git commit -m "feat: add OG profile image generation route"
```

---

### Task 3 : Route OG résultat (`/api/og/result/[slug]/[resultId]`)

**Files:**
- Create: `app/api/og/result/[slug]/[resultId]/route.tsx`

**Interfaces:**
- Consumes: Supabase `palmares` (id, result, competition, medal, date, city, category, profile_id) + `profiles` (first_name, last_name, profile_photo_url, cover_photo_url, published)
- Produces: `GET /api/og/result/[slug]/[resultId]` → `image/png` 1200×630

---

- [ ] **Step 1 : Créer la route**

Créer `app/api/og/result/[slug]/[resultId]/route.tsx` :

```tsx
import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import fs from 'fs'
import path from 'path'

const montserratBlack = fs.readFileSync(
  path.join(process.cwd(), 'public/fonts/Montserrat-Black.ttf')
)
const interBold = fs.readFileSync(
  path.join(process.cwd(), 'public/fonts/Inter-Bold.ttf')
)

const MEDAL_COLORS: Record<string, string> = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string; resultId: string } }
) {
  const supabase = createClient()

  const { data: entry } = await supabase
    .from('palmares')
    .select('result, competition, medal, date, city, category, profile_id')
    .eq('id', params.resultId)
    .maybeSingle()

  if (!entry) {
    return new Response('Not found', { status: 404 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, profile_photo_url, cover_photo_url')
    .eq('id', entry.profile_id)
    .eq('slug', params.slug)
    .eq('published', true)
    .maybeSingle()

  if (!profile) {
    return new Response('Not found', { status: 404 })
  }

  const medalColor = entry.medal ? (MEDAL_COLORS[entry.medal] ?? '#cba72f') : '#cba72f'
  const initials =
    (profile.first_name?.[0] ?? '') + (profile.last_name?.[0] ?? '')

  const detailParts: string[] = [formatDate(entry.date)]
  if (entry.city) detailParts.push(entry.city)
  if (entry.category) detailParts.push(entry.category)
  const detailLine = detailParts.filter(Boolean).join(' · ')

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '1200px',
          height: '630px',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#000666',
        }}
      >
        {/* Cover photo background */}
        {profile.cover_photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.cover_photo_url}
            alt=""
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '1200px',
              height: '630px',
              objectFit: 'cover',
            }}
          />
        )}

        {/* Dark overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,6,102,0.85)',
          }}
        />

        {/* Center content */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            paddingBottom: '80px',
            gap: '16px',
          }}
        >
          {/* Medal circle */}
          <div
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '48px',
              backgroundColor: medalColor,
              border: '6px solid rgba(255,255,255,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontFamily: 'Montserrat',
                fontSize: '36px',
                fontWeight: 900,
                color: '#000',
              }}
            >
              {entry.medal === 'gold' ? '1' : entry.medal === 'silver' ? '2' : entry.medal === 'bronze' ? '3' : '★'}
            </span>
          </div>

          {/* Result — hero text */}
          <div
            style={{
              fontFamily: 'Montserrat',
              fontSize: entry.result && entry.result.length > 20 ? '56px' : '80px',
              fontWeight: 900,
              color: 'white',
              textTransform: 'uppercase',
              textAlign: 'center',
              lineHeight: 1.05,
              paddingLeft: '80px',
              paddingRight: '80px',
            }}
          >
            {entry.result ?? ''}
          </div>

          {/* Competition name */}
          <div
            style={{
              fontFamily: 'Inter',
              fontSize: '28px',
              fontWeight: 700,
              color: 'white',
              textAlign: 'center',
              paddingLeft: '80px',
              paddingRight: '80px',
            }}
          >
            {entry.competition ?? ''}
          </div>

          {/* Date + city + category */}
          {detailLine && (
            <div
              style={{
                fontFamily: 'Inter',
                fontSize: '18px',
                fontWeight: 700,
                color: '#c6c5d4',
                textAlign: 'center',
              }}
            >
              {detailLine}
            </div>
          )}
        </div>

        {/* Bottom row: profile info + branding */}
        <div
          style={{
            position: 'absolute',
            bottom: '36px',
            left: '64px',
            right: '64px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '28px',
                overflow: 'hidden',
                border: '2px solid rgba(255,255,255,0.2)',
                backgroundColor: '#1a237e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {profile.profile_photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.profile_photo_url}
                  alt=""
                  style={{ width: '56px', height: '56px', objectFit: 'cover' }}
                />
              ) : (
                <span
                  style={{
                    fontFamily: 'Montserrat',
                    fontSize: '18px',
                    fontWeight: 900,
                    color: 'white',
                    textTransform: 'uppercase',
                  }}
                >
                  {initials}
                </span>
              )}
            </div>
            <span
              style={{
                fontFamily: 'Inter',
                fontSize: '18px',
                fontWeight: 700,
                color: 'white',
              }}
            >
              {profile.first_name} {profile.last_name}
            </span>
          </div>

          {/* Branding */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '2px',
            }}
          >
            <span
              style={{
                fontFamily: 'Montserrat',
                fontSize: '22px',
                fontWeight: 900,
                color: 'white',
                textTransform: 'uppercase',
                letterSpacing: '-0.02em',
              }}
            >
              IpponId
            </span>
            <span
              style={{
                fontFamily: 'Inter',
                fontSize: '14px',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.45)',
              }}
            >
              ipponid.com/{params.slug}
            </span>
          </div>
        </div>

        {/* Gold bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '6px',
            backgroundColor: medalColor,
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Montserrat',
          data: montserratBlack as unknown as ArrayBuffer,
          weight: 900,
          style: 'normal',
        },
        {
          name: 'Inter',
          data: interBold as unknown as ArrayBuffer,
          weight: 700,
          style: 'normal',
        },
      ],
      headers: { 'Cache-Control': 'public, max-age=86400' },
    }
  )
}
```

- [ ] **Step 2 : Vérifier le rendu**

Naviguer vers `http://localhost:3000/api/og/result/[slug]/[resultId]` en utilisant un `resultId` UUID récupéré depuis la table `palmares` dans Supabase.

Expected : image impactante centrée sur le résultat avec la photo du judoka et les infos de compétition.

- [ ] **Step 3 : Vérifier le 404**

Naviguer vers `http://localhost:3000/api/og/result/[slug]/00000000-0000-0000-0000-000000000000`.

Expected : HTTP 404.

- [ ] **Step 4 : Commit**

```bash
git add app/api/og/result/
git commit -m "feat: add OG result image generation route"
```

---

### Task 4 : Mise à jour des métadonnées Open Graph de la page profil

**Files:**
- Modify: `app/[slug]/page.tsx`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_SITE_URL` env var + `params.slug`
- Produces: og:image et twitter:image pointent vers `/api/og/profile/[slug]`

---

- [ ] **Step 1 : Mettre à jour `generateMetadata`**

Dans `app/[slug]/page.tsx`, modifier la fonction `generateMetadata`. Remplacer le bloc `openGraph.images` et `twitter.images` :

```ts
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const judoka = await getJudokaBySlug(params.slug, { allowDraft: true })
  if (!judoka) return {}

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const ogImageUrl = `${siteUrl}/api/og/profile/${params.slug}`

  return {
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
}
```

- [ ] **Step 2 : Vérifier**

Dans le navigateur, ouvrir les DevTools → onglet Elements → chercher les balises `<meta property="og:image">` sur la page profil.

Expected : l'URL de la balise contient `/api/og/profile/[slug]`.

- [ ] **Step 3 : Commit**

```bash
git add app/[slug]/page.tsx
git commit -m "feat: update profile OG metadata to use dynamic image route"
```

---

### Task 5 : Composant `ShareButtons`

**Files:**
- Create: `components/ShareButtons.tsx`

**Interfaces:**
- Produces: `ShareButtons({ url, imageUrl, title, variant? })` — utilisé dans Tasks 6, 7, 8

---

- [ ] **Step 1 : Créer le composant**

Créer `components/ShareButtons.tsx` :

```tsx
'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface ShareButtonsProps {
  url: string
  imageUrl: string
  title: string
  variant?: 'light' | 'dark'
}

export default function ShareButtons({
  url,
  imageUrl,
  title,
  variant = 'dark',
}: ShareButtonsProps) {
  const [canNativeShare, setCanNativeShare] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    setCanNativeShare(typeof navigator.share === 'function')
  }, [])

  const isDark = variant === 'dark'
  const btnClass = isDark
    ? 'flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors'
    : 'flex items-center gap-2 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant px-3 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors'

  async function handleNativeShare() {
    try {
      await navigator.share({ title, url })
    } catch {
      // User cancelled — no-op
    }
  }

  async function handleDownload() {
    setIsDownloading(true)
    try {
      const res = await fetch(imageUrl)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const slug = url.split('/').filter(Boolean).pop() ?? 'profil'
      a.href = blobUrl
      a.download = `ipponid-${slug}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      toast.error('Échec du téléchargement')
    } finally {
      setIsDownloading(false)
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Lien copié !')
    } catch {
      toast.error('Impossible de copier le lien')
    }
  }

  if (canNativeShare) {
    return (
      <button onClick={handleNativeShare} className={btnClass}>
        <ShareIcon />
        Partager
      </button>
    )
  }

  return (
    <div className="flex flex-wrap gap-2 items-start">
      {/* WhatsApp */}
      <a
        href={`https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={btnClass}
      >
        <WhatsAppIcon />
        WhatsApp
      </a>

      {/* Facebook */}
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={btnClass}
      >
        <FacebookIcon />
        Facebook
      </a>

      {/* Instagram / TikTok download */}
      <div className="flex flex-col gap-1">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className={`${btnClass} disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          <DownloadIcon />
          {isDownloading ? 'Téléchargement…' : 'Instagram / TikTok'}
        </button>
        <p
          className={`text-[10px] leading-tight max-w-[180px] ${
            isDark ? 'text-white/40' : 'text-on-surface-variant'
          }`}
        >
          Télécharge l&apos;image et partage-la depuis l&apos;app Instagram ou TikTok
        </p>
      </div>

      {/* Copy link */}
      <button onClick={handleCopyLink} className={btnClass}>
        <CopyIcon />
        Copier le lien
      </button>
    </div>
  )
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM11.999 0C5.373 0 0 5.373 0 12c0 2.117.554 4.106 1.523 5.833L0 24l6.335-1.508A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 11.999 0zm.001 21.818c-1.9 0-3.664-.514-5.175-1.408l-.371-.22-3.76.895.954-3.663-.242-.383A9.817 9.817 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z"/>
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
    </svg>
  )
}
```

- [ ] **Step 2 : Vérifier la compilation**

```bash
npx tsc --noEmit
```

Expected : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add components/ShareButtons.tsx
git commit -m "feat: add ShareButtons client component"
```

---

### Task 6 : Intégration dans `HeroBlock` (page profil publique)

**Files:**
- Modify: `components/blocks/HeroBlock.tsx`
- Modify: `lib/blockRegistry.tsx`

**Interfaces:**
- Consumes: `ShareButtons` (Task 5), `slug: string` via prop

---

- [ ] **Step 1 : Ajouter `slug` à `HeroBlockProps` et intégrer `ShareButtons`**

Dans `components/blocks/HeroBlock.tsx`, modifier l'interface et le composant :

```tsx
// Ajouter l'import en haut
import ShareButtons from '@/components/ShareButtons'

// Modifier l'interface
interface HeroBlockProps {
  identity: Identity
  social: Social
  slug: string      // ajouté
}

// Modifier la signature
export default function HeroBlock({ identity, social, slug }: HeroBlockProps) {
```

Dans le JSX, après la `<div className="flex gap-3 mt-5">` des liens sociaux (ou après le bloc `{social.length > 0 && ...}`), ajouter :

```tsx
{/* Share section */}
{process.env.NEXT_PUBLIC_SITE_URL && (
  <div className="mt-5">
    <p className="font-inter text-[10px] font-bold uppercase tracking-[0.25em] text-white/40 mb-2">
      Partager ce profil
    </p>
    <ShareButtons
      url={`${process.env.NEXT_PUBLIC_SITE_URL}/${slug}`}
      imageUrl={`${process.env.NEXT_PUBLIC_SITE_URL}/api/og/profile/${slug}`}
      title={`Découvrez le profil judoka de ${identity.firstName} ${identity.lastName} sur IpponId`}
      variant="dark"
    />
  </div>
)}
```

- [ ] **Step 2 : Mettre à jour le registry**

Dans `lib/blockRegistry.tsx`, modifier la ligne `hero` :

```tsx
hero: (data) => <HeroBlock identity={data.identity} social={data.social} slug={data.slug} />,
```

- [ ] **Step 3 : Vérifier**

Naviguer vers la page profil publique `http://localhost:3000/[slug]`.

Expected : section "Partager ce profil" visible sous les réseaux sociaux du judoka, avec les boutons WhatsApp / Facebook / Instagram-TikTok / Copier le lien (ou bouton Partager natif sur mobile).

- [ ] **Step 4 : Commit**

```bash
git add components/blocks/HeroBlock.tsx lib/blockRegistry.tsx
git commit -m "feat: add share profile section to HeroBlock"
```

---

### Task 7 : Intégration dans `PalmaresBlock` (page profil publique)

**Files:**
- Create: `components/blocks/PalmaresShareButton.tsx`
- Modify: `components/blocks/PalmaresBlock.tsx`
- Modify: `lib/blockRegistry.tsx`

**Interfaces:**
- Consumes: `ShareButtons` (Task 5), `PalmaresEntry.id` (Task 1)
- Produces: `PalmaresShareButton({ slug, resultId })` — bouton partage isolé par entrée

---

- [ ] **Step 1 : Créer `PalmaresShareButton`**

Créer `components/blocks/PalmaresShareButton.tsx` :

```tsx
'use client'

import { useState } from 'react'
import ShareButtons from '@/components/ShareButtons'

interface PalmaresShareButtonProps {
  slug: string
  resultId: string
}

export default function PalmaresShareButton({ slug, resultId }: PalmaresShareButtonProps) {
  const [open, setOpen] = useState(false)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const url = `${siteUrl}/${slug}#result-${resultId}`
  const imageUrl = `${siteUrl}/api/og/result/${slug}/${resultId}`

  return (
    <div className="relative flex flex-col items-center">
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Partager ce résultat"
        title="Partager ce résultat"
        className="text-on-surface-variant hover:text-primary transition-colors p-1"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-20 p-3 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-lg min-w-max">
          <ShareButtons
            url={url}
            imageUrl={imageUrl}
            title={`Découvrez ce résultat sur IpponId — ipponid.com/${slug}`}
            variant="light"
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2 : Mettre à jour `PalmaresBlock`**

Dans `components/blocks/PalmaresBlock.tsx` :

Modifier l'interface `PalmaresBlockProps` :
```tsx
interface PalmaresBlockProps {
  palmares: PalmaresEntry[]
  birthDate: string | undefined
  slug: string      // ajouté
}
```

Modifier la signature :
```tsx
export default function PalmaresBlock({ palmares, birthDate, slug }: PalmaresBlockProps) {
```

Ajouter l'import en haut :
```tsx
import PalmaresShareButton from '@/components/blocks/PalmaresShareButton'
```

Dans le JSX, ajouter `id={`result-${entry.id ?? i}`}` sur chaque `<article>` et intégrer `PalmaresShareButton` dans la zone icônes en haut à droite (dans le `<div className="flex flex-col items-center gap-2 flex-shrink-0">`). Modifier le `map` des entrées :

```tsx
{bySeason[startYear].map((entry, i) => {
  const medal = entry.medal ? MEDAL_STYLES[entry.medal] : null
  return (
    <article
      key={i}
      id={entry.id ? `result-${entry.id}` : undefined}
      className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden"
      style={{ borderLeft: `4px solid ${medal?.border ?? '#c6c5d4'}` }}
    >
      <div className="p-5 flex justify-between items-start gap-4">
        <div className="min-w-0">
          <p className="font-inter text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">
            {formatDate(entry.date)} · {entry.level}{entry.city ? ` · ${entry.city}` : ''}
          </p>
          <h3 className="font-inter text-base font-bold text-primary leading-snug">
            {entry.result} — {entry.competition}
          </h3>
          <p className="font-inter text-sm text-on-surface-variant mt-1 flex items-center gap-2 flex-wrap">
            {entry.category}
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
              {computeAgeCategory(birthDate, entry.date)}
            </span>
          </p>
        </div>
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          {entry.id && process.env.NEXT_PUBLIC_SITE_URL && (
            <PalmaresShareButton slug={slug} resultId={entry.id} />
          )}
          {entry.podiumPhoto && (
            <PodiumPhotoButton
              photo={entry.podiumPhoto}
              alt={`Photo du podium — ${entry.competition} ${entry.result}`}
            />
          )}
          {medal && (
            <svg
              width="32"
              height="40"
              viewBox="0 0 32 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label={`Médaille ${medal.label}`}
              role="img"
              className="flex-shrink-0"
            >
              <rect x="10" y="0" width="5" height="16" rx="1.5" fill={medal.border} opacity="0.85" transform="rotate(-10 10 0)" />
              <rect x="17" y="0" width="5" height="16" rx="1.5" fill={medal.dot} opacity="0.85" transform="rotate(10 17 0)" />
              <circle cx="16" cy="28" r="11" fill={medal.dot} />
              <circle cx="16" cy="28" r="9" fill={medal.border} opacity="0.4" />
              <circle cx="16" cy="28" r="7" fill={medal.dot} />
              <text x="16" y="32.5" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">{medal.rank}</text>
            </svg>
          )}
        </div>
      </div>
    </article>
  )
})}
```

- [ ] **Step 3 : Mettre à jour le registry**

Dans `lib/blockRegistry.tsx`, modifier la ligne `palmares` :

```tsx
palmares: (data) => <PalmaresBlock palmares={data.palmares} birthDate={data.identity.birthDate} slug={data.slug} />,
```

- [ ] **Step 4 : Vérifier**

Naviguer vers la page profil publique. Sur chaque entrée du palmarès qui a un `id` (toutes les entrées DB), vérifier qu'une icône de partage apparaît en haut à droite de la carte. Cliquer dessus : une popover avec `ShareButtons` doit s'ouvrir.

- [ ] **Step 5 : Commit**

```bash
git add components/blocks/PalmaresShareButton.tsx components/blocks/PalmaresBlock.tsx lib/blockRegistry.tsx
git commit -m "feat: add per-result share button to PalmaresBlock"
```

---

### Task 8 : Intégration dans le dashboard (`PalmaresManager`)

**Files:**
- Modify: `app/dashboard/palmares/actions.ts`
- Modify: `app/dashboard/palmares/PalmaresManager.tsx`
- Modify: `app/dashboard/palmares/page.tsx`

**Interfaces:**
- Consumes: `ShareButtons` (Task 5)
- Produces: bouton partage persistant + bannière post-ajout dans le dashboard

---

- [ ] **Step 1 : Modifier `addPalmares` pour retourner l'`id`**

Dans `app/dashboard/palmares/actions.ts`, modifier la signature et l'implémentation de `addPalmares` :

```ts
export async function addPalmares(formData: FormData): Promise<{ ok: true; id: string } | { ok: false }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const profile = await getProfile(supabase, user.id)
    if (!profile) redirect('/')

    const position = Number(formData.get('position'))
    const { medal, result } = deriveFromPosition(position)

    const { data: inserted, error: insertError } = await supabase
      .from('palmares')
      .insert({
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
      .select('id')
      .single()

    if (insertError || !inserted) return { ok: false }

    revalidatePath('/dashboard/palmares')
    revalidatePath(`/${profile.slug}`)
    return { ok: true, id: inserted.id }
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
    return { ok: false }
  }
}
```

- [ ] **Step 2 : Mettre à jour `PalmaresPage` pour passer `isPublished` et `profileSlug`**

Dans `app/dashboard/palmares/page.tsx`, modifier le SELECT et les props :

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
    .select('id, slug, published')       // ajout de slug et published
    .eq('owner_id', user.id)
    .single()

  if (!profile) redirect('/dashboard/setup')

  const { data: entries } = await supabase
    .from('palmares')
    .select('id, date, competition, city, category, level, position, result, medal')
    .eq('profile_id', profile.id)
    .order('date', { ascending: true })

  return (
    <div className="px-margin-mobile md:px-margin-desktop py-10 max-w-container-max">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
        <h1 className="font-montserrat text-headline-md font-bold text-primary uppercase">
          Mon Palmarès
        </h1>
      </div>
      <PalmaresManager
        entries={entries ?? []}
        isPublished={profile.published}
        profileSlug={profile.slug}
      />
    </div>
  )
}
```

- [ ] **Step 3 : Mettre à jour `PalmaresManager` — props, bouton persistant, bannière post-ajout**

Dans `app/dashboard/palmares/PalmaresManager.tsx`, apporter les modifications suivantes :

**En haut du fichier, ajouter l'import :**

```tsx
import ShareButtons from '@/components/ShareButtons'
```

**Modifier `PalmaresManager` props :**

```tsx
export default function PalmaresManager({
  entries,
  isPublished,
  profileSlug,
}: {
  entries: PalmaresRow[]
  isPublished: boolean
  profileSlug: string
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [justAddedId, setJustAddedId] = useState<string | null>(null)  // ajouté
```

**Modifier `PalmaresForm.handleSubmit` pour stocker `justAddedId` :**

Le composant `PalmaresForm` est interne. Il reçoit déjà `onDone: () => void`. Changer la signature pour passer l'id au parent après un ajout réussi. Modifier `PalmaresForm` :

```tsx
function PalmaresForm({
  initial,
  onDone,
  onAdded,   // nouveau
}: {
  initial?: PalmaresRow
  onDone: () => void
  onAdded?: (id: string) => void  // nouveau
}) {
```

Dans `handleSubmit`, modifier le bloc `if (result.ok)` :

```tsx
if (result.ok) {
  if (initial) {
    toast.success('Résultat mis à jour')
    onDone()
  } else {
    toast.success('Ajouté avec succès')
    form.reset()
    onDone()
    if (onAdded && 'id' in result) onAdded(result.id)   // ajouté
  }
}
```

**Mettre à jour l'instanciation dans `PalmaresManager` :**

```tsx
<PalmaresForm onDone={() => {}} onAdded={(id) => setJustAddedId(id)} />
```

**Modifier le rendu de chaque entrée pour ajouter le bouton persistant et la bannière :**

```tsx
{entries.map((entry) => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const shareUrl = `${siteUrl}/${profileSlug}#result-${entry.id}`
  const shareImageUrl = `${siteUrl}/api/og/result/${profileSlug}/${entry.id}`
  const isJustAdded = justAddedId === entry.id

  return (
    <div
      key={entry.id}
      className={`bg-surface-container-lowest rounded-xl border overflow-hidden ${
        isJustAdded ? 'border-tertiary-container' : 'border-outline-variant'
      }`}
    >
      {editing === entry.id ? (
        <div className="p-4">
          <PalmaresForm
            initial={entry}
            onDone={() => setEditing(null)}
          />
        </div>
      ) : (
        <>
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
              {/* Bouton partage persistant */}
              {isPublished ? (
                <button
                  onClick={() =>
                    setJustAddedId(justAddedId === entry.id ? null : entry.id)
                  }
                  title="Partager ce résultat"
                  className="text-xs font-medium text-on-surface-variant hover:text-primary transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                </button>
              ) : (
                <button
                  disabled
                  title="Publie ton profil pour partager"
                  className="text-xs text-on-surface-variant/30 cursor-not-allowed"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                </button>
              )}

              {/* Modifier / Supprimer — code inchangé */}
              {confirming === entry.id ? (
                <>
                  <button
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
                        if (justAddedId === entry.id) setJustAddedId(null)
                      }
                    }}
                    disabled={deleting === entry.id}
                    className="text-xs font-semibold text-secondary hover:underline active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-secondary/50 rounded transition-all disabled:opacity-60"
                  >
                    {deleting === entry.id ? 'Suppression…' : 'Confirmer'}
                  </button>
                  <button
                    onClick={() => setConfirming(null)}
                    disabled={deleting === entry.id}
                    className="text-xs text-on-surface-variant hover:underline active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30 rounded transition-all disabled:opacity-60"
                  >
                    Annuler
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setEditing(entry.id); setJustAddedId(null) }}
                    className="text-xs font-medium text-primary hover:underline active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 rounded transition-all"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => { setConfirming(entry.id); setJustAddedId(null) }}
                    className="text-xs font-medium text-secondary hover:underline active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-secondary/50 rounded transition-all"
                  >
                    Supprimer
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Bannière post-ajout / partage ouvert */}
          {isJustAdded && isPublished && (
            <div className="border-t border-tertiary-container/30 bg-tertiary-container/5 px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-tertiary uppercase tracking-wider">
                  Partage ce résultat !
                </p>
                <button
                  onClick={() => setJustAddedId(null)}
                  className="text-on-surface-variant hover:text-on-surface transition-colors"
                  aria-label="Fermer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <ShareButtons
                url={shareUrl}
                imageUrl={shareImageUrl}
                title={`${entry.result} — ${entry.competition} | IpponId`}
                variant="light"
              />
            </div>
          )}
        </>
      )}
    </div>
  )
})}
```

- [ ] **Step 4 : Vérifier la compilation**

```bash
npx tsc --noEmit
```

Expected : aucune erreur TypeScript.

- [ ] **Step 5 : Vérifier dans le navigateur**

1. Aller sur `/dashboard/palmares`.
2. Ajouter un nouveau résultat → après soumission, la bannière "Partage ce résultat !" doit apparaître avec la bordure or.
3. Cliquer ✕ → bannière disparaît.
4. Cliquer l'icône partage sur un résultat existant → la bannière de partage s'ouvre inline.
5. Si profil non publié : icône partage désactivée (opacité réduite, cursor not-allowed).

- [ ] **Step 6 : Commit**

```bash
git add app/dashboard/palmares/actions.ts app/dashboard/palmares/PalmaresManager.tsx app/dashboard/palmares/page.tsx
git commit -m "feat: add share buttons to PalmaresManager (persistent + post-add banner)"
```

---

## Checklist de tests à effectuer à la fin

1. Accéder à `/api/og/profile/[slug]` directement → image 1200×630 avec photo, nom, médailles
2. Accéder à `/api/og/result/[slug]/[resultId]` → image impactante centrée sur le résultat
3. Slug inexistant sur les deux routes OG → HTTP 404 (pas 500)
4. Copier-coller un lien de profil dans WhatsApp sur mobile → carte preview avec image générée
5. Poster sur Facebook → même vérification avec l'outil [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
6. Sur mobile : ouvrir la page profil → bouton "Partager" natif (navigator.share) à la place des boutons individuels
7. Sur desktop : cliquer Instagram/TikTok → fichier `.png` téléchargé
8. Cliquer "Copier le lien" → toast "Lien copié !" + URL dans le presse-papier
9. Dashboard, profil non publié → icône partage désactivée
10. Dashboard, ajouter un résultat → bannière "Partage ce résultat !" avec bordure or apparaît sur le nouveau résultat
