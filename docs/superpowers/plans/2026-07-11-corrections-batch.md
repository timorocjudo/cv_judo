# Corrections Batch IpponId — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Appliquer 7 corrections UI/logique/partage sans changement de schéma DB majeur.

**Architecture:** Corrections indépendantes organisées du plus critique au plus risqué : fixes de calcul → UI rapides → bug partage → suppression de profil. Chaque tâche produit un commit autonome.

**Tech Stack:** Next.js 14 App Router, Supabase, TypeScript, Tailwind, Vitest

## Global Constraints

- Aucune migration SQL requise (birth_date existe déjà, cascade profiles existe déjà)
- Tests unitaires avec Vitest (`npm test` = `vitest run`)
- Zéro modification de signature publique pour `computeAgeCategory` (même nom, même paramètres `string | undefined` + `string | undefined`)
- `createAdminClient()` depuis `@/lib/supabase/admin` — nécessite `SUPABASE_SERVICE_ROLE_KEY`
- Images stockées dans bucket `media` au chemin `{owner_id}/{fieldName}-{timestamp}.{ext}`

---

## Task 1 — Fix lib/ageCategory.ts + tests unitaires (C2 core)

**Files:**
- Modify: `lib/ageCategory.ts`
- Create: `__tests__/unit/ageCategory.test.ts`

**Interfaces:**
- Produces: `computeAgeCategory(birthDate: string | undefined, referenceDate?: string): string`
  - Retourne `""` si birthDate absent ou âge ≤ 3
  - Retourne `"Éveil Judo"` pour 4-5 ans
  - Retourne `"Pré-Poussins 1"` / `"Pré-Poussins 2"` pour 6-7 ans
  - Retourne `"Poussins 1"` / `"Poussins 2"` pour 8-9 ans
  - Retourne `"Benjamins 1"` / `"Benjamins 2"` pour 10-11 ans
  - Retourne `"Minimes 1"` / `"Minimes 2"` pour 12-13 ans
  - Retourne `"Cadets 1"` / `"Cadets 2"` / `"Cadets 3"` pour 14-16 ans
  - Retourne `"Juniors 1"` / `"Juniors 2"` / `"Juniors 3"` pour 17-19 ans
  - Retourne `"Séniors"` pour 20-29 ans
  - Retourne `"Vétérans"` pour 30+ ans
  - Référence : si `referenceDate` absent, utilise `new Date()` (date du jour)
  - Saison = septembre N → août N+1. Si `ref.getMonth() >= 8`, saison commence en `ref.getFullYear()`, sinon en `ref.getFullYear() - 1`. **L'âge de référence = seasonStartYear + 1 - birthYear** (année civile de fin de saison).

- [ ] **Step 1 : Écrire les tests qui vont échouer**

Créer `__tests__/unit/ageCategory.test.ts` :

```ts
import { describe, it, expect } from 'vitest'
import { computeAgeCategory } from '@/lib/ageCategory'

describe('computeAgeCategory', () => {
  it('birthDate absent → ""', () => {
    expect(computeAgeCategory(undefined)).toBe('')
  })

  it('Anna Lucia (2017-04-15), saison 2025/2026 → Poussins 2', () => {
    // Saison 2025/2026 : referenceDate en juillet 2026 (mois 6 < 8, donc start = 2025, end = 2026)
    // age = 2026 - 2017 = 9 → Poussins 2
    expect(computeAgeCategory('2017-04-15', '2026-07-01')).toBe('Poussins 2')
  })

  it('Anna Lucia (2017-04-15), saison 2026/2027 → Benjamins 1', () => {
    // referenceDate en octobre 2026 (mois 9 >= 8, donc start = 2026, end = 2027)
    // age = 2027 - 2017 = 10 → Benjamins 1
    expect(computeAgeCategory('2017-04-15', '2026-10-01')).toBe('Benjamins 1')
  })

  it('4 ans → Éveil Judo', () => {
    expect(computeAgeCategory('2022-01-01', '2026-07-01')).toBe('Éveil Judo')
  })

  it('5 ans → Éveil Judo', () => {
    expect(computeAgeCategory('2021-01-01', '2026-07-01')).toBe('Éveil Judo')
  })

  it('6 ans → Pré-Poussins 1', () => {
    expect(computeAgeCategory('2020-01-01', '2026-07-01')).toBe('Pré-Poussins 1')
  })

  it('7 ans → Pré-Poussins 2', () => {
    expect(computeAgeCategory('2019-01-01', '2026-07-01')).toBe('Pré-Poussins 2')
  })

  it('8 ans → Poussins 1', () => {
    expect(computeAgeCategory('2018-01-01', '2026-07-01')).toBe('Poussins 1')
  })

  it('10 ans → Benjamins 1', () => {
    expect(computeAgeCategory('2016-01-01', '2026-07-01')).toBe('Benjamins 1')
  })

  it('11 ans → Benjamins 2', () => {
    expect(computeAgeCategory('2015-01-01', '2026-07-01')).toBe('Benjamins 2')
  })

  it('12 ans → Minimes 1', () => {
    expect(computeAgeCategory('2014-01-01', '2026-07-01')).toBe('Minimes 1')
  })

  it('13 ans → Minimes 2', () => {
    expect(computeAgeCategory('2013-01-01', '2026-07-01')).toBe('Minimes 2')
  })

  it('14 ans → Cadets 1', () => {
    expect(computeAgeCategory('2012-01-01', '2026-07-01')).toBe('Cadets 1')
  })

  it('15 ans → Cadets 2', () => {
    expect(computeAgeCategory('2011-01-01', '2026-07-01')).toBe('Cadets 2')
  })

  it('16 ans → Cadets 3', () => {
    expect(computeAgeCategory('2010-01-01', '2026-07-01')).toBe('Cadets 3')
  })

  it('17 ans → Juniors 1', () => {
    expect(computeAgeCategory('2009-01-01', '2026-07-01')).toBe('Juniors 1')
  })

  it('19 ans → Juniors 3', () => {
    expect(computeAgeCategory('2007-01-01', '2026-07-01')).toBe('Juniors 3')
  })

  it('20 ans → Séniors', () => {
    expect(computeAgeCategory('2006-01-01', '2026-07-01')).toBe('Séniors')
  })

  it('29 ans → Séniors', () => {
    expect(computeAgeCategory('1997-01-01', '2026-07-01')).toBe('Séniors')
  })

  it('30 ans → Vétérans', () => {
    expect(computeAgeCategory('1996-01-01', '2026-07-01')).toBe('Vétérans')
  })

  it('cas limite : né le 1er septembre — compte dans la nouvelle saison', () => {
    // ref = 2025-09-01 → mois 8 >= 8, donc start = 2025, end = 2026
    // age = 2026 - 2010 = 16 → Cadets 3
    expect(computeAgeCategory('2010-09-01', '2025-09-01')).toBe('Cadets 3')
  })

  it('cas limite : né le 31 août — compte dans l\'ancienne saison', () => {
    // ref = 2025-08-31 → mois 7 < 8, donc start = 2024, end = 2025
    // age = 2025 - 2010 = 15 → Cadets 2
    expect(computeAgeCategory('2010-08-31', '2025-08-31')).toBe('Cadets 2')
  })

  it('âge ≤ 3 → ""', () => {
    expect(computeAgeCategory('2023-01-01', '2026-07-01')).toBe('')
  })
})
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
npm test -- --reporter=verbose __tests__/unit/ageCategory.test.ts
```

Attendu : plusieurs FAIL (off-by-one, catégories manquantes).

- [ ] **Step 3 : Réécrire lib/ageCategory.ts**

Remplacer intégralement le contenu de `lib/ageCategory.ts` :

```ts
/**
 * Computes the French judo age category (FFJudo) for a given birth date.
 * Reference age = age reached in the civil year that ends the season.
 * Season: September N → August N+1. Reference civil year = N+1.
 */
export function computeAgeCategory(birthDate: string | undefined, referenceDate?: string): string {
  if (!birthDate) return ''
  const birthYear = new Date(birthDate).getFullYear()
  const ref = referenceDate ? new Date(referenceDate) : new Date()
  const seasonStartYear = ref.getMonth() >= 8 ? ref.getFullYear() : ref.getFullYear() - 1
  const age = (seasonStartYear + 1) - birthYear

  if (age <= 3)  return ''
  if (age <= 5)  return 'Éveil Judo'
  if (age === 6) return 'Pré-Poussins 1'
  if (age === 7) return 'Pré-Poussins 2'
  if (age === 8) return 'Poussins 1'
  if (age === 9) return 'Poussins 2'
  if (age === 10) return 'Benjamins 1'
  if (age === 11) return 'Benjamins 2'
  if (age === 12) return 'Minimes 1'
  if (age === 13) return 'Minimes 2'
  if (age === 14) return 'Cadets 1'
  if (age === 15) return 'Cadets 2'
  if (age === 16) return 'Cadets 3'
  if (age === 17) return 'Juniors 1'
  if (age === 18) return 'Juniors 2'
  if (age === 19) return 'Juniors 3'
  if (age <= 29) return 'Séniors'
  return 'Vétérans'
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
npm test -- --reporter=verbose __tests__/unit/ageCategory.test.ts
```

Attendu : tous PASS.

- [ ] **Step 5 : Commit**

```bash
git add lib/ageCategory.ts __tests__/unit/ageCategory.test.ts
git commit -m "fix(age-category): correct off-by-one and add missing FFJudo categories"
```

---

## Task 2 — ProfileForm : affichage temps réel + bouton "Utiliser cette valeur" (C2 UI)

**Files:**
- Modify: `components/dashboard/ProfileForm.tsx`

**Interfaces:**
- Consumes: `computeAgeCategory` de `@/lib/ageCategory` (signature inchangée)
- Note: `computeAgeCategory` retourne maintenant des formes plurielles ("Benjamins 1") — `getAgeGroupFromCategory` doit être mise à jour.

- [ ] **Step 1 : Mettre à jour `getAgeGroupFromCategory` pour les nouvelles catégories**

Remplacer la fonction `getAgeGroupFromCategory` (lignes 40-47 du fichier actuel) :

```ts
function getAgeGroupFromCategory(category: string): AgeGroup {
  if (!category) return 'Sénior'
  if (
    category.startsWith('Éveil') ||
    category.startsWith('Pré-Poussins') ||
    category.startsWith('Poussins') ||
    category.startsWith('Benjamins') ||
    category.startsWith('Benjamin')
  ) return 'Benjamin'
  if (category.startsWith('Minimes') || category.startsWith('Minime')) return 'Minime'
  if (category.startsWith('Cadets') || category.startsWith('Cadet')) return 'Cadet'
  if (category.startsWith('Juniors') || category.startsWith('Junior')) return 'Junior'
  return 'Sénior'
}
```

- [ ] **Step 2 : Ajouter l'affichage temps réel après le champ birth_date**

Dans `ProfileForm.tsx`, le champ `birth_date` se trouve à la ligne ~108. Après le `</div>` fermant du champ birth_date (après la balise `</input>` et son conteneur), ajouter :

```tsx
{birthDate && computedCategory && (
  <div className="flex flex-wrap items-center gap-2 mt-1.5">
    <span className="text-xs text-on-surface-variant">
      Calculé automatiquement :
    </span>
    <span className="text-xs font-semibold text-primary">
      {computedCategory}
    </span>
    <button
      type="button"
      onClick={() => setAgeGroup(getAgeGroupFromCategory(computedCategory))}
      className="text-xs text-primary underline hover:no-underline"
    >
      Utiliser cette valeur
    </button>
  </div>
)}
```

Ce bloc s'insère juste après la balise `</div>` qui ferme le conteneur du champ `birth_date` (le div qui contient label + input), et avant la `<div>` du champ `club`. La variable `computedCategory` est déjà calculée ligne 69 et mise à jour réactivement via le state `birthDate`.

- [ ] **Step 3 : Vérifier le build TypeScript**

```bash
npx tsc --noEmit
```

Attendu : 0 erreurs.

- [ ] **Step 4 : Commit**

```bash
git add components/dashboard/ProfileForm.tsx
git commit -m "feat(dashboard): show computed age category in real time with apply button"
```

---

## Task 3 — Bio conditionnel + Badge poids conditionnel (C1 + C3)

**Files:**
- Modify: `lib/blockRegistry.tsx`
- Modify: `components/blocks/PalmaresBlock.tsx`

**Interfaces:**
- Consumes: `data.bio: string` depuis `JudokaData` (retourne `''` si null en DB, via `judokaService.ts`)
- Consumes: `entry.category: string` depuis `PalmaresEntry`

- [ ] **Step 1 : Bio conditionnel dans blockRegistry.tsx**

Remplacer la ligne `bio:` dans `lib/blockRegistry.tsx` (ligne 16) :

```ts
// Avant
bio: (data) => <FadeInOnScroll delay={0.1}><BioBlock bio={data.bio} /></FadeInOnScroll>,

// Après
bio: (data) =>
  data.bio?.trim()
    ? <FadeInOnScroll delay={0.1}><BioBlock bio={data.bio} /></FadeInOnScroll>
    : null,
```

- [ ] **Step 2 : Badge poids conditionnel dans PalmaresBlock.tsx**

Dans `PalmaresBlock.tsx`, localiser le `<div className="flex items-center gap-2 flex-wrap">` (autour de la ligne 89). Remplacer les deux spans (lignes 90-95) par :

```tsx
<div className="flex items-center gap-2 flex-wrap">
  {entry.category && (
    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
      {entry.category}
    </span>
  )}
  {computeAgeCategory(birthDate, entry.date) && (
    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
      {computeAgeCategory(birthDate, entry.date)}
    </span>
  )}
</div>
```

- [ ] **Step 3 : Vérifier le build**

```bash
npx tsc --noEmit
```

Attendu : 0 erreurs.

- [ ] **Step 4 : Commit**

```bash
git add lib/blockRegistry.tsx components/blocks/PalmaresBlock.tsx
git commit -m "fix(profile): hide empty bio section and empty weight category badge"
```

---

## Task 4 — Mobile nav labels centrés + Bloc Timothé cliquable (C4 + C5)

**Files:**
- Modify: `components/landing/LandingMobileNav.tsx`
- Modify: `components/landing/MockupSection.tsx`

- [ ] **Step 1 : Centrer les labels du menu mobile**

Dans `LandingMobileNav.tsx`, les spans de labels (lignes 36 et 50) n'ont pas de `text-center`. Les remplacer :

```tsx
// Ligne 36 (dans le <a> de navItems.map)
<span className="font-inter text-[10px] font-bold uppercase tracking-wider leading-none text-center">
  {label}
</span>

// Ligne 50 (dans le <Link> "Créer")
<span className="font-inter text-[10px] font-bold uppercase tracking-wider leading-none text-center">
  Créer
</span>
```

- [ ] **Step 2 : Rendre le bloc Timothé entièrement cliquable**

Dans `MockupSection.tsx`, trois modifications chirurgicales :

**2a.** Avant le `<div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white">` (ligne ~25), insérer :
```tsx
      <Link
        href={`/${featured.slug}`}
        className="block group"
        aria-label={`Voir le profil de ${featured.first_name} ${featured.last_name}`}
      >
```

**2b.** Sur ce même `<div>`, ajouter les classes hover à la fin de `className` :
```tsx
<div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white group-hover:ring-2 group-hover:ring-primary/30 group-hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)] transition-all duration-200">
```

**2c.** Après le `</div>` fermant de ce bloc (juste avant `<div className="text-center mt-4">`), insérer `</Link>` :
```tsx
      </div>
      </Link>

      <div className="text-center mt-4">
```

Le lien texte existant `"Voir le profil complet de…"` est conservé tel quel en bas.

- [ ] **Step 3 : Vérifier le build**

```bash
npx tsc --noEmit
```

Attendu : 0 erreurs.

- [ ] **Step 4 : Commit**

```bash
git add components/landing/LandingMobileNav.tsx components/landing/MockupSection.tsx
git commit -m "fix(landing): center mobile nav labels and make featured profile card fully clickable"
```

---

## Task 5 — Fix route OG résultat (C6)

**Files:**
- Modify: `app/api/og/result/[slug]/[resultId]/route.tsx`
- Modify: `app/[slug]/page.tsx`

**Interfaces:**
- Le bug : `.eq('published', true)` à la ligne ~51 de la route résultat. La colonne `published` est toujours `false` depuis la migration de visibilité, donc aucun profil n'est trouvé → l'image OG résultat retourne 404 → WhatsApp n'affiche pas d'image.

- [ ] **Step 1 : Corriger la requête dans la route OG résultat**

Dans `app/api/og/result/[slug]/[resultId]/route.tsx`, trouver la requête qui fetch le profil (autour de la ligne 45-53) et remplacer :

```ts
// Avant (cassé — published est toujours false)
const { data: profile } = await supabase
  .from('profiles')
  .select('first_name, last_name, profile_photo_url, cover_photo_url')
  .eq('id', entry.profile_id)
  .eq('slug', params.slug)
  .eq('published', true)
  .maybeSingle()

// Après
const { data: profile } = await supabase
  .from('profiles')
  .select('first_name, last_name, profile_photo_url, cover_photo_url')
  .eq('id', entry.profile_id)
  .eq('slug', params.slug)
  .in('visibility', ['public', 'private'])
  .maybeSingle()
```

- [ ] **Step 2 : Renforcer la garde siteUrl dans generateMetadata**

Dans `app/[slug]/page.tsx`, ligne 23, remplacer :

```ts
// Avant
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''

// Après
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ipponid.com'
```

- [ ] **Step 3 : Vérifier le build**

```bash
npx tsc --noEmit
```

Attendu : 0 erreurs.

- [ ] **Step 4 : Commit**

```bash
git add app/api/og/result/[slug]/[resultId]/route.tsx app/[slug]/page.tsx
git commit -m "fix(og): fix result OG image returning 404 due to stale published=true filter"
```

---

## Task 6 — Server actions suppression profil (C7 backend)

**Files:**
- Modify: `app/dashboard/[profileId]/actions.ts`

**Interfaces:**
- Produces:
  - `removeFromManagement(formData: FormData): Promise<void>` — supprime la ligne profile_access du manager appelant; redirige vers `/dashboard`
  - `deleteProfile(formData: FormData): Promise<void>` — supprime fichiers Storage + ligne profiles (cascade); redirige vers `/dashboard`
- Consumes: `isProfileOwner` de `@/lib/profileAccessService`, `createAdminClient` de `@/lib/supabase/admin`

- [ ] **Step 1 : Ajouter les imports nécessaires en haut de actions.ts**

Dans `app/dashboard/[profileId]/actions.ts`, ajouter aux imports existants :

```ts
import { createAdminClient } from '@/lib/supabase/admin'
```

Les imports `createClient`, `isProfileOwner`, `revalidatePath`, `redirect` sont déjà présents.

- [ ] **Step 2 : Ajouter removeFromManagement en bas du fichier**

```ts
export async function removeFromManagement(formData: FormData): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const profileId = formData.get('profileId') as string

  const { data: access } = await supabase
    .from('profile_access')
    .select('role')
    .eq('profile_id', profileId)
    .eq('account_id', user.id)
    .maybeSingle()

  // Garde : ne pas supprimer si owner ou si pas d'accès
  if (!access || access.role === 'owner') return

  await supabase
    .from('profile_access')
    .delete()
    .eq('profile_id', profileId)
    .eq('account_id', user.id)

  redirect('/dashboard')
}
```

- [ ] **Step 3 : Ajouter deleteProfile en bas du fichier**

```ts
export async function deleteProfile(formData: FormData): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const profileId = formData.get('profileId') as string
  const confirmedName = (formData.get('confirmedName') as string | null)?.trim() ?? ''

  const owner = await isProfileOwner(profileId, user.id)
  if (!owner) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, profile_photo_url, cover_photo_url')
    .eq('id', profileId)
    .single()

  if (!profile || confirmedName !== profile.first_name) return

  // Récupérer les URLs des photos de galerie avant suppression cascade
  const { data: galleryPhotos } = await supabase
    .from('gallery_photos')
    .select('photo_url')
    .eq('profile_id', profileId)

  // Extraire les chemins Storage depuis les URLs publiques Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const storagePrefix = `${supabaseUrl}/storage/v1/object/public/media/`
  const rawUrls: (string | null)[] = [
    profile.profile_photo_url,
    profile.cover_photo_url,
    ...(galleryPhotos ?? []).map((g) => g.photo_url),
  ]
  const storagePaths = rawUrls
    .filter((url): url is string => !!url && url.startsWith(storagePrefix))
    .map((url) => url.slice(storagePrefix.length))

  if (storagePaths.length > 0) {
    const adminClient = createAdminClient()
    await adminClient.storage.from('media').remove(storagePaths)
  }

  await supabase.from('profiles').delete().eq('id', profileId)

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
```

- [ ] **Step 4 : Vérifier le build TypeScript**

```bash
npx tsc --noEmit
```

Attendu : 0 erreurs.

- [ ] **Step 5 : Commit**

```bash
git add app/dashboard/[profileId]/actions.ts
git commit -m "feat(dashboard): add removeFromManagement and deleteProfile server actions"
```

---

## Task 7 — Zone dangereuse UI (C7 frontend)

**Files:**
- Create: `components/dashboard/DeleteProfileSection.tsx`
- Modify: `app/dashboard/[profileId]/page.tsx`

**Interfaces:**
- Consumes:
  - `removeFromManagement` depuis `@/app/dashboard/[profileId]/actions`
  - `deleteProfile` depuis `@/app/dashboard/[profileId]/actions`
- Props du composant :
  ```ts
  interface DeleteProfileSectionProps {
    profileId: string
    firstName: string
    userRole: 'owner' | 'manager'
  }
  ```

- [ ] **Step 1 : Créer components/dashboard/DeleteProfileSection.tsx**

```tsx
'use client'

import { useState, useRef } from 'react'
import { removeFromManagement, deleteProfile } from '@/app/dashboard/[profileId]/actions'

interface DeleteProfileSectionProps {
  profileId: string
  firstName: string
  userRole: 'owner' | 'manager'
}

export default function DeleteProfileSection({
  profileId,
  firstName,
  userRole,
}: DeleteProfileSectionProps) {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [confirmInput, setConfirmInput] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)

  function openDeleteModal() {
    setConfirmInput('')
    setDeleteModalOpen(true)
    dialogRef.current?.showModal()
  }

  function closeDeleteModal() {
    setDeleteModalOpen(false)
    setConfirmInput('')
    dialogRef.current?.close()
  }

  return (
    <div className="mt-10 border border-red-200 rounded-xl p-5 bg-red-50/40">
      <p className="font-montserrat font-bold text-sm uppercase tracking-wide text-red-700 mb-4">
        Zone dangereuse
      </p>

      {userRole === 'manager' && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-on-surface-variant">
            Me retirer de la gestion de ce profil — le profil continuera d&apos;exister, géré par son propriétaire.
          </p>
          {!showRemoveConfirm ? (
            <button
              type="button"
              onClick={() => setShowRemoveConfirm(true)}
              className="self-start text-sm font-semibold text-red-600 border border-red-300 rounded-lg px-4 py-2 hover:bg-red-50 transition-colors"
            >
              Me retirer de la gestion
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <form action={removeFromManagement}>
                <input type="hidden" name="profileId" value={profileId} />
                <button
                  type="submit"
                  className="text-sm font-semibold text-white bg-red-600 rounded-lg px-4 py-2 hover:bg-red-700 transition-colors"
                >
                  Confirmer
                </button>
              </form>
              <button
                type="button"
                onClick={() => setShowRemoveConfirm(false)}
                className="text-sm font-medium text-on-surface-variant hover:text-on-surface"
              >
                Annuler
              </button>
            </div>
          )}
        </div>
      )}

      {userRole === 'owner' && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-on-surface-variant">
            Supprimer définitivement le profil de {firstName} — palmarès, photos et vidéos inclus. Action irréversible.
          </p>
          <button
            type="button"
            onClick={openDeleteModal}
            className="self-start text-sm font-semibold text-red-600 border border-red-300 rounded-lg px-4 py-2 hover:bg-red-50 transition-colors"
          >
            Supprimer définitivement le profil de {firstName}
          </button>

          {/* Modale de confirmation */}
          <dialog
            ref={dialogRef}
            className="rounded-2xl border border-outline-variant shadow-xl p-6 max-w-md w-full backdrop:bg-black/40"
            onCancel={closeDeleteModal}
          >
            <p className="font-montserrat font-bold text-primary text-lg mb-2">
              Supprimer le profil de {firstName} ?
            </p>
            <p className="text-sm text-on-surface-variant mb-4">
              Cette action est <strong>irréversible</strong>. Le profil, son palmarès, ses photos et ses vidéos seront définitivement supprimés.
            </p>
            <label className="block text-sm font-medium text-on-surface mb-1">
              Tape <strong>{firstName}</strong> pour confirmer
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={firstName}
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-red-400/40 mb-4"
            />
            <div className="flex gap-3">
              <form action={deleteProfile} className="flex-1">
                <input type="hidden" name="profileId" value={profileId} />
                <input type="hidden" name="confirmedName" value={confirmInput} />
                <button
                  type="submit"
                  disabled={confirmInput !== firstName}
                  className="w-full text-sm font-semibold text-white bg-red-600 rounded-lg px-4 py-2.5 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Supprimer définitivement
                </button>
              </form>
              <button
                type="button"
                onClick={closeDeleteModal}
                className="text-sm font-medium text-on-surface-variant border border-outline-variant rounded-lg px-4 py-2.5 hover:bg-surface-container transition-colors"
              >
                Annuler
              </button>
            </div>
          </dialog>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2 : Modifier app/dashboard/[profileId]/page.tsx pour charger le rôle et afficher la zone**

**2a.** Ajouter l'import en haut du fichier (après les imports existants) :

```ts
import DeleteProfileSection from '@/components/dashboard/DeleteProfileSection'
```

**2b.** Dans la fonction `ProfileDashboardHome`, le bloc `[ownerStatus, missingFields]` (ligne ~30) utilise `Promise.all` + `isProfileOwner`. Remplacer entièrement ce bloc par :

```ts
// Récupère le rôle ET les champs manquants en parallèle
const [{ data: accessRow }, missingFields] = await Promise.all([
  supabase
    .from('profile_access')
    .select('role')
    .eq('profile_id', profileId)
    .eq('account_id', user.id)
    .maybeSingle(),
  Promise.resolve(getMissingFieldsForPublishing(profile)),
])

const userRole = (accessRow?.role ?? null) as 'owner' | 'manager' | 'viewer' | null
const ownerStatus = userRole === 'owner'
```

L'import `isProfileOwner` peut être supprimé de ce fichier (il n'est plus appelé directement — `ownerStatus` est dérivé de `userRole`).

**2c.** Ajouter en bas du JSX retourné, juste avant la dernière `</div>` de clôture :

```tsx
{(userRole === 'owner' || userRole === 'manager') && (
  <DeleteProfileSection
    profileId={profileId}
    firstName={profile.first_name}
    userRole={userRole as 'owner' | 'manager'}
  />
)}
```

- [ ] **Step 3 : Vérifier le build TypeScript**

```bash
npx tsc --noEmit
```

Attendu : 0 erreurs.

- [ ] **Step 4 : Commit**

```bash
git add components/dashboard/DeleteProfileSection.tsx app/dashboard/[profileId]/page.tsx
git commit -m "feat(dashboard): add danger zone with remove-self and delete-profile actions"
```

---

## Plan de tests manuels après implémentation complète

| Correction | Scénario | Résultat attendu |
|-----------|----------|-----------------|
| C1 | Profil avec `bio = null` ou `bio = " "` | Section "Profil" absente de la page publique |
| C1 | Profil avec bio non vide | Section "Profil" visible |
| C2 | Dashboard → Profil → Date de naissance = 2017-04-15 | Affiche "Calculé automatiquement : Poussins 2 (saison 2025/2026)" |
| C2 | Cliquer "Utiliser cette valeur" | Le select catégorie d'âge passe à "Benjamin" |
| C2 | PalmaresBlock — entrée du 2026-03-01 pour né en 2017 | Badge affiche "Poussins 2" (et non plus "Benjamin 1") |
| C3 | Entrée palmarès sans catégorie de poids | Aucun badge poids vide |
| C3 | Entrée avec catégorie "-44 kg" | Badge poids "-44 kg" visible |
| C4 | Mobile (< 768px), menu bas de page | Icônes + labels parfaitement centrés sous chaque item |
| C5 | Cliquer n'importe où sur le bloc Timothé | Redirige vers `/timothe-francois` |
| C5 | Hover sur le bloc | Ring bleu subtil + ombre plus prononcée |
| C6 | Partager un résultat via WhatsApp | Aperçu WhatsApp affiche l'image générée par `/api/og/result/...` |
| C6 | Partager un profil | Aperçu WhatsApp affiche l'image de profil |
| C7 | Connecté en tant que manager | Bouton "Me retirer" visible, "Supprimer" absent |
| C7 | Cliquer "Me retirer" → "Confirmer" | Manager n'apparaît plus dans le dashboard |
| C7 | Connecté en tant qu'owner | Bouton "Supprimer définitivement" visible |
| C7 | Taper un mauvais prénom dans la modale | Bouton "Supprimer" reste grisé |
| C7 | Taper le bon prénom et confirmer | Profil supprimé, retour `/dashboard`, page profil → 404 |
