# Design — Génération de QR Code par profil judoka

**Date :** 2026-06-24  
**Projet :** IpponId (cv_judo)  
**Branche cible :** bugfix-lot1 → main

---

## Contexte

Permettre à chaque judoka de disposer d'un QR code personnel pointant vers son profil IpponId (`https://ipponid.com/[slug]`). Utile dans le monde physique : sac de judogi, cartes de visite, panneaux de club.

---

## Approche retenue

**Génération côté serveur via une route API Next.js.** La librairie `qrcode` génère un PNG via `qrcode.toBuffer()`. L'affichage côté client se fait via une simple balise `<img src="/api/qrcode/[slug]">`. Le navigateur et le CDN gèrent le cache HTTP.

Alternatives écartées :
- **Client-side (`qrcode.react`)** : bundle client lourd, pas d'URL stable, téléchargement 512px complexe.
- **Build-time (fichiers statiques)** : ne fonctionne pas pour les profils créés dynamiquement par les utilisateurs.

---

## Architecture

```
app/api/qrcode/[slug]/route.ts   ← génère le PNG, gère les 404
components/QRCodeDisplay.tsx     ← Client Component réutilisable (img + téléchargement)
components/blocks/HeroBlock.tsx  ← ajout du toggle QR (public uniquement)
app/dashboard/[profileId]/page.tsx ← section "Mon QR Code" (public + private)
__tests__/unit/qrcode.test.ts   ← tests unitaires de la route API
```

---

## Section 1 — Route API `/api/qrcode/[slug]/route.ts`

### Comportement

| Condition | Réponse |
|---|---|
| Slug inexistant | `404 Not Found` |
| Profil `draft` | `404 Not Found` |
| Profil `private` (user authentifié) | `200 image/png` |
| Profil `public` | `200 image/png` |

### Logique

```
GET /api/qrcode/[slug]
  → getJudokaBySlug(slug)   // RLS Supabase via cookie session
  → null || visibility === 'draft'  → 404
  → qrcode.toBuffer(url, options)   → Response(buffer, { Content-Type: image/png })
```

`getJudokaBySlug` est importable directement dans un route handler (tous deux s'exécutent côté serveur). RLS filtre automatiquement selon la session : les profils privés ne sont retournés qu'aux utilisateurs connectés.

### URL encodée

```
https://ipponid.com/${slug}   (via process.env.NEXT_PUBLIC_SITE_URL)
```

### Options qrcode

```ts
{
  width: 512,
  margin: 2,
  color: { dark: '#1B3A6B', light: '#FFFFFF' },
  errorCorrectionLevel: 'M',
}
```

### Headers de réponse

```
Content-Type: image/png
Cache-Control: public, max-age=31536000, immutable
```

Le slug d'un profil est immuable après création → cache permanent justifié.

---

## Section 2 — Composant `components/QRCodeDisplay.tsx`

### Props

```ts
interface QRCodeDisplayProps {
  slug: string
  size?: number        // taille d'affichage web en px, défaut : 200
  showLabel?: boolean  // affiche "MON QR CODE IPPONID" au-dessus, défaut : true
}
```

### Rendu

```
[MON QR CODE IPPONID]           ← si showLabel=true (Montserrat bold uppercase text-primary)

┌──────────────────────────┐
│                          │
│     <img src="/api/      │    ← 200×200px par défaut (ou size prop)
│      qrcode/[slug]">     │       alt="QR code du profil IpponId de [slug]"
│                          │
└──────────────────────────┘

ipponid.com/[slug]              ← text-xs text-on-surface-variant

[ Télécharger en PNG ]          ← bouton outline, déclenche le download
```

Encadré : `bg-white rounded-xl border border-outline-variant shadow-sm p-4 inline-flex flex-col items-center gap-3`

### Téléchargement

- `fetch('/api/qrcode/[slug]')` → blob → `URL.createObjectURL` → clic programmatique
- Nom du fichier : `ipponid-[slug].png`
- Le fichier téléchargé est le PNG 512×512 natif de l'API (pas redimensionné)
- État `isDownloading` : bouton désactivé pendant le fetch, texte « Téléchargement… »
- Pattern identique à `ShareButtons.handleDownload` existant

---

## Section 3 — Intégration HeroBlock (page profil publique)

### Condition

`visibility === 'public'` seulement. Conditionnel dans `HeroBlock`, pas dans `QRCodeDisplay`.

### Nouvelle prop HeroBlock

```ts
visibility: 'draft' | 'private' | 'public'
```

Passée depuis `blockRegistry.tsx` qui a accès à `judoka.visibility`.

### Positionnement

Juste après le `motion.div` du bouton PARTAGER existant.

### Pattern toggle

`useState<boolean>` local (`showQR`, défaut `false`). HeroBlock est déjà un Client Component.

```
[ Partager ]                    ← bouton accent existant

[ ▾ Voir le QR Code ]           ← nouveau bouton toggle
                                   style : bg-white/10 hover:bg-white/20 text-white
                                           border border-white/20 px-3 py-2 rounded-full
                                           text-xs font-bold uppercase tracking-wider

  ┌────────────────────┐
  │  <QRCodeDisplay    │        ← visible si showQR === true
  │    slug={slug}     │           size={160}, showLabel={false}
  │    size={160}      │
  │    showLabel={false}│
  └────────────────────┘
```

---

## Section 4 — Intégration dashboard (`app/dashboard/[profileId]/page.tsx`)

### Condition

`profile.visibility !== 'draft'` (public ou private). Un QR code vers un profil brouillon inaccessible n'a pas de sens.

### Positionnement

Après le lien "Voir la page publique" existant (en bas de page).

### Rendu

```tsx
{profile.visibility !== 'draft' && (
  <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 mt-6">
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1 h-8 bg-tertiary-container rounded-full" />
      <p className="font-montserrat font-bold text-primary text-sm uppercase tracking-wide">
        Mon QR Code
      </p>
    </div>
    <QRCodeDisplay slug={profile.slug} size={220} showLabel={false} />
    <p className="text-sm text-on-surface-variant mt-4 max-w-sm">
      Imprime ce QR code et colle-le sur ton sac, ton kimono, ou donne-le à ton club
      pour t'identifier facilement.
    </p>
  </div>
)}
```

`QRCodeDisplay` intègre déjà le bouton "Télécharger en PNG".

---

## Section 5 — Tests `__tests__/unit/qrcode.test.ts`

### Stratégie

- `vi.mock('@/lib/judokaService')` — contrôle la valeur retournée par `getJudokaBySlug`
- `vi.mock('qrcode')` — mock de `toBuffer` retournant un `Buffer` vide (on teste le comportement HTTP, pas la génération du QR)
- Import direct du handler : `import { GET } from '@/app/api/qrcode/[slug]/route'`

### Cas de test

```ts
describe('GET /api/qrcode/[slug]', () => {
  it('retourne un PNG 200 pour un slug valide et public')
  it('retourne 404 pour un slug inexistant')
  it('retourne 404 pour un profil en brouillon (draft)')
  it('retourne un PNG 200 pour un profil privé (private)')
})
```

### Hors scope tests automatisés

Vérification que le QR code est scannable avec un smartphone (test manuel avec l'appareil photo natif iOS/Android après déploiement local).

---

## Installation

```bash
npm install qrcode
npm install --save-dev @types/qrcode
```

---

## Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `app/api/qrcode/[slug]/route.ts` | Créer |
| `components/QRCodeDisplay.tsx` | Créer |
| `components/blocks/HeroBlock.tsx` | Modifier (prop visibility + toggle QR) |
| `lib/blockRegistry.tsx` | Modifier (passer visibility à HeroBlock) |
| `app/dashboard/[profileId]/page.tsx` | Modifier (section QR) |
| `__tests__/unit/qrcode.test.ts` | Créer |
