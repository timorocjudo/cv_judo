# Onboarding & Types de Compte Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une table `accounts` avec `account_type` (manager / parent_judoka / judoka), remplacer la page `/creer-mon-profil` par un vrai flux d'onboarding en 3 cards, protéger la création de profils côté DB et UI, ajouter une page de paramètres dans le dashboard, et mettre à jour la landing page pour les trois cas d'usage.

**Architecture:** La table `accounts` vit dans Supabase avec RLS ; une policy RESTRICTIVE sur `profiles` INSERT enforce `max_profiles` en base. Le service `lib/accountService.ts` regroupe toute la logique métier (fonctions pures testables + appels Supabase). L'onboarding `/creer-mon-profil` est un Server Component qui passe `defaultType` (query param `?type=`) à un Client Component `AccountTypeSelector`; l'action serveur `saveAccountType` insère dans `accounts` puis redirige.

**Tech Stack:** Next.js 14 App Router, Supabase (PostgreSQL + RLS), React 18, `useFormState` de `react-dom`, Tailwind (tokens custom du projet), Vitest pour les tests.

## Global Constraints

- Toujours utiliser `createClient()` de `@/lib/supabase/server` dans les Server Components/Actions, jamais le client browser côté serveur.
- Jamais importer `judoka.json` dans les components — uniquement via `blockRegistry.tsx`.
- Respecter les tokens Tailwind du projet : `font-montserrat`, `text-primary`, `bg-surface-container-lowest`, `border-outline-variant`, `px-margin-mobile md:px-margin-desktop`, `max-w-container-max`, `rounded-2xl`, etc.
- Les en-têtes de section suivent le pattern : barre `w-1 h-8 bg-tertiary-container` + `font-montserrat text-headline-md font-bold text-primary uppercase`.
- Le numéro de la migration suivante est **0011**.
- `useFormState` vient de `'react-dom'` (React 18 / Next.js 14) — pas `useActionState`.
- Tous les tests security utilisent `createAdminSetupClient()` pour le setup et `createAuthenticatedClient()` pour les assertions sous RLS.
- Jamais de commentaire qui explique le WHAT (les noms suffisent) ; uniquement le WHY quand non-évident.

---

## File Map

**Nouveaux fichiers :**
- `supabase/migrations/0011_account_type.sql` — table accounts, RLS, policy RESTRICTIVE sur profiles INSERT, backfill
- `lib/accountService.ts` — fonctions pures + appels Supabase pour la gestion des comptes
- `app/creer-mon-profil/actions.ts` — Server Action `saveAccountType`
- `components/onboarding/AccountTypeSelector.tsx` — Client Component 3-cards + form
- `app/dashboard/parametres/page.tsx` — affichage du type de compte + form de changement
- `app/dashboard/parametres/actions.ts` — Server Action `updateAccountType`
- `components/landing/WhoIsItForSection.tsx` — nouvelle section "Qui est IpponId pour ?"
- `__tests__/unit/accountType.test.ts` — tests pures de `validateTypeChange` et `canCreateMoreProfiles`
- `__tests__/security/accountType.test.ts` — tests RLS sur accounts et profiles

**Fichiers modifiés :**
- `app/auth/callback/route.ts` — rediriger vers `/creer-mon-profil` si pas de compte
- `app/creer-mon-profil/page.tsx` — remplacer placeholder par Server Component onboarding
- `app/dashboard/page.tsx` — masquer bouton "+" et afficher message limite si judoka avec 1 profil
- `app/dashboard/layout.tsx` — ajouter lien "Paramètres" dans le header
- `app/dashboard/nouveau/page.tsx` — lire `?context=` et adapter le titre/sous-titre
- `components/landing/HeroSection.tsx` — ajouter 3 cards de parcours au-dessus de la recherche
- `components/landing/HowItWorksSection.tsx` — 2 parcours distincts (parent vs judoka)
- `app/page.tsx` — importer et placer `WhoIsItForSection`

---

## Task 1 — Migration SQL + lib/accountService.ts

**Files:**
- Create: `supabase/migrations/0011_account_type.sql`
- Create: `lib/accountService.ts`

**Interfaces:**
- Produces: `AccountType`, `Account`, `validateTypeChange(current, next, count)`, `canCreateMoreProfiles(max, count)`, `maxProfilesForType(type)`, `getAccount(userId)`, `hasAccount(userId)`, `createAccount(userId, type)`, `updateAccountType(userId, newType)`, `getOwnedProfileCount(userId)`

- [ ] **Step 1 : Écrire la migration SQL**

```sql
-- supabase/migrations/0011_account_type.sql

-- ─── 1. Table accounts ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.accounts (
  id            uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type  text        NOT NULL
                            CHECK (account_type IN ('manager', 'parent_judoka', 'judoka'))
                            DEFAULT 'judoka',
  max_profiles  int         NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ─── 2. RLS sur accounts ──────────────────────────────────────────────────────

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounts_select_own" ON public.accounts
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "accounts_insert_own" ON public.accounts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "accounts_update_own" ON public.accounts
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ─── 3. Policy RESTRICTIVE sur profiles INSERT (enforce max_profiles) ─────────
-- RESTRICTIVE = AND'd avec toutes les autres policies ; ne peut pas être contournée
-- par une autre policy permissive. Le service role (admin) bypass RLS entièrement.

CREATE POLICY "profiles_insert_max_profiles" ON public.profiles
  AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE id = auth.uid()
        AND (
          max_profiles = -1
          OR max_profiles > (
            SELECT COUNT(*) FROM public.profile_access
            WHERE account_id = auth.uid() AND role = 'owner'
          )
        )
    )
  );

-- ─── 4. Backfill : créer des lignes accounts pour les utilisateurs existants ──

INSERT INTO public.accounts (id, account_type, max_profiles, created_at)
SELECT
  pa.account_id                                                       AS id,
  CASE WHEN cnt.owned > 1 THEN 'parent_judoka' ELSE 'judoka' END     AS account_type,
  CASE WHEN cnt.owned > 1 THEN -1              ELSE 1         END     AS max_profiles,
  now()                                                               AS created_at
FROM (
  SELECT DISTINCT account_id FROM public.profile_access WHERE role = 'owner'
) pa
JOIN (
  SELECT account_id, COUNT(*) AS owned
  FROM   public.profile_access
  WHERE  role = 'owner'
  GROUP BY account_id
) cnt ON cnt.account_id = pa.account_id
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 2 : Appliquer la migration localement et vérifier qu'elle passe**

```bash
npx supabase db reset
# OU si la DB tourne déjà :
npx supabase migration up
```

Expected : aucune erreur. La table `accounts` est créée et les utilisateurs existants ont des lignes.

- [ ] **Step 3 : Créer lib/accountService.ts**

```typescript
// lib/accountService.ts
'use server'

import { createClient } from '@/lib/supabase/server'

export type AccountType = 'manager' | 'parent_judoka' | 'judoka'

export type Account = {
  id: string
  account_type: AccountType
  max_profiles: number
  created_at: string
}

// ── Fonctions pures (testables sans Supabase) ────────────────────────────────

export function maxProfilesForType(type: AccountType): number {
  return type === 'judoka' ? 1 : -1
}

export function canCreateMoreProfiles(maxProfiles: number, ownedCount: number): boolean {
  return maxProfiles === -1 || ownedCount < maxProfiles
}

export function validateTypeChange(
  current: AccountType,
  next: AccountType,
  ownedCount: number
): { allowed: boolean; error?: string } {
  if (current === next) return { allowed: true }

  // Downgrade vers judoka : autorisé seulement si ≤ 1 profil en propriété
  if (next === 'judoka' && ownedCount > 1) {
    return {
      allowed: false,
      error: `Tu possèdes ${ownedCount} profils actifs. Supprime-en ${ownedCount - 1} avant de passer en compte judoka.`,
    }
  }

  // Toutes les autres transitions sont autorisées
  return { allowed: true }
}

// ── Fonctions Supabase ────────────────────────────────────────────────────────

export async function getAccount(userId: string): Promise<Account | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('accounts')
    .select('id, account_type, max_profiles, created_at')
    .eq('id', userId)
    .maybeSingle()
  return data as Account | null
}

export async function hasAccount(userId: string): Promise<boolean> {
  const supabase = createClient()
  const { data } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', userId)
    .maybeSingle()
  return !!data
}

export async function createAccount(userId: string, type: AccountType): Promise<void> {
  const supabase = createClient()
  await supabase.from('accounts').insert({
    id: userId,
    account_type: type,
    max_profiles: maxProfilesForType(type),
  })
}

export async function getOwnedProfileCount(userId: string): Promise<number> {
  const supabase = createClient()
  const { count } = await supabase
    .from('profile_access')
    .select('profile_id', { count: 'exact', head: true })
    .eq('account_id', userId)
    .eq('role', 'owner')
  return count ?? 0
}

export async function updateAccountType(
  userId: string,
  newType: AccountType
): Promise<{ success: boolean; error?: string }> {
  const account = await getAccount(userId)
  if (!account) return { success: false, error: 'Compte introuvable.' }

  const ownedCount = await getOwnedProfileCount(userId)
  const validation = validateTypeChange(account.account_type, newType, ownedCount)
  if (!validation.allowed) return { success: false, error: validation.error }

  const supabase = createClient()
  const { error } = await supabase
    .from('accounts')
    .update({ account_type: newType, max_profiles: maxProfilesForType(newType) })
    .eq('id', userId)

  if (error) return { success: false, error: 'Erreur lors de la mise à jour.' }
  return { success: true }
}
```

- [ ] **Step 4 : Type-check**

```bash
npx tsc --noEmit
```

Expected : 0 erreurs.

- [ ] **Step 5 : Commit**

```bash
git add supabase/migrations/0011_account_type.sql lib/accountService.ts
git commit -m "feat: table accounts + accountService (type de compte, max_profiles)"
```

---

## Task 2 — Flux d'onboarding + mise à jour du callback OAuth

**Files:**
- Create: `app/creer-mon-profil/actions.ts`
- Create: `components/onboarding/AccountTypeSelector.tsx`
- Modify: `app/creer-mon-profil/page.tsx`
- Modify: `app/auth/callback/route.ts`
- Modify: `app/dashboard/nouveau/page.tsx`

**Interfaces:**
- Consumes: `AccountType`, `createAccount`, `hasAccount` de `@/lib/accountService`
- Produces: route `/creer-mon-profil?type=judoka|manager|parent_judoka` avec pré-sélection, `saveAccountType` Server Action, redirect vers `/dashboard/nouveau?context=<type>`

- [ ] **Step 1 : Créer app/creer-mon-profil/actions.ts**

```typescript
// app/creer-mon-profil/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAccount, type AccountType } from '@/lib/accountService'

const VALID_TYPES: AccountType[] = ['manager', 'parent_judoka', 'judoka']

export async function saveAccountType(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const type = formData.get('account_type') as AccountType
  if (!VALID_TYPES.includes(type)) return

  await createAccount(user.id, type)

  redirect(`/dashboard/nouveau?context=${type}`)
}
```

- [ ] **Step 2 : Créer components/onboarding/AccountTypeSelector.tsx**

```typescript
// components/onboarding/AccountTypeSelector.tsx
'use client'

import { useState } from 'react'
import { saveAccountType } from '@/app/creer-mon-profil/actions'
import type { AccountType } from '@/lib/accountService'

const CARDS: {
  type: AccountType
  title: string
  description: string
  icon: React.ReactNode
}[] = [
  {
    type: 'manager',
    title: 'Je gère les profils de mes enfants',
    description: 'Tu créeras et géreras les profils judokas de tes enfants. Parfait si tu n\'es pas judoka toi-même.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    type: 'parent_judoka',
    title: 'Je suis judoka ET parent d\'un judoka',
    description: 'Tu auras ton propre profil judoka et pourras aussi créer les profils de tes enfants.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    type: 'judoka',
    title: 'Je suis judoka',
    description: 'Tu créeras ton propre profil judoka. Simple et rapide.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

export default function AccountTypeSelector({ defaultType }: { defaultType?: AccountType }) {
  const [selected, setSelected] = useState<AccountType | null>(defaultType ?? null)

  return (
    <form action={saveAccountType} className="w-full max-w-3xl mx-auto">
      <input type="hidden" name="account_type" value={selected ?? ''} />

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {CARDS.map((card) => {
          const isSelected = selected === card.type
          return (
            <button
              key={card.type}
              type="button"
              onClick={() => setSelected(card.type)}
              className={[
                'flex flex-col items-center text-center p-6 rounded-2xl border-2 transition-all cursor-pointer',
                isSelected
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-outline-variant bg-surface-container-lowest hover:border-primary/40 hover:shadow-sm',
              ].join(' ')}
            >
              <div
                className={[
                  'w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors',
                  isSelected ? 'bg-primary text-on-primary' : 'bg-primary/10 text-primary',
                ].join(' ')}
              >
                {card.icon}
              </div>
              <h3
                className={[
                  'font-montserrat font-bold text-base mb-2 leading-snug',
                  isSelected ? 'text-primary' : 'text-on-surface',
                ].join(' ')}
              >
                {card.title}
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {card.description}
              </p>
              {isSelected && (
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                  Sélectionné
                </span>
              )}
            </button>
          )
        })}
      </div>

      <button
        type="submit"
        disabled={!selected}
        className="w-full bg-primary text-on-primary font-semibold py-3 rounded-lg hover:bg-primary-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continuer
      </button>
    </form>
  )
}
```

- [ ] **Step 3 : Remplacer app/creer-mon-profil/page.tsx**

```typescript
// app/creer-mon-profil/page.tsx
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hasAccount, type AccountType } from '@/lib/accountService'
import AccountTypeSelector from '@/components/onboarding/AccountTypeSelector'

export const metadata: Metadata = { title: 'Créer mon compte — IpponId' }

const VALID_TYPES: AccountType[] = ['manager', 'parent_judoka', 'judoka']

export default async function CreerMonProfilPage({
  searchParams,
}: {
  searchParams: { type?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Si un compte existe déjà, aller directement au dashboard
  const accountExists = await hasAccount(user.id)
  if (accountExists) redirect('/dashboard')

  const rawType = searchParams.type as AccountType | undefined
  const defaultType = rawType && VALID_TYPES.includes(rawType) ? rawType : undefined

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-margin-mobile py-16">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="font-montserrat text-headline-md font-bold text-primary mb-3">
            Bienvenue sur IpponId
          </h1>
          <p className="text-body-lg text-on-surface-variant max-w-xl mx-auto">
            Dis-nous qui tu es pour personnaliser ton expérience.
          </p>
        </div>
        <AccountTypeSelector defaultType={defaultType} />
      </div>
    </main>
  )
}
```

- [ ] **Step 4 : Mettre à jour app/auth/callback/route.ts**

```typescript
// app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasAccount } from '@/lib/accountService'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_code`)
  }

  const supabase = createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/?error=auth_failed`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (user && !(await hasAccount(user.id))) {
    return NextResponse.redirect(`${origin}/creer-mon-profil`)
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
```

- [ ] **Step 5 : Mettre à jour app/dashboard/nouveau/page.tsx (messages contextuels)**

Modifier les lignes 29-34 de `app/dashboard/nouveau/page.tsx` :

```typescript
// Remplacer la signature de la fonction et les lignes de titre/sous-titre
export default async function NouveauPage({
  searchParams,
}: {
  searchParams: { context?: string }
}) {
  // ... (garder le reste : supabase, user, meta, defaultFirst, defaultLast inchangés)

  const CONTEXT_COPY: Record<string, { title: string; subtitle: string }> = {
    manager: {
      title: 'Premier profil de tes enfants',
      subtitle: 'Créons ensemble le premier profil judoka de tes enfants.',
    },
    parent_judoka: {
      title: 'Ton profil judoka',
      subtitle: 'Commençons par ton propre profil — tu pourras ajouter ceux de tes enfants ensuite.',
    },
  }
  const copy = CONTEXT_COPY[searchParams.context ?? ''] ?? {
    title: 'Nouveau profil judoka',
    subtitle: 'Ces informations seront visibles sur la page publique.',
  }
```

Puis remplacer les deux balises `<h1>` et `<p>` dans le JSX par :

```tsx
<h1 className="font-montserrat text-headline-md font-bold text-primary mb-2">
  {copy.title}
</h1>
<p className="text-on-surface-variant text-body-md mb-8">
  {copy.subtitle}
</p>
```

- [ ] **Step 6 : Vérifier manuellement le flux**

1. Se déconnecter (si connecté)
2. Cliquer "Connexion Google" sur la landing
3. Vérifier la redirection vers `/creer-mon-profil`
4. Cliquer la card "Je suis judoka" → Continuer
5. Vérifier la redirection vers `/dashboard/nouveau` avec le formulaire standard
6. Visiter `/creer-mon-profil?type=manager` → vérifier que la card "Je gère les profils de mes enfants" est pré-sélectionnée

- [ ] **Step 7 : Type-check**

```bash
npx tsc --noEmit
```

Expected : 0 erreurs.

- [ ] **Step 8 : Commit**

```bash
git add app/creer-mon-profil/ components/onboarding/ app/auth/callback/route.ts app/dashboard/nouveau/page.tsx
git commit -m "feat: flux d'onboarding /creer-mon-profil avec choix du type de compte"
```

---

## Task 3 — Dashboard : protection du bouton + page Paramètres + lien layout

**Files:**
- Modify: `app/dashboard/page.tsx`
- Modify: `app/dashboard/layout.tsx`
- Create: `app/dashboard/parametres/page.tsx`
- Create: `app/dashboard/parametres/actions.ts`

**Interfaces:**
- Consumes: `getAccount`, `updateAccountType`, `validateTypeChange`, `AccountType` de `@/lib/accountService`
- Produces: route `/dashboard/parametres` avec affichage du type et form de changement

- [ ] **Step 1 : Mettre à jour app/dashboard/page.tsx**

Ajouter l'import et la logique de compte, puis conditionner le bouton "+" :

```typescript
// Ajouter l'import en haut
import { getAccount, canCreateMoreProfiles } from '@/lib/accountService'

// Dans le corps de DashboardPage, après `const profiles = ...` :
const account = await getAccount(user.id)
const ownedCount = profiles.filter((p) => p.role === 'owner').length
const canCreate = canCreateMoreProfiles(account?.max_profiles ?? 1, ownedCount)
```

Remplacer le bouton "+ Créer un nouveau judoka" par :

```tsx
{canCreate ? (
  <Link
    href="/dashboard/nouveau"
    className="bg-primary text-on-primary font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-primary-container transition-colors"
  >
    + Créer un nouveau judoka
  </Link>
) : (
  <div className="text-right">
    <p className="text-sm text-on-surface-variant max-w-xs">
      Limite atteinte pour ton type de compte.{' '}
      <Link href="/dashboard/parametres" className="text-primary hover:underline font-medium">
        Passer en compte famille
      </Link>
    </p>
  </div>
)}
```

- [ ] **Step 2 : Mettre à jour app/dashboard/layout.tsx**

Ajouter un lien "Paramètres" dans le header, entre `<LogoLink />` et `<NavUserAvatar />` :

```tsx
import Link from 'next/link'

// Dans le <div className="flex justify-between ..."> :
<LogoLink />
<nav className="flex items-center gap-4">
  <Link
    href="/dashboard/parametres"
    className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
  >
    Paramètres
  </Link>
  <NavUserAvatar initialIsLoggedIn />
</nav>
```

- [ ] **Step 3 : Créer app/dashboard/parametres/actions.ts**

```typescript
// app/dashboard/parametres/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateAccountType, type AccountType } from '@/lib/accountService'

const VALID_TYPES: AccountType[] = ['manager', 'parent_judoka', 'judoka']

export async function changeAccountType(
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const newType = formData.get('new_type') as AccountType
  if (!VALID_TYPES.includes(newType)) return { error: 'Type invalide.' }

  const result = await updateAccountType(user.id, newType)
  if (!result.success) return { error: result.error }

  // Si upgrade vers parent_judoka depuis manager, rediriger pour créer le profil perso
  if (newType === 'parent_judoka') {
    redirect('/dashboard/nouveau?context=parent_judoka')
  }

  return {}
}
```

- [ ] **Step 4 : Créer app/dashboard/parametres/page.tsx**

```typescript
// app/dashboard/parametres/page.tsx
'use client'

import type { Metadata } from 'next'
import { useFormState } from 'react-dom'
import Link from 'next/link'
import { changeAccountType } from './actions'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Account, AccountType } from '@/lib/accountService'

// Note : cette page est un Client Component car elle utilise useFormState.
// Les données de compte sont chargées côté client depuis Supabase.

const TYPE_LABELS: Record<AccountType, string> = {
  judoka:        'Judoka',
  parent_judoka: 'Judoka & Parent',
  manager:       'Parent / Manager',
}

const TRANSITIONS: { from: AccountType; to: AccountType; label: string }[] = [
  { from: 'judoka',        to: 'parent_judoka', label: 'Passer en Judoka & Parent' },
  { from: 'judoka',        to: 'manager',       label: 'Passer en Parent / Manager' },
  { from: 'parent_judoka', to: 'manager',       label: 'Passer en Parent / Manager' },
  { from: 'parent_judoka', to: 'judoka',        label: 'Repasser en Judoka seul' },
  { from: 'manager',       to: 'parent_judoka', label: 'Passer en Judoka & Parent' },
  { from: 'manager',       to: 'judoka',        label: 'Repasser en Judoka seul' },
]

export default function ParametresPage() {
  const [account, setAccount] = useState<Account | null>(null)
  const [state, formAction] = useFormState(changeAccountType, {})

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('accounts')
        .select('id, account_type, max_profiles, created_at')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => setAccount(data as Account | null))
    })
  }, [state])

  const availableTransitions = account
    ? TRANSITIONS.filter((t) => t.from === account.account_type)
    : []

  return (
    <div className="min-h-screen bg-background px-margin-mobile md:px-margin-desktop py-10">
      <div className="max-w-lg mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors mb-6"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Mes judokas
        </Link>

        <h1 className="font-montserrat text-headline-md font-bold text-primary uppercase mb-8">
          Paramètres du compte
        </h1>

        {/* Type actuel */}
        <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6 mb-6">
          <h2 className="font-montserrat font-bold text-primary mb-1">Type de compte</h2>
          {account ? (
            <p className="text-on-surface-variant">
              Ton compte est de type{' '}
              <span className="font-semibold text-on-surface">
                {TYPE_LABELS[account.account_type]}
              </span>
              .{' '}
              {account.max_profiles === -1
                ? 'Tu peux créer un nombre illimité de profils.'
                : `Tu peux créer jusqu'à ${account.max_profiles} profil.`}
            </p>
          ) : (
            <p className="text-on-surface-variant text-sm">Chargement…</p>
          )}
        </section>

        {/* Changement de type */}
        {availableTransitions.length > 0 && (
          <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6 mb-6">
            <h2 className="font-montserrat font-bold text-primary mb-4">Changer de type</h2>
            {state.error && (
              <p className="text-sm text-error bg-error/10 rounded-lg px-4 py-2 mb-4">
                {state.error}
              </p>
            )}
            <div className="flex flex-col gap-3">
              {availableTransitions.map(({ to, label }) => (
                <form key={to} action={formAction}>
                  <input type="hidden" name="new_type" value={to} />
                  <button
                    type="submit"
                    className="w-full text-left bg-surface-container px-4 py-3 rounded-lg border border-outline-variant hover:border-primary/40 hover:shadow-sm transition-all text-sm font-medium text-on-surface"
                  >
                    {label}
                  </button>
                </form>
              ))}
            </div>
          </section>
        )}

        {/* Déconnexion */}
        <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6 mb-6">
          <h2 className="font-montserrat font-bold text-primary mb-3">Session</h2>
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
            >
              Se déconnecter
            </button>
          </form>
        </section>

        {/* Suppression de compte */}
        <section className="bg-surface-container-lowest rounded-2xl border border-error/20 p-6">
          <h2 className="font-montserrat font-bold text-error mb-2">Zone dangereuse</h2>
          <p className="text-sm text-on-surface-variant mb-4">
            La suppression de ton compte est irréversible.
          </p>
          <Link
            href="/dashboard/supprimer-compte"
            className="text-sm font-semibold text-error hover:underline"
          >
            Supprimer mon compte
          </Link>
        </section>
      </div>
    </div>
  )
}
```

> **Note :** Ce composant utilise le client Supabase browser pour charger les données du compte car c'est un Client Component. L'alternative serait de séparer en Server Component (fetch data) + Client Component (form state), mais cela complexifie inutilement pour cette page simple.

> **Note :** Le lien "Se déconnecter" et "Supprimer mon compte" pointent vers des routes existantes — vérifier que `LogoutButton` / la route de suppression est déjà en place ou adapter le href.

- [ ] **Step 5 : Type-check + lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected : 0 erreurs.

- [ ] **Step 6 : Commit**

```bash
git add app/dashboard/page.tsx app/dashboard/layout.tsx app/dashboard/parametres/
git commit -m "feat: protection limite profils, page paramètres compte, lien dashboard"
```

---

## Task 4 — Landing page : hero à 3 chemins + WhoIsItFor + HowItWorks restructuré

**Files:**
- Modify: `components/landing/HeroSection.tsx`
- Create: `components/landing/WhoIsItForSection.tsx`
- Modify: `components/landing/HowItWorksSection.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: aucune — composants purement présentation
- Produces: landing avec 3 entrées dans le hero, nouvelle section "Qui est IpponId pour ?", HowItWorks en 2 colonnes

- [ ] **Step 1 : Mettre à jour components/landing/HeroSection.tsx**

```typescript
// components/landing/HeroSection.tsx
import { Suspense } from 'react'
import Link from 'next/link'
import SearchAutocomplete from '@/components/SearchAutocomplete'

const PATHS = [
  {
    label: 'Je veux créer le profil de mon enfant',
    href: '/creer-mon-profil?type=manager',
    icon: '👨‍👧',
  },
  {
    label: "J'ai mon propre palmarès à partager",
    href: '/creer-mon-profil?type=judoka',
    icon: '🥋',
  },
  {
    label: 'Je suis judoka et parent d\'un judoka',
    href: '/creer-mon-profil?type=parent_judoka',
    icon: '🥋👨‍👧',
  },
]

export default function HeroSection() {
  return (
    <section className="relative px-margin-mobile md:px-margin-desktop pt-16 pb-10 text-center">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <h1 className="font-montserrat text-headline-lg-mobile md:text-headline-lg font-black text-primary mb-6 leading-tight">
          Le CV en ligne des judokas
        </h1>
        <p className="text-body-lg text-on-surface-variant mb-8 max-w-2xl mx-auto">
          Crée ta page gratuitement. Partage ton parcours, tes grades et tes victoires avec ton URL personnalisée.
        </p>

        {/* 3 chemins d'entrée */}
        <div className="grid sm:grid-cols-3 gap-3 mb-10 max-w-2xl mx-auto">
          {PATHS.map(({ label, href, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-outline-variant bg-surface-container-lowest hover:border-primary hover:shadow-md transition-all group"
            >
              <span className="text-2xl" role="img" aria-hidden>{icon}</span>
              <span className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors leading-snug">
                {label}
              </span>
            </Link>
          ))}
        </div>

        {/* Moteur de recherche — conservé */}
        <p className="text-xs text-on-surface-variant mb-4 uppercase tracking-wide font-semibold">
          Ou recherche un judoka
        </p>
        <Suspense
          fallback={
            <div className="max-w-2xl mx-auto flex items-center bg-white rounded-xl shadow-xl border border-outline-variant p-2">
              <input
                type="text"
                disabled
                placeholder="Rechercher un judoka…"
                className="flex-1 border-none outline-none px-4 py-3 text-on-surface placeholder:text-outline bg-transparent"
              />
            </div>
          }
        >
          <SearchAutocomplete className="max-w-2xl mx-auto" />
        </Suspense>
      </div>
    </section>
  )
}
```

- [ ] **Step 2 : Créer components/landing/WhoIsItForSection.tsx**

```typescript
// components/landing/WhoIsItForSection.tsx

const PERSONAS = [
  {
    emoji: '👨‍👧',
    title: 'Tu es parent',
    body: 'Ton enfant commence le judo et tu veux garder une trace de son parcours, de ses premières compétitions, de ses grades. IpponId te permet de créer et gérer son profil à sa place.',
  },
  {
    emoji: '🥋',
    title: 'Tu es judoka compétiteur',
    body: 'Tu accumules les médailles et tu veux partager ton palmarès avec tes partenaires, sponsors ou clubs. Une URL, tout ton parcours.',
  },
  {
    emoji: '🥋👨‍👧',
    title: 'Tu es les deux',
    body: 'Tu pratiques le judo et tu as des enfants judokas. IpponId gère les deux : ton profil et les leurs, dans le même espace.',
  },
]

export default function WhoIsItForSection() {
  return (
    <section className="px-margin-mobile md:px-margin-desktop py-16">
      <div className="max-w-container-max mx-auto">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-1 h-8 bg-tertiary-container hidden md:block" />
            <h2 className="font-montserrat text-headline-md font-bold text-primary uppercase">
              IpponId, c'est pour qui ?
            </h2>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PERSONAS.map(({ emoji, title, body }) => (
            <div
              key={title}
              className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-8"
            >
              <span className="text-4xl mb-4 block" role="img" aria-hidden>
                {emoji}
              </span>
              <h3 className="font-montserrat font-bold text-primary text-lg mb-3">{title}</h3>
              <p className="text-on-surface-variant leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3 : Mettre à jour components/landing/HowItWorksSection.tsx**

```typescript
// components/landing/HowItWorksSection.tsx

const JUDOKA_STEPS = [
  {
    step: '1',
    title: 'Crée ton compte judoka',
    body: 'Connecte-toi avec Google et choisis le type "Je suis judoka".',
  },
  {
    step: '2',
    title: 'Remplis ton profil',
    body: 'Ajoute ton grade, ton club, ton palmarès et tes vidéos en quelques minutes.',
  },
  {
    step: '3',
    title: 'Partage ton URL',
    body: 'Envoie ton lien à tes partenaires, sponsors ou intègre-le dans ta bio.',
  },
]

const PARENT_STEPS = [
  {
    step: '1',
    title: 'Crée ton compte parent',
    body: 'Connecte-toi avec Google et choisis "Je gère les profils de mes enfants".',
  },
  {
    step: '2',
    title: 'Crée le profil de ton enfant',
    body: 'Renseigne son prénom, son club, ses grades et ses résultats de compétition.',
  },
  {
    step: '3',
    title: 'Partage sa page',
    body: 'Envoie le lien à sa famille, à son coach ou télécharge son QR code.',
  },
]

function Journey({
  title,
  emoji,
  steps,
}: {
  title: string
  emoji: string
  steps: { step: string; title: string; body: string }[]
}) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-8">
      <h3 className="font-montserrat font-bold text-primary text-lg mb-6 flex items-center gap-2">
        <span role="img" aria-hidden>{emoji}</span>
        {title}
      </h3>
      <ol className="space-y-5">
        {steps.map(({ step, title, body }) => (
          <li key={step} className="flex gap-4">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-on-primary text-xs font-bold flex items-center justify-center mt-0.5">
              {step}
            </span>
            <div>
              <p className="font-semibold text-on-surface mb-0.5">{title}</p>
              <p className="text-sm text-on-surface-variant">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="px-margin-mobile md:px-margin-desktop py-16 bg-surface-container">
      <div className="max-w-container-max mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-1 h-8 bg-tertiary-container hidden md:block" />
            <h2 className="font-montserrat text-headline-md font-bold text-primary uppercase">
              Comment ça marche ?
            </h2>
          </div>
          <p className="text-on-surface-variant text-body-lg">Deux parcours, une même simplicité.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Journey title="Tu es judoka" emoji="🥋" steps={JUDOKA_STEPS} />
          <Journey title="Tu es parent" emoji="👨‍👧" steps={PARENT_STEPS} />
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4 : Mettre à jour app/page.tsx**

Ajouter l'import de `WhoIsItForSection` et l'insérer entre `<MockupSection>` et `<HowItWorksSection>` :

```typescript
import WhoIsItForSection from '@/components/landing/WhoIsItForSection'

// Dans le JSX (entre MockupSection et HowItWorksSection) :
<MockupSection featured={featured} />
<WhoIsItForSection />
<HowItWorksSection />
```

- [ ] **Step 5 : Type-check + lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected : 0 erreurs, 0 warnings.

- [ ] **Step 6 : Lancer le dev server et vérifier visuellement**

```bash
npm run dev
```

Ouvrir http://localhost:3000 et vérifier :
- Le hero affiche bien 3 cards cliquables au-dessus du moteur de recherche
- La section "IpponId, c'est pour qui ?" apparaît entre MockupSection et HowItWorks
- HowItWorks affiche 2 colonnes (judoka / parent) sur desktop
- Cliquer une card hero redirige vers `/creer-mon-profil?type=<type>` (même si on n'est pas connecté, la page fera une redirection login ou affichera le sélecteur)

- [ ] **Step 7 : Commit**

```bash
git add components/landing/ app/page.tsx
git commit -m "feat: landing — 3 chemins hero, section 'pour qui', HowItWorks 2 parcours"
```

---

## Task 5 — Tests unitaires

**Files:**
- Create: `__tests__/unit/accountType.test.ts`

**Interfaces:**
- Consumes: `validateTypeChange`, `canCreateMoreProfiles`, `maxProfilesForType` de `@/lib/accountService`

- [ ] **Step 1 : Écrire les tests**

```typescript
// __tests__/unit/accountType.test.ts
import { describe, it, expect } from 'vitest'
import {
  validateTypeChange,
  canCreateMoreProfiles,
  maxProfilesForType,
} from '@/lib/accountService'

describe('maxProfilesForType', () => {
  it('retourne 1 pour judoka', () => {
    expect(maxProfilesForType('judoka')).toBe(1)
  })
  it('retourne -1 pour manager', () => {
    expect(maxProfilesForType('manager')).toBe(-1)
  })
  it('retourne -1 pour parent_judoka', () => {
    expect(maxProfilesForType('parent_judoka')).toBe(-1)
  })
})

describe('canCreateMoreProfiles', () => {
  it('[judoka] ne peut pas créer plus d'un profil', () => {
    expect(canCreateMoreProfiles(1, 0)).toBe(true)
    expect(canCreateMoreProfiles(1, 1)).toBe(false)
  })
  it('[manager] peut créer plusieurs profils', () => {
    expect(canCreateMoreProfiles(-1, 0)).toBe(true)
    expect(canCreateMoreProfiles(-1, 5)).toBe(true)
  })
  it('[parent_judoka] peut créer plusieurs profils', () => {
    expect(canCreateMoreProfiles(-1, 1)).toBe(true)
    expect(canCreateMoreProfiles(-1, 10)).toBe(true)
  })
})

describe('validateTypeChange', () => {
  it('upgrade judoka → parent_judoka : toujours autorisé', () => {
    expect(validateTypeChange('judoka', 'parent_judoka', 0)).toEqual({ allowed: true })
    expect(validateTypeChange('judoka', 'parent_judoka', 1)).toEqual({ allowed: true })
  })

  it('upgrade judoka → manager : toujours autorisé', () => {
    expect(validateTypeChange('judoka', 'manager', 1)).toEqual({ allowed: true })
  })

  it('upgrade parent_judoka → manager : toujours autorisé', () => {
    expect(validateTypeChange('parent_judoka', 'manager', 5)).toEqual({ allowed: true })
  })

  it('upgrade manager → parent_judoka : autorisé', () => {
    expect(validateTypeChange('manager', 'parent_judoka', 3)).toEqual({ allowed: true })
  })

  it('[CRITIQUE] downgrade parent_judoka → judoka refusé si plusieurs profils actifs', () => {
    const result = validateTypeChange('parent_judoka', 'judoka', 2)
    expect(result.allowed).toBe(false)
    expect(result.error).toContain('2')
  })

  it('downgrade parent_judoka → judoka autorisé si un seul profil actif', () => {
    expect(validateTypeChange('parent_judoka', 'judoka', 1)).toEqual({ allowed: true })
  })

  it('[CRITIQUE] downgrade manager → judoka refusé si plusieurs profils actifs', () => {
    const result = validateTypeChange('manager', 'judoka', 3)
    expect(result.allowed).toBe(false)
    expect(result.error).toContain('3')
  })

  it('downgrade manager → judoka autorisé si un seul profil actif', () => {
    expect(validateTypeChange('manager', 'judoka', 1)).toEqual({ allowed: true })
  })

  it('même type → autorisé (no-op)', () => {
    expect(validateTypeChange('judoka', 'judoka', 1)).toEqual({ allowed: true })
  })
})
```

- [ ] **Step 2 : Lancer les tests**

```bash
npx vitest run __tests__/unit/accountType.test.ts
```

Expected : 12 tests passent, 0 failing.

- [ ] **Step 3 : Commit**

```bash
git add __tests__/unit/accountType.test.ts
git commit -m "test: tests unitaires validateTypeChange et canCreateMoreProfiles"
```

---

## Task 6 — Tests de sécurité (RLS)

**Files:**
- Create: `__tests__/security/accountType.test.ts`

**Interfaces:**
- Consumes: helpers de `__tests__/helpers/supabaseTestClient.ts`

- [ ] **Step 1 : Écrire les tests**

```typescript
// __tests__/security/accountType.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createAdminSetupClient,
  createAuthenticatedClient,
  createTestUser,
  deleteTestUser,
} from '../helpers/supabaseTestClient'
import type { SupabaseClient } from '@supabase/supabase-js'

const TIMEOUT = 15_000

const JUDOKA_EMAIL   = 'judoka-actype-test@ipponid.test'
const JUDOKA_PASS    = 'Test1234!'
const MANAGER_EMAIL  = 'manager-actype-test@ipponid.test'
const MANAGER_PASS   = 'Test1234!'

let admin: SupabaseClient
let judokaId: string
let managerId: string

const isSupabaseAvailable = !!process.env.SUPABASE_SERVICE_ROLE_KEY

async function insertProfile(ownerId: string): Promise<string> {
  const { data, error } = await admin.from('profiles').insert({
    owner_id: ownerId,
    slug: `actype-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    first_name: 'Test', last_name: 'Judoka',
    published: false, visibility: 'draft',
  }).select('id').single()
  if (error) throw new Error(error.message)
  return data.id
}

async function setupAccount(userId: string, type: 'judoka' | 'manager' | 'parent_judoka', maxProfiles: number) {
  await admin.from('accounts').upsert({ id: userId, account_type: type, max_profiles: maxProfiles })
}

;(isSupabaseAvailable ? describe : describe.skip)('RLS — accounts & max_profiles', () => {
  beforeAll(async () => {
    admin = createAdminSetupClient()
    judokaId  = await createTestUser(admin, JUDOKA_EMAIL, JUDOKA_PASS)
    managerId = await createTestUser(admin, MANAGER_EMAIL, MANAGER_PASS)
  }, TIMEOUT)

  afterAll(async () => {
    await admin.from('profiles').delete().like('slug', 'actype-test-%')
    await admin.from('accounts').delete().in('id', [judokaId, managerId])
    await deleteTestUser(admin, judokaId)
    await deleteTestUser(admin, managerId)
  }, TIMEOUT)

  it('[CRITIQUE] un compte judoka (max_profiles=1) ne peut pas insérer un deuxième profil via RLS', async () => {
    await setupAccount(judokaId, 'judoka', 1)
    await insertProfile(judokaId)  // premier profil via admin (bypass RLS)

    const judoka = await createAuthenticatedClient(JUDOKA_EMAIL, JUDOKA_PASS)
    const { error } = await judoka.from('profiles').insert({
      owner_id: judokaId,
      slug: `actype-test-second-${Date.now()}`,
      first_name: 'Second', last_name: 'Profil',
      published: false, visibility: 'draft',
    })
    // La policy RESTRICTIVE doit bloquer cette insertion
    expect(error).not.toBeNull()
  }, TIMEOUT)

  it('[CRITIQUE] un compte manager (max_profiles=-1) peut insérer plusieurs profils', async () => {
    await setupAccount(managerId, 'manager', -1)
    await insertProfile(managerId) // premier profil

    const manager = await createAuthenticatedClient(MANAGER_EMAIL, MANAGER_PASS)
    const { error } = await manager.from('profiles').insert({
      owner_id: managerId,
      slug: `actype-test-manager2-${Date.now()}`,
      first_name: 'Enfant', last_name: 'Deux',
      published: false, visibility: 'draft',
    })
    expect(error).toBeNull()
  }, TIMEOUT)

  it('un utilisateur ne peut lire que son propre compte accounts', async () => {
    await setupAccount(judokaId, 'judoka', 1)
    const judoka = await createAuthenticatedClient(JUDOKA_EMAIL, JUDOKA_PASS)

    const { data: own } = await judoka.from('accounts').select('id').eq('id', judokaId).maybeSingle()
    expect(own?.id).toBe(judokaId)

    const { data: other } = await judoka.from('accounts').select('id').eq('id', managerId).maybeSingle()
    expect(other).toBeNull()
  }, TIMEOUT)

  it('un utilisateur peut insérer son propre compte accounts mais pas celui d\'un autre', async () => {
    const judoka = await createAuthenticatedClient(JUDOKA_EMAIL, JUDOKA_PASS)

    // Insérer pour soi-même (peut échouer si déjà existant — on ignore le conflit)
    await judoka.from('accounts').upsert({ id: judokaId, account_type: 'judoka', max_profiles: 1 })

    // Essayer d'insérer pour quelqu'un d'autre : doit être bloqué
    const { error } = await judoka.from('accounts').insert({
      id: managerId, account_type: 'judoka', max_profiles: 1,
    })
    expect(error).not.toBeNull()
  }, TIMEOUT)
})
```

- [ ] **Step 2 : Lancer les tests (nécessite Supabase local avec SUPABASE_SERVICE_ROLE_KEY)**

```bash
npx vitest run __tests__/security/accountType.test.ts
```

Expected : 4 tests passent. Si Supabase n'est pas disponible, les tests sont skippés (comportement attendu en CI sans DB).

- [ ] **Step 3 : Commit**

```bash
git add __tests__/security/accountType.test.ts
git commit -m "test: tests sécurité RLS accounts et max_profiles"
```

---

## Self-review

### Couverture des exigences

| Exigence spec | Tâche |
|---|---|
| Table accounts + RLS | Task 1 |
| max_profiles enforced en DB | Task 1 (policy RESTRICTIVE) |
| Backfill utilisateurs existants | Task 1 |
| Flux /creer-mon-profil avec 3 cards | Task 2 |
| Pré-sélection via ?type= | Task 2 (searchParams + defaultType) |
| Redirection première connexion | Task 2 (auth/callback) |
| Messages contextuels /dashboard/nouveau | Task 2 |
| Bouton "+" masqué si judoka avec 1 profil | Task 3 |
| Message "limite atteinte" + lien params | Task 3 |
| Page /dashboard/parametres | Task 3 |
| Upgrade judoka → parent_judoka / manager | Task 3 (changeAccountType) |
| Downgrade parent_judoka → judoka si 1 profil | Task 3 (validateTypeChange) |
| Lien "Paramètres" dans layout dashboard | Task 3 |
| Bouton déconnexion dans paramètres | Task 3 |
| Lien suppression compte dans paramètres | Task 3 |
| Hero landing avec 3 chemins | Task 4 |
| Section "Qui est IpponId pour ?" | Task 4 |
| HowItWorks 2 parcours | Task 4 |
| Moteur de recherche conservé | Task 4 |
| Tests unitaires validateTypeChange | Task 5 |
| Tests unitaires canCreateMoreProfiles | Task 5 |
| Tests sécurité RLS judoka max 1 profil | Task 6 |
| Tests sécurité RLS manager illimité | Task 6 |
| Tests sécurité RLS accounts isolation | Task 6 |

### Points de vigilance

- La page `app/dashboard/parametres/page.tsx` est un Client Component et utilise le client Supabase browser pour charger les données de compte. Si cette approche pose des problèmes (flash de contenu), scinder en Server Component parent + Client Component pour le form.
- Le lien "Se déconnecter" dans paramètres pointe vers `/auth/signout` — vérifier que cette route existe ou utiliser le `LogoutButton` existant (`components/auth/LogoutButton.tsx`).
- Le lien "Supprimer mon compte" pointe vers `/dashboard/supprimer-compte` — vérifier l'URL exacte via `components/dashboard/DeleteAccountSection.tsx`.
- `useFormState` est déprécié en React 19 mais c'est la bonne API pour Next.js 14 / React 18.

---

## Scénario de test manuel

### Compte "judoka"
1. Se déconnecter et aller sur la landing
2. Cliquer "J'ai mon propre palmarès à partager" → `/creer-mon-profil?type=judoka`
3. Vérifier que la card "Je suis judoka" est pré-sélectionnée
4. Cliquer "Continuer" → `/dashboard/nouveau` (titre standard)
5. Créer un profil → `/dashboard`
6. Vérifier que le bouton "+" est absent et qu'un message "limite atteinte" est affiché
7. Aller dans Paramètres → vérifier "Type de compte : Judoka, jusqu'à 1 profil"
8. Cliquer "Passer en Judoka & Parent" → redirection `/dashboard/nouveau?context=parent_judoka`
9. Retourner dans Paramètres → vérifier "Type de compte : Judoka & Parent, illimité"
10. Vérifier que le bouton "+" réapparaît dans `/dashboard`

### Compte "manager"
1. Se déconnecter, ouvrir `/creer-mon-profil?type=manager`
2. S'authentifier → retour sur `/creer-mon-profil` avec card "Je gère les profils de mes enfants" pré-sélectionnée
3. Cliquer "Continuer" → `/dashboard/nouveau?context=manager` (titre "Premier profil de tes enfants")
4. Créer un premier profil enfant
5. Vérifier que le bouton "+ Créer un nouveau judoka" est présent (illimité)
6. Créer un deuxième profil → vérifier qu'il apparaît dans la liste
7. Aller dans Paramètres → essayer "Repasser en Judoka seul" → message d'erreur "Tu possèdes 2 profils actifs"

### Compte "parent_judoka"
1. Se déconnecter, ouvrir `/creer-mon-profil?type=parent_judoka`
2. S'authentifier et continuer → `/dashboard/nouveau?context=parent_judoka` (titre "Ton profil judoka")
3. Créer son profil judoka personnel
4. Créer un deuxième profil (son enfant) via le bouton "+"
5. Vérifier les 2 profils dans le dashboard
6. Aller dans Paramètres → essayer "Repasser en Judoka seul" → erreur car 2 profils
7. Supprimer un profil (via `/dashboard/[id]`), retourner dans Paramètres → downgrade autorisé

### Première connexion OAuth (nouveau compte)
1. Ouvrir une session de navigation privée
2. Cliquer "Connexion" → Google OAuth → callback
3. Vérifier la redirection automatique vers `/creer-mon-profil` (pas `/dashboard`)
4. Compléter le choix de type → créer le profil → `/dashboard`
5. Se déconnecter et se reconnecter → vérifier la redirection directe vers `/dashboard` (compte existant)
