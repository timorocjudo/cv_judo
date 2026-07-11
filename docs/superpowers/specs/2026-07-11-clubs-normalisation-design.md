# Design : Normalisation du champ club

**Date :** 2026-07-11  
**Branche :** feat/init-club  
**Statut :** Approuvé

---

## Contexte

Le champ `profiles.club` est actuellement un texte libre. Deux profils du même club peuvent avoir des valeurs différentes ("ROC Judo", "roc judo", "Roc Judo Nice"), ce qui empêche toute recherche ou regroupement par club. L'objectif est de normaliser ce champ en une référence vers une table `clubs` tout en préservant les données existantes.

---

## Décisions clés

| Question | Décision |
|---|---|
| Stratégie migration données | Migration SQL pure (Approche 1) — atomique dans `0013_clubs.sql` |
| Type `identity.club` | `string` inchangé (alimenté par jointure, fallback `profiles.club`) |
| `identity.clubId` | `string \| null` ajouté pour futures features |
| Lien `/clubs/[slug]` dans HeroBlock | Reporté — `clubSlug` non exposé dans ce sprint |
| Tests composant ClubAutocomplete | Optionnels — nécessitent `@testing-library/react` non installé |

---

## Section 1 — Schéma et migration SQL

### Table `clubs`

```sql
CREATE TABLE public.clubs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  slug            text UNIQUE NOT NULL,
  city            text,
  department      text,
  department_name text,
  region          text,
  verified        boolean NOT NULL DEFAULT false,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX clubs_name_idx       ON public.clubs (lower(name));
CREATE INDEX clubs_slug_idx       ON public.clubs (slug);
CREATE INDEX clubs_department_idx ON public.clubs (department);
```

### RLS sur `clubs`

| Opération | Rôle | Condition |
|---|---|---|
| SELECT | anon, authenticated | toujours (liste publique pour autocomplétion) |
| INSERT | authenticated | toujours (un user connecté peut créer un club manquant) |
| UPDATE | service_role | — |
| DELETE | service_role | — |

### Colonne `club_id` sur `profiles`

```sql
ALTER TABLE public.profiles
  ADD COLUMN club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL;
```

La colonne `profiles.club` (text) est conservée sans modification — elle sert de fallback d'affichage pour les profils dont `club_id` serait null.

### Migration automatique des données

Une fonction PL/pgSQL inline `slugify_club(text)` reproduit la logique de `lib/slugify.ts` :
- Dénormalisation Unicode NFD
- Suppression des diacritiques
- Lowercase
- Remplacement de `[^a-z0-9]+` par `-`
- Trim des tirets en début/fin

La migration enchaîne :
1. **Déduplication** — un seul club par valeur distincte (insensible à la casse et aux espaces de début/fin) :
   ```sql
   INSERT INTO clubs (name, slug)
   SELECT DISTINCT ON (lower(trim(club))) trim(club), slugify_club(trim(club))
   FROM profiles WHERE club IS NOT NULL AND trim(club) <> ''
   ORDER BY lower(trim(club));
   ```
2. **Rattachement** — chaque profil pointe vers son club :
   ```sql
   UPDATE profiles p SET club_id = c.id
   FROM clubs c WHERE lower(trim(p.club)) = lower(trim(c.name));
   ```

---

## Section 2 — Service `lib/clubService.ts`

Marqué `'use server'` — suit le pattern de `judokaService.ts`.

### Type `Club`

Défini dans `lib/clubService.ts` (ou re-exporté depuis `types/judoka.ts` si besoin) :

```ts
export type Club = {
  id: string
  name: string
  slug: string
  city: string | null
  department: string | null
  verified: boolean
}
```

### Fonctions

**`searchClubs(query: string): Promise<Club[]>`**
- Retourne `[]` immédiatement si `query.length < 2`
- Filtre via `.ilike('name', '%query%')` côté Supabase (réduit le transfert réseau)
- `query` est normalisé via `normalizeText()` avant l'appel `.ilike()`
- Tri : `verified = true` en premier, puis alphabétique sur `name`
- Max 8 résultats

**`createClub(name: string, accountId: string): Promise<Club>`**
- Vérifie qu'aucun club avec `lower(trim(name))` identique n'existe → `throw new Error('CLUB_ALREADY_EXISTS')` si trouvé
- Génère `slug` via `normalizeText(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')`
- Boucle de déduplication de slug : si slug pris, essaie `slug-2`, `slug-3`...
- Insère avec `created_by = accountId`
- Retourne le club créé

**`getClubBySlug(slug: string): Promise<Club | null>`**
- Simple lookup `.eq('slug', slug).maybeSingle()`
- Pour les futures pages `/clubs/[slug]`

### Mise à jour `JudokaData` (`types/judoka.ts`)

```ts
identity: {
  // champs existants inchangés
  club: string           // nom du club (jointure clubs.name, fallback profiles.club)
  clubId: string | null  // nouveau — id pour futures features
}
```

### Mise à jour `judokaService.ts`

`getJudokaBySlug` et `searchJudokas` :
```ts
.select(`*, clubs(id, name), palmares(*), videos(*), gallery_photos(*)`)
```

`searchJudokasAutocomplete` :
```ts
.select('slug, first_name, last_name, club, club_id, clubs(name), grade, category, profile_photo_url')
```

Le mapper `mapProfile` et `JudokaAutocompleteResult` lisent :
- `club` : `row.clubs?.name ?? row.club ?? ''`
- `clubId` : `row.clubs?.id ?? null`

---

## Section 3 — Composant `ClubAutocomplete`

**Fichier :** `components/ClubAutocomplete.tsx` (Client Component)

### Props

```ts
interface ClubAutocompleteProps {
  value: string | null
  onChange: (clubId: string | null, clubName: string | null) => void
  placeholder?: string
}
```

### Comportement

- Debounce 300ms, seuil `MIN_QUERY_LEN = 2`
- Quand un club est sélectionné : affiche son nom + bouton `✕` pour désélectionner
- Résultats : `[NomDuClub] [Ville?] [✓ Vérifié?]`
- Badge "✓ Vérifié" en `text-tertiary-container` si `verified = true`
- Option "Créer" : visible en bas de liste si query ≥ 2 chars ET aucun résultat avec `name` exactement égal à `query` (insensible casse). Visuellement distincte (bordure dashed, couleur secondaire).
- Clic "Créer" → `createClub(query, userId)` → sélection automatique → toast sonner "Club créé et sélectionné"
- Navigation clavier (↑↓ Entrée Échap) — l'option "Créer" est le dernier index dans le cycle

### Intégration `ProfileForm`

Deux nouveaux états dans `ProfileForm` :
```ts
const [clubId, setClubId]     = useState<string | null>(profile.club_id ?? null)
const [clubName, setClubName] = useState<string | null>(profile.club_name ?? null)
```

Le `<input id="club" name="club" ...>` est remplacé par :
```tsx
<ClubAutocomplete
  value={clubId}
  onChange={(id, name) => { setClubId(id); setClubName(name) }}
/>
<input type="hidden" name="club_id" value={clubId ?? ''} />
```

`ClubAutocomplete` a besoin du `userId` pour `createClub`. Il le reçoit via une prop `userId: string` passée depuis `ProfileForm` (qui a déjà `profile.owner_id`).

### Mise à jour `saveProfile` (action)

```ts
club_id: (formData.get('club_id') as string) || null,
```
La ligne `club: ...` est retirée — on ne met plus à jour le champ texte libre.

### Mise à jour `ProfilPage`

Query enrichie :
```ts
.select('first_name, last_name, club, club_id, clubs(name), category, grade, bio, profile_photo_url, cover_photo_url, owner_id, birth_date')
```

`club_name` passé à `ProfileForm` : `profile.clubs?.name ?? profile.club ?? ''`

---

## Section 4 — Affichage public

**`HeroBlock`** : aucun changement visuel. Le badge club continue d'afficher `identity.club` (string). `identity.clubId` est disponible dans les données pour les futures features (lien `/clubs/[slug]`).

**`SearchAutocomplete`** : aucun changement dans le composant. `JudokaAutocompleteResult.club` retourne toujours `string | null`, désormais alimenté par la jointure.

---

## Section 5 — Tests

### `__tests__/unit/clubService.test.ts` (requis)

Mock du client Supabase (pattern identique à `profileAccessService.test.ts`) :

- `searchClubs("roc")` → trouve "ROC Judo" (insensible casse)
- `searchClubs("röc")` → trouve "ROC Judo" (insensible accents — normalizeText)
- `searchClubs` retourne clubs vérifiés en premier
- `searchClubs("")` → `[]` sans appel réseau
- `searchClubs("r")` → `[]` sans appel réseau (query < 2)
- `createClub` avec nom existant → `throw Error('CLUB_ALREADY_EXISTS')`
- `createClub` génère slug unique avec suffixe `-2` si collision

### `__tests__/unit/clubAutocomplete.test.ts` (optionnel)

Requiert `@testing-library/react` — non installé. À implémenter si on ajoute les tests de composants au projet :

- L'option "Créer" n'apparaît pas si un résultat a exactement le même nom que la query
- L'option "Créer" apparaît si aucun résultat exact

---

## Fichiers touchés

| Fichier | Action |
|---|---|
| `supabase/migrations/0013_clubs.sql` | Nouveau |
| `lib/clubService.ts` | Nouveau |
| `components/ClubAutocomplete.tsx` | Nouveau |
| `types/judoka.ts` | Modifier — ajouter `clubId` à `Identity` |
| `lib/judokaService.ts` | Modifier — jointure clubs, mapper mis à jour |
| `components/dashboard/ProfileForm.tsx` | Modifier — intégrer ClubAutocomplete |
| `app/dashboard/[profileId]/profil/page.tsx` | Modifier — query enrichie |
| `app/dashboard/[profileId]/profil/actions.ts` | Modifier — écrire club_id |
| `__tests__/unit/clubService.test.ts` | Nouveau |

**Fichiers non touchés :** `HeroBlock.tsx`, `SearchAutocomplete.tsx`, `Footer.tsx` — alimentés par la jointure transparente.
