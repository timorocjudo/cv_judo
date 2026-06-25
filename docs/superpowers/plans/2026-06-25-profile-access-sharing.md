# Profile Access Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à un owner d'inviter d'autres comptes IpponId à gérer (manager) ou consulter (viewer) son profil judoka, avec interface de gestion dans le dashboard.

**Architecture:** La route API `/api/profile-access` (POST, admin client) gère la résolution email→UUID et les mutations ; le service `profileAccessService.ts` contient la logique métier (validations, RLS via client session) ; la page `/dashboard/[profileId]/acces` est réservée aux owners et charge les données initiales via `createAdminClient()` directement, sans aller-retour HTTP superflu.

**Tech Stack:** Next.js 14 App Router, Supabase (RLS + admin client SERVICE_ROLE_KEY), TypeScript, Tailwind CSS, sonner (toasts), vitest

## Global Constraints

- Jamais l'email complet d'un tiers retourné dans une réponse JSON côté client
- Anti-énumération : même message `"Aucun compte IpponId associé à cet email."` pour email inexistant ET email déjà présent
- `addProfileAccess` / `removeProfileAccess` dans le service reçoivent des UUIDs (pas des emails) — la résolution email→UUID est dans la route API
- Tous les fichiers `'use server'` n'importent jamais `createAdminClient` sauf `app/api/profile-access/route.ts` et `app/dashboard/[profileId]/acces/page.tsx`
- Tailwind uniquement pour le style, tokens existants (`text-primary`, `bg-surface`, `font-montserrat`, etc.)
- Tests skippés si `SUPABASE_SERVICE_ROLE_KEY` absent
- Commande de test : `npx vitest run __tests__/...`
- Commande lint/types : `npx tsc --noEmit && npm run lint`

---

## File Map

| Fichier | Action | Responsabilité |
|---------|--------|----------------|
| `supabase/migrations/0009_profile_access_rls_update.sql` | Créer | 3 nouvelles RLS policies + SQL function `get_account_id_by_email` |
| `lib/profileAccessService.ts` | Modifier | Ajouter `ProfileAccessEntry`, `getProfileAccesses`, `addProfileAccess`, `removeProfileAccess` |
| `app/api/profile-access/route.ts` | Créer | POST handler : list / add / remove — utilise admin client |
| `components/dashboard/ProfileAccessManager.tsx` | Créer | Client component : liste accès + formulaire d'invitation |
| `app/dashboard/[profileId]/acces/page.tsx` | Créer | Server component owner-only : guard + chargement initial |
| `components/dashboard/DashboardProfileNav.tsx` | Modifier | Ajout item "Accès & partage" owner-only (desktop + mobile) |
| `__tests__/unit/profileAccessService.test.ts` | Créer | 3 tests unitaires des nouvelles fonctions (mocks vitest) |
| `__tests__/security/profileAccessSharing.test.ts` | Créer | 9 tests d'intégration (mock `createClient` → vrai Supabase) |

---

## Task 1: Migration RLS + SQL function

**Files:**
- Create: `supabase/migrations/0009_profile_access_rls_update.sql`

**Interfaces:**
- Produces: policy `pa_owner_select_profile`, `pa_owner_insert_for_profile`, `pa_owner_delete_others`; function `public.get_account_id_by_email(p_email text) → uuid`

- [ ] **Step 1: Créer la migration**

Créer le fichier `supabase/migrations/0009_profile_access_rls_update.sql` avec ce contenu exact :

```sql
-- supabase/migrations/0009_profile_access_rls_update.sql
-- Défense en profondeur : policies owner sur profile_access
-- + helper function pour la recherche par email (utilisée par la route API)

-- ─── 1. Owner peut lire toutes les lignes de ses profils ──────────────────────

CREATE POLICY "pa_owner_select_profile"
  ON public.profile_access FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profile_access pa2
      WHERE pa2.profile_id = profile_access.profile_id
        AND pa2.account_id = auth.uid()
        AND pa2.role = 'owner'
    )
  );

-- ─── 2. Owner peut insérer des lignes non-owner pour ses profils ──────────────

CREATE POLICY "pa_owner_insert_for_profile"
  ON public.profile_access FOR INSERT TO authenticated
  WITH CHECK (
    role != 'owner'
    AND EXISTS (
      SELECT 1 FROM public.profile_access pa2
      WHERE pa2.profile_id = profile_access.profile_id
        AND pa2.account_id = auth.uid()
        AND pa2.role = 'owner'
    )
  );

-- ─── 3. Owner peut supprimer les lignes non-owner de ses profils ──────────────

CREATE POLICY "pa_owner_delete_others"
  ON public.profile_access FOR DELETE TO authenticated
  USING (
    role != 'owner'
    AND EXISTS (
      SELECT 1 FROM public.profile_access pa2
      WHERE pa2.profile_id = profile_access.profile_id
        AND pa2.account_id = auth.uid()
        AND pa2.role = 'owner'
    )
  );

-- ─── 4. Helper : résolution email → account_id (SECURITY DEFINER) ────────────

CREATE OR REPLACE FUNCTION public.get_account_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
$$;
```

- [ ] **Step 2: Appliquer la migration**

```bash
npx supabase db push
```

Résultat attendu : `Applied 1 migration(s)` (ou message similaire sans erreur). Si Supabase local n'est pas disponible, passer à l'étape suivante — les tests d'intégration valideront la migration.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0009_profile_access_rls_update.sql
git commit -m "feat: RLS owner policies + get_account_id_by_email helper"
```

---

## Task 2: Nouvelles fonctions service + tests unitaires (TDD)

**Files:**
- Modify: `lib/profileAccessService.ts`
- Create: `__tests__/unit/profileAccessService.test.ts`

**Interfaces:**
- Consumes: `isProfileOwner(profileId, accountId): Promise<boolean>` (déjà dans le fichier), `createClient()` from `@/lib/supabase/server`
- Produces:
  - `ProfileAccessEntry { id, account_id, role: ProfileRole, invited_by: string|null, created_at: string }`
  - `getProfileAccesses(profileId: string): Promise<ProfileAccessEntry[]>`
  - `addProfileAccess(profileId: string, targetAccountId: string, role: 'manager'|'viewer', requestingAccountId: string): Promise<{ success: boolean; message: string }>`
  - `removeProfileAccess(profileId: string, targetAccountId: string, requestingAccountId: string): Promise<{ success: boolean; message: string }>`

- [ ] **Step 1: Écrire les tests unitaires**

Créer `__tests__/unit/profileAccessService.test.ts` :

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockSupabase = { from: mockFrom }

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase,
}))

vi.mock('@/lib/judokaService', () => ({
  getJudokaBySlug: vi.fn(),
}))

import {
  getProfileAccesses,
  addProfileAccess,
  removeProfileAccess,
} from '@/lib/profileAccessService'

function makeChain(returnValue: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'in', 'maybeSingle', 'single', 'order', 'insert', 'delete']
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain)
  })
  chain.then = vi.fn((resolve: (v: unknown) => void) => Promise.resolve(returnValue).then(resolve))
  ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue(returnValue)
  ;(chain.single as ReturnType<typeof vi.fn>).mockResolvedValue(returnValue)
  return chain
}

beforeEach(() => vi.clearAllMocks())

describe('getProfileAccesses', () => {
  it('retourne toutes les lignes avec les bons rôles', async () => {
    const fakeRows = [
      { id: '1', account_id: 'u1', role: 'owner', invited_by: null, created_at: '2024-01-01T00:00:00Z' },
      { id: '2', account_id: 'u2', role: 'manager', invited_by: 'u1', created_at: '2024-02-01T00:00:00Z' },
    ]
    mockFrom.mockReturnValue(makeChain({ data: fakeRows, error: null }))

    const result = await getProfileAccesses('profile-1')
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ account_id: 'u1', role: 'owner' })
    expect(result[1]).toMatchObject({ account_id: 'u2', role: 'manager', invited_by: 'u1' })
  })

  it('retourne un tableau vide en cas d\'erreur', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }))
    const result = await getProfileAccesses('profile-1')
    expect(result).toEqual([])
  })
})

describe('addProfileAccess', () => {
  it('insère la ligne avec le bon rôle et invited_by', async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: { id: 'a1' }, error: null }))  // isProfileOwner → owner
      .mockReturnValueOnce(makeChain({ data: null, error: null }))            // pas de doublon
      .mockReturnValueOnce(makeChain({ error: null }))                        // insert OK
    const result = await addProfileAccess('profile-1', 'user-2', 'manager', 'user-1')
    expect(result).toEqual({ success: true, message: 'Accès ajouté.' })
    const insertCall = (mockFrom.mock.results[2].value.insert as ReturnType<typeof vi.fn>)
    expect(insertCall).toHaveBeenCalledWith({
      profile_id: 'profile-1',
      account_id: 'user-2',
      role: 'manager',
      invited_by: 'user-1',
    })
  })

  it('refuse si le demandeur n\'est pas owner', async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: null })) // isProfileOwner → false
    const result = await addProfileAccess('profile-1', 'user-2', 'manager', 'non-owner')
    expect(result).toEqual({ success: false, message: 'Accès refusé.' })
    expect(mockFrom).toHaveBeenCalledTimes(1)
  })

  it('refuse si le demandeur s\'ajoute lui-même', async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: { id: 'a1' }, error: null })) // isProfileOwner → true
    const result = await addProfileAccess('profile-1', 'user-1', 'manager', 'user-1')
    expect(result).toEqual({ success: false, message: 'Tu ne peux pas t\'ajouter toi-même.' })
    expect(mockFrom).toHaveBeenCalledTimes(1)
  })

  it('retourne message neutre si doublon', async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: { id: 'a1' }, error: null })) // isProfileOwner → true
      .mockReturnValueOnce(makeChain({ data: { id: 'existing' }, error: null })) // doublon trouvé
    const result = await addProfileAccess('profile-1', 'user-2', 'viewer', 'user-1')
    expect(result).toEqual({ success: false, message: 'Aucun compte IpponId associé à cet email.' })
  })
})

describe('removeProfileAccess', () => {
  it('supprime la ligne et retourne succès', async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: { id: 'a1' }, error: null }))           // isProfileOwner → true
      .mockReturnValueOnce(makeChain({ data: { id: 'row', role: 'manager' }, error: null })) // cible est manager
      .mockReturnValueOnce(makeChain({ error: null }))                                 // delete OK
    const result = await removeProfileAccess('profile-1', 'user-2', 'user-1')
    expect(result).toEqual({ success: true, message: 'Accès retiré.' })
  })

  it('refuse si la cible est owner', async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: { id: 'a1' }, error: null }))           // isProfileOwner → true
      .mockReturnValueOnce(makeChain({ data: { id: 'owner-row', role: 'owner' }, error: null })) // cible est owner
    const result = await removeProfileAccess('profile-1', 'user-owner', 'user-1')
    expect(result).toEqual({ success: false, message: 'Impossible de retirer le propriétaire du profil.' })
    expect(mockFrom).toHaveBeenCalledTimes(2)
  })

  it('refuse si le demandeur n\'est pas owner', async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: null })) // isProfileOwner → false
    const result = await removeProfileAccess('profile-1', 'user-2', 'non-owner')
    expect(result).toEqual({ success: false, message: 'Accès refusé.' })
    expect(mockFrom).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Vérifier que les tests échouent**

```bash
npx vitest run __tests__/unit/profileAccessService.test.ts
```

Résultat attendu : erreurs `getProfileAccesses is not a function` ou `TypeError` — les fonctions n'existent pas encore.

- [ ] **Step 3: Implémenter les nouvelles fonctions**

Ajouter à la fin de `lib/profileAccessService.ts` (après les exports existants) :

```typescript
export type ProfileAccessEntry = {
  id: string
  account_id: string
  role: ProfileRole
  invited_by: string | null
  created_at: string
}

export async function getProfileAccesses(profileId: string): Promise<ProfileAccessEntry[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profile_access')
    .select('id, account_id, role, invited_by, created_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return data as ProfileAccessEntry[]
}

export async function addProfileAccess(
  profileId: string,
  targetAccountId: string,
  role: 'manager' | 'viewer',
  requestingAccountId: string
): Promise<{ success: boolean; message: string }> {
  const ownerCheck = await isProfileOwner(profileId, requestingAccountId)
  if (!ownerCheck) return { success: false, message: 'Accès refusé.' }

  if (targetAccountId === requestingAccountId) {
    return { success: false, message: "Tu ne peux pas t'ajouter toi-même." }
  }

  const supabase = createClient()
  const { data: existing } = await supabase
    .from('profile_access')
    .select('id')
    .eq('profile_id', profileId)
    .eq('account_id', targetAccountId)
    .maybeSingle()

  if (existing) return { success: false, message: 'Aucun compte IpponId associé à cet email.' }

  const { error } = await supabase
    .from('profile_access')
    .insert({ profile_id: profileId, account_id: targetAccountId, role, invited_by: requestingAccountId })

  if (error) return { success: false, message: 'Une erreur est survenue.' }

  return { success: true, message: 'Accès ajouté.' }
}

export async function removeProfileAccess(
  profileId: string,
  targetAccountId: string,
  requestingAccountId: string
): Promise<{ success: boolean; message: string }> {
  const ownerCheck = await isProfileOwner(profileId, requestingAccountId)
  if (!ownerCheck) return { success: false, message: 'Accès refusé.' }

  const supabase = createClient()
  const { data: target } = await supabase
    .from('profile_access')
    .select('id, role')
    .eq('profile_id', profileId)
    .eq('account_id', targetAccountId)
    .maybeSingle()

  if (!target) return { success: false, message: 'Accès introuvable.' }
  if (target.role === 'owner') return { success: false, message: 'Impossible de retirer le propriétaire du profil.' }

  const { error } = await supabase
    .from('profile_access')
    .delete()
    .eq('profile_id', profileId)
    .eq('account_id', targetAccountId)

  if (error) return { success: false, message: 'Une erreur est survenue.' }

  return { success: true, message: 'Accès retiré.' }
}
```

- [ ] **Step 4: Vérifier que les tests passent**

```bash
npx vitest run __tests__/unit/profileAccessService.test.ts
```

Résultat attendu : `9 tests passed`.

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Step 6: Commit**

```bash
git add lib/profileAccessService.ts __tests__/unit/profileAccessService.test.ts
git commit -m "feat: getProfileAccesses, addProfileAccess, removeProfileAccess"
```

---

## Task 3: Route API `/api/profile-access`

**Files:**
- Create: `app/api/profile-access/route.ts`

**Interfaces:**
- Consumes: `createClient()` from `@/lib/supabase/server`, `createAdminClient()` from `@/lib/supabase/admin`, `getProfileAccesses`, `addProfileAccess`, `removeProfileAccess` from `@/lib/profileAccessService`
- Produces: `POST /api/profile-access` → JSON `{ accesses? }` | `{ success, message }` | `{ error }`
  - Body `{ action: 'list', profileId }` → `{ accesses: Array<{ account_id, role, created_at, display_name }> }`
  - Body `{ action: 'add', profileId, email, role }` → `{ success: boolean, message: string }`
  - Body `{ action: 'remove', profileId, targetAccountId }` → `{ success: boolean, message: string }`

- [ ] **Step 1: Créer la route**

Créer `app/api/profile-access/route.ts` :

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getProfileAccesses,
  addProfileAccess,
  removeProfileAccess,
} from '@/lib/profileAccessService'

function buildDisplayName(
  firstName: string | null,
  lastName: string | null,
  email: string | null
): string {
  if (firstName && lastName) return `${firstName} ${lastName[0]}.`
  if (firstName) return firstName
  if (email) return email.split('@')[0]
  return 'Inconnu'
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: Record<string, string>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
  }

  const { action, profileId } = body
  if (!action || !profileId) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  if (action === 'list') {
    const adminClient = createAdminClient()
    const rows = await getProfileAccesses(profileId)
    const accountIds = rows.map((r) => r.account_id)

    const [profilesResult, usersResult] = await Promise.all([
      adminClient.from('profiles').select('owner_id, first_name, last_name').in('owner_id', accountIds),
      adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ])

    const profileMap = new Map(profilesResult.data?.map((p) => [p.owner_id, p]) ?? [])
    const userMap = new Map(usersResult.data?.users.map((u) => [u.id, u]) ?? [])

    const accesses = rows.map((row) => {
      const profile = profileMap.get(row.account_id)
      const authUser = userMap.get(row.account_id)
      return {
        account_id: row.account_id,
        role: row.role,
        created_at: row.created_at,
        display_name: buildDisplayName(
          profile?.first_name ?? null,
          profile?.last_name ?? null,
          authUser?.email ?? null
        ),
      }
    })

    return NextResponse.json({ accesses })
  }

  if (action === 'add') {
    const { email, role } = body
    if (!email || !['manager', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const { data: targetAccountId } = await adminClient.rpc('get_account_id_by_email', {
      p_email: email,
    })

    if (!targetAccountId) {
      return NextResponse.json({
        success: false,
        message: 'Aucun compte IpponId associé à cet email.',
      })
    }

    const result = await addProfileAccess(
      profileId,
      targetAccountId as string,
      role as 'manager' | 'viewer',
      user.id
    )
    return NextResponse.json(result)
  }

  if (action === 'remove') {
    const { targetAccountId } = body
    if (!targetAccountId) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }
    const result = await removeProfileAccess(profileId, targetAccountId, user.id)
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Step 3: Test manuel rapide** (si Supabase local disponible)

Lancer le serveur :
```bash
npm run dev
```

Puis dans un autre terminal (adapter le cookie de session) :
```bash
curl -X POST http://localhost:3000/api/profile-access \
  -H "Content-Type: application/json" \
  -d '{"action":"list","profileId":"<un-vrai-uuid>"}' \
  -b "<cookie-de-session>"
```

Résultat attendu : `{"accesses":[...]}` sans email exposé.

- [ ] **Step 4: Commit**

```bash
git add app/api/profile-access/route.ts
git commit -m "feat: route API /api/profile-access (list/add/remove)"
```

---

## Task 4: Composant `ProfileAccessManager`

**Files:**
- Create: `components/dashboard/ProfileAccessManager.tsx`

**Interfaces:**
- Consumes: `POST /api/profile-access` (route Task 3), `toast` from `sonner`, `ProfileRole` from `@/lib/profileAccessService`
- Produces: `default export ProfileAccessManager({ profileId, currentAccountId, initialAccesses })`

```typescript
type DisplayAccess = {
  account_id: string
  role: ProfileRole
  created_at: string
  display_name: string
}

type Props = {
  profileId: string
  currentAccountId: string
  initialAccesses: DisplayAccess[]
}
```

- [ ] **Step 1: Créer le composant**

Créer `components/dashboard/ProfileAccessManager.tsx` :

```typescript
'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import type { ProfileRole } from '@/lib/profileAccessService'

type DisplayAccess = {
  account_id: string
  role: ProfileRole
  created_at: string
  display_name: string
}

type Props = {
  profileId: string
  currentAccountId: string
  initialAccesses: DisplayAccess[]
}

const ROLE_LABELS: Record<ProfileRole, string> = {
  owner: 'Propriétaire',
  manager: 'Gestionnaire',
  viewer: 'Lecteur',
}

const ROLE_BADGE_CLASSES: Record<ProfileRole, string> = {
  owner: 'bg-primary/10 text-primary border border-primary/20',
  manager: 'bg-blue-50 text-blue-700 border border-blue-200',
  viewer: 'bg-surface-container text-on-surface-variant border border-outline-variant',
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
      <h2 className="font-montserrat text-headline-md font-bold text-primary uppercase">
        {children}
      </h2>
    </div>
  )
}

export default function ProfileAccessManager({ profileId, currentAccountId, initialAccesses }: Props) {
  const [accesses, setAccesses] = useState<DisplayAccess[]>(initialAccesses)
  const [isPending, setIsPending] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function refreshList() {
    const res = await fetch('/api/profile-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', profileId }),
    })
    if (res.ok) {
      const { accesses: fresh } = await res.json()
      setAccesses(fresh)
    }
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const role = (form.elements.namedItem('role') as HTMLSelectElement).value

    setIsPending(true)
    try {
      const res = await fetch('/api/profile-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', profileId, email, role }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        formRef.current?.reset()
        await refreshList()
      } else {
        toast.error(data.message)
      }
    } catch {
      toast.error('Une erreur est survenue')
    } finally {
      setIsPending(false)
    }
  }

  async function handleRemove(targetAccountId: string) {
    try {
      const res = await fetch('/api/profile-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', profileId, targetAccountId }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        await refreshList()
      } else {
        toast.error(data.message)
      }
    } catch {
      toast.error('Une erreur est survenue')
    }
  }

  return (
    <div className="space-y-10">
      <section>
        <SectionHeader>Personnes ayant accès</SectionHeader>
        <ul className="divide-y divide-outline-variant">
          {accesses.map((access) => (
            <li key={access.account_id} className="flex items-center justify-between py-3 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-medium text-on-surface truncate">{access.display_name}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${ROLE_BADGE_CLASSES[access.role]}`}>
                  {ROLE_LABELS[access.role]}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-on-surface-variant hidden sm:block">
                  {new Date(access.created_at).toLocaleDateString('fr-FR')}
                </span>
                {access.role !== 'owner' && (
                  <button
                    onClick={() => handleRemove(access.account_id)}
                    className="text-xs text-error hover:underline"
                  >
                    Retirer
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionHeader>Inviter une personne</SectionHeader>
        <form ref={formRef} onSubmit={handleAdd} className="space-y-4 max-w-md">
          <input
            type="email"
            name="email"
            placeholder="Adresse email du compte IpponId"
            required
            className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <select
            name="role"
            defaultValue="manager"
            className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="manager">Gestionnaire — peut modifier le profil, ajouter des résultats, des photos, des vidéos</option>
            <option value="viewer">Lecteur — peut voir le profil même s'il est en brouillon ou privé, ne peut pas modifier</option>
          </select>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-primary text-on-primary text-sm font-semibold rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Envoi…
              </span>
            ) : (
              'Inviter'
            )}
          </button>
          <p className="text-xs text-on-surface-variant">
            La personne doit avoir un compte IpponId avec cette adresse email pour pouvoir accéder au profil.
          </p>
        </form>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/ProfileAccessManager.tsx
git commit -m "feat: ProfileAccessManager client component"
```

---

## Task 5: Page `/dashboard/[profileId]/acces`

**Files:**
- Create: `app/dashboard/[profileId]/acces/page.tsx`

**Interfaces:**
- Consumes: `createClient()` from `@/lib/supabase/server`, `createAdminClient()` from `@/lib/supabase/admin`, `isProfileOwner` from `@/lib/profileAccessService`, `ProfileAccessManager` (Task 4)
- Produces: Server Component exporté par défaut, accessible à `/dashboard/[profileId]/acces`

- [ ] **Step 1: Créer la page**

Créer `app/dashboard/[profileId]/acces/page.tsx` :

```typescript
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isProfileOwner } from '@/lib/profileAccessService'
import ProfileAccessManager from '@/components/dashboard/ProfileAccessManager'

export const metadata: Metadata = { title: 'Accès & partage' }

export default async function ProfileAccessPage({ params }: { params: { profileId: string } }) {
  const { profileId } = params
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const owner = await isProfileOwner(profileId, user.id)
  if (!owner) redirect(`/dashboard/${profileId}`)

  const adminClient = createAdminClient()

  const { data: accessRows } = await adminClient
    .from('profile_access')
    .select('account_id, role, created_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true })

  const rows = accessRows ?? []
  const accountIds = rows.map((r) => r.account_id)

  const [profilesResult, usersResult] = await Promise.all([
    adminClient.from('profiles').select('owner_id, first_name, last_name').in('owner_id', accountIds),
    adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  const profileMap = new Map(profilesResult.data?.map((p) => [p.owner_id, p]) ?? [])
  const userMap = new Map(usersResult.data?.users.map((u) => [u.id, u]) ?? [])

  const accesses = rows.map((row) => {
    const profile = profileMap.get(row.account_id)
    const authUser = userMap.get(row.account_id)
    const firstName = profile?.first_name ?? null
    const lastName = profile?.last_name ?? null
    const email = authUser?.email ?? null
    const display_name =
      firstName && lastName
        ? `${firstName} ${lastName[0]}.`
        : firstName ?? (email ? email.split('@')[0] : 'Inconnu')
    return { account_id: row.account_id, role: row.role as 'owner' | 'manager' | 'viewer', created_at: row.created_at, display_name }
  })

  return (
    <div className="px-margin-mobile md:px-margin-desktop py-10 max-w-container-max">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
        <h1 className="font-montserrat text-headline-md font-bold text-primary uppercase">
          Accès & partage
        </h1>
      </div>
      <ProfileAccessManager
        profileId={profileId}
        currentAccountId={user.id}
        initialAccesses={accesses}
      />
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Step 3: Test manuel** (si Supabase local disponible)

Naviguer vers `http://localhost:3000/dashboard/<profileId>/acces` en tant qu'owner. Vérifier :
- La page charge et liste les accès
- Un non-owner est redirigé vers `/dashboard/<profileId>`

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/[profileId]/acces/page.tsx
git commit -m "feat: page /dashboard/[profileId]/acces (owner-only)"
```

---

## Task 6: Navigation — lien "Accès & partage"

**Files:**
- Modify: `components/dashboard/DashboardProfileNav.tsx`

**Interfaces:**
- Consumes: `isOwner: boolean` (prop déjà reçue)
- Produces: `NAV_ITEMS` avec 6ème item `ownerOnly: true`, filtré à l'affichage desktop et mobile

- [ ] **Step 1: Ajouter le champ `ownerOnly` et le 6ème item**

Dans `components/dashboard/DashboardProfileNav.tsx`, modifier `NAV_ITEMS` :

Remplacer :
```typescript
  const NAV_ITEMS = [
```

Par :
```typescript
  const NAV_ITEMS: Array<{
    href: string
    label: string
    icon: React.ReactNode
    exact?: boolean
    ownerOnly?: boolean
  }> = [
```

Puis ajouter à la fin du tableau `NAV_ITEMS`, après l'item `galerie` :

```typescript
    {
      href: `${base}/acces`,
      label: 'Accès & partage',
      ownerOnly: true,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
        </svg>
      ),
    },
```

- [ ] **Step 2: Filtrer les items dans le rendu desktop**

Dans la section desktop (`.map((item) => {` de la liste principale), remplacer :

```typescript
          {NAV_ITEMS.map((item) => {
```

Par :

```typescript
          {NAV_ITEMS.filter((item) => !item.ownerOnly || isOwner).map((item) => {
```

- [ ] **Step 3: Filtrer les items dans le rendu mobile**

Dans la section mobile, remplacer :

```typescript
        {NAV_ITEMS.slice(1).map((item) => {
```

Par :

```typescript
        {NAV_ITEMS.filter((item) => !item.ownerOnly || isOwner).slice(1).map((item) => {
```

- [ ] **Step 4: Type-check + lint**

```bash
npx tsc --noEmit && npm run lint
```

Résultat attendu : aucune erreur.

- [ ] **Step 5: Vérification manuelle**

Naviguer dans le dashboard :
- En tant qu'owner : le lien "Accès & partage" apparaît en bas de la sidebar desktop et dans la barre mobile
- En tant que manager : le lien est absent

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/DashboardProfileNav.tsx
git commit -m "feat: lien 'Accès & partage' owner-only dans la nav dashboard"
```

---

## Task 7: Tests d'intégration sécurité

**Files:**
- Create: `__tests__/security/profileAccessSharing.test.ts`

**Interfaces:**
- Consumes: `addProfileAccess`, `removeProfileAccess` from `@/lib/profileAccessService` (via mock de `createClient`)
- Produces: 9 tests d'intégration avec vrai Supabase, skippés si `SUPABASE_SERVICE_ROLE_KEY` absent

**Stratégie :** mock de `@/lib/supabase/server` pour retourner un `SupabaseClient` authentifié réel (au lieu du client cookie Next.js). Les fonctions du service s'exécutent contre le vrai Supabase avec RLS appliquée.

- [ ] **Step 1: Créer le fichier de tests**

Créer `__tests__/security/profileAccessSharing.test.ts` :

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createAdminSetupClient,
  createAuthenticatedClient,
  createTestUser,
  deleteTestUser,
} from '../helpers/supabaseTestClient'

const TIMEOUT = 15_000
const isSupabaseAvailable = !!process.env.SUPABASE_SERVICE_ROLE_KEY

const OWNER_EMAIL   = 'owner-sharing-test@ipponid.test'
const OWNER_PASS    = 'Test1234!'
const MANAGER_EMAIL = 'manager-sharing-test@ipponid.test'
const MANAGER_PASS  = 'Test1234!'
const VIEWER_EMAIL  = 'viewer-sharing-test@ipponid.test'
const VIEWER_PASS   = 'Test1234!'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { addProfileAccess, removeProfileAccess } from '@/lib/profileAccessService'

;(isSupabaseAvailable ? describe : describe.skip)('Accès partagés — logique d\'invitation', () => {
  let admin: SupabaseClient
  let ownerId: string
  let managerId: string
  let viewerId: string
  let profileId: string
  let ownerClient: SupabaseClient
  let managerClient: SupabaseClient

  beforeAll(async () => {
    admin       = createAdminSetupClient()
    ownerId     = await createTestUser(admin, OWNER_EMAIL, OWNER_PASS)
    managerId   = await createTestUser(admin, MANAGER_EMAIL, MANAGER_PASS)
    viewerId    = await createTestUser(admin, VIEWER_EMAIL, VIEWER_PASS)
    ownerClient   = await createAuthenticatedClient(OWNER_EMAIL, OWNER_PASS)
    managerClient = await createAuthenticatedClient(MANAGER_EMAIL, MANAGER_PASS)
  }, TIMEOUT)

  afterAll(async () => {
    await deleteTestUser(admin, ownerId)
    await deleteTestUser(admin, managerId)
    await deleteTestUser(admin, viewerId)
  }, TIMEOUT)

  beforeEach(async () => {
    const { data, error } = await admin.from('profiles').insert({
      owner_id: ownerId,
      slug: `sharing-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      first_name: 'Test', last_name: 'Sharing',
      published: false, visibility: 'draft',
    }).select('id').single()
    if (error) throw new Error(error.message)
    profileId = data.id
  }, TIMEOUT)

  afterEach(async () => {
    vi.resetAllMocks()
    await admin.from('profiles').delete().eq('id', profileId)
  }, TIMEOUT)

  it('owner peut ajouter un manager', async () => {
    vi.mocked(createClient).mockReturnValue(ownerClient as never)
    const result = await addProfileAccess(profileId, managerId, 'manager', ownerId)
    expect(result).toEqual({ success: true, message: 'Accès ajouté.' })
    const { data } = await admin.from('profile_access').select('role').eq('profile_id', profileId).eq('account_id', managerId).single()
    expect(data?.role).toBe('manager')
  }, TIMEOUT)

  it('owner peut ajouter un viewer', async () => {
    vi.mocked(createClient).mockReturnValue(ownerClient as never)
    const result = await addProfileAccess(profileId, viewerId, 'viewer', ownerId)
    expect(result).toEqual({ success: true, message: 'Accès ajouté.' })
    const { data } = await admin.from('profile_access').select('role').eq('profile_id', profileId).eq('account_id', viewerId).single()
    expect(data?.role).toBe('viewer')
  }, TIMEOUT)

  it('un manager ne peut pas ajouter quelqu\'un', async () => {
    await admin.from('profile_access').insert({ profile_id: profileId, account_id: managerId, role: 'manager' })
    vi.mocked(createClient).mockReturnValue(managerClient as never)
    const result = await addProfileAccess(profileId, viewerId, 'viewer', managerId)
    expect(result.success).toBe(false)
    expect(result.message).toBe('Accès refusé.')
  }, TIMEOUT)

  it('owner ne peut pas s\'ajouter lui-même', async () => {
    vi.mocked(createClient).mockReturnValue(ownerClient as never)
    const result = await addProfileAccess(profileId, ownerId, 'manager', ownerId)
    expect(result.success).toBe(false)
    expect(result.message).toBe('Tu ne peux pas t\'ajouter toi-même.')
  }, TIMEOUT)

  it('owner peut retirer un manager', async () => {
    await admin.from('profile_access').insert({ profile_id: profileId, account_id: managerId, role: 'manager' })
    vi.mocked(createClient).mockReturnValue(ownerClient as never)
    const result = await removeProfileAccess(profileId, managerId, ownerId)
    expect(result).toEqual({ success: true, message: 'Accès retiré.' })
    const { data } = await admin.from('profile_access').select('id').eq('profile_id', profileId).eq('account_id', managerId).maybeSingle()
    expect(data).toBeNull()
  }, TIMEOUT)

  it('owner ne peut pas retirer l\'owner', async () => {
    vi.mocked(createClient).mockReturnValue(ownerClient as never)
    const result = await removeProfileAccess(profileId, ownerId, ownerId)
    expect(result.success).toBe(false)
    expect(result.message).toBe('Impossible de retirer le propriétaire du profil.')
  }, TIMEOUT)

  it('un manager ne peut pas retirer quelqu\'un', async () => {
    await admin.from('profile_access').insert({ profile_id: profileId, account_id: managerId, role: 'manager' })
    await admin.from('profile_access').insert({ profile_id: profileId, account_id: viewerId, role: 'viewer' })
    vi.mocked(createClient).mockReturnValue(managerClient as never)
    const result = await removeProfileAccess(profileId, viewerId, managerId)
    expect(result.success).toBe(false)
    expect(result.message).toBe('Accès refusé.')
  }, TIMEOUT)

  it('email déjà présent → message neutre (anti-énumération)', async () => {
    await admin.from('profile_access').insert({ profile_id: profileId, account_id: managerId, role: 'manager' })
    vi.mocked(createClient).mockReturnValue(ownerClient as never)
    const result = await addProfileAccess(profileId, managerId, 'viewer', ownerId)
    expect(result.success).toBe(false)
    expect(result.message).toBe('Aucun compte IpponId associé à cet email.')
  }, TIMEOUT)

  it('invited_by est défini lors de l\'ajout', async () => {
    vi.mocked(createClient).mockReturnValue(ownerClient as never)
    await addProfileAccess(profileId, managerId, 'manager', ownerId)
    const { data } = await admin.from('profile_access').select('invited_by').eq('profile_id', profileId).eq('account_id', managerId).single()
    expect(data?.invited_by).toBe(ownerId)
  }, TIMEOUT)
})
```

- [ ] **Step 2: Lancer les tests**

```bash
npx vitest run __tests__/security/profileAccessSharing.test.ts
```

Résultat attendu (si Supabase disponible) : `9 tests passed`. Si Supabase non disponible : `9 tests skipped`.

- [ ] **Step 3: Lancer tous les tests unitaires**

```bash
npx vitest run __tests__/unit/
```

Résultat attendu : tous les tests existants + les nouveaux passent.

- [ ] **Step 4: Commit**

```bash
git add __tests__/security/profileAccessSharing.test.ts
git commit -m "test: intégration sécurité partage d'accès profil"
```

---

## Auto-review

**Couverture spec → tâches :**

| Exigence spec | Task |
|--------------|------|
| `getProfileAccesses` | Task 2 |
| `addProfileAccess` | Task 2 |
| `removeProfileAccess` | Task 2 |
| Route API POST list/add/remove | Task 3 |
| Admin client pour recherche email | Task 3 (via `rpc('get_account_id_by_email')`) |
| Ne jamais retourner email complet | Task 3 (`buildDisplayName` + Task 5) |
| Page `/acces` owner-only | Task 5 |
| Guard redirect manager/viewer | Task 5 |
| Section "Personnes ayant accès" avec badges | Task 4 |
| Section "Inviter" avec rôle + texte d'aide | Task 4 |
| Toast succès/erreur | Task 4 |
| État de chargement bouton | Task 4 |
| Bouton "Retirer" désactivé sur owner | Task 4 (condition `role !== 'owner'`) |
| Lien nav desktop owner-only | Task 6 |
| Lien nav mobile 6ème onglet owner-only | Task 6 |
| RLS `pa_owner_select_profile` | Task 1 |
| RLS `pa_owner_insert_for_profile` | Task 1 |
| RLS `pa_owner_delete_others` | Task 1 |
| Tests unitaires service (3 cas) | Task 2 (9 cas, > spec) |
| Tests sécurité (9 cas) | Task 7 |
| Anti-énumération même message | Task 2 + Task 3 |

**Scénario test manuel (section 9 du spec) :** couvert par les vérifications manuelles de Task 3, Task 5, Task 6.

**Note :** le cas "email inexistant → message neutre" est testé via la route API (action `add` avec email introuvable dans `rpc('get_account_id_by_email')` retournant null). Ce cas est à valider manuellement lors du test de Task 3.
