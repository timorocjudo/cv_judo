# Publish Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bloquer la publication d'un profil judoka incomplet et afficher une checklist visuelle dans le dashboard.

**Architecture:** Une fonction pure dans `lib/profileValidation.ts` détermine les champs manquants. Elle est appelée dans la Server Action (garde côté serveur) et dans le Server Component du dashboard (désactivation du bouton + checklist). Pas de nouveau composant Client, pas de changement de schéma DB.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase (client serveur)

## Global Constraints

- Next.js 14 App Router — Server Components et Server Actions uniquement (pas de `useActionState`)
- Pas de suite de tests configurée — vérification par `npx tsc --noEmit` et test manuel
- Couleurs Tailwind custom disponibles : `secondary` (#b6171e rouge), `tertiary` (#735c00 gold), `on-surface`, `on-surface-variant`, `surface-container-lowest`, `outline-variant`, `primary`, `on-primary`
- Champs manquants = `null` ou chaîne vide après `.trim()`
- Stratégie d'erreur server action : `redirect('/dashboard?error=...')` (pas de retour de valeur)

---

## File Map

| Fichier | Statut | Responsabilité |
|---|---|---|
| `lib/profileValidation.ts` | **Créer** | Fonction pure de validation, liste des labels requis |
| `app/dashboard/actions.ts` | **Modifier** | Ajouter la garde de validation dans `togglePublished` |
| `app/dashboard/page.tsx` | **Modifier** | Checklist, bannière d'erreur, bouton conditionnel |

---

## Task 1 : Créer `lib/profileValidation.ts`

**Files:**
- Create: `lib/profileValidation.ts`

**Interfaces:**
- Produces:
  - `PublishableProfile` — type avec les 5 champs nullable
  - `REQUIRED_FIELD_LABELS: string[]` — liste des 5 labels dans l'ordre d'affichage
  - `getMissingFieldsForPublishing(profile: PublishableProfile): string[]` — retourne les labels des champs vides

- [ ] **Step 1 : Créer le fichier**

```ts
// lib/profileValidation.ts
export type PublishableProfile = {
  club: string | null
  category: string | null
  grade: string | null
  bio: string | null
  profile_photo_url: string | null
}

type RequiredField = { key: keyof PublishableProfile; label: string }

const REQUIRED_FIELDS: RequiredField[] = [
  { key: 'club',              label: 'Club' },
  { key: 'category',         label: 'Catégorie' },
  { key: 'grade',            label: 'Grade' },
  { key: 'bio',              label: 'Bio' },
  { key: 'profile_photo_url', label: 'Photo de profil' },
]

export const REQUIRED_FIELD_LABELS: string[] = REQUIRED_FIELDS.map((f) => f.label)

export function getMissingFieldsForPublishing(profile: PublishableProfile): string[] {
  return REQUIRED_FIELDS
    .filter(({ key }) => !profile[key]?.trim())
    .map(({ label }) => label)
}
```

- [ ] **Step 2 : Vérifier le type-check**

```bash
npx tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Step 3 : Vérifier la logique manuellement**

Dans le terminal Node ou en ajoutant un `console.log` temporaire dans n'importe quelle Server Action, tester :

```ts
import { getMissingFieldsForPublishing } from '@/lib/profileValidation'

// Profil vide → 5 champs manquants
getMissingFieldsForPublishing({ club: null, category: '', grade: null, bio: '   ', profile_photo_url: null })
// => ['Club', 'Catégorie', 'Grade', 'Bio', 'Photo de profil']

// Profil complet → tableau vide
getMissingFieldsForPublishing({ club: 'Judo Club', category: '-66 kg', grade: 'Ceinture bleue', bio: 'Bonjour', profile_photo_url: 'https://...' })
// => []
```

- [ ] **Step 4 : Commit**

```bash
git add lib/profileValidation.ts
git commit -m "feat: add getMissingFieldsForPublishing validation"
```

---

## Task 2 : Ajouter la garde dans `togglePublished`

**Files:**
- Modify: `app/dashboard/actions.ts`

**Interfaces:**
- Consumes: `getMissingFieldsForPublishing(profile: PublishableProfile): string[]` from `@/lib/profileValidation`
- Produces: Comportement inchangé pour la dépublication. Pour la publication avec champs manquants : `redirect('/dashboard?error=<labels encodés>')`.

- [ ] **Step 1 : Remplacer le contenu de `app/dashboard/actions.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMissingFieldsForPublishing } from '@/lib/profileValidation'

export async function togglePublished(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const profileId = formData.get('profileId') as string
  const slug = formData.get('slug') as string
  const next = formData.get('next') === 'true'

  if (next) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('club, category, grade, bio, profile_photo_url')
      .eq('id', profileId)
      .eq('owner_id', user.id)
      .single()

    if (!profile) redirect('/')

    const missing = getMissingFieldsForPublishing(profile)
    if (missing.length > 0) {
      redirect(`/dashboard?error=${encodeURIComponent(missing.join(','))}`)
    }
  }

  await supabase
    .from('profiles')
    .update({ published: next })
    .eq('id', profileId)
    .eq('owner_id', user.id)

  revalidatePath('/dashboard')
  revalidatePath(`/${slug}`)
  revalidatePath('/', 'layout')
}
```

- [ ] **Step 2 : Vérifier le type-check**

```bash
npx tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/dashboard/actions.ts
git commit -m "feat: block publishing when required fields are missing"
```

---

## Task 3 : Mettre à jour le dashboard (checklist + bouton conditionnel + bannière)

**Files:**
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes:
  - `getMissingFieldsForPublishing(profile: PublishableProfile): string[]` from `@/lib/profileValidation`
  - `REQUIRED_FIELD_LABELS: string[]` from `@/lib/profileValidation`
  - `togglePublished` (Server Action) — comportement inchangé côté appel

- [ ] **Step 1 : Remplacer le contenu de `app/dashboard/page.tsx`**

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { togglePublished } from './actions'
import { getMissingFieldsForPublishing, REQUIRED_FIELD_LABELS } from '@/lib/profileValidation'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { error?: string | string[] }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, slug, first_name, last_name, profile_photo_url, published, club, category, grade, bio')
    .eq('owner_id', user.id)
    .single()

  if (!profile) redirect('/dashboard/setup')

  const missingFields = getMissingFieldsForPublishing(profile)
  const isPublishable = missingFields.length === 0

  const initials =
    (profile.first_name?.[0] ?? '') + (profile.last_name?.[0] ?? '')

  const rawError = Array.isArray(searchParams.error)
    ? searchParams.error[0]
    : searchParams.error
  const errorFields = rawError ? decodeURIComponent(rawError).split(',') : []

  return (
    <div className="px-margin-mobile md:px-margin-desktop py-10 max-w-container-max">

      {/* Bannière d'erreur (contournement UI) */}
      {errorFields.length > 0 && (
        <div className="mb-6 bg-secondary/10 border border-secondary/30 text-secondary rounded-lg px-4 py-3 text-sm">
          Impossible de publier — champs manquants :{' '}
          <span className="font-semibold">{errorFields.join(', ')}</span>.
        </div>
      )}

      {/* Carte résumé */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6 flex items-center gap-5 mb-8">
        {profile.profile_photo_url ? (
          <img
            src={profile.profile_photo_url}
            alt={`${profile.first_name} ${profile.last_name}`}
            className="w-16 h-16 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
            <span className="font-montserrat font-black text-on-primary text-lg">
              {initials.toUpperCase()}
            </span>
          </div>
        )}
        <div className="min-w-0">
          <p className="font-montserrat font-bold text-primary text-xl">
            {profile.first_name} {profile.last_name}
          </p>
          <p className="text-on-surface-variant text-sm">@{profile.slug}</p>
          <span
            className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
              profile.published
                ? 'bg-tertiary-container/20 text-tertiary'
                : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            {profile.published ? 'Publié' : 'Brouillon'}
          </span>
        </div>
      </div>

      {/* Checklist avant publication */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 mb-6">
        <p className="font-montserrat font-bold text-primary text-sm mb-3 uppercase tracking-wide">
          Avant de publier
        </p>
        <ul className="space-y-2">
          {REQUIRED_FIELD_LABELS.map((label) => {
            const isMissing = missingFields.includes(label)
            return (
              <li key={label} className="flex items-center gap-2 text-sm">
                <span className={isMissing ? 'text-secondary' : 'text-tertiary'}>
                  {isMissing ? '✗' : '✓'}
                </span>
                <span className={isMissing ? 'text-on-surface font-medium' : 'text-on-surface-variant'}>
                  {label}
                </span>
                {isMissing && (
                  <Link
                    href="/dashboard/profil"
                    className="ml-auto text-xs text-primary underline hover:no-underline"
                  >
                    Compléter →
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={`/${profile.slug}`}
          target="_blank"
          className="flex items-center justify-center gap-2 border border-outline-variant text-on-surface font-semibold px-6 py-3 rounded-lg hover:bg-surface-container transition-colors text-sm"
        >
          Voir ma page publique ↗
        </Link>

        <form action={togglePublished}>
          <input type="hidden" name="profileId" value={profile.id} />
          <input type="hidden" name="slug" value={profile.slug} />
          <input type="hidden" name="next" value={String(!profile.published)} />
          <button
            type="submit"
            disabled={!profile.published && !isPublishable}
            title={
              !profile.published && !isPublishable
                ? `Champs manquants : ${missingFields.join(', ')}`
                : undefined
            }
            className={`w-full sm:w-auto font-semibold px-6 py-3 rounded-lg text-sm transition-colors ${
              profile.published
                ? 'border border-secondary text-secondary hover:bg-secondary/5'
                : isPublishable
                  ? 'bg-primary text-on-primary hover:bg-primary-container'
                  : 'bg-primary/30 text-on-primary cursor-not-allowed'
            }`}
          >
            {profile.published ? 'Dépublier' : 'Publier mon profil'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier le type-check**

```bash
npx tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Step 3 : Lancer le serveur et tester manuellement**

```bash
npm run dev
```

Ouvrir `http://localhost:3000/dashboard`.

Cas à tester :

| Scénario | Attendu |
|---|---|
| Profil incomplet (ex. grade manquant) | Checklist : `✗ Grade` en rouge + lien "Compléter →", bouton "Publier" désactivé (opacité réduite), survol affiche la tooltip |
| Profil complet | Checklist : 5 `✓` en gold, bouton "Publier mon profil" actif |
| Clic "Publier" sur profil complet | Profil publié, badge "Publié" affiché, bouton devient "Dépublier" |
| Clic "Dépublier" | Toujours possible, badge repasse à "Brouillon" |
| Contournement : modifier `value` du champ `next` en `"true"` via devtools et soumettre le form sur profil incomplet | Bannière rouge "Impossible de publier — champs manquants : …" en haut du dashboard |
| Valeur vide (bio = `"   "`) | Doit être traitée comme manquante → `✗ Bio` |

- [ ] **Step 4 : Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: add publish checklist and conditional publish button on dashboard"
```
