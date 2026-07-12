# Design — Photos de compétition & page publique dédiée

**Date :** 2026-07-12  
**Branche :** `feat/palmares-photos`  
**Approche retenue :** Option A — implémentation complète

---

## Contexte

Chaque entrée du palmarès peut désormais porter plusieurs photos (podium, pesée, combats…). Ces photos sont **indépendantes de la galerie générale** du profil. Chaque compétition dispose d'une page publique dédiée accessible via une URL propre construite depuis le nom + l'année de la compétition.

---

## Section 1 — Schéma base de données

### Migration `0014_competition_photos.sql`

#### 1a. Colonne `competition_slug` sur `palmares`

```sql
ALTER TABLE public.palmares
  ADD COLUMN competition_slug text;

-- Contrainte unique partielle : deux entrées du même profil
-- ne peuvent pas partager le même slug (les NULL sont exclus)
ALTER TABLE public.palmares
  ADD CONSTRAINT palmares_profile_competition_slug_unique
  UNIQUE (profile_id, competition_slug);
-- (La contrainte UNIQUE crée l'index implicitement)
```

- `NULLABLE` — les entrées existantes n'ont pas encore de slug
- La contrainte `UNIQUE (profile_id, competition_slug)` standard suffit : en PostgreSQL, plusieurs NULL sont autorisés dans une contrainte UNIQUE (NULL ≠ NULL en SQL), donc les entrées sans slug ne se bloquent pas mutuellement
- Régénéré automatiquement à chaque create/update d'une entrée palmarès

#### 1b. Table `competition_photos`

```sql
CREATE TABLE public.competition_photos (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  palmares_id uuid        NOT NULL REFERENCES public.palmares(id) ON DELETE CASCADE,
  profile_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_url   text        NOT NULL,
  caption     text,
  position    int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX competition_photos_palmares_id_idx
  ON public.competition_photos (palmares_id);
```

`profile_id` est redondant par rapport à `palmares.profile_id` mais indispensable pour des politiques RLS efficaces (évite une double jointure).

#### 1c. RLS sur `competition_photos`

Même pattern que `gallery_photos` (migration 0012) :

```sql
ALTER TABLE public.competition_photos ENABLE ROW LEVEL SECURITY;

-- Anon : profils public ET private (même logique que les autres tables)
CREATE POLICY "anon_read_accessible_competition_photos"
  ON public.competition_photos FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = profile_id AND visibility IN ('public', 'private')
    )
  );

-- Auth : public/private/draft si owner-manager
CREATE POLICY "auth_read_accessible_competition_photos"
  ON public.competition_photos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = profile_id
        AND (
          visibility IN ('public', 'private')
          OR EXISTS (
            SELECT 1 FROM public.profile_access
            WHERE profile_id = profiles.id AND account_id = auth.uid()
              AND role IN ('owner', 'manager')
          )
        )
    )
  );

-- Auth write : owner ou manager seulement
CREATE POLICY "access_write_competition_photos"
  ON public.competition_photos FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profile_access
      WHERE profile_id = competition_photos.profile_id
        AND account_id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profile_access
      WHERE profile_id = competition_photos.profile_id
        AND account_id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  );
```

---

## Section 2 — Couche service

### `lib/slugify.ts` — ajout de `generateCompetitionSlug`

```ts
export function generateCompetitionSlug(competition: string, date: string): string {
  const year = date.slice(0, 4)
  return normalizeText(`${competition} ${year}`)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
```

Exemples :
- `"Open de Marseille" + "2025-03-15"` → `"open-de-marseille-2025"`
- `"Championnat de France par équipe" + "2026-05-02"` → `"championnat-de-france-par-equipe-2026"`

La déduplication des doublons se fait côté applicatif **avant** l'insert :
1. Calculer le slug candidat
2. Vérifier en DB si `(profile_id, slug)` existe déjà
3. Si oui, essayer `slug-2`, `slug-3`, etc.
4. La contrainte unique partielle en SQL est un filet de sécurité supplémentaire

### `lib/competitionService.ts` — nouveau fichier

```ts
export interface CompetitionPhoto {
  id: string
  photo_url: string
  caption: string | null
  position: number
}

export interface CompetitionPage {
  palmares: {
    id: string
    competition: string
    date: string
    result: string
    category: string | null
    level: string | null
    medal: string | null
    city: string | null
    competition_slug: string
  }
  photos: CompetitionPhoto[]
  profile: {
    slug: string
    firstName: string
    lastName: string
    profilePhotoUrl: string | null
  }
}

// Utilisé par la page publique
export async function getCompetitionBySlug(
  profileSlug: string,
  competitionSlug: string
): Promise<CompetitionPage | null>

// Utilisé par le dashboard
export async function getCompetitionPhotos(
  palmaresId: string
): Promise<CompetitionPhoto[]>
```

`getCompetitionBySlug` :
- Joint `profiles` → `palmares` → `competition_photos`
- Retourne `null` si profil `draft` (les RLS laissent passer public+private pour anon, mais on vérifie explicitement pour retourner `null` proprement)
- Les photos sont triées par `position ASC`

---

## Section 3 — Dashboard : accordéon photos par compétition

### Fichiers modifiés

- `app/dashboard/[profileId]/palmares/page.tsx` — ajoute `owner_id` et `competition_slug` au SELECT
- `app/dashboard/[profileId]/palmares/actions.ts` — `addPalmares` et `updatePalmares` calculent et persistent le `competition_slug` ; nouvelles actions `addCompetitionPhoto`, `deleteCompetitionPhoto`, `updateCompetitionPhotoCaption`, `reorderCompetitionPhotos`
- `components/dashboard/PalmaresManager.tsx` — reçoit `ownerId`, affiche le bouton photo et l'accordéon

### UX de l'accordéon

Chaque carte de résultat affiche :
```
┌──────────────────────────────────────────────────────────┐
│  🥇  1re place — Championnat de France · 12 jan. 2025   │
│  [Modifier]  [Supprimer]  [↗]  [📷 2 photo(s)]          │
├──────────────────────────────────────────────────────────┤  ← dépliable
│  ┌────┐ ┌────┐  [ + Ajouter une photo ]                  │
│  │ ↑↓ │ │ ↑↓ │                                           │
│  │ 🖼  │ │ 🖼  │                                           │
│  │ [✕]│ │ [✕]│                                           │
│  └────┘ └────┘                                           │
│  Caption: [______________________________]               │
└──────────────────────────────────────────────────────────┘
```

Comportements :
- Upload via `ImageUploader` adapté, path Storage : `{owner_id}/competitions/{palmares_id}/{timestamp}.{ext}`
- Suppression : Server Action → supprime la ligne DB + le fichier Storage (`supabase.storage.from('media').remove([path])`)
- Réordonnancement : boutons ↑↓, Server Action `reorderCompetitionPhotos(ids: string[])`
- Caption : `<input>` éditable inline, sauvegarde au `blur` ou `Enter` via Server Action `updateCompetitionPhotoCaption`
- Le bouton `📷` affiche le count dès que les photos sont chargées en local

### Génération du `competition_slug` dans les Server Actions

```ts
// Dans addPalmares / updatePalmares
const baseSlug = generateCompetitionSlug(competition, date)
const slug = await resolveUniqueSlug(supabase, profileId, baseSlug, entryId)
// resolveUniqueSlug : boucle slug → slug-2 → slug-3 jusqu'à trouver un slot libre
```

---

## Section 4 — Page publique `/[slug]/competition/[competitionSlug]`

### Fichier : `app/[slug]/competition/[competitionSlug]/page.tsx`

Pas de conflit avec `app/[slug]/page.tsx` — Next.js App Router résout les segments statiques (`competition`) avant les segments dynamiques.

Mode de rendu : **SSR** (pas de `generateStaticParams`) — les photos peuvent être ajoutées à tout moment.

### Contenu

```
← Retour au profil de [Prénom Nom]

╔══════════════════════════════════════╗
║  Open de Marseille 2025              ║  ← h1
║  15 mars 2025 · Marseille            ║
║  🥇 1re place  │  -66 kg             ║
║  [photo] Timothé François →          ║
╚══════════════════════════════════════╝

── Photos de la compétition ──────────
┌───┐ ┌───┐ ┌───┐ ┌───┐
│ 🖼 │ │ 🖼 │ │ 🖼 │ │ 🖼 │  ← Lightbox au clic
└───┘ └───┘ └───┘ └───┘
```

La section "Photos" est absente si `photos.length === 0`.

La `Lightbox` existante reçoit les photos mappées vers `GalleryImage[]` : `photos.map(p => ({ src: p.photo_url, caption: p.caption ?? '' }))`.

### Visibilité et robots

| Visibility du profil | Accès page | SEO |
|---|---|---|
| `public` | ✓ | indexé |
| `private` | ✓ | `robots: { index: false }` |
| `draft` | `notFound()` | — |

### `generateMetadata`

```ts
title: `${firstName} ${lastName} — ${competition} ${year} · IpponId`
description: `Résultat et photos de ${firstName} ${lastName} à ${competition} ${year} — ${result}`
og:image: `/api/og/result/${profileSlug}/${palmaresId}`  // route déjà existante
```

Schema.org `SportsEvent` si `date` présente :
```json
{
  "@type": "SportsEvent",
  "name": "Open de Marseille 2025",
  "startDate": "2025-03-15",
  "location": { "@type": "Place", "name": "Marseille" }
}
```

---

## Section 5 — Liens depuis le profil public

### `judokaService.ts`

La query palmares est étendue pour remonter le count de photos :
```ts
palmares (*, competition_photos(count))
```

`PalmaresEntry` reçoit un champ optionnel `photosCount?: number` et `competitionSlug?: string`.

### `PalmaresBlock`

Chaque `<article>` est wrappé dans un `<Link href={...}>` si `entry.competitionSlug && (entry.photosCount ?? 0) > 0`. Sinon, balise `<article>` simple (comportement inchangé).

Un petit badge `📷 N` est ajouté à côté du medal badge quand `photosCount > 0`.

### `HeroBlock`

Les Highlights `getBestResults(palmares)` sont wrappés dans `<Link>` si `entry.competitionSlug && (entry.photosCount ?? 0) > 0`.

---

## Section 6 — Sitemap

Deux requêtes dans `app/sitemap.ts` :

1. Récupérer les `palmares` des profils publics avec `competition_slug IS NOT NULL`
2. Filtrer côté JS pour ne garder que ceux qui ont au moins une photo (en joignant `competition_photos` avec la relation embarquée Supabase)

```ts
// Requête 1 : palmares des profils publics avec slug
const { data: entries } = await supabase
  .from('palmares')
  .select('id, competition_slug, competition_photos(created_at), profiles!inner(slug)')
  .eq('profiles.visibility', 'public')
  .not('competition_slug', 'is', null)

// Filtrage JS : uniquement les entrées ayant au moins une photo
const withPhotos = (entries ?? []).filter(e => e.competition_photos.length > 0)

// Génère: { url: `${siteUrl}/${slug}/competition/${competition_slug}`, lastModified: maxCreatedAt }
```

---

## Section 7 — Tests

### `__tests__/unit/competitionSlug.test.ts`

| Input | Expected |
|---|---|
| `"Open de Marseille"` + `"2025-03-15"` | `"open-de-marseille-2025"` |
| `"Championnat de France par équipe"` + `"2026-05-02"` | `"championnat-de-france-par-equipe-2026"` |
| Doublon `open-de-marseille-2025` déjà existant | `"open-de-marseille-2025-2"` |

### `__tests__/security/competitionPhotos.test.ts`

| Scénario | Attendu |
|---|---|
| Anon lit photos profil `public` | ✓ |
| Anon lit photos profil `private` | ✓ |
| Anon lit photos profil `draft` | ✗ (RLS bloque) |
| Manager insère une photo | ✓ |
| Anon tente INSERT | ✗ |
| Suppression palmares → cascade photos | ✓ |

---

## Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `supabase/migrations/0014_competition_photos.sql` | créé |
| `lib/slugify.ts` | modifié — ajout `generateCompetitionSlug` |
| `lib/competitionService.ts` | créé |
| `lib/judokaService.ts` | modifié — palmares query + count photos + `competitionSlug` |
| `types/judoka.ts` | modifié — `PalmaresEntry` + `photosCount`, `competitionSlug` |
| `app/dashboard/[profileId]/palmares/page.tsx` | modifié — SELECT `owner_id`, `competition_slug` |
| `app/dashboard/[profileId]/palmares/actions.ts` | modifié — slug + 4 nouvelles actions photos |
| `components/dashboard/PalmaresManager.tsx` | modifié — accordéon photos |
| `app/[slug]/competition/[competitionSlug]/page.tsx` | créé |
| `components/blocks/PalmaresBlock.tsx` | modifié — liens conditionnels |
| `components/blocks/HeroBlock.tsx` | modifié — highlights cliquables |
| `app/sitemap.ts` | modifié — pages compétition |
| `__tests__/unit/competitionSlug.test.ts` | créé |
| `__tests__/security/competitionPhotos.test.ts` | créé |

**Total : 14 fichiers** (5 créés, 9 modifiés)
