# Bloc "Techniques préférées" — Design Spec

Date: 2026-06-16

## Objectif

Ajouter un bloc `TechniquesBlock` au CV de Timothé François permettant d'afficher une ou plusieurs techniques de judo préférées. Chaque technique peut avoir une description et une image, toutes deux optionnelles.

## Structure des données

### `data/judoka.json`

Nouveau champ `techniques` (tableau) au même niveau que `palmares`, `videos`, `gallery` :

```json
"techniques": [
  {
    "name": "Seoi-nage",
    "description": "Projection épaule, technique de prédilection de Timothé.",
    "image": "/images/technique-seoi-nage.jpg"
  },
  {
    "name": "Uchi-mata",
    "description": null,
    "image": null
  }
]
```

- `name` : requis
- `description` : optionnel (`null` ou absent)
- `image` : optionnel (`null` ou absent) — chemin relatif depuis `/public`

Le bloc est inséré dans `layout` à la position souhaitée :

```json
"layout": ["hero", "bio", "palmares", "techniques", "videos", "gallery"]
```

## Types (`types/judoka.ts`)

```ts
export interface Technique {
  name: string
  description?: string | null
  image?: string | null
}
```

- Ajouter `techniques: Technique[]` dans `JudokaData`
- Ajouter `'techniques'` dans l'union `BlockName`

## Composant (`components/blocks/TechniquesBlock.tsx`)

### Props

```ts
interface TechniquesBlockProps {
  techniques: Technique[]
}
```

Guard : si `techniques.length === 0`, retourner `null`.

### Layout

- Section avec padding `py-16 md:py-24 px-margin-mobile md:px-margin-desktop`
- `max-w-container-max mx-auto`
- En-tête : barre `w-1 h-8 bg-tertiary-container` + titre `"Techniques préférées"` en `font-montserrat text-headline-md font-bold text-primary uppercase tracking-tight`
- Grille : `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6`

### Carte

Chaque technique est rendue dans une carte `rounded-xl bg-surface-container overflow-hidden group`.

**Zone image** (`aspect-[4/3]`, `relative`) :
- Si `image` présent : `<Image fill object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-105 />`
- Si absent : `div` avec `bg-gradient-to-br from-primary to-primary-container` (placeholder coloré)

**Zone texte** (`p-4`) :
- Nom : `font-montserrat font-bold text-primary text-base uppercase tracking-tight`
- Description : `font-inter text-sm text-on-surface-variant mt-1 leading-relaxed` — rendu uniquement si présente

## Enregistrement (`lib/blockRegistry.tsx`)

```tsx
import TechniquesBlock from '@/components/blocks/TechniquesBlock'

// Dans blockRegistry :
techniques: (data) => <TechniquesBlock techniques={data.techniques} />,
```

## Fichiers modifiés

| Fichier | Action |
|---|---|
| `types/judoka.ts` | Ajouter `Technique`, étendre `JudokaData` et `BlockName` |
| `data/judoka.json` | Ajouter `techniques[]` et `"techniques"` dans `layout` |
| `components/blocks/TechniquesBlock.tsx` | Créer le composant |
| `lib/blockRegistry.tsx` | Enregistrer le renderer |

## Non-inclus (hors scope)

- Pas d'animation d'entrée au scroll
- Pas de modal / vue détail au clic
- Pas de tri ou filtre
