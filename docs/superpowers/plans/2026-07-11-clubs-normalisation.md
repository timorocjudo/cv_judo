# Clubs Normalisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalise le champ `profiles.club` (texte libre) en une référence FK vers une table `clubs`, avec autocomplétion dans le dashboard et migration transparente des données existantes.

**Architecture:** Migration SQL atomique (`0013_clubs.sql`) qui crée la table, migre les données existantes et ajoute `club_id` sur `profiles`. Un service `lib/clubService.ts` expose `searchClubs` / `createClub` / `getClubBySlug`. Le composant `ClubAutocomplete` remplace le champ texte libre dans `ProfileForm`. Les services `judokaService.ts` joignent `clubs` pour alimenter `identity.club` (string, unchanged) et le nouveau `identity.clubId`.

**Tech Stack:** Next.js 14 App Router, Supabase (PostgreSQL + RLS), TypeScript, Tailwind CSS, Sonner (toasts), Vitest

## Global Constraints

- `profiles.club` (colonne texte) n'est **pas supprimée** dans ce sprint — elle reste comme fallback
- `identity.club: string` reste inchangé dans `JudokaData` — alimenté par `clubs.name ?? profiles.club`
- `identity.clubId: string | null` ajouté à `Identity` — pour futures features uniquement
- `ClubAutocomplete` ne reçoit pas `userId` — `createClub` lit l'userId depuis la session Supabase
- `searchClubs` filtre côté JS via `normalizeText()` (pas `.ilike()`) pour la recherche accent-insensible
- `HeroBlock` n'est pas modifié — le badge club continue d'afficher `identity.club` (string)
- `SearchAutocomplete` n'est pas modifié — `JudokaAutocompleteResult.club` reste `string | null`
- Commandes de test : `npx vitest run __tests__/unit/clubService.test.ts`
- Commande de type-check : `npx tsc --noEmit`

---

## File Map

| Fichier | Action |
|---|---|
| `supabase/migrations/0013_clubs.sql` | Créer |
| `lib/clubService.ts` | Créer |
| `__tests__/unit/clubService.test.ts` | Créer |
| `types/judoka.ts` | Modifier — ajouter `clubId` à `Identity` |
| `lib/judokaService.ts` | Modifier — jointure clubs, mapper, ProfileRow |
| `components/ClubAutocomplete.tsx` | Créer |
| `app/dashboard/[profileId]/profil/page.tsx` | Modifier — query enrichie |
| `components/dashboard/ProfileForm.tsx` | Modifier — intégrer ClubAutocomplete |
| `app/dashboard/[profileId]/profil/actions.ts` | Modifier — écrire club_id |

---

## Task 1 : Migration SQL `0013_clubs.sql`

**Files:**
- Create: `supabase/migrations/0013_clubs.sql`

**Interfaces:**
- Produces: table `public.clubs`, colonne `profiles.club_id uuid`, données migrées depuis `profiles.club`

- [ ] **Step 1 : Écrire la migration**

Créer `supabase/migrations/0013_clubs.sql` avec le contenu suivant :

```sql
-- 0013_clubs.sql
-- Normalise profiles.club (texte libre) → club_id (FK vers clubs)

-- ─── Helper: slugify_club ────────────────────────────────────────────────────
-- Reproduit la logique de lib/slugify.ts normalizeText + slug generation

CREATE OR REPLACE FUNCTION slugify_club(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result text;
BEGIN
  result := lower(trim(input));
  result := translate(result,
    'àâäáãåèêëéìîïíòôöóùûüúýÿçñ',
    'aaaaaaeeeeiiiioooouuuuyycn'
  );
  result := regexp_replace(result, '[^a-z0-9]+', '-', 'g');
  result := trim(both '-' from result);
  RETURN result;
END;
$$;

-- ─── Table clubs ─────────────────────────────────────────────────────────────

CREATE TABLE public.clubs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  slug            text        UNIQUE NOT NULL,
  city            text,
  department      text,
  department_name text,
  region          text,
  verified        boolean     NOT NULL DEFAULT false,
  created_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX clubs_name_idx       ON public.clubs (lower(name));
CREATE INDEX clubs_slug_idx       ON public.clubs (slug);
CREATE INDEX clubs_department_idx ON public.clubs (department);

CREATE TRIGGER clubs_updated_at
  BEFORE UPDATE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── RLS sur clubs ───────────────────────────────────────────────────────────

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_clubs"
  ON public.clubs FOR SELECT TO anon
  USING (true);

CREATE POLICY "authenticated_read_clubs"
  ON public.clubs FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authenticated_insert_clubs"
  ON public.clubs FOR INSERT TO authenticated
  WITH CHECK (true);

-- ─── Colonne club_id sur profiles ────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL;

-- ─── Migration des données existantes ────────────────────────────────────────
-- Phase 1 : un club par valeur unique (insensible casse + espaces)
INSERT INTO public.clubs (name, slug)
SELECT DISTINCT ON (lower(trim(club)))
  trim(club) AS name,
  slugify_club(trim(club)) AS slug
FROM public.profiles
WHERE club IS NOT NULL AND trim(club) <> ''
ORDER BY lower(trim(club)), trim(club);

-- Phase 2 : rattachement — chaque profil pointe vers son club
UPDATE public.profiles p
SET club_id = c.id
FROM public.clubs c
WHERE p.club IS NOT NULL
  AND lower(trim(p.club)) = lower(trim(c.name));
```

- [ ] **Step 2 : Appliquer la migration**

Via le dashboard Supabase → SQL Editor, ou :
```bash
supabase db push
```

- [ ] **Step 3 : Vérifier la migration**

Exécuter dans le SQL Editor Supabase :
```sql
-- Vérifie que les clubs ont été créés
SELECT id, name, slug, verified FROM public.clubs ORDER BY name;

-- Vérifie que les profils sont rattachés
SELECT p.first_name, p.last_name, p.club, p.club_id, c.name AS club_resolved
FROM public.profiles p
LEFT JOIN public.clubs c ON c.id = p.club_id;
```

Résultat attendu : chaque profil avec `club IS NOT NULL` a un `club_id` non-null, et `club_resolved` correspond à `club`.

- [ ] **Step 4 : Commit**

```bash
git add supabase/migrations/0013_clubs.sql
git commit -m "feat(db): add clubs table and migrate profiles.club to club_id"
```

---

## Task 2 : Mettre à jour `types/judoka.ts`

**Files:**
- Modify: `types/judoka.ts`

**Interfaces:**
- Produces: `Identity.clubId: string | null` — utilisé par Tasks 4 et 6

- [ ] **Step 1 : Ajouter `clubId` à `Identity`**

Dans `types/judoka.ts`, modifier l'interface `Identity` :

```ts
export interface Identity {
  firstName: string
  lastName: string
  club: string
  clubId: string | null     // ← ajouter cette ligne après club
  birthDate?: string
  weightCategory: string
  grade: string
  profilePhoto: string
  coverPhoto: string
  height?: number
  weight?: number
  nationality?: string
}
```

- [ ] **Step 2 : Vérifier que le type-check passe**

```bash
npx tsc --noEmit
```

Résultat attendu : erreurs liées à `clubId` manquant dans `mapProfile` (judokaService.ts) — c'est normal, sera corrigé en Task 4.

- [ ] **Step 3 : Commit**

```bash
git add types/judoka.ts
git commit -m "feat(types): add clubId to Identity interface"
```

---

## Task 3 : Créer `lib/clubService.ts` + tests

**Files:**
- Create: `lib/clubService.ts`
- Create: `__tests__/unit/clubService.test.ts`

**Interfaces:**
- Consumes: `normalizeText` depuis `@/lib/slugify`; `createClient` depuis `@/lib/supabase/server`
- Produces:
  - `type Club = { id: string; name: string; slug: string; city: string | null; department: string | null; verified: boolean }`
  - `searchClubs(query: string): Promise<Club[]>`
  - `createClub(name: string): Promise<Club>` — lit userId depuis session, throw `'CLUB_ALREADY_EXISTS'` si doublon
  - `getClubBySlug(slug: string): Promise<Club | null>`

- [ ] **Step 1 : Écrire les tests en premier**

Créer `__tests__/unit/clubService.test.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockAuth = { getUser: vi.fn() }
const mockSupabase = { from: mockFrom, auth: mockAuth }

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase,
}))

function makeChain(returnValue: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'insert', 'single', 'maybeSingle', 'order']
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain)
  })
  chain.then = vi.fn((resolve: (v: unknown) => void) =>
    Promise.resolve(returnValue).then(resolve)
  )
  ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue(returnValue)
  ;(chain.single as ReturnType<typeof vi.fn>).mockResolvedValue(returnValue)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

import { searchClubs, createClub } from '@/lib/clubService'

// ─── searchClubs ─────────────────────────────────────────────────────────────

describe('searchClubs', () => {
  it('retourne [] sans appel réseau si query < 2 chars', async () => {
    expect(await searchClubs('')).toEqual([])
    expect(await searchClubs('r')).toEqual([])
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('trouve "ROC Judo" avec "roc" (insensible casse)', async () => {
    const clubs = [
      { id: '1', name: 'ROC Judo', slug: 'roc-judo', city: 'Nice', department: '06', verified: true },
      { id: '2', name: 'Judo Club Paris', slug: 'judo-club-paris', city: 'Paris', department: '75', verified: false },
    ]
    mockFrom.mockReturnValue(makeChain({ data: clubs, error: null }))
    const result = await searchClubs('roc')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('ROC Judo')
  })

  it('trouve "ROC Judo" avec "röc" (insensible aux accents)', async () => {
    const clubs = [
      { id: '1', name: 'ROC Judo', slug: 'roc-judo', city: null, department: null, verified: true },
    ]
    mockFrom.mockReturnValue(makeChain({ data: clubs, error: null }))
    const result = await searchClubs('röc')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('ROC Judo')
  })

  it('retourne les clubs vérifiés en premier', async () => {
    const clubs = [
      { id: '1', name: 'Club Alpha', slug: 'club-alpha', city: null, department: null, verified: false },
      { id: '2', name: 'Club Beta', slug: 'club-beta', city: null, department: null, verified: true },
    ]
    mockFrom.mockReturnValue(makeChain({ data: clubs, error: null }))
    const result = await searchClubs('club')
    expect(result[0].verified).toBe(true)
    expect(result[0].name).toBe('Club Beta')
  })

  it('limite à 8 résultats', async () => {
    const clubs = Array.from({ length: 15 }, (_, i) => ({
      id: String(i),
      name: `Club ${i}`,
      slug: `club-${i}`,
      city: null,
      department: null,
      verified: false,
    }))
    mockFrom.mockReturnValue(makeChain({ data: clubs, error: null }))
    const result = await searchClubs('club')
    expect(result).toHaveLength(8)
  })
})

// ─── createClub ──────────────────────────────────────────────────────────────

describe('createClub', () => {
  it('throw CLUB_ALREADY_EXISTS si nom identique existe (insensible casse)', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const existingClubs = [
      { id: '1', name: 'ROC Judo', slug: 'roc-judo', city: null, department: null, verified: false },
    ]
    mockFrom.mockReturnValueOnce(makeChain({ data: existingClubs, error: null }))
    await expect(createClub('roc judo')).rejects.toThrow('CLUB_ALREADY_EXISTS')
  })

  it('génère un slug avec suffixe -2 si le slug de base est déjà pris', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const newClub = { id: 'new-id', name: 'ROC Judo', slug: 'roc-judo-2', city: null, department: null, verified: false }
    mockFrom
      .mockReturnValueOnce(makeChain({ data: [], error: null }))                               // pas de doublon
      .mockReturnValueOnce(makeChain({ data: { slug: 'roc-judo' }, error: null }))             // slug de base pris
      .mockReturnValueOnce(makeChain({ data: null, error: null }))                             // roc-judo-2 libre
      .mockReturnValueOnce(makeChain({ data: newClub, error: null }))                          // insert OK
    const result = await createClub('ROC Judo')
    expect(result.slug).toBe('roc-judo-2')
    expect(result.name).toBe('ROC Judo')
  })

  it('crée avec le slug de base quand il est disponible', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const newClub = { id: 'new-id', name: 'Judo Club Test', slug: 'judo-club-test', city: null, department: null, verified: false }
    mockFrom
      .mockReturnValueOnce(makeChain({ data: [], error: null }))             // pas de doublon
      .mockReturnValueOnce(makeChain({ data: null, error: null }))           // slug libre
      .mockReturnValueOnce(makeChain({ data: newClub, error: null }))        // insert OK
    const result = await createClub('Judo Club Test')
    expect(result.slug).toBe('judo-club-test')
  })
})
```

- [ ] **Step 2 : Lancer les tests — vérifier qu'ils échouent**

```bash
npx vitest run __tests__/unit/clubService.test.ts
```

Résultat attendu : `FAIL` — `Cannot find module '@/lib/clubService'`

- [ ] **Step 3 : Implémenter `lib/clubService.ts`**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { normalizeText } from '@/lib/slugify'

export type Club = {
  id: string
  name: string
  slug: string
  city: string | null
  department: string | null
  verified: boolean
}

export async function searchClubs(query: string): Promise<Club[]> {
  if (query.length < 2) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from('clubs')
    .select('id, name, slug, city, department, verified')

  if (error || !data) return []

  const normalized = normalizeText(query)

  return data
    .filter((club) => normalizeText(club.name).includes(normalized))
    .sort((a, b) => {
      if (a.verified && !b.verified) return -1
      if (!a.verified && b.verified) return 1
      return a.name.localeCompare(b.name, 'fr')
    })
    .slice(0, 8) as Club[]
}

export async function createClub(name: string): Promise<Club> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('UNAUTHENTICATED')

  const { data: allClubs } = await supabase
    .from('clubs')
    .select('id, name, slug, city, department, verified')

  const normalizedName = normalizeText(name.trim())
  const duplicate = (allClubs ?? []).find(
    (c) => normalizeText(c.name) === normalizedName
  )
  if (duplicate) throw new Error('CLUB_ALREADY_EXISTS')

  let slug = normalizeText(name.trim())
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const { data: slugCheck } = await supabase
    .from('clubs')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle()

  if (slugCheck) {
    let i = 2
    while (true) {
      const candidate = `${slug}-${i}`
      const { data: candidateCheck } = await supabase
        .from('clubs')
        .select('slug')
        .eq('slug', candidate)
        .maybeSingle()
      if (!candidateCheck) {
        slug = candidate
        break
      }
      i++
    }
  }

  const { data, error } = await supabase
    .from('clubs')
    .insert({ name: name.trim(), slug, created_by: user.id })
    .select('id, name, slug, city, department, verified')
    .single()

  if (error || !data) throw new Error('CREATE_FAILED')
  return data as Club
}

export async function getClubBySlug(slug: string): Promise<Club | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clubs')
    .select('id, name, slug, city, department, verified')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data) return null
  return data as Club
}
```

- [ ] **Step 4 : Lancer les tests — vérifier qu'ils passent**

```bash
npx vitest run __tests__/unit/clubService.test.ts
```

Résultat attendu : tous les tests `PASS`.

- [ ] **Step 5 : Type-check**

```bash
npx tsc --noEmit
```

Résultat attendu : aucune erreur dans `lib/clubService.ts` (des erreurs peuvent persister dans `lib/judokaService.ts` — sera corrigé en Task 4).

- [ ] **Step 6 : Commit**

```bash
git add lib/clubService.ts __tests__/unit/clubService.test.ts
git commit -m "feat(clubs): add clubService with search, create, getBySlug"
```

---

## Task 4 : Mettre à jour `lib/judokaService.ts`

**Files:**
- Modify: `lib/judokaService.ts`

**Interfaces:**
- Consumes: `Identity.clubId: string | null` depuis Task 2
- Produces: `mapProfile` alimente `identity.club` (jointure) et `identity.clubId`; `searchJudokasAutocomplete` retourne `club` depuis jointure

- [ ] **Step 1 : Mettre à jour `ProfileRow`**

Dans `lib/judokaService.ts`, ajouter `club_id` et `clubs` à l'interface `ProfileRow` :

```ts
type ProfileRow = {
  id: string
  owner_id: string
  published: boolean
  visibility: 'draft' | 'private' | 'public'
  slug: string
  first_name: string
  last_name: string
  club: string | null
  club_id: string | null                           // ← ajouter
  clubs: { id: string; name: string } | null       // ← ajouter (résultat jointure)
  category: string | null
  grade: string | null
  bio: string | null
  birth_date: string | null
  profile_photo_url: string | null
  cover_photo_url: string | null
  layout: unknown
  palmares: PalmaresRow[] | null
  videos: VideoRow[] | null
  gallery_photos: GalleryRow[] | null
}
```

- [ ] **Step 2 : Mettre à jour `mapProfile`**

Dans la fonction `mapProfile`, modifier le bloc `identity` :

```ts
identity: {
  firstName: row.first_name,
  lastName: row.last_name,
  club: (row.clubs as { name: string } | null)?.name ?? row.club ?? '',
  clubId: (row.clubs as { id: string } | null)?.id ?? row.club_id ?? null,
  birthDate: row.birth_date ?? undefined,
  weightCategory: row.category ?? '',
  grade: row.grade ?? '',
  profilePhoto: row.profile_photo_url ?? '',
  coverPhoto: row.cover_photo_url ?? '',
},
```

- [ ] **Step 3 : Mettre à jour `getJudokaBySlug`**

Modifier la query `.select()` :

```ts
const { data, error } = await supabase
  .from('profiles')
  .select(`
    *,
    clubs(id, name),
    palmares (*),
    videos (*),
    gallery_photos (*)
  `)
  .eq('slug', slug)
  .maybeSingle()
```

- [ ] **Step 4 : Mettre à jour `searchJudokas`**

Modifier la query `.select()` :

```ts
const { data, error } = await supabase
  .from('profiles')
  .select('*, clubs(id, name)')
  .eq('visibility', 'public')
```

- [ ] **Step 5 : Mettre à jour `searchJudokasAutocomplete`**

Modifier la query et ajouter un `.map()` pour résoudre le nom du club :

```ts
export async function searchJudokasAutocomplete(
  query: string
): Promise<JudokaAutocompleteResult[]> {
  const normalized = normalizeText(query)
  if (normalized.length < 3) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('slug, first_name, last_name, club, clubs(id, name), grade, category, profile_photo_url')
    .eq('visibility', 'public')

  if (error || !data) return []

  return data
    .filter((row) => {
      const fullName = normalizeText(`${row.first_name} ${row.last_name}`)
      return fullName.includes(normalized)
    })
    .slice(0, 8)
    .map((row) => ({
      slug: row.slug,
      first_name: row.first_name,
      last_name: row.last_name,
      club: (row.clubs as { name: string } | null)?.name ?? row.club ?? null,
      grade: row.grade,
      category: row.category,
      profile_photo_url: row.profile_photo_url,
    }))
}
```

- [ ] **Step 6 : Type-check**

```bash
npx tsc --noEmit
```

Résultat attendu : aucune erreur liée à `judokaService.ts` ou `types/judoka.ts`.

- [ ] **Step 7 : Commit**

```bash
git add lib/judokaService.ts
git commit -m "feat(judokaService): join clubs table, populate clubId in identity"
```

---

## Task 5 : Créer `components/ClubAutocomplete.tsx`

**Files:**
- Create: `components/ClubAutocomplete.tsx`

**Interfaces:**
- Consumes: `searchClubs`, `createClub`, `Club` depuis `@/lib/clubService`; `toast` depuis `sonner`
- Produces:
  ```ts
  interface ClubAutocompleteProps {
    value: string | null        // club_id sélectionné
    valueName: string | null    // nom à afficher quand sélectionné
    onChange: (clubId: string | null, clubName: string | null) => void
    placeholder?: string
  }
  export default function ClubAutocomplete(props: ClubAutocompleteProps): JSX.Element
  ```

- [ ] **Step 1 : Créer le composant**

Créer `components/ClubAutocomplete.tsx` :

```tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { searchClubs, createClub, type Club } from '@/lib/clubService'

const DEBOUNCE_MS = 300
const MIN_QUERY_LEN = 2

interface ClubAutocompleteProps {
  value: string | null
  valueName: string | null
  onChange: (clubId: string | null, clubName: string | null) => void
  placeholder?: string
}

export default function ClubAutocomplete({
  value,
  valueName,
  onChange,
  placeholder = 'Recherche ton club...',
}: ClubAutocompleteProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Club[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [creating, setCreating] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchIdRef = useRef(0)

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  const showCreateOption =
    query.trim().length >= MIN_QUERY_LEN &&
    !results.some((c) => c.name.toLowerCase() === query.trim().toLowerCase())

  const totalItems = results.length + (showCreateOption ? 1 : 0)

  const selectClub = useCallback(
    (club: Club) => {
      onChange(club.id, club.name)
      setIsOpen(false)
      setQuery('')
      setResults([])
      setActiveIndex(-1)
    },
    [onChange]
  )

  const handleCreate = useCallback(async () => {
    const name = query.trim()
    setCreating(true)
    try {
      const club = await createClub(name)
      selectClub(club)
      toast.success('Club créé et sélectionné')
    } catch {
      toast.error('Erreur lors de la création du club')
    } finally {
      setCreating(false)
    }
  }, [query, selectClub])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    setActiveIndex(-1)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (val.trim().length < MIN_QUERY_LEN) {
      setResults([])
      setIsOpen(false)
      setLoading(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      const id = ++searchIdRef.current
      setLoading(true)
      try {
        const data = await searchClubs(val)
        if (id !== searchIdRef.current) return
        setResults(data)
        setIsOpen(true)
      } catch {
        if (id !== searchIdRef.current) return
        setResults([])
        setIsOpen(true)
      } finally {
        if (id === searchIdRef.current) setLoading(false)
      }
    }, DEBOUNCE_MS)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, totalItems - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && activeIndex < results.length) {
        selectClub(results[activeIndex])
      } else if (activeIndex === results.length && showCreateOption) {
        handleCreate()
      } else if (results.length > 0) {
        selectClub(results[0])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }

  if (value && valueName) {
    return (
      <div className="flex items-center gap-2 border border-outline-variant rounded-lg px-4 py-2.5 bg-surface-container-lowest">
        <span className="flex-1 text-sm text-on-surface">{valueName}</span>
        <button
          type="button"
          onClick={() => onChange(null, null)}
          className="text-outline hover:text-on-surface transition-colors"
          aria-label="Désélectionner le club"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center border border-outline-variant rounded-lg bg-surface-container-lowest">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          className="flex-1 border-none outline-none focus:ring-0 px-4 py-2.5 text-on-surface text-sm placeholder:text-outline bg-transparent"
        />
        {loading && (
          <svg
            className="animate-spin h-4 w-4 text-outline flex-shrink-0 mr-3"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
      </div>

      {isOpen && (results.length > 0 || showCreateOption) && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-outline-variant shadow-[0_8px_30px_rgba(0,6,102,0.12)] overflow-hidden z-50"
        >
          {results.length > 0 && (
            <ul>
              {results.map((club, i) => (
                <li
                  key={club.id}
                  role="option"
                  aria-selected={activeIndex === i}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    selectClub(club)
                  }}
                  className={`flex items-center justify-between px-4 py-2.5 cursor-pointer text-sm border-b border-outline-variant/40 last:border-0 transition-colors ${
                    activeIndex === i ? 'bg-primary/5' : 'hover:bg-surface-container'
                  }`}
                >
                  <span className="font-medium text-on-surface">{club.name}</span>
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    {club.city && <span>{club.city}</span>}
                    {club.verified && (
                      <span className="font-semibold text-tertiary-container">✓ Vérifié</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {showCreateOption && (
            <button
              type="button"
              role="option"
              aria-selected={activeIndex === results.length}
              onMouseEnter={() => setActiveIndex(results.length)}
              onMouseDown={(e) => {
                e.preventDefault()
                handleCreate()
              }}
              disabled={creating}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm border-t border-dashed border-outline-variant text-secondary font-medium transition-colors disabled:opacity-50 ${
                activeIndex === results.length ? 'bg-secondary/5' : 'hover:bg-secondary/5'
              }`}
            >
              <span>+</span>
              <span>
                Créer le club «&nbsp;{query.trim()}&nbsp;»
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2 : Type-check**

```bash
npx tsc --noEmit
```

Résultat attendu : aucune erreur dans `components/ClubAutocomplete.tsx`.

- [ ] **Step 3 : Commit**

```bash
git add components/ClubAutocomplete.tsx
git commit -m "feat(ui): add ClubAutocomplete component with create-on-the-fly"
```

---

## Task 6 : Intégration dashboard

**Files:**
- Modify: `app/dashboard/[profileId]/profil/page.tsx`
- Modify: `components/dashboard/ProfileForm.tsx`
- Modify: `app/dashboard/[profileId]/profil/actions.ts`

**Interfaces:**
- Consumes: `ClubAutocomplete` depuis Task 5; `club_id` colonne DB depuis Task 1

- [ ] **Step 1 : Mettre à jour `ProfilPage` — query enrichie**

Dans `app/dashboard/[profileId]/profil/page.tsx`, modifier la query et le passage de props :

```ts
const { data: profile } = await supabase
  .from('profiles')
  .select('first_name, last_name, club, club_id, clubs(id, name), category, grade, bio, profile_photo_url, cover_photo_url, owner_id, birth_date')
  .eq('id', profileId)
  .single()

if (!profile) redirect('/dashboard')

const clubJoin = profile.clubs as { id: string; name: string } | null
const profileData = {
  ...profile,
  club_id: clubJoin?.id ?? (profile.club_id as string | null) ?? null,
  club_name: clubJoin?.name ?? profile.club ?? null,
}

return (
  <div className="px-margin-mobile md:px-margin-desktop py-10 max-w-container-max">
    <div className="flex items-center gap-3 mb-8">
      <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
      <h1 className="font-montserrat text-headline-md font-bold text-primary uppercase">
        Profil
      </h1>
    </div>
    <ProfileForm profile={profileData} profileId={profileId} />
    <DeleteAccountSection />
  </div>
)
```

- [ ] **Step 2 : Mettre à jour `ProfileForm` — remplacer le champ texte**

Dans `components/dashboard/ProfileForm.tsx` :

**2a — Mettre à jour l'interface `Profile`** (ajouter `club_id` et `club_name`) :

```ts
interface Profile {
  first_name: string
  last_name: string
  club: string | null
  club_id: string | null    // ← ajouter
  club_name: string | null  // ← ajouter
  category: string | null
  grade: string | null
  bio: string | null
  birth_date: string | null
  profile_photo_url: string | null
  cover_photo_url: string | null
  owner_id: string
}
```

**2b — Ajouter les imports** en haut du fichier :

```ts
import ClubAutocomplete from '@/components/ClubAutocomplete'
```

**2c — Ajouter les états club dans `ProfileForm`** (après `const [coverPhotoUrl, ...]`) :

```ts
const [clubId, setClubId] = useState<string | null>(profile.club_id ?? null)
const [clubName, setClubName] = useState<string | null>(profile.club_name ?? null)
```

**2d — Remplacer le bloc `<div>` du champ club** (le `<div>` qui contient `<label htmlFor="club">Club</label>`) par :

```tsx
<div>
  <label className="block text-sm font-medium text-on-surface mb-1">Club</label>
  <ClubAutocomplete
    value={clubId}
    valueName={clubName}
    onChange={(id, name) => {
      setClubId(id)
      setClubName(name)
    }}
  />
  <input type="hidden" name="club_id" value={clubId ?? ''} />
</div>
```

- [ ] **Step 3 : Mettre à jour `saveProfile` — écrire club_id**

Dans `app/dashboard/[profileId]/profil/actions.ts`, dans le `.update({...})`, **remplacer** la ligne :
```ts
club: (formData.get('club') as string) || null,
```
par :
```ts
club_id: (formData.get('club_id') as string) || null,
```

- [ ] **Step 4 : Type-check complet**

```bash
npx tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Step 5 : Lancer tous les tests unitaires**

```bash
npx vitest run __tests__/unit/
```

Résultat attendu : tous les tests passent (y compris les tests existants non modifiés).

- [ ] **Step 6 : Test manuel**

1. Lancer `npm run dev`
2. Se connecter et aller sur `/dashboard/[id]/profil`
3. Dans le champ Club : taper "ROC" → la liste propose "ROC Judo" (migré)
4. Sélectionner "ROC Judo" → le badge s'affiche avec la croix de désélection
5. Cliquer Enregistrer → vérifier dans Supabase que `club_id` est renseigné sur le profil
6. Aller sur la page publique `/[slug]` → vérifier que le badge club affiche toujours "ROC Judo"
7. Taper un club inexistant (ex: "Judo Club Test XYZ") → l'option "+ Créer le club" apparaît
8. Cliquer "Créer" → toast "Club créé et sélectionné", club sélectionné
9. Enregistrer → vérifier que le nouveau club apparaît dans la table `clubs` Supabase

- [ ] **Step 7 : Commit**

```bash
git add app/dashboard/[profileId]/profil/page.tsx components/dashboard/ProfileForm.tsx app/dashboard/[profileId]/profil/actions.ts
git commit -m "feat(dashboard): replace free-text club field with ClubAutocomplete"
```
