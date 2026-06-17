# Design : Photo podium dans le bloc Palmarès

**Date :** 2026-06-17  
**Statut :** Approuvé

## Objectif

Permettre d'afficher une photo de podium associée à une entrée du palmarès, en cliquant sur une icône caméra. La photo s'ouvre dans une modal plein écran.

## Données

### `types/judoka.ts`
Ajout d'un champ optionnel sur `PalmaresEntry` :
```ts
podiumPhoto?: string   // chemin relatif, ex: "/images/podium-France-2023.jpg"
```

### `data/judoka.json`
Entrée du 2023-03-26 (Champion de France Individuel -66kg) :
```json
"podiumPhoto": "/images/podium-France-2023.jpg"
```
Les autres entrées sans photo ne changent pas (le champ est absent, pas `null`).

## Architecture des composants

### `components/blocks/PodiumPhotoButton.tsx` (nouveau, `'use client'`)
- **Props :** `photo: string`, `alt: string`
- **State :** `open: boolean` (géré localement avec `useState`)
- **Rendu fermé :** bouton circulaire avec icône caméra SVG inline, couleur `text-primary`, `hover:bg-primary/10`
- **Rendu ouvert :** overlay `fixed inset-0 z-50 bg-black/70 flex items-center justify-center`
  - `<Image>` Next.js avec `max-w-[90vw] max-h-[85vh] object-contain rounded-xl`
  - Bouton × (`position: absolute top-4 right-4`) pour fermer
  - Clic sur le fond ferme la modal
  - Touche Escape ferme la modal (via `useEffect` + `keydown`)

### `components/blocks/PalmaresBlock.tsx` (modifié, reste Server Component)
- Importe `PodiumPhotoButton` dynamiquement (import normal, Next.js gère le split)
- Quand `entry.podiumPhoto` est présent, rend `<PodiumPhotoButton>` dans la zone droite de la carte, à côté du badge médaille

## Accessibilité
- Bouton avec `aria-label="Voir la photo du podium"`
- Modal avec `role="dialog"` et `aria-modal="true"`
- Focus piégé dans la modal (Escape pour fermer)

## Fichiers touchés
1. `types/judoka.ts` — ajout `podiumPhoto?` sur `PalmaresEntry`
2. `data/judoka.json` — ajout du champ sur l'entrée 2023-03-26
3. `components/blocks/PodiumPhotoButton.tsx` — nouveau fichier
4. `components/blocks/PalmaresBlock.tsx` — intégration du bouton
