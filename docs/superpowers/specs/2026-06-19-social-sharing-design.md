# Design : Génération de cartes partageables et boutons de partage social

Date : 2026-06-19

## Objectif

Permettre à un judoka de partager son profil IpponId ou un résultat individuel du palmarès sur les réseaux sociaux (WhatsApp, Facebook, Instagram, TikTok) avec une image générée automatiquement, cohérente avec la charte graphique du site.

---

## Prérequis

### Dépendance

Installer `@vercel/og` (génération d'images sur Edge runtime via JSX).

### Polices

Télécharger et placer dans `public/fonts/` :
- `Montserrat-Black.ttf` (utilisé pour les titres dans les images OG)
- `Inter-Bold.ttf` (utilisé pour les labels)

Les routes OG les lisent via `fs.readFile` au démarrage du worker. Zéro dépendance réseau au moment de la génération.

### Variable d'environnement

`NEXT_PUBLIC_SITE_URL` — URL absolue de production (ex. `https://ipponid.com`). À ajouter dans `.env.local` et sur Vercel. Utilisée pour construire les URLs dans les boutons de partage et dans `generateMetadata`.

---

## Changement de type — `PalmaresEntry`

Ajouter un champ `id` dans [types/judoka.ts](../../../types/judoka.ts) :

```ts
export interface PalmaresEntry {
  id?: string        // UUID Supabase — présent sur les profils DB, absent sur les données statiques legacy
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

Propager `id` dans le mapper `mapProfile` de [lib/judokaService.ts](../../../lib/judokaService.ts) :

```ts
palmares: palmares.map((p) => ({
  id: p.id ?? undefined,   // ligne ajoutée
  date: p.date ?? '',
  // ...
})),
```

---

## Routes de génération d'images OG

### `app/api/og/profile/[slug]/route.tsx`

- Runtime : Edge
- Dimensions : 1200×630 (Open Graph standard)
- Cache : `Cache-Control: public, max-age=86400`
- Données : appel `getJudokaBySlug(slug)` — retourne 404 si profil inexistant ou non publié
- Tri du palmarès pour sélection : or → argent → bronze → sans médaille, puis plus récent en premier ; prend les 3 premiers

**Layout** (deux colonnes) :

```
┌────────────────────────────────────────────────────────────────┐
│ [IpponId]                                             fond #000666 │
│                                                                    │
│  [Photo profil]   PRÉNOM NOM                                       │
│  128×128 px       (Montserrat Black, 64px, blanc)                  │
│  circulaire       Club · Grade                                     │
│                   (Inter Bold 18px, #e9c349)                       │
│                                                                    │
│                   ┌─ Résultat 1 : 🥇 1re place — Champ. France ─┐ │
│                   ├─ Résultat 2 : 🥈 2e place — Open de Paris   ─┤ │
│                   └─ Résultat 3 : …                              ─┘ │
│                                                                    │
│ ████████████████████████████████ ipponid.com (barre or 8px bas)   │
└────────────────────────────────────────────────────────────────────┘
```

Si `profilePhoto` absent : initiales sur fond `#1a237e`.
Si palmarès vide : tagline "Athlète IpponId" à la place des résultats.

### `app/api/og/result/[slug]/[resultId]/route.tsx`

- Runtime : Edge
- Dimensions : 1200×630
- Cache : `Cache-Control: public, max-age=86400`
- Données : requête Supabase directe sur `palmares` filtré par `id = resultId` + `profiles` filtré par `slug` — retourne 404 si résultat ou profil introuvable/non publié

**Layout** (centré, impactant) :

```
┌────────────────────────────────────────────────────────────────────┐
│           [Photo de couverture en fond, floutée + overlay          │
│            rgba(0,6,102,0.85)]                                      │
│                                                                     │
│                        🥇  (SVG 120px)                              │
│                                                                     │
│                      1re PLACE                                      │
│                 (Montserrat Black 96px, blanc)                      │
│                                                                     │
│              Championnat de France Individuel                       │
│                 (Inter Bold 28px, blanc)                            │
│           12 mars 2024 · Paris · -66 kg Cadet                      │
│                 (Inter Bold 18px, #c6c5d4)                          │
│                                                                     │
│ [Photo 64px] Prénom Nom          IpponId · ipponid.com/slug        │
└─────────────────────────────────────────────────────────────────────┘
```

Si `coverPhoto` absent : fond `#000666` uni. Si `profilePhoto` absent : initiales.

---

## Mise à jour `generateMetadata` — `app/[slug]/page.tsx`

Remplacer l'`og:image` statique actuelle par la route dynamique :

```ts
openGraph: {
  images: [{
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/og/profile/${params.slug}`,
    width: 1200,
    height: 630,
    alt: `${judoka.identity.firstName} ${judoka.identity.lastName} — IpponId`,
  }],
},
twitter: {
  images: [`${process.env.NEXT_PUBLIC_SITE_URL}/api/og/profile/${params.slug}`],
},
```

---

## Composant `components/ShareButtons.tsx`

Client component (`'use client'`).

### Props

```ts
interface ShareButtonsProps {
  url: string       // URL absolue à partager
  imageUrl: string  // URL absolue de l'image OG
  title: string     // Texte pré-rempli pour WhatsApp / navigator.share
  variant?: 'light' | 'dark'  // 'dark' par défaut (fond sombre HeroBlock)
}
```

### Logique

- Au montage : détecte `typeof navigator !== 'undefined' && !!navigator.share` avec `useState` initialisé à `false` + `useEffect` pour éviter les erreurs SSR.
- **Si `navigator.share` disponible** : affiche uniquement le bouton "Partager" qui appelle `navigator.share({ title, url })`. Les boutons individuels sont masqués.
- **Si `navigator.share` absent** : affiche les 4 boutons ci-dessous.

### Boutons (mode sans `navigator.share`)

| Bouton | Comportement |
|---|---|
| WhatsApp | Ouvre `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}` dans un nouvel onglet |
| Facebook | Ouvre `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` dans un nouvel onglet |
| Instagram / TikTok | `fetch(imageUrl)` → `blob()` → `URL.createObjectURL` → `<a download="ipponid-[slug].png">` click programmatique. Affiche sous le bouton : "Télécharge l'image et partage-la depuis l'app Instagram ou TikTok" (texte xs, gris) |
| Copier le lien | `navigator.clipboard.writeText(url)` → `toast.success('Lien copié !')` via sonner |

Le fetch image pour Instagram/TikTok se fait au clic uniquement, pas au montage.

### Style

Boutons compacts (`px-3 py-2`, icône SVG 18px + label court). En `variant="dark"` : `bg-white/10 text-white border-white/20 hover:bg-white/20`. En `variant="light"` : `bg-surface-container text-on-surface border-outline-variant hover:bg-surface-container-high`.

---

## Intégration dans l'UI

### `components/blocks/HeroBlock.tsx`

Juste après la div des liens sociaux existants, ajouter une section "Partager ce profil" avec `<ShareButtons>` :

```tsx
<div className="mt-4">
  <p className="font-inter text-xs font-bold uppercase tracking-widest text-white/50 mb-2">
    Partager ce profil
  </p>
  <ShareButtons
    url={`${process.env.NEXT_PUBLIC_SITE_URL}/${identity.slug}`}
    imageUrl={`${process.env.NEXT_PUBLIC_SITE_URL}/api/og/profile/${identity.slug}`}
    title={`Découvrez le profil judoka de ${identity.firstName} ${identity.lastName} sur IpponId`}
    variant="dark"
  />
</div>
```

`HeroBlock` reçoit `slug: string` comme prop supplémentaire (pas sur `Identity` — c'est un champ de `JudokaData`). Le registry est mis à jour : `(data) => <HeroBlock identity={data.identity} social={data.social} slug={data.slug} />`.

### `components/blocks/PalmaresBlock.tsx`

Chaque carte résultat reçoit un `ShareButton` isolé (Client Component) dans la zone `flex-col items-center` en haut à droite. Ce composant isolé gère lui-même l'état ouvert/fermé de la popover inline — `PalmaresBlock` reste Server Component.

Composant isolé : `components/blocks/PalmaresShareButton.tsx` (`'use client'`). Reçoit `url` et `imageUrl` en props, affiche une icône partage (upload arrow SVG) ; au clic, toggle une petite section inline sous l'icône avec `<ShareButtons>`.

URL du résultat : `${siteUrl}/[slug]#result-[id]`
URL image OG : `${siteUrl}/api/og/result/[slug]/[id]`

`PalmaresBlock` reçoit `slug: string` comme prop supplémentaire via le registry : `(data) => <PalmaresBlock palmares={data.palmares} birthDate={data.identity.birthDate} slug={data.slug} />`. `NEXT_PUBLIC_SITE_URL` est lu directement depuis `process.env` (Server Component). Chaque `<article>` du palmarès reçoit `id={`result-${entry.id}`}` pour que le lien ancré fonctionne.

### `app/dashboard/palmares/PalmaresManager.tsx`

**Server action `addPalmares`** : modifier le retour de `{ ok: boolean }` à `{ ok: true, id: string } | { ok: false }` pour que le client récupère l'`id` du résultat nouvellement créé.

**Bouton persistant** sur chaque résultat existant : icône partage à côté des boutons Modifier / Supprimer. Au clic, toggle une section inline `<ShareButtons variant="light">`. Si le profil n'est pas publié (prop `isPublished: boolean` passée à `PalmaresManager`), le bouton est désactivé avec `title="Publie ton profil pour partager"`.

**Bannière post-ajout** : état local `justAddedId: string | null`. Après `result.ok`, stocker `justAddedId = result.id`. Le résultat concerné affiche une bordure `border-tertiary-container` + section "Partage ce résultat !" avec `<ShareButtons variant="light">` + bouton ✕ pour fermer (`justAddedId = null`). La bannière se ferme aussi si l'utilisateur clique sur Modifier ou Supprimer d'un autre résultat.

`PalmaresManager` reçoit une nouvelle prop `isPublished: boolean` transmise depuis `app/dashboard/palmares/page.tsx`.

---

## Fichiers modifiés / créés

| Fichier | Action |
|---|---|
| `package.json` | + `@vercel/og` |
| `types/judoka.ts` | + `id?: string` sur `PalmaresEntry` |
| `lib/judokaService.ts` | propage `id` dans le mapper |
| `lib/blockRegistry.tsx` | passe `slug` à `HeroBlock` et `PalmaresBlock` |
| `public/fonts/Montserrat-Black.ttf` | nouveau |
| `public/fonts/Inter-Bold.ttf` | nouveau |
| `app/api/og/profile/[slug]/route.tsx` | nouveau |
| `app/api/og/result/[slug]/[resultId]/route.tsx` | nouveau |
| `app/[slug]/page.tsx` | og:image → route dynamique |
| `components/ShareButtons.tsx` | nouveau |
| `components/blocks/PalmaresShareButton.tsx` | nouveau (Client Component isolé) |
| `components/blocks/HeroBlock.tsx` | + section partage profil |
| `components/blocks/PalmaresBlock.tsx` | + `PalmaresShareButton` par entrée + props slug/siteUrl |
| `app/dashboard/palmares/actions.ts` | `addPalmares` retourne `{ ok: true, id: string }` |
| `app/dashboard/palmares/PalmaresManager.tsx` | + bouton persistant + bannière post-ajout + prop `isPublished` |
| `app/dashboard/palmares/page.tsx` | passe `isPublished` à `PalmaresManager` |

---

## Ce qu'il faut tester

1. **Image profil** : accéder directement à `/api/og/profile/[slug]` — vérifier le rendu (photo, nom, palmarès, pas d'erreur si photo absente)
2. **Image résultat** : accéder à `/api/og/result/[slug]/[resultId]` — vérifier le rendu impactant (médaille centrale, résultat lisible)
3. **404 OG** : slug inexistant ou profil non publié → réponse 404 (pas d'erreur 500)
4. **Open Graph WhatsApp** : copier-coller un lien de profil dans WhatsApp sur mobile → la carte preview doit apparaître avec la bonne image
5. **Open Graph Facebook** : même test sur Facebook Messenger ou post Facebook
6. **`navigator.share` mobile** : ouvrir la page profil sur un téléphone → vérifier que le bouton "Partager" natif apparaît à la place des boutons individuels
7. **Téléchargement image Instagram/TikTok** : cliquer le bouton sur desktop → un fichier `.png` doit se télécharger
8. **Copier le lien** : vérifier le toast de confirmation
9. **Bouton désactivé dashboard** : profil non publié → bouton partage désactivé dans `PalmaresManager`
10. **Bannière post-ajout** : ajouter un résultat dans le dashboard → la bannière de partage doit apparaître sur ce résultat, puis disparaître à la fermeture
