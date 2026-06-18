# Account Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à un utilisateur de supprimer intégralement son compte (fichiers Storage + données DB en cascade + session) depuis une zone dangereuse dans `/dashboard/profil`, avec confirmation explicite "SUPPRIMER".

**Architecture:** Une Server Action `deleteAccount()` utilise un client admin Supabase (SERVICE_ROLE_KEY) pour lister/supprimer les fichiers Storage puis supprimer l'utilisateur (déclenchant les cascades DB). Un composant client `DeleteAccountSection` gère la modale de confirmation avant d'appeler l'action.

**Tech Stack:** Next.js 14 App Router, `@supabase/supabase-js` (admin client), `@supabase/ssr` (server client), React `useTransition`, Tailwind CSS.

## Global Constraints

- Jamais de `SUPABASE_SERVICE_ROLE_KEY` dans du code ou des fichiers accessibles côté client
- L'admin client ne doit être importé que depuis des Server Actions ou Route Handlers (jamais depuis `'use client'`)
- Aucune librairie externe pour la modale — `div` + Tailwind uniquement
- La confirmation est sensible à la casse : la valeur doit être exactement `SUPPRIMER`
- `next/navigation` `redirect('/')` utilisé pour terminer l'action côté serveur
- Commande de type-check : `npx tsc --noEmit`
- Commande lint : `npm run lint`

---

## File Map

| Fichier | Action | Responsabilité |
|---|---|---|
| `supabase/migrations/0005_cascade_verify.sql` | Créer | Commentaire de vérification des cascades (aucune instruction SQL) |
| `lib/supabase/admin.ts` | Créer | Factory du client admin Supabase (SERVICE_ROLE_KEY) |
| `app/dashboard/profil/actions.ts` | Modifier | Ajout de `deleteAccount()` |
| `app/dashboard/profil/DeleteAccountSection.tsx` | Créer | Zone danger + modale de confirmation (composant client) |
| `app/dashboard/profil/page.tsx` | Modifier | Rendu de `DeleteAccountSection` en bas de page |

---

### Task 1 : Migration de vérification des cascades

**Files:**
- Create: `supabase/migrations/0005_cascade_verify.sql`

**Interfaces:**
- Consumes: rien
- Produces: rien (fichier purement documentaire)

- [ ] **Étape 1 : Créer le fichier**

Contenu complet de `supabase/migrations/0005_cascade_verify.sql` :

```sql
-- 0005_cascade_verify.sql
-- Vérification : toutes les contraintes ON DELETE CASCADE nécessaires
-- à la suppression de compte sont déjà en place depuis 0001_init.sql.
-- Aucune instruction SQL à exécuter.
--
-- État vérifié le 2026-06-18 :
--   profiles.owner_id       → auth.users(id)   ON DELETE CASCADE ✓
--   palmares.profile_id     → profiles(id)     ON DELETE CASCADE ✓
--   videos.profile_id       → profiles(id)     ON DELETE CASCADE ✓
--   gallery_photos.profile_id → profiles(id)   ON DELETE CASCADE ✓
```

- [ ] **Étape 2 : Commit**

```bash
git add supabase/migrations/0005_cascade_verify.sql
git commit -m "docs: verify cascade constraints for account deletion"
```

---

### Task 2 : Client admin Supabase

**Files:**
- Create: `lib/supabase/admin.ts`

**Interfaces:**
- Consumes: `process.env.NEXT_PUBLIC_SUPABASE_URL`, `process.env.SUPABASE_SERVICE_ROLE_KEY`
- Produces: `createAdminClient()` → instance `SupabaseClient` avec droits admin

- [ ] **Étape 1 : Vérifier la variable d'environnement**

Dans `.env.local`, s'assurer que la ligne suivante existe (valeur dans Supabase > Settings > API > service_role) :

```
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Si elle manque, l'ajouter avant de continuer — `npx tsc --noEmit` échouera sinon avec une erreur runtime.

- [ ] **Étape 2 : Créer `lib/supabase/admin.ts`**

```ts
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

- [ ] **Étape 3 : Vérifier le type-check**

```bash
npx tsc --noEmit
```

Attendu : aucune erreur.

- [ ] **Étape 4 : Commit**

```bash
git add lib/supabase/admin.ts
git commit -m "feat: add supabase admin client factory"
```

---

### Task 3 : Server Action `deleteAccount()`

**Files:**
- Modify: `app/dashboard/profil/actions.ts`

**Interfaces:**
- Consumes: `createAdminClient()` depuis `@/lib/supabase/admin`, `createClient()` depuis `@/lib/supabase/server`
- Produces: `deleteAccount()` — Server Action async, `'use server'`, sans paramètre, sans valeur de retour (redirige)

- [ ] **Étape 1 : Ajouter les imports dans `app/dashboard/profil/actions.ts`**

En haut du fichier, après les imports existants, ajouter :

```ts
import { createAdminClient } from '@/lib/supabase/admin'
```

Le fichier aura ces imports au total :

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
```

- [ ] **Étape 2 : Ajouter la fonction `deleteAccount()` à la fin du fichier**

```ts
export async function deleteAccount() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const uid = user.id
  const adminClient = createAdminClient()

  // Supprimer tous les fichiers du bucket "media" pour cet utilisateur
  const { data: files } = await adminClient.storage.from('media').list(uid)
  if (files && files.length > 0) {
    const paths = files.map((f) => `${uid}/${f.name}`)
    await adminClient.storage.from('media').remove(paths)
  }

  // Supprimer l'utilisateur — la cascade supprime profiles, palmares, videos, gallery_photos
  const { error } = await adminClient.auth.admin.deleteUser(uid)
  if (error) throw new Error(`Échec suppression compte : ${error.message}`)

  // Effacer les cookies de session localement (l'utilisateur n'existe plus côté serveur)
  await supabase.auth.signOut({ scope: 'local' })

  redirect('/')
}
```

- [ ] **Étape 3 : Vérifier le type-check**

```bash
npx tsc --noEmit
```

Attendu : aucune erreur.

- [ ] **Étape 4 : Commit**

```bash
git add app/dashboard/profil/actions.ts
git commit -m "feat: add deleteAccount server action"
```

---

### Task 4 : Composant `DeleteAccountSection`

**Files:**
- Create: `app/dashboard/profil/DeleteAccountSection.tsx`

**Interfaces:**
- Consumes: `deleteAccount()` depuis `./actions`
- Produces: `DeleteAccountSection` — composant React sans props, `'use client'`

- [ ] **Étape 1 : Créer `app/dashboard/profil/DeleteAccountSection.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { deleteAccount } from './actions'

export default function DeleteAccountSection() {
  const [isOpen, setIsOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      await deleteAccount()
    })
  }

  function handleClose() {
    setIsOpen(false)
    setConfirmText('')
  }

  return (
    <>
      <div className="mt-12 pt-8 border-t-2 border-red-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-8 bg-red-500 rounded-full flex-shrink-0" />
          <h2 className="font-montserrat text-headline-md font-bold text-red-600 uppercase">
            Zone dangereuse
          </h2>
        </div>
        <p className="text-sm text-on-surface-variant mb-4 max-w-md">
          Supprime définitivement ton compte, toutes tes données et tes fichiers.
          Cette action est irréversible.
        </p>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="border border-red-500 text-red-600 font-semibold px-6 py-2.5 rounded-lg hover:bg-red-50 transition-colors text-sm"
        >
          Supprimer mon compte
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-montserrat font-bold text-primary text-lg">
              Supprimer mon compte ?
            </h3>
            <p className="text-sm text-on-surface-variant">
              Cette action est <strong>irréversible</strong>. Toutes tes données,
              photos et palmarès seront supprimés définitivement.
            </p>
            <div>
              <label
                htmlFor="confirm-delete-input"
                className="block text-sm font-medium text-on-surface mb-1"
              >
                Pour confirmer, tape <strong>SUPPRIMER</strong> ci-dessous
              </label>
              <input
                id="confirm-delete-input"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="SUPPRIMER"
                disabled={isPending}
                className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="flex-1 border border-outline-variant text-on-surface font-medium px-4 py-2.5 rounded-lg hover:bg-surface-container transition-colors text-sm disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={confirmText !== 'SUPPRIMER' || isPending}
                className="flex-1 bg-red-600 text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Suppression…' : 'Confirmer la suppression'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Étape 2 : Vérifier le type-check**

```bash
npx tsc --noEmit
```

Attendu : aucune erreur.

- [ ] **Étape 3 : Commit**

```bash
git add app/dashboard/profil/DeleteAccountSection.tsx
git commit -m "feat: add DeleteAccountSection component with modal confirmation"
```

---

### Task 5 : Intégration dans la page profil + vérification finale

**Files:**
- Modify: `app/dashboard/profil/page.tsx`

**Interfaces:**
- Consumes: `DeleteAccountSection` depuis `./DeleteAccountSection`
- Produces: page `/dashboard/profil` avec la zone dangereuse en bas

- [ ] **Étape 1 : Modifier `app/dashboard/profil/page.tsx`**

Ajouter l'import en haut du fichier (après les imports existants) :

```ts
import DeleteAccountSection from './DeleteAccountSection'
```

Modifier le `return` pour ajouter `<DeleteAccountSection />` après `<ProfileForm />` :

```tsx
return (
  <div className="px-margin-mobile md:px-margin-desktop py-10 max-w-container-max">
    <div className="flex items-center gap-3 mb-8">
      <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
      <h1 className="font-montserrat text-headline-md font-bold text-primary uppercase">
        Mon profil
      </h1>
    </div>
    <ProfileForm profile={profile} />
    <DeleteAccountSection />
  </div>
)
```

- [ ] **Étape 2 : Type-check + lint**

```bash
npx tsc --noEmit && npm run lint
```

Attendu : aucune erreur ni warning.

- [ ] **Étape 3 : Démarrer le serveur de dev et tester manuellement**

```bash
npm run dev
```

Checklist de test manuel :

1. **Annulation** : aller sur `/dashboard/profil`, cliquer "Supprimer mon compte", taper autre chose que "SUPPRIMER" → bouton "Confirmer la suppression" reste désactivé. Cliquer "Annuler" → modale se ferme, compte intact.

2. **Suppression complète** :
   - Taper exactement `SUPPRIMER` → bouton s'active
   - Cliquer "Confirmer la suppression" → texte passe à "Suppression…", puis redirection vers `/`
   - Vérifier en SQL dans Supabase Studio :
     ```sql
     select * from public.profiles where owner_id = '<uid_supprimé>';
     -- Doit retourner 0 lignes
     select * from public.palmares where profile_id in (select id from public.profiles where owner_id = '<uid_supprimé>');
     -- Idem (ou juste vérifier que profiles est vide)
     ```
   - Vérifier dans Storage > media que le dossier `{uid}/` est absent ou vide.

3. **Reconnexion** : se connecter avec le même compte Google → flux `/dashboard/setup` se déclenche normalement (nouveau profil vierge).

- [ ] **Étape 4 : Commit final**

```bash
git add app/dashboard/profil/page.tsx
git commit -m "feat: add account deletion zone to profil page"
```
