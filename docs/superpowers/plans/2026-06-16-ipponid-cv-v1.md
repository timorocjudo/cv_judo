# IpponId CV V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js 14 (App Router, TypeScript, Tailwind CSS) single-page CV site for judoka Timothé François, displaying his palmares, bio, YouTube highlights, and photo gallery, with data driven from a local JSON file and a block registry enabling future reordering.

**Architecture:** A static `data/judoka.json` feeds `app/page.tsx`, which iterates a `layout` array, resolves each block name through `lib/blockRegistry.tsx`, and renders the corresponding `components/blocks/*` component with typed props sliced from the data — components never import JSON directly. Tailwind is configured with the full Stitch design-token palette (Judo Blue, gold medal accents, Inter + Montserrat typography).

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Tailwind CSS, next/image, next/font/google, no database, no auth.

---

## Design Summary (from `design-reference/`)

- **Primary colour:** Judo Blue `#000666` / deep `#1a237e`
- **Surface:** `#f9f9f9` background, `#ffffff` cards
- **Medal accents:** Gold `#FFD700` / `#cba72f`, Silver `#C0C0C0`, Bronze `#CD7F32`
- **Typography:** Montserrat (Black 900 / Bold 700) for headlines, Inter (400/700) for body & labels
- **Texture:** radial-gradient dot pattern ("gi-texture") at low opacity on dark sections
- **Timeline:** vertical 2px Judo Blue line connecting yearly palmares groups
- **Gallery:** grayscale images that reveal colour on hover
- **Video:** iframe embeds with title + description below each card

---

## File Map

| Path | Responsibility |
|---|---|
| `types/judoka.ts` | All TypeScript interfaces & BlockName union |
| `data/judoka.json` | Static content — Timothé's real data |
| `tailwind.config.ts` | Design tokens (colors, fonts, spacing) |
| `app/globals.css` | Tailwind directives + `.gi-texture` utility |
| `app/layout.tsx` | Root layout: next/font, html lang, base metadata |
| `app/page.tsx` | Reads JSON → generates metadata → renders block loop |
| `lib/blockRegistry.tsx` | `Record<BlockName, (data: JudokaData) => ReactElement>` |
| `components/layout/Header.tsx` | Sticky nav, anchor links |
| `components/layout/Footer.tsx` | Social links, copyright |
| `components/blocks/HeroBlock.tsx` | Cover photo, name, club, category, belt badges |
| `components/blocks/BioBlock.tsx` | Two-column text layout |
| `components/blocks/PalmaresBlock.tsx` | Timeline grouped by year, medal colours |
| `components/blocks/VideosBlock.tsx` | YouTube iframe grid |
| `components/blocks/GalleryBlock.tsx` | Responsive grid, grayscale hover |
| `public/images/` | Static images (user must add their own) |

---

## Task 1: Initialize Next.js Project

**Files:**
- Create: entire Next.js project scaffold in current directory

- [ ] **Step 1: Run create-next-app in the current directory**

Run in `c:\Users\MariePoc\Desktop\STAGE Timothé\cv_judo`:
```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --yes
```
Expected: project files created (app/, components/, public/, package.json, tsconfig.json, tailwind.config.ts, next.config.ts)

- [ ] **Step 2: Install Google Fonts (already bundled with next/font — no extra package needed). Verify dev server starts**

```bash
npm run dev
```
Expected: server starts on http://localhost:3000, default Next.js page loads. Stop with Ctrl+C.

- [ ] **Step 3: Create image placeholder directory**

```bash
mkdir -p public/images
echo "" > public/images/.gitkeep
```

- [ ] **Step 4: Commit scaffold**

```bash
git add -A
git commit -m "chore: initialize Next.js 14 project with TypeScript + Tailwind"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `types/judoka.ts`

- [ ] **Step 1: Create `types/judoka.ts`**

```typescript
// types/judoka.ts
export type MedalType = 'gold' | 'silver' | 'bronze' | null

export interface Identity {
  firstName: string
  lastName: string
  club: string
  category: string
  grade: string
  profilePhoto: string
  coverPhoto: string
}

export interface PalmaresEntry {
  date: string          // ISO 8601: "2024-03-25"
  competition: string
  result: string
  category: string      // weight class + age category
  level: string         // "National Individuel" | "Régional" | etc.
  medal: MedalType
}

export interface Video {
  title: string
  youtubeUrl: string
  description: string
}

export interface GalleryImage {
  src: string
  caption: string
}

export interface Social {
  instagram?: string
  youtube?: string
}

export type BlockName = 'hero' | 'bio' | 'palmares' | 'videos' | 'gallery'

export interface JudokaData {
  slug: string
  identity: Identity
  bio: string
  palmares: PalmaresEntry[]
  videos: Video[]
  gallery: GalleryImage[]
  social: Social
  layout: BlockName[]
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add types/judoka.ts
git commit -m "feat: add TypeScript interfaces for judoka data model"
```

---

## Task 3: Data File

**Files:**
- Create: `data/judoka.json`

- [ ] **Step 1: Create `data/judoka.json` with Timothé's real data**

```json
{
  "slug": "timothe-francois",
  "identity": {
    "firstName": "Timothé",
    "lastName": "François",
    "club": "ONJ — Omnisports Neuilly Judo",
    "category": "Cadet 2 · -81kg",
    "grade": "Ceinture noire",
    "profilePhoto": "/images/profile.jpg",
    "coverPhoto": "/images/cover.jpg"
  },
  "bio": "Judoka de haut niveau évoluant au sein de l'ONJ (Omnisports Neuilly Judo), Timothé François est un compétiteur d'exception. Double Champion de France Individuel (-66kg en 2023, -73kg en 2024), il enchaîne les podiums nationaux depuis 2021 avec une régularité remarquable. Sa progression constante, sa maîtrise technique et son mental de compétiteur en font l'un des espoirs les plus prometteurs du judo français dans sa catégorie.",
  "palmares": [
    { "date": "2026-05-02", "competition": "Championnat de France par équipe de club", "result": "Médaille de bronze", "category": "-73kg · ONJ", "level": "National Équipe", "medal": "bronze" },
    { "date": "2026-01-31", "competition": "Championnat Régional", "result": "Champion Régional", "category": "-81kg · Cadet 2", "level": "Régional", "medal": "gold" },
    { "date": "2025-11-08", "competition": "Championnat Départemental", "result": "Vice-Champion Départemental", "category": "-81kg · Cadet 2", "level": "Départemental", "medal": "silver" },
    { "date": "2025-05-18", "competition": "Championnat de France Cadet Espoir", "result": "Médaille de bronze", "category": "-81kg", "level": "National", "medal": "bronze" },
    { "date": "2025-02-08", "competition": "Championnat Régional", "result": "Médaille de bronze", "category": "-81kg · Cadet 1", "level": "Régional", "medal": "bronze" },
    { "date": "2024-11-16", "competition": "Championnat Départemental", "result": "Médaille de bronze", "category": "-81kg · Cadet 1", "level": "Départemental", "medal": "bronze" },
    { "date": "2024-05-12", "competition": "Championnat de France par équipe de département", "result": "Vice-Champion de France", "category": "-73kg", "level": "National Équipe", "medal": "silver" },
    { "date": "2024-03-25", "competition": "Championnat de France Individuel", "result": "Champion de France", "category": "-73kg", "level": "National Individuel", "medal": "gold" },
    { "date": "2024-02-11", "competition": "Championnat Régional", "result": "Champion Régional", "category": "-73kg", "level": "Régional", "medal": "gold" },
    { "date": "2023-11-18", "competition": "Championnat Départemental", "result": "Vice-Champion Départemental", "category": "-73kg", "level": "Départemental", "medal": "silver" },
    { "date": "2023-05-13", "competition": "Championnat de France par équipe de département", "result": "Champion de France", "category": "-66kg", "level": "National Équipe", "medal": "gold" },
    { "date": "2023-03-26", "competition": "Championnat de France Individuel", "result": "Champion de France", "category": "-66kg", "level": "National Individuel", "medal": "gold" },
    { "date": "2023-01-21", "competition": "Championnat Régional", "result": "Champion Régional", "category": "-66kg", "level": "Régional", "medal": "gold" },
    { "date": "2022-11-19", "competition": "Championnat Départemental", "result": "Champion Départemental", "category": "-66kg", "level": "Départemental", "medal": "gold" },
    { "date": "2022-04-10", "competition": "Championnat Régional", "result": "Champion Régional", "category": "Benjamin", "level": "Régional", "medal": "gold" },
    { "date": "2021-11-21", "competition": "Championnat Départemental", "result": "Champion Départemental", "category": "Benjamin 2", "level": "Départemental", "medal": "gold" }
  ],
  "videos": [
    {
      "title": "France Individuel 2024 — Finale -73kg",
      "youtubeUrl": "https://www.youtube.com/watch?v=REPLACE_ME_1",
      "description": "Highlights de la finale du Championnat de France Individuel 2024 en -73kg."
    },
    {
      "title": "France Individuel 2023 — Finale -66kg",
      "youtubeUrl": "https://www.youtube.com/watch?v=REPLACE_ME_2",
      "description": "Retour sur le titre de Champion de France 2023 en -66kg."
    }
  ],
  "gallery": [
    { "src": "/images/gallery-1.jpg", "caption": "Finale France 2024 — -73kg" },
    { "src": "/images/gallery-2.jpg", "caption": "Préparation ONJ" },
    { "src": "/images/gallery-3.jpg", "caption": "Podium France 2023" },
    { "src": "/images/gallery-4.jpg", "caption": "Entraînement matinal" }
  ],
  "social": {
    "instagram": "https://www.instagram.com/",
    "youtube": "https://www.youtube.com/@"
  },
  "layout": ["hero", "bio", "palmares", "videos", "gallery"]
}
```

**Note:** Replace `REPLACE_ME_1`/`REPLACE_ME_2` with real YouTube video IDs, and add real images to `public/images/`. The app will show a coloured placeholder for any missing image.

- [ ] **Step 2: Commit**

```bash
git add data/judoka.json
git commit -m "feat: add judoka data file with Timothé François palmares"
```

---

## Task 4: Tailwind Config + Global CSS

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Replace `tailwind.config.ts` with design-token config**

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#000666',
        'primary-container': '#1a237e',
        'on-primary': '#ffffff',
        'on-primary-container': '#8690ee',
        'primary-fixed-dim': '#bdc2ff',
        background: '#f9f9f9',
        surface: '#f9f9f9',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f3f3f3',
        'surface-container': '#eeeeee',
        'surface-container-high': '#e8e8e8',
        'surface-container-highest': '#e2e2e2',
        'on-surface': '#1a1c1c',
        'on-surface-variant': '#454652',
        'inverse-surface': '#2f3131',
        outline: '#767683',
        'outline-variant': '#c6c5d4',
        tertiary: '#735c00',
        'tertiary-container': '#cba72f',
        'tertiary-fixed': '#ffe088',
        'tertiary-fixed-dim': '#e9c349',
        'on-tertiary-container': '#4e3d00',
        'medal-gold': '#FFD700',
        'medal-silver': '#C0C0C0',
        'medal-bronze': '#CD7F32',
      },
      fontFamily: {
        montserrat: ['var(--font-montserrat)', 'sans-serif'],
        inter: ['var(--font-inter)', 'sans-serif'],
      },
      maxWidth: {
        'container-max': '1280px',
      },
      spacing: {
        gutter: '24px',
        'margin-mobile': '16px',
        'margin-desktop': '64px',
        'section-padding': '120px',
      },
      fontSize: {
        'display-lg': ['72px', { lineHeight: '80px', letterSpacing: '-0.02em', fontWeight: '900' }],
        'headline-lg': ['48px', { lineHeight: '56px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'headline-md': ['32px', { lineHeight: '40px', fontWeight: '700' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'label-bold': ['14px', { lineHeight: '20px', letterSpacing: '0.05em', fontWeight: '700' }],
        'stats-number': ['40px', { lineHeight: '40px', fontWeight: '900' }],
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 2: Replace `app/globals.css` content**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer utilities {
  .gi-texture {
    background-image: radial-gradient(#c6c5d4 0.5px, transparent 0.5px);
    background-size: 8px 8px;
  }

  .gi-texture-dark {
    background-image: radial-gradient(rgba(26, 35, 126, 0.12) 0.5px, transparent 0.5px);
    background-size: 8px 8px;
  }
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```
Expected: build succeeds (ignore the default app/page.tsx content for now).

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts app/globals.css
git commit -m "feat: configure Tailwind with Stitch design tokens and gi-texture utility"
```

---

## Task 5: App Layout + Fonts

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace `app/layout.tsx`**

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import { Montserrat, Inter } from 'next/font/google'
import './globals.css'

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
  weight: ['400', '700', '900'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '700'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://ipponid.com'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${montserrat.variable} ${inter.variable}`}>
      <body className="bg-background text-on-surface font-inter overflow-x-hidden">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: configure root layout with Montserrat + Inter via next/font"
```

---

## Task 6: Header + Footer Components

**Files:**
- Create: `components/layout/Header.tsx`
- Create: `components/layout/Footer.tsx`

- [ ] **Step 1: Create `components/layout/Header.tsx`**

```tsx
// components/layout/Header.tsx
import Link from 'next/link'
import type { Identity, Social } from '@/types/judoka'

interface HeaderProps {
  identity: Identity
  social: Social
}

export default function Header({ identity }: HeaderProps) {
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
          <a
            href="#bio"
            className="font-inter text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
          >
            Profil
          </a>
          <a
            href="#palmares"
            className="font-inter text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
          >
            Palmarès
          </a>
          <a
            href="#videos"
            className="font-inter text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
          >
            Highlights
          </a>
          <a
            href="#gallery"
            className="font-inter text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
          >
            Galerie
          </a>
        </nav>

        <span className="font-inter text-xs font-bold uppercase tracking-widest text-on-surface-variant hidden md:block">
          {identity.firstName} {identity.lastName}
        </span>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Create `components/layout/Footer.tsx`**

```tsx
// components/layout/Footer.tsx
import type { Identity, Social } from '@/types/judoka'

interface FooterProps {
  identity: Identity
  social: Social
}

export default function Footer({ identity, social }: FooterProps) {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-surface-container-highest border-t border-outline-variant">
      <div className="px-margin-mobile md:px-margin-desktop py-10 max-w-container-max mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="font-montserrat text-xl font-black text-primary tracking-tighter">
          IpponId
        </div>

        <nav className="flex gap-6" aria-label="Réseaux sociaux">
          {social.instagram && (
            <a
              href={social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="font-inter text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
            >
              Instagram
            </a>
          )}
          {social.youtube && (
            <a
              href={social.youtube}
              target="_blank"
              rel="noopener noreferrer"
              className="font-inter text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
            >
              YouTube
            </a>
          )}
        </nav>

        <p className="font-inter text-xs text-on-surface-variant opacity-70 text-center">
          © {year} {identity.firstName} {identity.lastName}. Tous droits réservés.
        </p>
      </div>
    </footer>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/layout/Header.tsx components/layout/Footer.tsx
git commit -m "feat: add Header and Footer layout components"
```

---

## Task 7: HeroBlock

**Files:**
- Create: `components/blocks/HeroBlock.tsx`

- [ ] **Step 1: Create `components/blocks/HeroBlock.tsx`**

```tsx
// components/blocks/HeroBlock.tsx
import Image from 'next/image'
import type { Identity } from '@/types/judoka'

interface HeroBlockProps {
  identity: Identity
}

export default function HeroBlock({ identity }: HeroBlockProps) {
  return (
    <section className="relative min-h-[65vh] md:min-h-[75vh] bg-primary-container overflow-hidden flex items-end">
      {/* Cover photo with gradient overlay */}
      <div className="absolute inset-0">
        <Image
          src={identity.coverPhoto}
          alt={`${identity.firstName} ${identity.lastName} en compétition`}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/30 to-transparent" />
        <div className="absolute inset-0 gi-texture-dark" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
          {/* Profile photo */}
          <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white/20 flex-shrink-0 bg-surface-container">
            <Image
              src={identity.profilePhoto}
              alt={`Photo de profil de ${identity.firstName} ${identity.lastName}`}
              fill
              className="object-cover"
              sizes="128px"
            />
          </div>

          {/* Text */}
          <div>
            <p className="font-inter text-xs font-bold uppercase tracking-[0.25em] text-tertiary-fixed-dim mb-2">
              IpponId · Athlete Profile
            </p>
            <h1 className="font-montserrat text-5xl md:text-7xl font-black text-white uppercase tracking-tight leading-none">
              {identity.firstName}
              <br />
              {identity.lastName}
            </h1>
            <div className="flex flex-wrap gap-2 mt-5">
              <span className="bg-white/10 backdrop-blur-sm text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-white/20">
                {identity.club}
              </span>
              <span className="bg-tertiary-container text-on-tertiary-container text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">
                {identity.category}
              </span>
              <span className="bg-white/10 backdrop-blur-sm text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-white/20">
                {identity.grade}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/blocks/HeroBlock.tsx
git commit -m "feat: add HeroBlock with cover photo, name, and identity badges"
```

---

## Task 8: BioBlock

**Files:**
- Create: `components/blocks/BioBlock.tsx`

- [ ] **Step 1: Create `components/blocks/BioBlock.tsx`**

```tsx
// components/blocks/BioBlock.tsx
interface BioBlockProps {
  bio: string
  firstName: string
}

export default function BioBlock({ bio, firstName }: BioBlockProps) {
  return (
    <section className="py-16 md:py-24 px-margin-mobile md:px-margin-desktop">
      <div className="max-w-container-max mx-auto grid grid-cols-1 md:grid-cols-12 gap-gutter items-start">
        {/* Left column: section label */}
        <div className="md:col-span-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
            <h2 className="font-montserrat text-headline-md font-bold text-primary uppercase tracking-tight">
              Profil
            </h2>
          </div>
          <p className="font-inter text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-4">
            {firstName}
          </p>
        </div>

        {/* Right column: bio text */}
        <div className="md:col-span-8">
          <p className="font-inter text-body-lg text-on-surface-variant leading-relaxed">
            {bio}
          </p>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/blocks/BioBlock.tsx
git commit -m "feat: add BioBlock with two-column layout"
```

---

## Task 9: PalmaresBlock

**Files:**
- Create: `components/blocks/PalmaresBlock.tsx`

- [ ] **Step 1: Create `components/blocks/PalmaresBlock.tsx`**

```tsx
// components/blocks/PalmaresBlock.tsx
import type { PalmaresEntry, MedalType } from '@/types/judoka'

interface PalmaresBlockProps {
  palmares: PalmaresEntry[]
}

const MEDAL_STYLES: Record<NonNullable<MedalType>, { border: string; dot: string; label: string }> = {
  gold:   { border: '#FFD700', dot: '#cba72f', label: 'Or' },
  silver: { border: '#C0C0C0', dot: '#767683', label: 'Argent' },
  bronze: { border: '#CD7F32', dot: '#8d6e63', label: 'Bronze' },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function PalmaresBlock({ palmares }: PalmaresBlockProps) {
  // Group entries by year, descending
  const byYear = palmares.reduce<Record<number, PalmaresEntry[]>>((acc, entry) => {
    const year = new Date(entry.date).getFullYear()
    if (!acc[year]) acc[year] = []
    acc[year].push(entry)
    return acc
  }, {})

  const years = Object.keys(byYear)
    .map(Number)
    .sort((a, b) => b - a)

  return (
    <section className="py-16 md:py-24 bg-surface-container-low">
      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        {/* Section header */}
        <div className="flex items-center gap-3 mb-12">
          <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
          <h2 className="font-montserrat text-headline-md font-bold text-primary uppercase tracking-tight">
            Mon Palmarès
          </h2>
        </div>

        {/* Timeline */}
        <div className="space-y-12">
          {years.map((year, yearIdx) => (
            <div key={year} className="flex gap-6 relative">
              {/* Dot + vertical line */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-6 h-6 rounded-full border-2 border-primary bg-background z-10 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                {yearIdx < years.length - 1 && (
                  <div className="flex-1 w-px bg-primary/20 mt-1 min-h-[2rem]" />
                )}
              </div>

              {/* Year group */}
              <div className="flex-1 pb-4">
                <span className="font-montserrat text-5xl font-black text-primary-container block mb-6">
                  {year}
                </span>
                <div className="grid grid-cols-1 gap-3">
                  {byYear[year].map((entry, i) => {
                    const medal = entry.medal ? MEDAL_STYLES[entry.medal] : null
                    return (
                      <article
                        key={i}
                        className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden"
                        style={{ borderLeft: `4px solid ${medal?.border ?? '#c6c5d4'}` }}
                      >
                        <div className="p-5 flex justify-between items-start gap-4">
                          <div className="min-w-0">
                            <p className="font-inter text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                              {formatDate(entry.date)} · {entry.level}
                            </p>
                            <h3 className="font-inter text-base font-bold text-primary leading-snug">
                              {entry.result} — {entry.competition}
                            </h3>
                            <p className="font-inter text-sm text-on-surface-variant mt-1">
                              {entry.category}
                            </p>
                          </div>
                          {medal && (
                            <div
                              className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm text-white font-bold"
                              style={{ backgroundColor: medal.dot }}
                              aria-label={`Médaille ${medal.label}`}
                              role="img"
                            >
                              ★
                            </div>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/blocks/PalmaresBlock.tsx
git commit -m "feat: add PalmaresBlock with year-grouped timeline and medal colours"
```

---

## Task 10: VideosBlock

**Files:**
- Create: `components/blocks/VideosBlock.tsx`

- [ ] **Step 1: Create `components/blocks/VideosBlock.tsx`**

```tsx
// components/blocks/VideosBlock.tsx
import type { Video } from '@/types/judoka'

interface VideosBlockProps {
  videos: Video[]
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([^&?/]+)/)
  return match?.[1] ?? null
}

export default function VideosBlock({ videos }: VideosBlockProps) {
  if (!videos.length) return null

  return (
    <section className="py-16 md:py-24 bg-surface-container border-y border-outline-variant">
      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        {/* Section header */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
          <h2 className="font-montserrat text-headline-md font-bold text-primary uppercase tracking-tight">
            Highlights
          </h2>
        </div>

        {/* Video grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {videos.map((video, i) => {
            const videoId = extractYouTubeId(video.youtubeUrl)
            return (
              <div key={i}>
                <div className="relative aspect-video rounded-xl overflow-hidden shadow-lg bg-primary-container">
                  {videoId ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title={video.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full border-0"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-on-primary-container">
                      <p className="font-inter text-sm">Vidéo non disponible</p>
                    </div>
                  )}
                </div>
                <div className="mt-3 px-1">
                  <h3 className="font-montserrat text-base font-bold text-primary leading-snug">
                    {video.title}
                  </h3>
                  {video.description && (
                    <p className="font-inter text-sm text-on-surface-variant mt-1 leading-relaxed">
                      {video.description}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/blocks/VideosBlock.tsx
git commit -m "feat: add VideosBlock with YouTube iframe embeds"
```

---

## Task 11: GalleryBlock

**Files:**
- Create: `components/blocks/GalleryBlock.tsx`

- [ ] **Step 1: Create `components/blocks/GalleryBlock.tsx`**

```tsx
// components/blocks/GalleryBlock.tsx
import Image from 'next/image'
import type { GalleryImage } from '@/types/judoka'

interface GalleryBlockProps {
  gallery: GalleryImage[]
}

export default function GalleryBlock({ gallery }: GalleryBlockProps) {
  if (!gallery.length) return null

  return (
    <section className="py-16 md:py-24 px-margin-mobile md:px-margin-desktop">
      <div className="max-w-container-max mx-auto">
        {/* Section header */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
          <h2 className="font-montserrat text-headline-md font-bold text-primary uppercase tracking-tight">
            Galerie
          </h2>
        </div>

        {/* Responsive grid: items 0,1 = half-width squares; item 2 = full-width or tall; rest = half-width squares */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {gallery.map((image, i) => {
            const isFeature = i === 2
            return (
              <figure
                key={i}
                className={`relative overflow-hidden rounded-xl bg-surface-container-high group ${
                  isFeature ? 'col-span-2 md:col-span-2 md:row-span-2' : ''
                }`}
              >
                <div className={isFeature ? 'aspect-[4/3] md:aspect-auto md:h-full min-h-[240px]' : 'aspect-square'}>
                  <Image
                    src={image.src}
                    alt={image.caption}
                    fill
                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-105"
                    sizes={
                      isFeature
                        ? '(min-width: 768px) 50vw, 100vw'
                        : '(min-width: 768px) 25vw, 50vw'
                    }
                  />
                </div>
                {image.caption && (
                  <figcaption className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-primary/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <p className="font-inter text-xs font-bold uppercase tracking-wider text-white">
                      {image.caption}
                    </p>
                  </figcaption>
                )}
              </figure>
            )
          })}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/blocks/GalleryBlock.tsx
git commit -m "feat: add GalleryBlock with grayscale hover and caption overlay"
```

---

## Task 12: Block Registry

**Files:**
- Create: `lib/blockRegistry.tsx`

- [ ] **Step 1: Create `lib/blockRegistry.tsx`**

```tsx
// lib/blockRegistry.tsx
import type { JudokaData, BlockName } from '@/types/judoka'
import HeroBlock from '@/components/blocks/HeroBlock'
import BioBlock from '@/components/blocks/BioBlock'
import PalmaresBlock from '@/components/blocks/PalmaresBlock'
import VideosBlock from '@/components/blocks/VideosBlock'
import GalleryBlock from '@/components/blocks/GalleryBlock'

// Each renderer receives the full JudokaData and extracts only the props its block needs.
// Components themselves never import the data file — this registry is the single coupling point.
type BlockRenderer = (data: JudokaData) => React.ReactElement

export const blockRegistry: Record<BlockName, BlockRenderer> = {
  hero:     (data) => <HeroBlock identity={data.identity} />,
  bio:      (data) => <BioBlock bio={data.bio} firstName={data.identity.firstName} />,
  palmares: (data) => <PalmaresBlock palmares={data.palmares} />,
  videos:   (data) => <VideosBlock videos={data.videos} />,
  gallery:  (data) => <GalleryBlock gallery={data.gallery} />,
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/blockRegistry.tsx
git commit -m "feat: add block registry mapping BlockName to typed render functions"
```

---

## Task 13: Main Page + SEO Metadata

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace `app/page.tsx`**

```tsx
// app/page.tsx
import type { Metadata } from 'next'
import judokaData from '@/data/judoka.json'
import type { JudokaData } from '@/types/judoka'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { blockRegistry } from '@/lib/blockRegistry'

const data = judokaData as JudokaData

export const metadata: Metadata = {
  title: `${data.identity.firstName} ${data.identity.lastName} — ${data.identity.club} · IpponId`,
  description: data.bio.slice(0, 155) + '…',
  openGraph: {
    title: `${data.identity.firstName} ${data.identity.lastName} — IpponId`,
    description: data.bio.slice(0, 155) + '…',
    images: [
      {
        url: data.identity.coverPhoto,
        width: 1200,
        height: 630,
        alt: `${data.identity.firstName} ${data.identity.lastName} en compétition`,
      },
    ],
    type: 'profile',
    locale: 'fr_FR',
    siteName: 'IpponId',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${data.identity.firstName} ${data.identity.lastName} — IpponId`,
    description: data.bio.slice(0, 155) + '…',
    images: [data.identity.coverPhoto],
  },
}

export default function HomePage() {
  return (
    <>
      <Header identity={data.identity} social={data.social} />
      <main>
        {data.layout.map((blockName) => {
          const render = blockRegistry[blockName]
          if (!render) return null
          return (
            <div key={blockName} id={blockName}>
              {render(data)}
            </div>
          )
        })}
      </main>
      <Footer identity={data.identity} social={data.social} />
    </>
  )
}
```

- [ ] **Step 2: Verify full TypeScript compilation**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: main page reads JSON, generates OG metadata, renders blocks via registry"
```

---

## Task 14: Final Build Verification

**Files:** none — verification only.

- [ ] **Step 1: Run production build**

```bash
npm run build
```
Expected: build succeeds with no TypeScript or lint errors. "Route / → Static" in output.

- [ ] **Step 2: Start dev server and verify visually**

```bash
npm run dev
```

Open http://localhost:3000 and verify:
- Header sticks at top, IpponId logo visible
- Hero section shows Judo Blue gradient (cover photo placeholder visible or blue fallback)
- Bio section: two-column layout with "Profil" label and bio text
- Palmarès: timeline groups by year 2026→2021, medals coloured gold/silver/bronze
- Videos: iframe grid (shows "Vidéo non disponible" until real YouTube IDs added)
- Gallery: 2×2 grid with grayscale images (shows blue placeholder until real photos added)
- Footer: social links, copyright line

- [ ] **Step 3: Add real images and YouTube IDs**

Place real photos in `public/images/`:
- `profile.jpg` — judoka portrait (square crop)
- `cover.jpg` — competition action shot (landscape, min 1200×630 for OG)
- `gallery-1.jpg` through `gallery-4.jpg` — action shots

Update `youtubeUrl` fields in `data/judoka.json` with real YouTube links.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: IpponId CV V1 — complete Timothé François judoka page"
```

---

## Launch Commands

```bash
# Install dependencies (first time)
npm install

# Development server with hot reload
npm run dev
# → http://localhost:3000

# Production build check
npm run build

# Production server
npm start
```

---

## Self-Review Checklist

- [x] **Hero** — cover photo with gradient overlay, name (Montserrat Black), club/category/belt badges ✓
- [x] **Bio** — 2-column asymmetric layout, Inter body-lg ✓
- [x] **Palmarès** — timeline grouped by year descending, medal border+dot colours, date formatted fr-FR ✓
- [x] **Videos** — YouTube iframe embeds, title + description below ✓
- [x] **Gallery** — grayscale hover-reveal, caption overlay, featured 3rd image ✓
- [x] **Header** — sticky, anchor links (#bio, #palmares, #videos, #gallery) ✓
- [x] **Footer** — social links, copyright ✓
- [x] **SEO** — title, description, og:title, og:image, og:description, twitter card ✓
- [x] **Block registry** — components never import JSON, registry is sole coupling point ✓
- [x] **TypeScript** — all props typed via `types/judoka.ts`, strict interfaces ✓
- [x] **Mobile-first** — `px-margin-mobile md:px-margin-desktop` pattern throughout ✓
- [x] **next/image** — all `<img>` replaced with `<Image>`, `alt` on every image ✓
- [x] **No placeholders** — all code complete, only real-image paths need user action ✓
