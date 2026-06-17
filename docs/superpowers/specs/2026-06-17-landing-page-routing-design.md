# Spec — Landing page IpponId + restructuration routing

**Date :** 2026-06-17  
**Projet :** IpponId — CV judoka statique (Next.js 14 App Router)

---

## Contexte

La page `/` affiche actuellement le profil de Timothé François. On ajoute une landing page marketing à la racine et on déplace le profil vers une route dynamique `/[slug]`. Le site reste statique (pas d'auth, pas de BDD), mais la couche service est écrite en `async` pour préparer une vraie BDD future.

---

## Routing

| Route | Fichier | Rôle |
|---|---|---|
| `/` | `app/page.tsx` | Landing page marketing |
| `/[slug]` | `app/[slug]/page.tsx` | Profil judoka dynamique |
| `/creer-mon-profil` | `app/creer-mon-profil/page.tsx` | Placeholder "Bientôt disponible" |

La route `/timothe-francois` doit afficher le profil existant sans aucune modification des composants blocs.

---

## Données

### `data/judokas.json`
`judoka.json` est renommé `judokas.json` et son contenu est enveloppé dans un tableau JSON. Le champ `slug: "timothe-francois"` est déjà présent dans les données existantes.

```json
[
  { ...données Timothé François existantes... }
]
```

---

## Couche service — `lib/judokaService.ts`

Expose deux fonctions async (implémentation in-memory pour l'instant) :

```ts
getJudokaBySlug(slug: string): Promise<JudokaData | null>
searchJudokas(query: string): Promise<JudokaData[]>
```

`searchJudokas` normalise la query ET les champs `firstName`/`lastName` via `normalizeText()` avant comparaison (`includes`), ce qui rend la recherche insensible aux accents et à la casse.

---

## Utilitaire — `lib/slugify.ts`

```ts
normalizeText(str: string): string  // "Timothé" → "timothe"
generateSlug(firstName: string, lastName: string): string  // "Timothé François" → "timothe-francois"
```

Algorithme : NFD decomposition → strip combining marks → lowercase → trim → replace non-alphanumeric par `-`.

---

## Landing page — sections

### Navbar (`components/landing/LandingNav.tsx`)
- Sticky, fond `surface/80` + `backdrop-blur`
- Logo "IpponId" (`font-montserrat font-black text-primary`)
- Desktop : liens ancres `#how-it-works` + `#profiles`, bouton "Créer mon profil" → `/creer-mon-profil`
- Mobile : menu hamburger avec overlay plein écran (même pattern que `MobileNav.tsx` existant)

### Hero (`components/landing/HeroSection.tsx`) — `'use client'`
- H1 : "Ton palmarès judo mérite sa propre page"  
- Sous-titre : "Crée ta page CV de judoka gratuitement. Partage ton parcours, tes grades et tes victoires."
- Champ de recherche : `<input placeholder="Rechercher un judoka…">` + bouton "Rechercher"
- Comportement à la soumission :
  1. Appelle `searchJudokas(query)`
  2. Si résultat → `router.push('/[slug]')` du premier résultat
  3. Si aucun résultat → affiche sous le champ : *"Aucun profil trouvé pour ce nom — sois le premier à créer le tien !"* avec bouton CTA "Créer mon profil" visible
- Pas d'état d'erreur sèche : l'échec de recherche est une opportunité de conversion
- Décorations de fond : blobs `primary/5` et `primary/10` avec `blur-3xl`

### Mockup navigateur (`components/landing/MockupSection.tsx`)
- Composant purement statique (Server Component)
- Fenêtre browser stylisée (barre `surface-container-high` avec 3 cercles colorés, barre d'adresse `ipponid.com/timothe-francois`)
- Corps : contenu statique simulant le profil de Timothé (photo, nom, grade, 4 stats-cards, 2 entrées de palmarès) — pas de vraie page iframée
- Lien "Voir le profil →" vers `/timothe-francois`

### Comment ça marche (`components/landing/HowItWorksSection.tsx`) — `id="how-it-works"`
- 3 cards en grille `md:grid-cols-3`
- Chaque card : icône SVG dans un cercle `bg-primary/10`, titre numéroté, texte
  1. "Crée ton profil" — Choisis ton URL personnalisée
  2. "Ajoute ton palmarès" — Grades, médailles, vidéos
  3. "Partage ton URL" — Bio Instagram, CV, inscriptions tournoi

### Preuve sociale (`components/landing/SocialProofSection.tsx`) — `id="profiles"`
- Titre "Ils ont déjà leur IpponId", sous-titre
- Avatars empilés + compteur "+450"
- Grille bento de 6 photos en niveaux de gris (`:hover` → couleur), toutes avec `alt` descriptif
- Note : les images sont des placeholders `bg-surface-container` tant qu'aucune vraie photo n'est disponible

### CTA final (`components/landing/CtaSection.tsx`)
- Fond `bg-primary`, texte `text-on-primary`
- Titre "Prêt à créer ta vitrine ?"
- Texte secondaire + bouton "Créer mon profil" → `/creer-mon-profil`
- Dégradé décoratif en overlay

### Footer landing (`components/landing/LandingFooter.tsx`)
- Fond `bg-surface-container-highest`, bordure `border-outline-variant`
- Logo, liens légaux, copyright
- Différent du `Footer.tsx` existant (qui prend des props `identity` + `social`)

---

## Route dynamique — `app/[slug]/page.tsx`

```ts
export default async function JudokaPage({ params }) {
  const judoka = await getJudokaBySlug(params.slug)
  if (!judoka) notFound()
  // Réutilise exactement : Header, Footer, MobileNav, blockRegistry
}
```

- `generateMetadata` construit title/description à partir des données du judoka
- `notFound()` de Next.js si aucun judoka ne correspond
- Les composants blocs (HeroBlock, BioBlock, etc.) ne sont pas modifiés

---

## Placeholder — `app/creer-mon-profil/page.tsx`

Page minimale :
- Titre "Bientôt disponible"
- Texte "La création de profil arrive prochainement. Revenez nous voir !"
- Lien retour vers `/`

---

## SEO

### Landing (`app/page.tsx`)
```ts
title: "IpponId — Crée ton CV judoka en ligne | Partage ton palmarès"
description: "Crée gratuitement ta page de judoka en quelques secondes. Partage tes grades, compétitions et victoires avec ton URL personnalisée."
```

### Route dynamique (`app/[slug]/page.tsx`)
Même logique que l'actuel `app/page.tsx` : construit depuis les données du judoka.

---

## Tailwind — ajouts minimaux à `tailwind.config.ts`

Couleur rouge CTA présente dans les maquettes, absente du config actuel :
```ts
secondary: '#b6171e',
'on-secondary': '#ffffff',
'secondary-container': '#da3433',
```

Les tokens existants (`primary`, `tertiary-container`, `medal-*`, `font-montserrat`, `font-inter`, etc.) sont conservés sans modification.

---

## Ce qui ne change pas

- `types/judoka.ts` — aucune modification
- `lib/blockRegistry.tsx` — aucune modification
- `components/blocks/*` — aucune modification
- `components/layout/Header.tsx`, `Footer.tsx`, `MobileNav.tsx` — aucune modification
- `app/layout.tsx` — aucune modification

---

## Contraintes

- Aucune authentification, aucun formulaire fonctionnel à ce stade
- Le service reste in-memory (lit `judokas.json` au démarrage)
- Next.js 14 App Router, TypeScript strict
- Pas de test suite configurée
