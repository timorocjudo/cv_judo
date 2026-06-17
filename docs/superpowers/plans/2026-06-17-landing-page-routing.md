# Landing Page IpponId + Restructuration Routing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une landing page marketing sur `/`, déplacer le profil judoka vers `/[slug]`, et créer la couche service async qui prépare une future BDD.

**Architecture:** `app/page.tsx` devient la landing (composants dans `components/landing/`). Une route dynamique `app/[slug]/page.tsx` lit les données via `lib/judokaService.ts` (async in-memory) et réutilise les composants blocs existants sans les modifier. `lib/slugify.ts` fournit la normalisation des accents pour la recherche.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, `next/navigation` (`useRouter`), `next/image`, `next/link`

## Global Constraints

- Next.js 14 App Router — `'use client'` obligatoire pour tout composant avec `useState`/`useRouter`
- Aucun composant bloc existant (`HeroBlock`, `BioBlock`, etc.) ne doit être modifié
- `Header.tsx`, `Footer.tsx`, `MobileNav.tsx` ne doivent pas être modifiés
- `types/judoka.ts` ne doit pas être modifié
- `lib/blockRegistry.tsx` ne doit pas être modifié
- Polices : `font-montserrat` et `font-inter` uniquement (pas de Hanken Grotesk)
- Pas de test suite — vérification via `npx tsc --noEmit` et `npm run dev`
- Commande de build : `npm run build` (lint + typecheck inclus)
- Profil Timothé accessible sur `/timothe-francois`

---

## File Map

| Fichier | Action | Responsabilité |
|---------|--------|----------------|
| `data/judokas.json` | Créer | Tableau JSON avec l'entrée Timothé |
| `lib/slugify.ts` | Créer | `normalizeText()` + `generateSlug()` |
| `lib/judokaService.ts` | Créer | `getJudokaBySlug()` + `searchJudokas()` |
| `app/[slug]/page.tsx` | Créer | Route dynamique profil judoka |
| `app/creer-mon-profil/page.tsx` | Créer | Placeholder "Bientôt disponible" |
| `tailwind.config.ts` | Modifier | Ajouter `secondary`, `on-secondary`, `secondary-container`, `headline-lg-mobile` |
| `components/landing/LandingNav.tsx` | Créer | Navbar landing avec mobile toggle |
| `components/landing/HeroSection.tsx` | Créer | Hero + moteur de recherche (client) |
| `components/landing/MockupSection.tsx` | Créer | Browser mockup statique |
| `components/landing/HowItWorksSection.tsx` | Créer | 3 étapes (server) |
| `components/landing/SocialProofSection.tsx` | Créer | Avatars + preuve sociale (server) |
| `components/landing/CtaSection.tsx` | Créer | CTA final fond bleu (server) |
| `components/landing/LandingFooter.tsx` | Créer | Footer légal (server) |
| `app/page.tsx` | Modifier | Devient la landing page |
| `data/judoka.json` | Supprimer | Remplacé par `judokas.json` |

---

### Task 1: Créer `data/judokas.json`

**Files:**
- Create: `data/judokas.json`

**Interfaces:**
- Produces: tableau `JudokaData[]` importable via `@/data/judokas.json`

- [ ] **Step 1: Créer `data/judokas.json`** — wrapper array autour des données existantes

```json
[
  {
    "slug": "timothe-francois",
    "identity": {
      "firstName": "Timothé",
      "lastName": "François",
      "club": "ROC Judo",
      "birthDate": "2010-04-02",
      "weightCategory": "-81kg",
      "grade": "Ceinture noire",
      "profilePhoto": "/images/profile.jpg",
      "coverPhoto": "/images/cover.jpg",
      "height": 173,
      "weight": 74,
      "nationality": "Français"
    },
    "bio": "Judoka de haut niveau évoluant au sein du club de ROC Judo, Timothé François est un compétiteur d'exception. Double Champion de France Individuel Minime (-66kg en 2023, -73kg en 2024), il enchaîne les podiums nationaux depuis 2023 avec une régularité remarquable. Sa progression constante, sa maîtrise technique et son mental de compétiteur en font l'un des espoirs les plus prometteurs du judo français dans sa catégorie.",
    "palmares": [
      { "date": "2026-05-02", "competition": "Championnat de France par équipe de club", "result": "Médaille de bronze", "category": "-73kg", "level": "National Équipe", "medal": "bronze", "city": "Villebon sur Yvette (91)" },
      { "date": "2026-01-31", "competition": "Championnat Régional", "result": "Champion Régional", "category": "-81kg", "level": "Régional", "medal": "gold", "city": "Avignon (84)" },
      { "date": "2025-11-08", "competition": "Championnat Départemental", "result": "Vice-Champion Départemental", "category": "-81kg", "level": "Départemental", "medal": "silver", "city": "Saint-Laurant du Var (06)" },
      { "date": "2025-05-18", "competition": "Championnat de France Cadet Espoir", "result": "Médaille de bronze", "category": "-81kg", "level": "National", "medal": "bronze", "city": "Villebon sur Yvette (91)" },
      { "date": "2025-02-08", "competition": "Championnat Régional", "result": "Médaille de bronze", "category": "-81kg", "level": "Régional", "medal": "bronze", "city": "Avignon (84)" },
      { "date": "2024-11-16", "competition": "Championnat Départemental", "result": "Médaille de bronze", "category": "-81kg", "level": "Départemental", "medal": "bronze", "city": "Nice (06)" },
      { "date": "2024-05-12", "competition": "Championnat de France par équipe de département", "result": "Vice-Champion de France", "category": "-73kg", "level": "National Équipe", "medal": "silver", "city": "Ceyrat (63)" },
      { "date": "2024-03-25", "competition": "Championnat de France Individuel", "result": "Champion de France", "category": "-73kg", "level": "National Individuel", "medal": "gold", "city": "Villebon sur Yvette (91)" },
      { "date": "2024-02-11", "competition": "Championnat Régional", "result": "Champion Régional", "category": "-73kg", "level": "Régional", "medal": "gold", "city": "Martigues (13)" },
      { "date": "2023-11-18", "competition": "Championnat Départemental", "result": "Vice-Champion Départemental", "category": "-73kg", "level": "Départemental", "medal": "silver", "city": "Saint-Martin du Var (06)" },
      { "date": "2023-05-13", "competition": "Championnat de France par équipe de département", "result": "Champion de France", "category": "-66kg", "level": "National Équipe", "medal": "gold", "city": "Ceyrat (63)" },
      { "date": "2023-03-26", "competition": "Championnat de France Individuel", "result": "Champion de France", "category": "-66kg", "level": "National Individuel", "medal": "gold", "city": "Villebon sur Yvette (91)", "podiumPhoto": "/images/podium-France-2023.jpg" },
      { "date": "2023-01-21", "competition": "Championnat Régional", "result": "Champion Régional", "category": "-66kg", "level": "Régional", "medal": "gold", "city": "Marseille (13)" },
      { "date": "2022-11-19", "competition": "Championnat Départemental", "result": "Champion Départemental", "category": "-66kg", "level": "Départemental", "medal": "gold", "city": "Saint-Martin du Var (06)" },
      { "date": "2022-04-10", "competition": "Championnat Régional", "result": "Champion Régional", "category": "", "level": "Régional", "medal": "gold", "city": "Marseille (13)" },
      { "date": "2021-11-21", "competition": "Championnat Départemental", "result": "Champion Départemental", "category": "Benjamin 2", "level": "Départemental", "medal": "gold", "city": "Saint-Martin du Var (06)" }
    ],
    "videos": [
      { "title": "France Individuel 2024 -73kg", "youtubeUrl": "https://www.youtube.com/watch?v=ONHcW9LAFsk", "description": "Highlights du Championnat de France Individuel 2024 en -73kg." },
      { "title": "France Individuel 2023 -66kg", "youtubeUrl": "https://www.youtube.com/watch?v=-nw5oyDSCvU", "description": "Retour sur le titre de Champion de France 2023 en -66kg." }
    ],
    "gallery": [
      { "src": "/images/gallery-1.jpg", "caption": "Finale France 2024 — -73kg" },
      { "src": "/images/gallery-2.jpg", "caption": "Préparation ONJ" },
      { "src": "/images/gallery-3.jpg", "caption": "Podium France 2023" },
      { "src": "/images/gallery-4.jpg", "caption": "Entraînement matinal" }
    ],
    "techniques": [
      { "name": "Seoi-nage", "description": "Projection par les épaules, technique de prédilection de Timothé qui lui a valu plusieurs titres nationaux.", "image": null },
      { "name": "moroté seoi nage", "description": "Morote Seoi Nage (chargement à l'aide des deux mains) est une technique de projection du judo. C'est l'une des variantes de la technique Ippon Seoi Nage.", "image": null }
    ],
    "social": {
      "instagram": "https://www.instagram.com/",
      "youtube": "https://www.youtube.com/@"
    },
    "layout": ["hero", "bio", "palmares", "techniques", "videos", "gallery"]
  }
]
```

- [ ] **Step 2: Vérifier que `app/page.tsx` (profil actuel) fonctionne encore**

`app/page.tsx` importe toujours `judoka.json` — ne pas le toucher pour l'instant.

```bash
npx tsc --noEmit
```

Expected: aucune erreur TypeScript.

- [ ] **Step 3: Commit**

```bash
git add data/judokas.json
git commit -m "feat: add judokas.json as array for multi-judoka data layer"
```

---

### Task 2: `lib/slugify.ts`

**Files:**
- Create: `lib/slugify.ts`

**Interfaces:**
- Produces:
  - `normalizeText(str: string): string` — "Timothé François" → "timothe francois"
  - `generateSlug(firstName: string, lastName: string): string` — "Timothé", "François" → "timothe-francois"

- [ ] **Step 1: Créer `lib/slugify.ts`**

```typescript
export function normalizeText(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

export function generateSlug(firstName: string, lastName: string): string {
  return normalizeText(`${firstName} ${lastName}`)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
```

- [ ] **Step 2: Vérifier le type-check**

```bash
npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 3: Vérifier manuellement la logique de normalisation**

Dans un REPL Node ou en ajoutant temporairement un `console.log` dans un script :

- `normalizeText("Timothé")` → `"timothe"`
- `normalizeText("TIMOTHÉ FRANÇOIS")` → `"timothe francois"`
- `generateSlug("Timothé", "François")` → `"timothe-francois"`
- `normalizeText("timothe")` doit matcher `normalizeText("Timothé")` avec `includes`

- [ ] **Step 4: Commit**

```bash
git add lib/slugify.ts
git commit -m "feat: add slugify utils with accent-insensitive normalizeText"
```

---

### Task 3: `lib/judokaService.ts`

**Files:**
- Create: `lib/judokaService.ts`

**Interfaces:**
- Consumes: `@/data/judokas.json` (tableau `JudokaData[]`), `normalizeText` de `@/lib/slugify`
- Produces:
  - `getJudokaBySlug(slug: string): Promise<JudokaData | null>`
  - `searchJudokas(query: string): Promise<JudokaData[]>`

- [ ] **Step 1: Créer `lib/judokaService.ts`**

```typescript
import judokasData from '@/data/judokas.json'
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

- [ ] **Step 2: Vérifier le type-check**

```bash
npx tsc --noEmit
```

Expected: aucune erreur. Si TypeScript se plaint de l'import JSON, vérifier que `tsconfig.json` a `"resolveJsonModule": true` (déjà présent si `app/page.tsx` importe `judoka.json`).

- [ ] **Step 3: Commit**

```bash
git add lib/judokaService.ts
git commit -m "feat: add judokaService with getJudokaBySlug and searchJudokas"
```

---

### Task 4: Route dynamique `app/[slug]/page.tsx`

**Files:**
- Create: `app/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getJudokaBySlug` de `@/lib/judokaService`, `blockRegistry` de `@/lib/blockRegistry`, `Header`, `Footer`, `MobileNav` existants

- [ ] **Step 1: Créer le dossier `app/[slug]/` et le fichier `page.tsx`**

```typescript
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getJudokaBySlug } from '@/lib/judokaService'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import MobileNav from '@/components/layout/MobileNav'
import { blockRegistry } from '@/lib/blockRegistry'

type Props = { params: { slug: string } }

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
  const judoka = await getJudokaBySlug(params.slug)
  if (!judoka) notFound()

  return (
    <>
      <Header identity={judoka.identity} social={judoka.social} />
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

- [ ] **Step 2: Vérifier le type-check**

```bash
npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 3: Tester dans le navigateur**

```bash
npm run dev
```

Ouvrir `http://localhost:3000/timothe-francois` — le profil doit s'afficher identique à l'actuel `/`. Ouvrir `http://localhost:3000/inconnu` — doit retourner une page 404 Next.js.

- [ ] **Step 4: Commit**

```bash
git add app/[slug]/page.tsx
git commit -m "feat: add dynamic [slug] route for judoka profiles"
```

---

### Task 5: Placeholder `/creer-mon-profil`

**Files:**
- Create: `app/creer-mon-profil/page.tsx`

- [ ] **Step 1: Créer `app/creer-mon-profil/page.tsx`**

```typescript
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Bientôt disponible — IpponId',
}

export default function CreerMonProfilPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-margin-mobile text-center">
      <span className="text-5xl mb-6" role="img" aria-label="Bientôt">🥋</span>
      <h1 className="font-montserrat text-headline-md font-bold text-primary mb-4">
        Bientôt disponible
      </h1>
      <p className="text-on-surface-variant text-body-lg mb-8 max-w-md">
        La création de profil arrive prochainement. Revenez nous voir très bientôt !
      </p>
      <Link
        href="/"
        className="bg-primary text-on-primary px-8 py-3 rounded-lg font-semibold hover:bg-primary-container transition-colors"
      >
        Retour à l&apos;accueil
      </Link>
    </main>
  )
}
```

- [ ] **Step 2: Vérifier dans le navigateur**

`http://localhost:3000/creer-mon-profil` doit afficher le placeholder. Le lien "Retour à l'accueil" redirige vers `/`.

- [ ] **Step 3: Commit**

```bash
git add app/creer-mon-profil/page.tsx
git commit -m "feat: add /creer-mon-profil placeholder page"
```

---

### Task 6: Étendre `tailwind.config.ts`

**Files:**
- Modify: `tailwind.config.ts`

**Interfaces:**
- Produces: classes `bg-secondary`, `text-secondary`, `bg-on-secondary`, `text-on-secondary`, `bg-secondary-container`, `text-headline-lg-mobile` utilisables dans les composants landing

- [ ] **Step 1: Ajouter les tokens manquants dans `tailwind.config.ts`**

Dans la section `colors`, ajouter après `'medal-bronze'` :

```typescript
secondary: '#b6171e',
'on-secondary': '#ffffff',
'secondary-container': '#da3433',
```

Dans la section `fontSize`, ajouter après `'stats-number'` :

```typescript
'headline-lg-mobile': ['24px', { lineHeight: '32px', fontWeight: '700' }],
```

Le bloc `fontSize` complet doit ressembler à :

```typescript
fontSize: {
  'display-lg': ['72px', { lineHeight: '80px', letterSpacing: '-0.02em', fontWeight: '900' }],
  'headline-lg': ['48px', { lineHeight: '56px', letterSpacing: '-0.01em', fontWeight: '700' }],
  'headline-md': ['32px', { lineHeight: '40px', fontWeight: '700' }],
  'headline-lg-mobile': ['24px', { lineHeight: '32px', fontWeight: '700' }],
  'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
  'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
  'label-bold': ['14px', { lineHeight: '20px', letterSpacing: '0.05em', fontWeight: '700' }],
  'stats-number': ['40px', { lineHeight: '40px', fontWeight: '900' }],
},
```

- [ ] **Step 2: Vérifier le type-check**

```bash
npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat: add secondary color tokens and headline-lg-mobile to tailwind config"
```

---

### Task 7: Composants landing statiques

**Files:**
- Create: `components/landing/LandingNav.tsx`
- Create: `components/landing/MockupSection.tsx`
- Create: `components/landing/HowItWorksSection.tsx`
- Create: `components/landing/SocialProofSection.tsx`
- Create: `components/landing/CtaSection.tsx`
- Create: `components/landing/LandingFooter.tsx`

**Interfaces:**
- Produces: 6 composants exportés par défaut, sans props, assemblables dans `app/page.tsx`

- [ ] **Step 1: Créer `components/landing/LandingNav.tsx`**

```typescript
'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function LandingNav() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-md shadow-sm">
      <nav className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop h-20 max-w-container-max mx-auto">
        <span className="font-montserrat text-2xl font-black text-primary tracking-tight">IpponId</span>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="text-on-surface-variant text-sm font-semibold hover:text-secondary transition-colors">
            Comment ça marche
          </a>
          <a href="#profiles" className="text-on-surface-variant text-sm font-semibold hover:text-secondary transition-colors">
            Exemples de profils
          </a>
          <Link
            href="/creer-mon-profil"
            className="bg-primary text-on-primary px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors active:scale-95"
          >
            Créer mon profil
          </Link>
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
          <Link
            href="/creer-mon-profil"
            onClick={() => setOpen(false)}
            className="bg-primary text-on-primary px-6 py-3 rounded-lg text-sm font-semibold w-11/12 text-center"
          >
            Créer mon profil
          </Link>
        </div>
      )}
    </header>
  )
}
```

- [ ] **Step 2: Créer `components/landing/MockupSection.tsx`**

```typescript
import Image from 'next/image'
import Link from 'next/link'

const STATS = [
  { value: '14', label: "Médailles d'or" },
  { value: '28', label: 'Podiums nationaux' },
  { value: '-81kg', label: 'Catégorie' },
  { value: '15', label: 'Âge' },
]

const PALMARES_PREVIEW = [
  { competition: 'Championnat de France Individuel', result: 'Champion de France', accent: 'border-secondary', badge: 'bg-secondary/10 text-secondary' },
  { competition: 'Championnat de France Cadet Espoir', result: 'Médaille de bronze', accent: 'border-primary-container', badge: 'bg-primary/10 text-primary' },
]

export default function MockupSection() {
  return (
    <section className="px-margin-mobile md:px-margin-desktop py-10 max-w-container-max mx-auto">
      <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
        {/* Browser chrome */}
        <div className="bg-surface-container-high px-4 py-2 flex items-center gap-2 border-b border-outline-variant">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-300/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-300/70" />
            <div className="w-3 h-3 rounded-full bg-green-300/70" />
          </div>
          <div className="flex-1 flex justify-center">
            <span className="bg-white/60 px-6 py-1 rounded-full text-xs text-outline">
              🔒 ipponid.com/timothe-francois
            </span>
          </div>
        </div>

        {/* Profile content */}
        <div className="bg-white p-6 md:p-10">
          <div className="flex items-end gap-4 mb-6">
            <div className="w-20 h-20 md:w-28 md:h-28 rounded-xl overflow-hidden shadow-lg border-2 border-white flex-shrink-0 bg-surface-container">
              <Image
                src="/images/profile.jpg"
                alt="Timothé François"
                width={112}
                height={112}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="font-montserrat text-xl md:text-2xl font-bold text-primary">Timothé François</h2>
              <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider mt-0.5">
                Ceinture Noire · -81kg · ROC Judo
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {STATS.map(({ value, label }) => (
              <div key={label} className="bg-surface-container rounded-xl p-3 border border-outline-variant">
                <div className="font-montserrat font-bold text-xl text-primary">{value}</div>
                <div className="text-xs text-outline uppercase mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          <div className="hidden md:flex flex-col gap-2">
            {PALMARES_PREVIEW.map(({ competition, result, accent, badge }) => (
              <div key={competition} className={`bg-surface-container-low rounded-lg p-3 flex justify-between items-center border-l-4 ${accent}`}>
                <span className="font-semibold text-primary text-sm">{competition}</span>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${badge}`}>{result}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="text-center mt-4">
        <Link href="/timothe-francois" className="text-primary font-semibold text-sm hover:underline">
          Voir le profil complet de Timothé →
        </Link>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Créer `components/landing/HowItWorksSection.tsx`**

```typescript
const STEPS = [
  {
    title: '1. Crée ton profil',
    body: 'Choisis ton URL personnalisée et remplis tes informations de base en quelques clics.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
  {
    title: '2. Ajoute ton palmarès',
    body: 'Intègre tes médailles, tes grades et tes vidéos de combats pour prouver ton talent.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    title: '3. Partage ton URL',
    body: 'Envoie ton lien à tes partenaires, sponsors ou intègre-le dans ta bio Instagram.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
    ),
  },
]

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="px-margin-mobile md:px-margin-desktop py-16 bg-surface-container">
      <div className="max-w-container-max mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-1 h-8 bg-tertiary-container hidden md:block" />
            <h2 className="font-montserrat text-headline-md font-bold text-primary uppercase">
              Comment ça marche ?
            </h2>
          </div>
          <p className="text-on-surface-variant text-body-lg">En trois étapes, tu es prêt à briller.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map(({ title, body, icon }) => (
            <div key={title} className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-5 group-hover:scale-110 transition-transform">
                {icon}
              </div>
              <h3 className="font-montserrat text-lg font-bold text-primary mb-2">{title}</h3>
              <p className="text-on-surface-variant">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Créer `components/landing/SocialProofSection.tsx`**

```typescript
export default function SocialProofSection() {
  return (
    <section id="profiles" className="px-margin-mobile md:px-margin-desktop py-16">
      <div className="max-w-container-max mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
          <div className="text-center md:text-left">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-8 bg-tertiary-container hidden md:block" />
              <h2 className="font-montserrat text-headline-md font-bold text-primary uppercase">
                Ils ont déjà leur IpponId
              </h2>
            </div>
            <p className="text-on-surface-variant text-body-lg">Rejoins la première communauté de profils judo.</p>
          </div>
          <div className="flex -space-x-3 flex-shrink-0">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-12 h-12 rounded-full border-2 border-white bg-surface-container" />
            ))}
            <div className="w-12 h-12 rounded-full border-2 border-white bg-primary text-on-primary flex items-center justify-center text-xs font-bold">
              +450
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="aspect-square bg-surface-container rounded-xl border border-outline-variant"
              aria-label="Profil judoka"
            />
          ))}
        </div>

        <p className="text-center text-on-surface-variant text-sm mt-6 italic">
          « Enfin un outil qui comprend la réalité de notre discipline. »
        </p>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Créer `components/landing/CtaSection.tsx`**

```typescript
import Link from 'next/link'

export default function CtaSection() {
  return (
    <section className="px-margin-mobile md:px-margin-desktop py-16">
      <div className="max-w-container-max mx-auto">
        <div className="bg-primary rounded-3xl p-10 md:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 via-transparent to-primary-container/40 pointer-events-none" />
          <div className="relative z-10">
            <h2 className="font-montserrat text-headline-md font-bold text-on-primary mb-4">
              Prêt à créer ta vitrine ?
            </h2>
            <p className="text-on-primary/80 text-body-lg mb-10 max-w-xl mx-auto">
              Rejoins les judokas qui font passer leur carrière au niveau supérieur.
            </p>
            <Link
              href="/creer-mon-profil"
              className="inline-block bg-secondary text-on-secondary px-10 py-4 rounded-lg font-semibold text-lg hover:bg-secondary-container transition-colors active:scale-95"
            >
              Créer mon profil gratuitement
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 6: Créer `components/landing/LandingFooter.tsx`**

```typescript
export default function LandingFooter() {
  return (
    <footer className="bg-surface-container-highest border-t border-outline-variant">
      <div className="flex flex-col md:flex-row justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-10 max-w-container-max mx-auto gap-6">
        <div className="flex flex-col items-center md:items-start gap-1">
          <span className="font-montserrat text-lg font-black text-primary tracking-tight">IpponId</span>
          <p className="text-on-surface-variant text-xs">© 2024 IpponId. Tous droits réservés.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-on-surface-variant text-xs">
          <a href="#" className="hover:text-secondary transition-colors">Mentions légales</a>
          <a href="#" className="hover:text-secondary transition-colors">Politique de confidentialité</a>
          <a href="#" className="hover:text-secondary transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 7: Vérifier le type-check**

```bash
npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 8: Commit**

```bash
git add components/landing/
git commit -m "feat: add static landing page components (nav, mockup, how-it-works, social proof, cta, footer)"
```

---

### Task 8: `HeroSection` — moteur de recherche

**Files:**
- Create: `components/landing/HeroSection.tsx`

**Interfaces:**
- Consumes: `searchJudokas(query: string): Promise<JudokaData[]>` de `@/lib/judokaService`
- Comportement:
  - Soumission → `searchJudokas(query)` → si résultat : `router.push('/' + results[0].slug)`, sinon : affiche message + lien `/creer-mon-profil`

- [ ] **Step 1: Créer `components/landing/HeroSection.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { searchJudokas } from '@/lib/judokaService'

export default function HeroSection() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [noResult, setNoResult] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setNoResult(false)
    const results = await searchJudokas(query)
    setLoading(false)
    if (results.length > 0) {
      router.push(`/${results[0].slug}`)
    } else {
      setNoResult(true)
    }
  }

  return (
    <section className="relative px-margin-mobile md:px-margin-desktop pt-16 pb-10 text-center overflow-hidden">
      {/* Décorations de fond */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <h1 className="font-montserrat text-headline-lg-mobile md:text-headline-lg font-black text-primary mb-6 leading-tight">
          Ton palmarès judo mérite<br className="hidden md:block" /> sa propre page
        </h1>
        <p className="text-body-lg text-on-surface-variant mb-10 max-w-2xl mx-auto">
          Crée ta page CV de judoka gratuitement. Partage ton parcours, tes grades et tes victoires avec ton URL personnalisée.
        </p>

        <form
          onSubmit={handleSearch}
          className="flex flex-col md:flex-row items-center gap-2 max-w-2xl mx-auto bg-white rounded-xl shadow-xl border border-outline-variant p-2"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setNoResult(false) }}
            placeholder="Rechercher un judoka…"
            className="flex-1 w-full border-none focus:ring-0 px-4 py-3 text-on-surface placeholder:text-outline bg-transparent"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto bg-secondary text-on-secondary px-8 py-3 rounded-lg font-semibold whitespace-nowrap hover:bg-secondary-container transition-colors active:scale-95 disabled:opacity-60"
          >
            {loading ? 'Recherche…' : 'Rechercher'}
          </button>
        </form>

        {noResult && (
          <div className="mt-6 p-5 bg-surface-container rounded-xl border border-outline-variant">
            <p className="text-on-surface-variant mb-4">
              Aucun profil trouvé pour «&nbsp;{query}&nbsp;» — sois le premier à créer le tien&nbsp;!
            </p>
            <Link
              href="/creer-mon-profil"
              className="inline-block bg-secondary text-on-secondary px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-secondary-container transition-colors active:scale-95"
            >
              Créer mon profil gratuitement
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Vérifier le type-check**

```bash
npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add components/landing/HeroSection.tsx
git commit -m "feat: add HeroSection with accent-insensitive judoka search"
```

---

### Task 9: Assembler la landing — `app/page.tsx` + nettoyage

**Files:**
- Modify: `app/page.tsx`
- Delete: `data/judoka.json`

**Interfaces:**
- Consumes: tous les composants `components/landing/*`
- Produces: route `/` affichant la landing, route `/timothe-francois` affichant toujours le profil

- [ ] **Step 1: Remplacer le contenu de `app/page.tsx`**

```typescript
import type { Metadata } from 'next'
import LandingNav from '@/components/landing/LandingNav'
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

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main className="mt-20">
        <HeroSection />
        <MockupSection />
        <HowItWorksSection />
        <SocialProofSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </>
  )
}
```

- [ ] **Step 2: Supprimer `data/judoka.json`**

```bash
git rm data/judoka.json
```

- [ ] **Step 3: Vérifier le type-check**

```bash
npx tsc --noEmit
```

Expected: aucune erreur. Si TypeScript se plaint d'un import de `judoka.json` quelque part, chercher avec :

```bash
grep -r "judoka.json" app/ components/ lib/
```

Expected: aucune occurrence.

- [ ] **Step 4: Vérifier dans le navigateur**

```bash
npm run dev
```

| URL | Résultat attendu |
|-----|-----------------|
| `http://localhost:3000/` | Landing page avec navbar, hero (champ de recherche), mockup, 3 steps, social proof, CTA, footer |
| `http://localhost:3000/timothe-francois` | Profil Timothé identique à l'ancien `/` |
| `http://localhost:3000/creer-mon-profil` | Page placeholder "Bientôt disponible" |
| `http://localhost:3000/inconnu` | Page 404 Next.js |
| Chercher "timothe" dans le hero | Redirect vers `/timothe-francois` |
| Chercher "Timothé" dans le hero | Redirect vers `/timothe-francois` |
| Chercher "inconnu" dans le hero | Message "Aucun profil trouvé…" + bouton CTA |

- [ ] **Step 5: Build de production**

```bash
npm run build
```

Expected: build réussi, aucune erreur TypeScript, aucune erreur ESLint, aucun warning bloquant.

- [ ] **Step 6: Commit final**

```bash
git add app/page.tsx
git commit -m "feat: transform / into landing page, profile moved to /[slug]

- app/page.tsx is now the marketing landing page
- /timothe-francois serves the judoka profile via dynamic route
- removes data/judoka.json (replaced by judokas.json)"
```
