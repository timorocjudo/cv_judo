# Podium Photo in Palmares Block — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un bouton icône caméra sur les entrées de palmarès qui ont une photo de podium ; cliquer ouvre la photo dans une modal plein écran.

**Architecture:** `PalmaresBlock` reste un Server Component. Un micro-composant client `PodiumPhotoButton` gère le bouton + le modal avec `useState`. `PalmaresEntry` reçoit un champ optionnel `podiumPhoto?`.

**Tech Stack:** Next.js 14 App Router, React `useState`/`useEffect`, `next/image`, Tailwind CSS.

> ⚠️ Aucun test suite configuré dans ce projet (voir CLAUDE.md). Les étapes de vérification sont manuelles (serveur de dev).

---

## File Map

| Fichier | Action | Rôle |
|---|---|---|
| `types/judoka.ts` | Modifier | Ajouter `podiumPhoto?` sur `PalmaresEntry` |
| `data/judoka.json` | Modifier | Ajouter le chemin photo sur l'entrée 2023-03-26 |
| `components/blocks/PodiumPhotoButton.tsx` | Créer | Bouton + modal, `'use client'` |
| `components/blocks/PalmaresBlock.tsx` | Modifier | Importer et rendre `PodiumPhotoButton` |

---

### Task 1 : Étendre le type `PalmaresEntry`

**Files:**
- Modify: `types/judoka.ts`

- [ ] **Step 1 : Ajouter le champ optionnel**

Dans `types/judoka.ts`, ligne 15-23, modifier l'interface `PalmaresEntry` :

```ts
export interface PalmaresEntry {
  date: string
  competition: string
  result: string
  category: string
  level: string
  medal: MedalType
  city?: string
  podiumPhoto?: string   // chemin relatif vers la photo, ex: "/images/podium-France-2023.jpg"
}
```

- [ ] **Step 2 : Vérifier le typage**

```bash
npx tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add types/judoka.ts
git commit -m "feat: add optional podiumPhoto field to PalmaresEntry"
```

---

### Task 2 : Ajouter la photo dans les données

**Files:**
- Modify: `data/judoka.json`

- [ ] **Step 1 : Ajouter `podiumPhoto` sur l'entrée du 2023-03-26**

Localiser l'entrée avec `"date": "2023-03-26"` et ajouter le champ :

```json
{
  "date": "2023-03-26",
  "competition": "Championnat de France Individuel",
  "result": "Champion de France",
  "category": "-66kg",
  "level": "National Individuel",
  "medal": "gold",
  "city": "Villebon sur Yvette (91)",
  "podiumPhoto": "/images/podium-France-2023.jpg"
}
```

- [ ] **Step 2 : Vérifier le typage**

```bash
npx tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add data/judoka.json
git commit -m "feat: add podium photo to France 2023 palmares entry"
```

---

### Task 3 : Créer le composant `PodiumPhotoButton`

**Files:**
- Create: `components/blocks/PodiumPhotoButton.tsx`

- [ ] **Step 1 : Créer le fichier**

```tsx
'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface PodiumPhotoButtonProps {
  photo: string
  alt: string
}

export default function PodiumPhotoButton({ photo, alt }: PodiumPhotoButtonProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Voir la photo du podium"
        className="w-8 h-8 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
          <circle cx="12" cy="13" r="3"/>
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="relative max-w-[90vw] max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="absolute -top-10 right-0 text-white hover:text-white/70 transition-colors font-bold text-2xl leading-none"
            >
              ×
            </button>
            <Image
              src={photo}
              alt={alt}
              width={1200}
              height={900}
              className="rounded-xl object-contain max-h-[85vh] w-auto"
              priority
            />
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2 : Vérifier le typage**

```bash
npx tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add components/blocks/PodiumPhotoButton.tsx
git commit -m "feat: add PodiumPhotoButton client component with fullscreen modal"
```

---

### Task 4 : Intégrer `PodiumPhotoButton` dans `PalmaresBlock`

**Files:**
- Modify: `components/blocks/PalmaresBlock.tsx`

- [ ] **Step 1 : Ajouter l'import en haut du fichier**

Après la ligne 2 (`import { computeAgeCategory }...`), ajouter :

```ts
import PodiumPhotoButton from '@/components/blocks/PodiumPhotoButton'
```

- [ ] **Step 2 : Rendre le bouton dans la carte**

Localiser le bloc de la zone droite de la carte (actuellement uniquement le badge médaille, lignes 96-105) et modifier pour ajouter le bouton photo :

```tsx
<div className="flex flex-col items-center gap-2 flex-shrink-0">
  {entry.podiumPhoto && (
    <PodiumPhotoButton
      photo={entry.podiumPhoto}
      alt={`Photo du podium — ${entry.competition} ${entry.result}`}
    />
  )}
  {medal && (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-sm text-white font-bold"
      style={{ backgroundColor: medal.dot }}
      aria-label={`Médaille ${medal.label}`}
      role="img"
    >
      ★
    </div>
  )}
</div>
```

- [ ] **Step 3 : Vérifier le typage**

```bash
npx tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Step 4 : Lancer le serveur de dev et vérifier manuellement**

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) et vérifier :
- L'icône caméra apparaît uniquement sur l'entrée "Champion de France 2023 -66kg"
- Cliquer sur l'icône ouvre la modal avec `podium-France-2023.jpg`
- Cliquer sur le fond ferme la modal
- La touche Escape ferme la modal
- Le bouton × ferme la modal
- Les autres entrées n'ont pas d'icône caméra

- [ ] **Step 5 : Commit**

```bash
git add components/blocks/PalmaresBlock.tsx
git commit -m "feat: integrate PodiumPhotoButton in PalmaresBlock"
```
