---
name: account-deletion
description: Suppression complète d'un compte utilisateur — fichiers Storage, données DB en cascade, session — avec confirmation explicite "SUPPRIMER" dans une modale.
metadata:
  type: project
---

# Suppression de compte — Design

## Contexte

Fonctionnalité de test/nettoyage : permettre à un utilisateur de supprimer intégralement son compte (données DB + fichiers Storage + session) depuis le dashboard, afin de pouvoir re-tester le flux de création depuis zéro.

## État du schéma — aucune migration FK nécessaire

Toutes les contraintes ON DELETE CASCADE sont déjà en place dans `0001_init.sql` :

| Table | Colonne | Référence | Cascade |
|---|---|---|---|
| `profiles` | `owner_id` | `auth.users(id)` | ON DELETE CASCADE ✓ |
| `palmares` | `profile_id` | `profiles(id)` | ON DELETE CASCADE ✓ |
| `videos` | `profile_id` | `profiles(id)` | ON DELETE CASCADE ✓ |
| `gallery_photos` | `profile_id` | `profiles(id)` | ON DELETE CASCADE ✓ |

Un fichier `0005_cascade_verify.sql` est créé comme commentaire de traçabilité uniquement — aucune instruction SQL à exécuter.

## Fichiers à créer / modifier

| Fichier | Action |
|---|---|
| `supabase/migrations/0005_cascade_verify.sql` | Nouveau — commentaire de vérification |
| `lib/supabase/admin.ts` | Nouveau — factory client admin SERVICE_ROLE_KEY |
| `app/dashboard/profil/actions.ts` | Modifié — ajout `deleteAccount()` |
| `app/dashboard/profil/DeleteAccountSection.tsx` | Nouveau — composant client zone danger + modale |
| `app/dashboard/profil/page.tsx` | Modifié — import `DeleteAccountSection` |

## Détail — `lib/supabase/admin.ts`

```ts
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

- Utilise `@supabase/supabase-js` (pas `@supabase/ssr`) — pas de cookies
- `SUPABASE_SERVICE_ROLE_KEY` est une variable sans préfixe `NEXT_PUBLIC_` : elle n'est jamais envoyée au bundle client
- Ce fichier ne doit être importé que dans des Server Actions ou Route Handlers

## Détail — Server Action `deleteAccount()`

Séquence dans `app/dashboard/profil/actions.ts` :

1. `createClient().auth.getUser()` — récupère l'utilisateur authentifié, redirige vers `/` si absent
2. `createAdminClient().storage.from('media').list(uid)` — liste les fichiers dans le dossier `{uid}/`
3. `createAdminClient().storage.from('media').remove([...paths])` — supprime tous les fichiers (no-op si dossier vide)
4. `createAdminClient().auth.admin.deleteUser(uid)` — supprime le compte ; la cascade supprime `profiles` puis `palmares` / `videos` / `gallery_photos`
5. `createClient().auth.signOut()` — efface les cookies de session côté serveur
6. `redirect('/')` — renvoie vers la page d'accueil

Points importants :
- Le `uid` est capturé avant toute suppression (étape 1), car il n'est plus récupérable ensuite
- L'admin client n'est jamais exporté ni accessible côté client
- Si la liste des fichiers renvoie une erreur (dossier inexistant), on continue sans bloquer
- `deleteUser` est une opération irréversible ; ne pas wrapper dans un try/catch silencieux — laisser remonter les erreurs
- Cas de défaillance partielle : si `deleteUser` échoue après suppression des fichiers Storage, le compte existe toujours mais les photos sont perdues. Acceptable pour un outil de test/nettoyage — l'utilisateur voit l'erreur et peut contacter le support ou réessayer.

## Détail — `DeleteAccountSection.tsx`

Composant `'use client'` rendu en bas de `profil/page.tsx`.

### Zone danger

- Séparateur visuel : `border-t-2 border-red-200 mt-12 pt-8`
- Titre "Zone dangereuse" en rouge
- Description courte : "Cette action est irréversible. Toutes tes données et fichiers seront supprimés."
- Bouton "Supprimer mon compte" : variante destructive rouge outline

### Modale de confirmation

Déclenchée au clic sur le bouton. Implémentée avec une `div` en `fixed inset-0` (overlay) + `div` centrée (modale), sans librairie externe.

Contenu :
- Titre : "Supprimer mon compte ?"
- Message d'avertissement explicite
- Label : `Pour confirmer, tape SUPPRIMER ci-dessous`
- `<input type="text">` contrôlé
- Bouton "Confirmer la suppression" : désactivé tant que la valeur != `"SUPPRIMER"` (exact, sensible à la casse)
- Bouton "Annuler" : ferme la modale
- État de chargement : bouton désactivé + texte "Suppression en cours…" pendant l'exécution de l'action

### Gestion des états

```
isOpen: boolean        — modale ouverte/fermée
confirmText: string    — valeur du champ de confirmation
isLoading: boolean     — action en cours
```

L'action est appelée via `startTransition(() => deleteAccount())` pour obtenir le `isPending` natif de React, ou via un état `isLoading` local.

## Variable d'environnement requise

```
SUPABASE_SERVICE_ROLE_KEY=<valeur dans Settings > API > service_role key>
```

À ajouter dans `.env.local` (déjà dans `.gitignore`). Ne pas préfixer par `NEXT_PUBLIC_`.

## Ce qu'il faut tester

1. **Suppression complète DB** : après suppression, vérifier en SQL que `profiles`, `palmares`, `videos`, `gallery_photos` n'ont plus de ligne avec cet `owner_id` / `profile_id`.
2. **Suppression Storage** : vérifier dans le bucket `media` que le dossier `{uid}/` est vide ou absent.
3. **Session invalidée** : après suppression, le dashboard doit rediriger vers `/` sans erreur.
4. **Reconnexion Google** : l'utilisateur peut se reconnecter via Google OAuth, ce qui crée un nouvel `auth.users` avec un nouvel `uid` → déclenche le flux `/dashboard/setup` normalement.
5. **Annulation modale** : cliquer "Annuler" ne déclenche rien, le compte est intact.
6. **Saisie incorrecte** : taper autre chose que `SUPPRIMER` (casse différente, faute) garde le bouton désactivé.
