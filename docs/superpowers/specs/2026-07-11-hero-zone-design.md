---
name: hero-zone-landing
description: Hero Zone cinématique pour la landing page ipponid.com — fond bleu marine, slogan, CTA, animations Framer Motion, route OG dynamique
metadata:
  type: project
---

# Hero Zone — Landing Page IpponId

## Contexte

La landing page (`app/page.tsx`) manque d'un premier écran impactant. Actuellement, `HeroSection` commence directement avec le titre "Le CV en ligne des judokas" et les 3 cartes de choix. Le nouveau `HeroZone` s'insère **avant** `HeroSection` pour créer une première impression visuelle forte — c'est aussi l'image partagée sur les réseaux sociaux.

---

## Décisions clés

| Décision | Choix retenu | Raison |
|---|---|---|
| Couleurs hero | Valeurs arbitraires Tailwind `bg-[#1B3A6B]` | One-off, pas de pollution des tokens globaux |
| OG image | Route dynamique `/api/og/landing` | Cohérent avec les routes profile/result existantes |
| h1 de page | Slogan dans HeroZone | Élément le plus visible ; le h1 de HeroSection descend en h2 |
| Décoratifs | Barre or + deux cercles | Équilibre entre profondeur et légèreté |

---

## Fichiers touchés

| Fichier | Action |
|---|---|
| `components/landing/HeroZone.tsx` | Créer |
| `components/landing/HeroSection.tsx` | Modifier — `<h1>` → `<h2>` |
| `app/page.tsx` | Modifier — insérer `<HeroZone />` + metadata OG |
| `app/api/og/landing/route.tsx` | Créer |

---

## Composant `HeroZone.tsx`

### Structure visuelle

```
┌────────────────────────────────────────────────────────────────────────┐
│  bg-[#1B3A6B]   min-h-[60vh] mobile  /  min-h-[75vh] desktop          │
│                                                                        │
│  cercle #1E4A8A 15% opacity top-left (500px)                           │
│  cercle #1E4A8A 15% opacity bottom-right (400px)                       │
│                                                                        │
│        [contenu centré vertical + horizontal]                          │
│        ┌───────────────────────────────┐                               │
│        │  IpponId  (48px blanc/or)     │  ← wordmark                   │
│        │  ─────────────── (barre or)   │  ← 80px × 2px centré         │
│        │                               │                               │
│        │  Ton palmarès mérite          │  ← h1, clamp(2.5rem, 6vw,    │
│        │  sa propre page.              │     4.5rem), blanc, bold      │
│        │                               │                               │
│        │  Crée gratuitement ta page    │  ← sous-titre 18-20px         │
│        │  judoka…                      │     blanc 70% opacity         │
│        │                               │                               │
│        │  [Créer mon profil gratis →]  │  ← CTA bg-[#D4A017]          │
│        └───────────────────────────────┘     text-[#1B3A6B]            │
└────────────────────────────────────────────────────────────────────────┘
```

### Contenu texte exact

- **Wordmark :** `Ippon` en blanc + `Id` en `#D4A017` — Montserrat Black ~48px
- **Barre décorative :** `w-20 h-0.5 bg-[#D4A017] mx-auto my-6`
- **H1 :** `Ton palmarès mérite sa propre page.`
- **Sous-titre :** `Crée gratuitement ta page judoka avec ton palmarès, tes vidéos et ta galerie photo.`
- **CTA :** `Créer mon profil gratuitement →` → `href="/creer-mon-profil"`

### Typographie

```
h1 : font-montserrat font-black text-white
     style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', lineHeight: 1.1 }}

sous-titre : font-inter text-white/70 text-lg md:text-xl

wordmark : font-montserrat font-black text-[3rem]
```

### Animations Framer Motion

`'use client'` — composant client.

```ts
const variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}
```

| Élément | Délai | Propriétés animées |
|---|---|---|
| Wordmark | 0ms | opacity seulement (pas de y) |
| Barre or | 75ms | opacity + scaleX (0→1, `originX: 'center'`) |
| H1 | 150ms | opacity + y |
| Sous-titre | 300ms | opacity + y |
| CTA | 450ms | opacity + y |

Durée de chaque transition : 400ms, `easing: 'easeOut'`.

**`prefers-reduced-motion` :** utiliser `useReducedMotion()` de Framer Motion. Si `true`, passer `duration: 0` et `y: 0` sur toutes les variantes.

### Cercles décoratifs

```tsx
{/* top-left */}
<div className="absolute -top-40 -left-40 w-[500px] h-[500px] 
                rounded-full bg-[#1E4A8A] opacity-15 pointer-events-none" />
{/* bottom-right */}
<div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] 
                rounded-full bg-[#1E4A8A] opacity-15 pointer-events-none" />
```

Wrapper : `relative overflow-hidden`.

### CTA

```tsx
<Link
  href="/creer-mon-profil"
  className="inline-block bg-[#D4A017] text-[#1B3A6B] font-bold font-montserrat
             px-8 py-4 rounded-xl hover:shadow-lg hover:scale-[1.02]
             transition-all duration-150 w-full sm:w-auto text-center"
>
  Créer mon profil gratuitement →
</Link>
```

### Responsive

| Breakpoint | min-height | Slogan | Sous-titre | CTA |
|---|---|---|---|---|
| Mobile 375px | 60vh | 2 lignes max | 2 lignes max | `w-full` |
| Tablette 768px | 70vh | 1-2 lignes | 1-2 lignes | `w-auto` centré |
| Desktop 1280px | 75vh | 1 ligne | 1 ligne | `w-auto` centré |

---

## Modification `HeroSection.tsx`

Changer `<h1` en `<h2` (une seule occurrence, ligne 31 actuelle). Le texte et les classes restent identiques.

---

## Route OG `/api/og/landing/route.tsx`

### Pattern

Identique aux routes existantes (`app/api/og/profile/[slug]/route.tsx`) :
- `@vercel/og` + `ImageResponse`
- Polices lues depuis `public/fonts/Montserrat-Black.ttf` et `public/fonts/Inter-Bold.ttf`
- GET sans paramètres (contenu statique)

### Layout 1200×630

```
┌─────────────────────────────────────────────────────────┐
│  bg #1B3A6B                                             │
│                                                         │
│  cercle #1E4A8A top-left (600px, opacity 0.15)          │
│  cercle #1E4A8A bottom-right (500px, opacity 0.15)      │
│                                                         │
│           Ippon  Id          (Montserrat 72px)          │
│           ─────────── (barre or 80px×4px)               │
│                                                         │
│     Ton palmarès mérite                                 │
│     sa propre page.          (Montserrat 56px)          │
│                                                         │
│     Crée gratuitement ta page judoka… (Inter 24px 60%)  │
│                                                         │
│                               ipponid.com (watermark)   │
└─────────────────────────────────────────────────────────┘
```

### Headers

```ts
{ 'Cache-Control': 'public, max-age=604800, immutable' }
```

---

## Mise à jour metadata `app/page.tsx`

```ts
openGraph: {
  images: [{ url: '/api/og/landing', width: 1200, height: 630 }],
  // … reste inchangé
},
twitter: {
  images: ['/api/og/landing'],
  // … reste inchangé
},
```

---

## URLs de test OG

Une fois déployé ou en dev local (`npm run dev`) :
- **Twitter Cards Validator :** https://cards-dev.twitter.com/validator — entrer `http://localhost:3000`
- **Facebook Sharing Debugger :** https://developers.facebook.com/tools/debug/ — entrer l'URL de prod
- **Aperçu direct de l'image :** `http://localhost:3000/api/og/landing`

---

## Ordre d'implémentation

1. Créer `HeroZone.tsx`
2. Modifier `HeroSection.tsx` (h1 → h2)
3. Insérer dans `app/page.tsx` + metadata
4. Créer `app/api/og/landing/route.tsx`
5. Vérifier rendu 375px / 768px / 1280px
6. Vérifier animation `prefers-reduced-motion`
