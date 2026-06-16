# TechniquesBlock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un bloc "Techniques préférées" au CV de Timothé qui affiche une ou plusieurs techniques de judo en cartes avec image optionnelle et description optionnelle.

**Architecture:** Suit le pattern existant data→types→component→registry. Le champ `techniques` est ajouté à `judoka.json`, typé dans `types/judoka.ts`, rendu par `TechniquesBlock.tsx`, et enregistré dans `blockRegistry.tsx`. Aucun composant n'importe le JSON directement.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, `next/image`

> **Note:** Ce projet n'a pas de suite de tests configurée. La validation se fait via `npx tsc --noEmit` (type-check) et `npm run build` (lint + build). Pas d'étapes TDD.

---

### Task 1: Ajouter les types TypeScript

**Files:**
- Modify: `types/judoka.ts`

- [ ] **Step 1: Ajouter l'interface `Technique` et mettre à jour `JudokaData` et `BlockName`**

Dans `types/judoka.ts`, ajouter après l'interface `GalleryImage` :

```ts
export interface Technique {
  name: string
  description?: string | null
  image?: string | null
}
```

Modifier `BlockName` :

```ts
export type BlockName = 'hero' | 'bio' | 'palmares' | 'videos' | 'gallery' | 'techniques'
```

Modifier `JudokaData` — ajouter le champ après `gallery` :

```ts
export interface JudokaData {
  slug: string
  identity: Identity
  bio: string
  palmares: PalmaresEntry[]
  videos: Video[]
  gallery: GalleryImage[]
  techniques: Technique[]
  social: Social
  layout: BlockName[]
}
```

- [ ] **Step 2: Vérifier les types**

```bash
npx tsc --noEmit
```

Résultat attendu : aucune erreur (ou uniquement des erreurs liées à `data.techniques` manquant dans `judoka.json`, ce qui est normal à ce stade).

- [ ] **Step 3: Commiter**

```bash
git add types/judoka.ts
git commit -m "feat: add Technique type and extend JudokaData and BlockName"
```

---

### Task 2: Ajouter les données dans `judoka.json`

**Files:**
- Modify: `data/judoka.json`

- [ ] **Step 1: Ajouter le champ `techniques` et l'insérer dans `layout`**

Dans `data/judoka.json`, ajouter après le tableau `gallery` :

```json
"techniques": [
  {
    "name": "Seoi-nage",
    "description": "Projection par les épaules, technique de prédilection de Timothé qui lui a valu plusieurs titres nationaux.",
    "image": null
  },
  {
    "name": "Uchi-mata",
    "description": "Fauchage intérieur de la cuisse, technique polyvalente qu'il utilise aussi bien en attaque directe qu'en contre.",
    "image": null
  }
],
```

Modifier le tableau `layout` pour inclure `"techniques"` après `"palmares"` :

```json
"layout": [
  "hero",
  "bio",
  "palmares",
  "techniques",
  "videos",
  "gallery"
]
```

- [ ] **Step 2: Vérifier les types**

```bash
npx tsc --noEmit
```

Résultat attendu : aucune erreur TypeScript.

- [ ] **Step 3: Commiter**

```bash
git add data/judoka.json
git commit -m "feat: add techniques data to judoka.json"
```

---

### Task 3: Créer le composant `TechniquesBlock`

**Files:**
- Create: `components/blocks/TechniquesBlock.tsx`

- [ ] **Step 1: Créer le fichier du composant**

Créer `components/blocks/TechniquesBlock.tsx` avec ce contenu :

```tsx
import Image from 'next/image'
import type { Technique } from '@/types/judoka'

interface TechniquesBlockProps {
  techniques: Technique[]
}

export default function TechniquesBlock({ techniques }: TechniquesBlockProps) {
  if (!techniques.length) return null

  return (
    <section className="py-16 md:py-24 px-margin-mobile md:px-margin-desktop">
      <div className="max-w-container-max mx-auto">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
          <h2 className="font-montserrat text-headline-md font-bold text-primary uppercase tracking-tight">
            Techniques préférées
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {techniques.map((technique, i) => (
            <div
              key={i}
              className="rounded-xl bg-surface-container overflow-hidden group"
            >
              <div className="relative aspect-[4/3]">
                {technique.image ? (
                  <Image
                    src={technique.image}
                    alt={technique.name}
                    fill
                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-105"
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-container" />
                )}
              </div>

              <div className="p-4">
                <p className="font-montserrat font-bold text-primary text-base uppercase tracking-tight">
                  {technique.name}
                </p>
                {technique.description && (
                  <p className="font-inter text-sm text-on-surface-variant mt-1 leading-relaxed">
                    {technique.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Vérifier les types**

```bash
npx tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Step 3: Commiter**

```bash
git add components/blocks/TechniquesBlock.tsx
git commit -m "feat: add TechniquesBlock component"
```

---

### Task 4: Enregistrer le bloc dans le registry

**Files:**
- Modify: `lib/blockRegistry.tsx`

- [ ] **Step 1: Importer et enregistrer `TechniquesBlock`**

Dans `lib/blockRegistry.tsx`, ajouter l'import après `GalleryBlock` :

```tsx
import TechniquesBlock from '@/components/blocks/TechniquesBlock'
```

Dans l'objet `blockRegistry`, ajouter après `gallery` :

```tsx
techniques: (data) => <TechniquesBlock techniques={data.techniques} />,
```

Le fichier complet doit ressembler à :

```tsx
import type { JudokaData, BlockName } from '@/types/judoka'
import HeroBlock from '@/components/blocks/HeroBlock'
import BioBlock from '@/components/blocks/BioBlock'
import PalmaresBlock from '@/components/blocks/PalmaresBlock'
import VideosBlock from '@/components/blocks/VideosBlock'
import GalleryBlock from '@/components/blocks/GalleryBlock'
import TechniquesBlock from '@/components/blocks/TechniquesBlock'

type BlockRenderer = (data: JudokaData) => React.ReactElement

export const blockRegistry: Record<BlockName, BlockRenderer> = {
  hero:       (data) => <HeroBlock identity={data.identity} />,
  bio:        (data) => <BioBlock bio={data.bio} firstName={data.identity.firstName} />,
  palmares:   (data) => <PalmaresBlock palmares={data.palmares} birthDate={data.identity.birthDate} />,
  videos:     (data) => <VideosBlock videos={data.videos} />,
  gallery:    (data) => <GalleryBlock gallery={data.gallery} />,
  techniques: (data) => <TechniquesBlock techniques={data.techniques} />,
}
```

- [ ] **Step 2: Vérifier les types et le build**

```bash
npx tsc --noEmit
```

Résultat attendu : aucune erreur.

```bash
npm run build
```

Résultat attendu : build réussi, aucune erreur ESLint ni TypeScript.

- [ ] **Step 3: Vérifier visuellement**

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) et vérifier :
- Le bloc "Techniques préférées" apparaît entre Palmarès et Vidéos
- Les cartes s'affichent avec le fond dégradé bleu (pas d'image renseignée pour l'instant)
- Le nom de chaque technique s'affiche en majuscules
- La description s'affiche sous le nom
- La grille passe de 1 colonne (mobile) à 2 (tablette) à 3 (desktop)

- [ ] **Step 4: Commiter**

```bash
git add lib/blockRegistry.tsx
git commit -m "feat: register TechniquesBlock in blockRegistry"
```
