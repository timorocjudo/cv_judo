# Test Infrastructure — IpponId Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en place Vitest et les premiers tests ciblés sur la logique métier critique et les règles de sécurité RLS d'IpponId.

**Architecture:** Tests unitaires sur les fonctions pures dans `__tests__/unit/` (pas de Supabase, < 2s), tests de sécurité RLS sur la base Supabase locale dans `__tests__/security/` (nécessitent `supabase start`), tests d'intégration avec Supabase mocké dans `__tests__/integration/`. Vitest est configuré en environnement `node` pour tous les fichiers.

**Tech Stack:** Vitest, @vitest/coverage-v8, @supabase/supabase-js (déjà présent), dotenv (déjà présent).

## Global Constraints

- Next.js 14 App Router — les Server Actions sont dans des fichiers avec `'use server'`. Vitest ignore ce pragma (c'est juste une string), mais les imports `next/cache` et `next/navigation` doivent être mockés.
- Alias `@/` → racine du projet (défini dans tsconfig et dans vitest.config.ts).
- Pas de `globals: true` dans Vitest — importer `describe`, `it`, `expect`, `vi`, `beforeAll`, etc. depuis `'vitest'` explicitement dans chaque fichier de test.
- Les tests unitaires doivent passer sans Supabase, sans serveur, sans fichier .env.
- Les tests de sécurité requièrent `supabase start` et les variables d'env `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (chargées depuis `.env.local` via le fichier setup).
- `redirect()` de `next/navigation` doit être mocké pour lancer une erreur avec `digest: 'NEXT_REDIRECT'` afin de respecter le comportement réel de Next.js (les Server Actions le re-throw).
- **Schéma RLS réel** : seulement `published: boolean` — pas de colonne `visibility`. Un profil non-publié est invisible à TOUT le monde sauf son propriétaire (anon ET autres utilisateurs authentifiés sont bloqués). Le concept "profil privé visible aux connectés" du spec d'origine n'est pas implémenté.

---

## File Structure

| Fichier | Action | Rôle |
|---------|--------|------|
| `package.json` | Modifier | Ajouter scripts test + devDependencies |
| `vitest.config.ts` | Créer | Config Vitest compatible Next.js App Router |
| `__tests__/setup.ts` | Créer | Charge `.env.local` via dotenv (pour les tests de sécurité) |
| `lib/palmaresStats.ts` | Créer | Extrait `computePalmaresStats()` depuis PalmaresBlock |
| `components/blocks/PalmaresBlock.tsx` | Modifier | Utilise `computePalmaresStats()` au lieu du calcul inline |
| `__tests__/unit/slugify.test.ts` | Créer | Tests de `generateSlug` et `normalizeText` |
| `__tests__/unit/profileValidation.test.ts` | Créer | Tests de `getMissingFieldsForPublishing` |
| `__tests__/unit/palmaresStats.test.ts` | Créer | Tests de `computePalmaresStats` |
| `__tests__/helpers/supabaseTestClient.ts` | Créer | Factories client anon/admin/authentifié |
| `__tests__/security/profileAccess.test.ts` | Créer | Tests RLS lecture profils |
| `__tests__/security/profileMutation.test.ts` | Créer | Tests RLS mutations profils/palmarès |
| `__tests__/integration/publishProfile.test.ts` | Créer | Tests Server Action `togglePublished` |
| `__tests__/integration/deleteAccount.test.ts` | Créer | Tests Server Action `deleteAccount` |
| `__tests__/README.md` | Créer | Documentation : lancer les tests, prérequis |
| `.github/workflows/tests.yml` | Créer | CI GitHub : vitest run sur push/PR |

---

### Task 1: Vitest Setup

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `__tests__/setup.ts`

**Interfaces:**
- Produces: commandes `npm run test`, `npm run test:watch`, `npm run test:coverage` fonctionnelles

- [ ] **Step 1: Installer les dépendances Vitest**

```bash
cd /var/www/projects/cv_judo && npm install --save-dev vitest @vitest/coverage-v8
```

Résultat attendu : `added N packages` sans erreur.

- [ ] **Step 2: Créer `vitest.config.ts`**

Contenu exact :

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['__tests__/setup.ts'],
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: [
        'lib/slugify.ts',
        'lib/profileValidation.ts',
        'lib/palmaresStats.ts',
        'app/dashboard/actions.ts',
        'app/dashboard/profil/actions.ts',
      ],
      reporter: ['text', 'html'],
    },
  },
})
```

- [ ] **Step 3: Créer `__tests__/setup.ts`**

```typescript
import { config } from 'dotenv'

// Charge .env.local pour les tests de sécurité (Supabase local)
// Les tests unitaires et d'intégration n'ont pas besoin de ces variables
config({ path: '.env.local' })
```

- [ ] **Step 4: Ajouter les scripts dans `package.json`**

Dans la section `"scripts"`, ajouter après `"lint"` :

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 5: Vérifier que Vitest démarre sans test**

```bash
cd /var/www/projects/cv_judo && npm run test
```

Résultat attendu : `No test files found` ou `0 tests` — PAS d'erreur de configuration.

- [ ] **Step 6: Commit**

```bash
cd /var/www/projects/cv_judo && git add vitest.config.ts __tests__/setup.ts package.json package-lock.json
git commit -m "chore: add Vitest test infrastructure"
```

---

### Task 2: Extraire `computePalmaresStats` vers `lib/palmaresStats.ts`

**Files:**
- Create: `lib/palmaresStats.ts`
- Modify: `components/blocks/PalmaresBlock.tsx:63-65`

**Interfaces:**
- Produces: `computePalmaresStats(palmares: PalmaresEntry[]): PalmaresStats`
  - `PalmaresStats = { totalCompetitions: number; totalPodiums: number; goldCount: number; silverCount: number; bronzeCount: number }`

- [ ] **Step 1: Créer `lib/palmaresStats.ts`**

```typescript
import type { PalmaresEntry } from '@/types/judoka'

export interface PalmaresStats {
  totalCompetitions: number
  totalPodiums: number
  goldCount: number
  silverCount: number
  bronzeCount: number
}

export function computePalmaresStats(palmares: PalmaresEntry[]): PalmaresStats {
  return {
    totalCompetitions: palmares.length,
    totalPodiums: palmares.filter((e) => e.medal != null).length,
    goldCount: palmares.filter((e) => e.medal === 'gold').length,
    silverCount: palmares.filter((e) => e.medal === 'silver').length,
    bronzeCount: palmares.filter((e) => e.medal === 'bronze').length,
  }
}
```

- [ ] **Step 2: Modifier `components/blocks/PalmaresBlock.tsx`**

Ajouter l'import en tête du fichier (après les imports existants) :

```typescript
import { computePalmaresStats } from '@/lib/palmaresStats'
```

Remplacer dans la fonction `PalmaresBlock` les lignes du `PalmaresStatsCounter` :

Avant :
```tsx
{palmares.length >= 3 && (
  <PalmaresStatsCounter
    totalCompetitions={palmares.length}
    totalPodiums={palmares.filter((e) => e.medal != null).length}
  />
)}
```

Après :
```tsx
{palmares.length >= 3 && (() => {
  const stats = computePalmaresStats(palmares)
  return (
    <PalmaresStatsCounter
      totalCompetitions={stats.totalCompetitions}
      totalPodiums={stats.totalPodiums}
    />
  )
})()}
```

- [ ] **Step 3: Vérifier le type-check**

```bash
cd /var/www/projects/cv_judo && npx tsc --noEmit
```

Résultat attendu : aucune erreur TypeScript.

- [ ] **Step 4: Commit**

```bash
cd /var/www/projects/cv_judo && git add lib/palmaresStats.ts components/blocks/PalmaresBlock.tsx
git commit -m "refactor: extract computePalmaresStats to lib/palmaresStats.ts"
```

---

### Task 3: Tests unitaires — slugify

**Files:**
- Create: `__tests__/unit/slugify.test.ts`

**Interfaces:**
- Consumes: `generateSlug(firstName: string, lastName: string): string`, `normalizeText(str: string): string` depuis `lib/slugify.ts`

- [ ] **Step 1: Créer `__tests__/unit/slugify.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { generateSlug, normalizeText } from '@/lib/slugify'

describe('normalizeText', () => {
  it('supprime les accents et passe en lowercase', () => {
    expect(normalizeText('Timothé')).toBe('timothe')
    expect(normalizeText('François')).toBe('francois')
    expect(normalizeText('Élodie')).toBe('elodie')
  })

  it('supprime tous les types d\'accents courants', () => {
    expect(normalizeText('éèêàùçô')).toBe('eeauco')
    // Note: à → a, ù → u
    expect(normalizeText('àùç')).toBe('auc')
  })

  it('passe en lowercase', () => {
    expect(normalizeText('DUPONT')).toBe('dupont')
    expect(normalizeText('Jean-Pierre')).toBe('jean-pierre')
  })

  it('conserve les tirets et chiffres', () => {
    expect(normalizeText('jean-pierre')).toBe('jean-pierre')
    expect(normalizeText('niveau2')).toBe('niveau2')
  })

  it('chaîne vide retourne chaîne vide', () => {
    expect(normalizeText('')).toBe('')
  })
})

describe('generateSlug', () => {
  it('génère le slug canonique', () => {
    expect(generateSlug('Timothé', 'François')).toBe('timothe-francois')
  })

  it('gère les prénoms composés', () => {
    expect(generateSlug('Jean-Pierre', 'Dupont')).toBe('jean-pierre-dupont')
  })

  it('espaces multiples dans le nom → tiret simple', () => {
    // normalizeText trim les espaces en bout de chaîne; les espaces internes deviennent des tirets
    expect(generateSlug('Marie  Claire', 'Lebrun')).toBe('marie-claire-lebrun')
  })

  it('supprime les caractères spéciaux', () => {
    expect(generateSlug("O'Brien", 'Smith')).toBe('o-brien-smith')
  })

  it('résultat toujours en lowercase', () => {
    expect(generateSlug('MARTIN', 'DUPONT')).toBe('martin-dupont')
  })

  it('pas de tiret en début ou fin', () => {
    const slug = generateSlug('Alice', 'Durand')
    expect(slug).not.toMatch(/^-/)
    expect(slug).not.toMatch(/-$/)
  })
})
```

- [ ] **Step 2: Lancer les tests**

```bash
cd /var/www/projects/cv_judo && npm run test -- __tests__/unit/slugify.test.ts
```

Résultat attendu : tous les tests PASS en < 1s. Si un test échoue, corriger le test (la logique de `lib/slugify.ts` est source de vérité).

- [ ] **Step 3: Commit**

```bash
cd /var/www/projects/cv_judo && git add __tests__/unit/slugify.test.ts
git commit -m "test: add unit tests for slugify functions"
```

---

### Task 4: Tests unitaires — profileValidation

**Files:**
- Create: `__tests__/unit/profileValidation.test.ts`

**Interfaces:**
- Consumes: `getMissingFieldsForPublishing(profile: PublishableProfile): string[]`, `PublishableProfile` depuis `lib/profileValidation.ts`
- Les labels retournés sont : `'Club'`, `'Catégorie'`, `'Grade'`, `'Bio'`, `'Photo de profil'`, `'Date de naissance'` (vérifier dans `lib/profileValidation.ts:12-19`)

- [ ] **Step 1: Créer `__tests__/unit/profileValidation.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { getMissingFieldsForPublishing, type PublishableProfile } from '@/lib/profileValidation'

const COMPLETE_PROFILE: PublishableProfile = {
  club: 'Judo Club Paris',
  category: '-66kg',
  grade: 'Ceinture noire 1er dan',
  bio: 'Judoka passionné depuis 10 ans.',
  profile_photo_url: 'https://cdn.example.com/photo.jpg',
  birth_date: '2010-04-02',
}

describe('getMissingFieldsForPublishing', () => {
  it('profil complet → retourne tableau vide', () => {
    const result = getMissingFieldsForPublishing(COMPLETE_PROFILE)
    expect(result).toEqual([])
  })

  it('sans photo de profil → "Photo de profil" dans les manquants', () => {
    const profile = { ...COMPLETE_PROFILE, profile_photo_url: null }
    expect(getMissingFieldsForPublishing(profile)).toContain('Photo de profil')
  })

  it('sans bio → "Bio" dans les manquants', () => {
    const profile = { ...COMPLETE_PROFILE, bio: null }
    expect(getMissingFieldsForPublishing(profile)).toContain('Bio')
  })

  it('sans club → "Club" dans les manquants', () => {
    const profile = { ...COMPLETE_PROFILE, club: null }
    expect(getMissingFieldsForPublishing(profile)).toContain('Club')
  })

  it('sans catégorie → "Catégorie" dans les manquants', () => {
    const profile = { ...COMPLETE_PROFILE, category: null }
    expect(getMissingFieldsForPublishing(profile)).toContain('Catégorie')
  })

  it('sans grade → "Grade" dans les manquants', () => {
    const profile = { ...COMPLETE_PROFILE, grade: null }
    expect(getMissingFieldsForPublishing(profile)).toContain('Grade')
  })

  it('sans date de naissance → "Date de naissance" dans les manquants', () => {
    const profile = { ...COMPLETE_PROFILE, birth_date: null }
    expect(getMissingFieldsForPublishing(profile)).toContain('Date de naissance')
  })

  it('profil entièrement vide → tous les 6 champs manquants', () => {
    const emptyProfile: PublishableProfile = {
      club: null,
      category: null,
      grade: null,
      bio: null,
      profile_photo_url: null,
      birth_date: null,
    }
    const result = getMissingFieldsForPublishing(emptyProfile)
    expect(result).toHaveLength(6)
    expect(result).toContain('Club')
    expect(result).toContain('Catégorie')
    expect(result).toContain('Grade')
    expect(result).toContain('Bio')
    expect(result).toContain('Photo de profil')
    expect(result).toContain('Date de naissance')
  })

  it('champ présent mais vide (chaîne vide) → considéré manquant', () => {
    const profile = { ...COMPLETE_PROFILE, bio: '' }
    expect(getMissingFieldsForPublishing(profile)).toContain('Bio')
  })

  it('champ présent mais espaces seulement → considéré manquant', () => {
    const profile = { ...COMPLETE_PROFILE, club: '   ' }
    expect(getMissingFieldsForPublishing(profile)).toContain('Club')
  })
})
```

- [ ] **Step 2: Lancer les tests**

```bash
cd /var/www/projects/cv_judo && npm run test -- __tests__/unit/profileValidation.test.ts
```

Résultat attendu : tous les tests PASS en < 1s.

- [ ] **Step 3: Commit**

```bash
cd /var/www/projects/cv_judo && git add __tests__/unit/profileValidation.test.ts
git commit -m "test: add unit tests for getMissingFieldsForPublishing"
```

---

### Task 5: Tests unitaires — palmaresStats

**Files:**
- Create: `__tests__/unit/palmaresStats.test.ts`

**Interfaces:**
- Consumes: `computePalmaresStats(palmares: PalmaresEntry[]): PalmaresStats` depuis `lib/palmaresStats.ts` (créé en Task 2)
- `PalmaresEntry.medal: 'gold' | 'silver' | 'bronze' | null`

- [ ] **Step 1: Créer `__tests__/unit/palmaresStats.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { computePalmaresStats } from '@/lib/palmaresStats'
import type { PalmaresEntry } from '@/types/judoka'

function entry(medal: PalmaresEntry['medal']): PalmaresEntry {
  return {
    date: '2024-03-25',
    competition: 'Championnat test',
    result: '1ère place',
    category: '-66kg',
    level: 'Régional',
    medal,
  }
}

describe('computePalmaresStats', () => {
  it('palmarès vide → tout à zéro, pas d\'erreur', () => {
    const stats = computePalmaresStats([])
    expect(stats.totalCompetitions).toBe(0)
    expect(stats.totalPodiums).toBe(0)
    expect(stats.goldCount).toBe(0)
    expect(stats.silverCount).toBe(0)
    expect(stats.bronzeCount).toBe(0)
  })

  it('3 premières places → totalPodiums = 3', () => {
    const palmares = [entry('gold'), entry('gold'), entry('gold')]
    expect(computePalmaresStats(palmares).totalPodiums).toBe(3)
  })

  it('totalCompetitions = nombre total d\'entrées', () => {
    const palmares = [entry('gold'), entry(null), entry('bronze')]
    expect(computePalmaresStats(palmares).totalCompetitions).toBe(3)
  })

  it('comptage correct or/argent/bronze', () => {
    const palmares = [
      entry('gold'),
      entry('gold'),
      entry('silver'),
      entry('bronze'),
      entry(null),
      entry(null),
    ]
    const stats = computePalmaresStats(palmares)
    expect(stats.goldCount).toBe(2)
    expect(stats.silverCount).toBe(1)
    expect(stats.bronzeCount).toBe(1)
    expect(stats.totalPodiums).toBe(4)
    expect(stats.totalCompetitions).toBe(6)
  })

  it('entrées sans médaille (null) ne comptent pas comme podium', () => {
    const palmares = [entry(null), entry(null), entry(null)]
    expect(computePalmaresStats(palmares).totalPodiums).toBe(0)
    expect(computePalmaresStats(palmares).totalCompetitions).toBe(3)
  })
})
```

- [ ] **Step 2: Lancer les tests**

```bash
cd /var/www/projects/cv_judo && npm run test -- __tests__/unit/palmaresStats.test.ts
```

Résultat attendu : tous les tests PASS en < 1s.

- [ ] **Step 3: Lancer tous les tests unitaires ensemble**

```bash
cd /var/www/projects/cv_judo && npm run test -- __tests__/unit/
```

Résultat attendu : tous les tests PASS, durée totale < 2s.

- [ ] **Step 4: Commit**

```bash
cd /var/www/projects/cv_judo && git add __tests__/unit/palmaresStats.test.ts
git commit -m "test: add unit tests for computePalmaresStats"
```

---

### Task 6: Helper supabaseTestClient (pour tests de sécurité RLS)

**Files:**
- Create: `__tests__/helpers/supabaseTestClient.ts`

**Interfaces:**
- Produces:
  - `createAnonClient(): SupabaseClient` — client sans session (rôle anon)
  - `createAdminSetupClient(): SupabaseClient` — client service role (bypass RLS)
  - `createAuthenticatedClient(email, password): Promise<SupabaseClient>` — client signé en tant qu'utilisateur
  - `createTestUser(admin, email, password): Promise<string>` — crée un utilisateur de test, retourne son `user.id`
  - `deleteTestUser(admin, userId): Promise<void>` — supprime un utilisateur de test

**Prérequis:** `supabase start` lancé, `.env.local` contenant `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

- [ ] **Step 1: Créer `__tests__/helpers/supabaseTestClient.ts`**

```typescript
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function getEnv(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Variable d'environnement manquante pour les tests : ${key}`)
  return value
}

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321'
}

const CLIENT_OPTIONS = {
  auth: { autoRefreshToken: false, persistSession: false },
}

export function createAnonClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'), CLIENT_OPTIONS)
}

export function createAdminSetupClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), getEnv('SUPABASE_SERVICE_ROLE_KEY'), CLIENT_OPTIONS)
}

export async function createAuthenticatedClient(
  email: string,
  password: string
): Promise<SupabaseClient> {
  const client = createClient(getSupabaseUrl(), getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'), CLIENT_OPTIONS)
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Impossible de connecter ${email} : ${error.message}`)
  return client
}

export async function createTestUser(
  admin: SupabaseClient,
  email: string,
  password: string
): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw new Error(`Impossible de créer l'utilisateur de test ${email} : ${error.message}`)
  return data.user.id
}

export async function deleteTestUser(admin: SupabaseClient, userId: string): Promise<void> {
  await admin.auth.admin.deleteUser(userId)
}
```

- [ ] **Step 2: Commit**

```bash
cd /var/www/projects/cv_judo && git add __tests__/helpers/supabaseTestClient.ts
git commit -m "test: add Supabase test client helpers for RLS security tests"
```

---

### Task 7: Tests de sécurité RLS — profileAccess

**Files:**
- Create: `__tests__/security/profileAccess.test.ts`

**Interfaces:**
- Consumes: tout ce qui est dans `__tests__/helpers/supabaseTestClient.ts`

**Note RLS importante :**
- `published = true` → SELECT autorisé pour anon ET authenticated (via `public_read_profiles` + `authenticated_read_published_profiles`)
- `published = false` → SELECT autorisé UNIQUEMENT pour le propriétaire (`owner_all_profiles`). Anon et autres utilisateurs authentifiés n'ont PAS accès — contrairement au spec initial qui imaginait un "profil privé" visible aux connectés.
- UPDATE est toujours limité au propriétaire (`owner_all_profiles` avec `auth.uid() = owner_id`).
- Quand RLS bloque un SELECT : Supabase retourne `{ data: null, error: null }` (pas d'erreur, juste aucune donnée).
- Quand RLS bloque un INSERT : Supabase retourne une erreur.

- [ ] **Step 1: Créer `__tests__/security/profileAccess.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import {
  createAnonClient,
  createAdminSetupClient,
  createAuthenticatedClient,
  createTestUser,
  deleteTestUser,
} from '../helpers/supabaseTestClient'
import type { SupabaseClient } from '@supabase/supabase-js'

// Délai généreux pour les opérations réseau locales Supabase
const TIMEOUT = 10_000

const OWNER_EMAIL = 'owner-access-test@ipponid.test'
const OWNER_PASSWORD = 'Test1234!'
const OTHER_EMAIL = 'other-access-test@ipponid.test'
const OTHER_PASSWORD = 'Test1234!'

let admin: SupabaseClient
let ownerId: string
let otherId: string
let publishedProfileId: string
let unpublishedProfileId: string

async function insertProfile(
  admin: SupabaseClient,
  ownerId: string,
  published: boolean
): Promise<string> {
  const { data, error } = await admin
    .from('profiles')
    .insert({
      owner_id: ownerId,
      slug: `test-profile-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      first_name: 'Test',
      last_name: 'Judoka',
      published,
    })
    .select('id')
    .single()
  if (error) throw new Error(`Insertion profil échouée : ${error.message}`)
  return data.id
}

beforeAll(async () => {
  admin = createAdminSetupClient()
  ownerId = await createTestUser(admin, OWNER_EMAIL, OWNER_PASSWORD)
  otherId = await createTestUser(admin, OTHER_EMAIL, OTHER_PASSWORD)
}, TIMEOUT)

afterAll(async () => {
  await deleteTestUser(admin, ownerId)
  await deleteTestUser(admin, otherId)
}, TIMEOUT)

beforeEach(async () => {
  publishedProfileId = await insertProfile(admin, ownerId, true)
  unpublishedProfileId = await insertProfile(admin, ownerId, false)
}, TIMEOUT)

afterEach(async () => {
  await admin.from('profiles').delete().eq('id', publishedProfileId)
  await admin.from('profiles').delete().eq('id', unpublishedProfileId)
}, TIMEOUT)

describe('Profil publié (published = true)', () => {
  it('client anonyme peut lire', async () => {
    const anon = createAnonClient()
    const { data, error } = await anon
      .from('profiles')
      .select('id')
      .eq('id', publishedProfileId)
      .single()
    expect(error).toBeNull()
    expect(data?.id).toBe(publishedProfileId)
  }, TIMEOUT)

  it('client anonyme ne peut PAS modifier', async () => {
    const anon = createAnonClient()
    // RLS bloque silencieusement les UPDATEs non autorisés (0 lignes affectées)
    // On vérifie que la valeur n'a pas changé côté admin
    await anon
      .from('profiles')
      .update({ first_name: 'HACKER' })
      .eq('id', publishedProfileId)

    const { data } = await admin
      .from('profiles')
      .select('first_name')
      .eq('id', publishedProfileId)
      .single()
    expect(data?.first_name).not.toBe('HACKER')
  }, TIMEOUT)

  it('propriétaire peut lire', async () => {
    const owner = await createAuthenticatedClient(OWNER_EMAIL, OWNER_PASSWORD)
    const { data, error } = await owner
      .from('profiles')
      .select('id')
      .eq('id', publishedProfileId)
      .single()
    expect(error).toBeNull()
    expect(data?.id).toBe(publishedProfileId)
  }, TIMEOUT)

  it('propriétaire peut modifier', async () => {
    const owner = await createAuthenticatedClient(OWNER_EMAIL, OWNER_PASSWORD)
    const { error } = await owner
      .from('profiles')
      .update({ first_name: 'Modifié' })
      .eq('id', publishedProfileId)
    expect(error).toBeNull()

    const { data } = await admin
      .from('profiles')
      .select('first_name')
      .eq('id', publishedProfileId)
      .single()
    expect(data?.first_name).toBe('Modifié')
  }, TIMEOUT)

  it('autre utilisateur authentifié peut lire', async () => {
    const other = await createAuthenticatedClient(OTHER_EMAIL, OTHER_PASSWORD)
    const { data, error } = await other
      .from('profiles')
      .select('id')
      .eq('id', publishedProfileId)
      .single()
    expect(error).toBeNull()
    expect(data?.id).toBe(publishedProfileId)
  }, TIMEOUT)

  it('autre utilisateur authentifié ne peut PAS modifier', async () => {
    const other = await createAuthenticatedClient(OTHER_EMAIL, OTHER_PASSWORD)
    await other
      .from('profiles')
      .update({ first_name: 'USURPATEUR' })
      .eq('id', publishedProfileId)

    const { data } = await admin
      .from('profiles')
      .select('first_name')
      .eq('id', publishedProfileId)
      .single()
    expect(data?.first_name).not.toBe('USURPATEUR')
  }, TIMEOUT)
})

describe('Profil non-publié (published = false)', () => {
  it('[CRITIQUE] client anonyme ne peut PAS lire', async () => {
    const anon = createAnonClient()
    const { data } = await anon
      .from('profiles')
      .select('id')
      .eq('id', unpublishedProfileId)
      .single()
    // RLS bloque → data est null (pas d'erreur, juste aucune ligne retournée)
    expect(data).toBeNull()
  }, TIMEOUT)

  it('[CRITIQUE] autre utilisateur authentifié ne peut PAS lire', async () => {
    const other = await createAuthenticatedClient(OTHER_EMAIL, OTHER_PASSWORD)
    const { data } = await other
      .from('profiles')
      .select('id')
      .eq('id', unpublishedProfileId)
      .single()
    expect(data).toBeNull()
  }, TIMEOUT)

  it('propriétaire peut lire son profil non-publié', async () => {
    const owner = await createAuthenticatedClient(OWNER_EMAIL, OWNER_PASSWORD)
    const { data, error } = await owner
      .from('profiles')
      .select('id')
      .eq('id', unpublishedProfileId)
      .single()
    expect(error).toBeNull()
    expect(data?.id).toBe(unpublishedProfileId)
  }, TIMEOUT)

  it('propriétaire peut modifier son profil non-publié', async () => {
    const owner = await createAuthenticatedClient(OWNER_EMAIL, OWNER_PASSWORD)
    const { error } = await owner
      .from('profiles')
      .update({ first_name: 'BrouillonModifié' })
      .eq('id', unpublishedProfileId)
    expect(error).toBeNull()

    const { data } = await admin
      .from('profiles')
      .select('first_name')
      .eq('id', unpublishedProfileId)
      .single()
    expect(data?.first_name).toBe('BrouillonModifié')
  }, TIMEOUT)
})
```

- [ ] **Step 2: S'assurer que `supabase start` est lancé puis lancer les tests**

```bash
supabase start   # si pas déjà lancé
cd /var/www/projects/cv_judo && npm run test -- __tests__/security/profileAccess.test.ts
```

Résultat attendu : tous les tests PASS. Les tests critiques marqués `[CRITIQUE]` sont les plus importants.

- [ ] **Step 3: Commit**

```bash
cd /var/www/projects/cv_judo && git add __tests__/security/profileAccess.test.ts
git commit -m "test: add RLS security tests for profile read access"
```

---

### Task 8: Tests de sécurité RLS — profileMutation

**Files:**
- Create: `__tests__/security/profileMutation.test.ts`

**Interfaces:**
- Consumes: `__tests__/helpers/supabaseTestClient.ts`
- Tables testées : `profiles`, `palmares`

- [ ] **Step 1: Créer `__tests__/security/profileMutation.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import {
  createAnonClient,
  createAdminSetupClient,
  createAuthenticatedClient,
  createTestUser,
  deleteTestUser,
} from '../helpers/supabaseTestClient'
import type { SupabaseClient } from '@supabase/supabase-js'

const TIMEOUT = 10_000

const OWNER_EMAIL = 'owner-mutation-test@ipponid.test'
const OWNER_PASSWORD = 'Test1234!'
const ATTACKER_EMAIL = 'attacker-mutation-test@ipponid.test'
const ATTACKER_PASSWORD = 'Test1234!'

let admin: SupabaseClient
let ownerId: string
let attackerId: string
let profileId: string
let palmaresId: string

beforeAll(async () => {
  admin = createAdminSetupClient()
  ownerId = await createTestUser(admin, OWNER_EMAIL, OWNER_PASSWORD)
  attackerId = await createTestUser(admin, ATTACKER_EMAIL, ATTACKER_PASSWORD)
}, TIMEOUT)

afterAll(async () => {
  await deleteTestUser(admin, ownerId)
  await deleteTestUser(admin, attackerId)
}, TIMEOUT)

beforeEach(async () => {
  const slug = `mut-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .insert({ owner_id: ownerId, slug, first_name: 'Test', last_name: 'Owner', published: true })
    .select('id')
    .single()
  if (profileErr) throw new Error(profileErr.message)
  profileId = profile.id

  const { data: palmares, error: palmaresErr } = await admin
    .from('palmares')
    .insert({ profile_id: profileId, competition: 'Test compet', result: '1er' })
    .select('id')
    .single()
  if (palmaresErr) throw new Error(palmaresErr.message)
  palmaresId = palmares.id
}, TIMEOUT)

afterEach(async () => {
  await admin.from('palmares').delete().eq('id', palmaresId)
  await admin.from('profiles').delete().eq('id', profileId)
}, TIMEOUT)

describe('Protection UPDATE profiles', () => {
  it('un utilisateur ne peut pas modifier le profil d\'un autre', async () => {
    const attacker = await createAuthenticatedClient(ATTACKER_EMAIL, ATTACKER_PASSWORD)
    await attacker
      .from('profiles')
      .update({ first_name: 'COMPROMIS' })
      .eq('id', profileId)

    const { data } = await admin
      .from('profiles')
      .select('first_name')
      .eq('id', profileId)
      .single()
    expect(data?.first_name).not.toBe('COMPROMIS')
  }, TIMEOUT)

  it('un utilisateur anonyme ne peut pas modifier un profil', async () => {
    const anon = createAnonClient()
    await anon
      .from('profiles')
      .update({ first_name: 'COMPROMIS' })
      .eq('id', profileId)

    const { data } = await admin
      .from('profiles')
      .select('first_name')
      .eq('id', profileId)
      .single()
    expect(data?.first_name).not.toBe('COMPROMIS')
  }, TIMEOUT)
})

describe('Protection DELETE profiles', () => {
  it('un utilisateur ne peut pas supprimer le profil d\'un autre', async () => {
    const attacker = await createAuthenticatedClient(ATTACKER_EMAIL, ATTACKER_PASSWORD)
    await attacker.from('profiles').delete().eq('id', profileId)

    const { data } = await admin
      .from('profiles')
      .select('id')
      .eq('id', profileId)
      .single()
    expect(data?.id).toBe(profileId)
  }, TIMEOUT)

  it('un utilisateur anonyme ne peut pas supprimer un profil', async () => {
    const anon = createAnonClient()
    await anon.from('profiles').delete().eq('id', profileId)

    const { data } = await admin
      .from('profiles')
      .select('id')
      .eq('id', profileId)
      .single()
    expect(data?.id).toBe(profileId)
  }, TIMEOUT)
})

describe('Protection INSERT/UPDATE palmares', () => {
  it('un utilisateur ne peut pas ajouter une entrée palmarès sur le profil d\'un autre', async () => {
    const attacker = await createAuthenticatedClient(ATTACKER_EMAIL, ATTACKER_PASSWORD)
    const { error } = await attacker
      .from('palmares')
      .insert({ profile_id: profileId, competition: 'Injection', result: 'Fraude' })
    // L'INSERT doit être bloqué par RLS (WITH CHECK échoue) → error non null
    expect(error).not.toBeNull()
  }, TIMEOUT)

  it('un utilisateur anonyme ne peut rien insérer dans palmares', async () => {
    const anon = createAnonClient()
    const { error } = await anon
      .from('palmares')
      .insert({ profile_id: profileId, competition: 'Injection anon', result: 'Fraude' })
    expect(error).not.toBeNull()
  }, TIMEOUT)

  it('un utilisateur ne peut pas modifier le palmarès d\'un autre', async () => {
    const attacker = await createAuthenticatedClient(ATTACKER_EMAIL, ATTACKER_PASSWORD)
    await attacker
      .from('palmares')
      .update({ competition: 'HACKED' })
      .eq('id', palmaresId)

    const { data } = await admin
      .from('palmares')
      .select('competition')
      .eq('id', palmaresId)
      .single()
    expect(data?.competition).not.toBe('HACKED')
  }, TIMEOUT)
})
```

- [ ] **Step 2: Lancer les tests**

```bash
cd /var/www/projects/cv_judo && npm run test -- __tests__/security/profileMutation.test.ts
```

Résultat attendu : tous les tests PASS.

- [ ] **Step 3: Commit**

```bash
cd /var/www/projects/cv_judo && git add __tests__/security/profileMutation.test.ts
git commit -m "test: add RLS security tests for profile and palmares mutations"
```

---

### Task 9: Tests d'intégration — togglePublished (Server Action)

**Files:**
- Create: `__tests__/integration/publishProfile.test.ts`

**Interfaces:**
- Consumes: `togglePublished` depuis `app/dashboard/actions.ts`
  - Signature : `togglePublished(_prevState: ToggleResult, formData: FormData): Promise<ToggleResult>`
  - `ToggleResult = { ok: boolean | null; missing: string[]; unpublished: boolean }`
- Mocks requis : `next/cache`, `next/navigation`, `@/lib/supabase/server`

**Note :** `redirect()` est mocké pour lancer une erreur avec `digest: 'NEXT_REDIRECT'`. `togglePublished` re-throw ce type d'erreur (voir `catch (e)` dans `app/dashboard/actions.ts:54`). Les tests sur l'utilisateur non-authentifié doivent donc utiliser `expect(...).rejects`.

- [ ] **Step 1: Créer `__tests__/integration/publishProfile.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Les vi.mock() sont hoistés avant les imports par Vitest
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn().mockImplementation((url: string) => {
    const err = Object.assign(new Error(`Redirect to ${url}`), { digest: 'NEXT_REDIRECT' })
    throw err
  }),
}))

const mockFrom = vi.fn()
const mockGetUser = vi.fn()
const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase,
}))

import { togglePublished, type ToggleResult } from '@/app/dashboard/actions'

const PREV_STATE: ToggleResult = { ok: null, missing: [], unpublished: false }

function makeFormData(opts: { profileId: string; slug: string; next: boolean }): FormData {
  const fd = new FormData()
  fd.set('profileId', opts.profileId)
  fd.set('slug', opts.slug)
  fd.set('next', String(opts.next))
  return fd
}

function makeProfileData(overrides: Partial<Record<string, string | null>> = {}) {
  return {
    club: 'Judo Club Paris',
    category: '-66kg',
    grade: 'Ceinture noire',
    bio: 'Judoka depuis 10 ans.',
    profile_photo_url: 'https://cdn.example.com/photo.jpg',
    birth_date: '2010-04-02',
    ...overrides,
  }
}

function setupMocks(opts: {
  userId?: string | null
  profileData?: Record<string, string | null> | null
}) {
  const userId = opts.userId !== undefined ? opts.userId : 'user-1'

  mockGetUser.mockResolvedValue({
    data: { user: userId ? { id: userId } : null },
  })

  // Premier appel from() → select (quand next=true)
  // Deuxième appel from() → update
  mockFrom.mockImplementation(() => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: opts.profileData ?? null,
            error: opts.profileData === null ? { message: 'Not found' } : null,
          }),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  }))
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('togglePublished — publication (next = true)', () => {
  it('profil complet → publication réussie', async () => {
    setupMocks({ userId: 'user-1', profileData: makeProfileData() })

    const result = await togglePublished(
      PREV_STATE,
      makeFormData({ profileId: 'profile-1', slug: 'timothe-francois', next: true })
    )

    expect(result.ok).toBe(true)
    expect(result.missing).toEqual([])
    expect(result.unpublished).toBe(false)
  })

  it('profil incomplet (bio manquante) → refus avec champs manquants', async () => {
    setupMocks({ userId: 'user-1', profileData: makeProfileData({ bio: null }) })

    const result = await togglePublished(
      PREV_STATE,
      makeFormData({ profileId: 'profile-1', slug: 'timothe-francois', next: true })
    )

    expect(result.ok).toBe(false)
    expect(result.missing).toContain('Bio')
    expect(result.unpublished).toBe(false)
  })

  it('profil incomplet (photo + club manquants) → les deux champs listés', async () => {
    setupMocks({
      userId: 'user-1',
      profileData: makeProfileData({ profile_photo_url: null, club: null }),
    })

    const result = await togglePublished(
      PREV_STATE,
      makeFormData({ profileId: 'profile-1', slug: 'timothe-francois', next: true })
    )

    expect(result.ok).toBe(false)
    expect(result.missing).toContain('Photo de profil')
    expect(result.missing).toContain('Club')
  })
})

describe('togglePublished — dépublication (next = false)', () => {
  it('dépublication → succès sans vérification des champs', async () => {
    setupMocks({ userId: 'user-1' })

    const result = await togglePublished(
      PREV_STATE,
      makeFormData({ profileId: 'profile-1', slug: 'timothe-francois', next: false })
    )

    expect(result.ok).toBe(true)
    expect(result.unpublished).toBe(true)
    // La sélection du profil n'est PAS appelée pour la dépublication
    expect(mockFrom).toHaveBeenCalledTimes(1) // seulement update
  })
})

describe('togglePublished — cas d\'erreur', () => {
  it('utilisateur non authentifié → redirect lancé', async () => {
    setupMocks({ userId: null })

    await expect(
      togglePublished(PREV_STATE, makeFormData({ profileId: 'p', slug: 's', next: true }))
    ).rejects.toMatchObject({ digest: 'NEXT_REDIRECT' })
  })

  it('profil non trouvé (autre propriétaire) → redirect lancé', async () => {
    setupMocks({ userId: 'user-1', profileData: null })

    await expect(
      togglePublished(PREV_STATE, makeFormData({ profileId: 'autre-profile', slug: 's', next: true }))
    ).rejects.toMatchObject({ digest: 'NEXT_REDIRECT' })
  })
})
```

- [ ] **Step 2: Lancer les tests**

```bash
cd /var/www/projects/cv_judo && npm run test -- __tests__/integration/publishProfile.test.ts
```

Résultat attendu : tous les tests PASS (pas de connexion Supabase réelle — tout est mocké).

- [ ] **Step 3: Commit**

```bash
cd /var/www/projects/cv_judo && git add __tests__/integration/publishProfile.test.ts
git commit -m "test: add integration tests for togglePublished Server Action"
```

---

### Task 10: Tests d'intégration — deleteAccount (Server Action)

**Files:**
- Create: `__tests__/integration/deleteAccount.test.ts`

**Interfaces:**
- Consumes: `deleteAccount` depuis `app/dashboard/profil/actions.ts`
  - Signature : `deleteAccount(): Promise<never>` (toujours redirect ou throw)
- Mocks requis : `next/navigation`, `@/lib/supabase/server`, `@/lib/supabase/admin`
- La fonction se termine TOUJOURS par `redirect('/')` → les tests doivent catch l'erreur NEXT_REDIRECT

- [ ] **Step 1: Créer `__tests__/integration/deleteAccount.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('next/navigation', () => ({
  redirect: vi.fn().mockImplementation((url: string) => {
    const err = Object.assign(new Error(`Redirect to ${url}`), { digest: 'NEXT_REDIRECT' })
    throw err
  }),
}))

const mockGetUser = vi.fn()
const mockSignOut = vi.fn()
const mockServerSupabase = {
  auth: {
    getUser: mockGetUser,
    signOut: mockSignOut,
  },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockServerSupabase,
}))

const mockStorageFrom = vi.fn()
const mockDeleteUser = vi.fn()
const mockAdminClient = {
  storage: { from: mockStorageFrom },
  auth: { admin: { deleteUser: mockDeleteUser } },
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockAdminClient,
}))

import { deleteAccount } from '@/app/dashboard/profil/actions'

beforeEach(() => {
  vi.clearAllMocks()
  mockSignOut.mockResolvedValue({ error: null })
  mockDeleteUser.mockResolvedValue({ error: null })
})

describe('deleteAccount', () => {
  it('supprime les fichiers storage, le compte utilisateur, puis redirige', async () => {
    const userId = 'user-abc-123'
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } } })

    const listMock = vi.fn().mockResolvedValue({
      data: [{ name: 'photo.jpg' }, { name: 'cover.jpg' }],
      error: null,
    })
    const removeMock = vi.fn().mockResolvedValue({ error: null })
    mockStorageFrom.mockReturnValue({ list: listMock, remove: removeMock })

    // deleteAccount se termine toujours par redirect → on attend l'erreur NEXT_REDIRECT
    await expect(deleteAccount()).rejects.toMatchObject({ digest: 'NEXT_REDIRECT' })

    // Vérifier que les fichiers ont été listés dans le bon dossier
    expect(listMock).toHaveBeenCalledWith(userId)

    // Vérifier que les fichiers ont été supprimés avec les bons chemins
    expect(removeMock).toHaveBeenCalledWith([
      `${userId}/photo.jpg`,
      `${userId}/cover.jpg`,
    ])

    // Vérifier que l'utilisateur a été supprimé via l'admin client
    expect(mockDeleteUser).toHaveBeenCalledWith(userId)

    // Vérifier que la session a été terminée
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('suppression réussie même si le dossier storage est vide', async () => {
    const userId = 'user-no-files'
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } } })

    const listMock = vi.fn().mockResolvedValue({ data: [], error: null })
    const removeMock = vi.fn()
    mockStorageFrom.mockReturnValue({ list: listMock, remove: removeMock })

    await expect(deleteAccount()).rejects.toMatchObject({ digest: 'NEXT_REDIRECT' })

    // Aucun fichier → remove ne doit pas être appelé
    expect(removeMock).not.toHaveBeenCalled()
    // Mais l'utilisateur doit quand même être supprimé
    expect(mockDeleteUser).toHaveBeenCalledWith(userId)
  })

  it('utilisateur non authentifié → redirect immédiat', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    await expect(deleteAccount()).rejects.toMatchObject({ digest: 'NEXT_REDIRECT' })

    // Aucune suppression ne doit avoir eu lieu
    expect(mockDeleteUser).not.toHaveBeenCalled()
    expect(mockSignOut).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Lancer les tests**

```bash
cd /var/www/projects/cv_judo && npm run test -- __tests__/integration/deleteAccount.test.ts
```

Résultat attendu : tous les tests PASS (pas de connexion Supabase réelle).

- [ ] **Step 3: Lancer TOUS les tests (sans les tests de sécurité qui nécessitent supabase start)**

```bash
cd /var/www/projects/cv_judo && npm run test -- __tests__/unit/ __tests__/integration/
```

Résultat attendu : tous les tests PASS en < 5s.

- [ ] **Step 4: Commit**

```bash
cd /var/www/projects/cv_judo && git add __tests__/integration/deleteAccount.test.ts
git commit -m "test: add integration tests for deleteAccount Server Action"
```

---

### Task 11: Rapport de couverture, CI GitHub, README

**Files:**
- Create: `.github/workflows/tests.yml`
- Create: `__tests__/README.md`

- [ ] **Step 1: Générer le rapport de couverture sur les fichiers ciblés**

```bash
cd /var/www/projects/cv_judo && npm run test:coverage -- __tests__/unit/ __tests__/integration/
```

Résultat attendu : rapport texte dans le terminal montrant la couverture sur `lib/slugify.ts`, `lib/profileValidation.ts`, `lib/palmaresStats.ts`, `app/dashboard/actions.ts`, `app/dashboard/profil/actions.ts`. Partager le rapport avec l'utilisateur.

- [ ] **Step 2: Créer `.github/workflows/tests.yml`**

> Note : les tests de sécurité (dossier `__tests__/security/`) nécessitent Supabase local. La CI ne les inclut PAS par défaut (infrastructure complexe). Ils sont marqués dans le pattern d'exclusion.

```yaml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-and-integration:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit and integration tests
        run: npx vitest run __tests__/unit/ __tests__/integration/
        env:
          # Valeurs fictives — les tests unitaires/intégration mockent tout
          NEXT_PUBLIC_SUPABASE_URL: http://localhost:54321
          NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder-anon-key
          SUPABASE_SERVICE_ROLE_KEY: placeholder-service-role-key
```

- [ ] **Step 3: Créer `__tests__/README.md`**

```markdown
# Tests IpponId

Philosophie : tests ciblés sur la logique métier critique et les règles de sécurité RLS — pas de couverture exhaustive.

## Lancer les tests

```bash
npm run test              # One-shot (unit + integration)
npm run test:watch        # Mode watch pour le développement
npm run test:coverage     # Avec rapport de couverture
```

## Structure

| Dossier | Contenu | Prérequis |
|---------|---------|-----------|
| `unit/` | Fonctions pures — slugify, profileValidation, palmaresStats | Aucun |
| `integration/` | Server Actions critiques — Supabase mocké via vi.mock() | Aucun |
| `security/` | Règles RLS Supabase — base réelle | `supabase start` + `.env.local` |

## Tests de sécurité RLS (dossier `security/`)

Ces tests vérifient que la base Supabase locale bloque bien les accès non autorisés.

**Prérequis :**
1. `supabase start` doit être lancé
2. `.env.local` doit contenir `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

```bash
supabase start
npm run test -- __tests__/security/
```

**Règles RLS testées :**
- `published = true` → lisible par tous (anon + authentifiés)
- `published = false` → lisible uniquement par le propriétaire
- Mutations (UPDATE/DELETE/INSERT) → uniquement par le propriétaire, jamais par un autre utilisateur ou anon

## CI GitHub

La CI (`.github/workflows/tests.yml`) lance uniquement les tests unit/ et integration/ à chaque push sur `main` et chaque Pull Request. Les tests de sécurité (qui nécessitent Supabase local) sont exclus de la CI par défaut.
```

- [ ] **Step 4: Commit final**

```bash
cd /var/www/projects/cv_judo && git add .github/workflows/tests.yml __tests__/README.md
git commit -m "test: add CI workflow and test README"
```

---

## Self-Review

**Vérification spec vs plan :**

| Exigence spec | Tâche couverte |
|---------------|----------------|
| Install Vitest + @vitest/coverage-v8 | Task 1 |
| Scripts test/test:watch/test:coverage | Task 1 |
| `__tests__/unit/slugify.test.ts` | Task 3 |
| `__tests__/unit/profileValidation.test.ts` | Task 4 |
| `__tests__/unit/palmaresStats.test.ts` | Task 5 (+ extraction Task 2) |
| Helper supabaseTestClient | Task 6 |
| `__tests__/security/profileAccess.test.ts` | Task 7 |
| `__tests__/security/profileMutation.test.ts` | Task 8 |
| `__tests__/integration/publishProfile.test.ts` | Task 9 |
| `__tests__/integration/deleteAccount.test.ts` | Task 10 |
| `npm run test:coverage` + rapport | Task 11, Step 1 |
| CI GitHub | Task 11, Step 2 |
| `__tests__/README.md` | Task 11, Step 3 |

**Divergences spec → réalité documentées :**
- Spec mentionne `visibility = 'private'` / `'draft'` → N'existe pas. Schéma réel : `published: boolean` seulement. Le concept "profil privé visible aux authentifiés" n'est pas implémenté dans les RLS actuelles — remplacé par des tests pubilé/non-publié dans Task 7.
- Spec mentionne "lib/slugService.ts" → fichier réel est `lib/slugify.ts`.
- `palmaresStats` n'existait pas → extrait en Task 2 puis testé en Task 5.
