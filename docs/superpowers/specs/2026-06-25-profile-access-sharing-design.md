# Design — Gestion des accès partagés (profil judoka)

**Date :** 2026-06-25
**Branche cible :** bugfix-lot1 (ou feature branch dédiée)
**Scope :** invitation d'autres comptes IpponId à gérer ou consulter un profil judoka

---

## Contexte

La table `profile_access` est en place depuis la migration `0008_profile_access.sql`. Elle stocke les triplets `(profile_id, account_id, role)` avec les rôles `owner | manager | viewer`. Ce design couvre l'interface et la logique d'invitation — pas la création de la table.

---

## Architecture

```
app/dashboard/[profileId]/acces/page.tsx   (Server Component — owner-only)
  └─► createAdminClient()                  (chargement initial liste)
  └─► ProfileAccessManager.tsx             (Client Component)
        └─► fetch POST /api/profile-access  (mutations : add / remove)
        └─► toast (sonner)                  (feedback utilisateur)

app/api/profile-access/route.ts            (POST handler)
  ├─ action=list   → admin client lit profile_access + enrichit via auth.users
  ├─ action=add    → admin client cherche email dans auth.users → addProfileAccess()
  └─ action=remove → removeProfileAccess()

lib/profileAccessService.ts                (nouvelles fonctions)
  ├─ getProfileAccesses(profileId)
  ├─ addProfileAccess(profileId, targetAccountId, role, requestingAccountId)
  └─ removeProfileAccess(profileId, targetAccountId, requestingAccountId)

supabase/migrations/0009_profile_access_rls_update.sql
  ├─ pa_owner_select_profile  (owner voit toutes les lignes de son profil)
  └─ pa_owner_delete_others   (owner peut supprimer les lignes non-owner)
```

---

## 1. Nouvelles fonctions — `profileAccessService.ts`

Le fichier est marqué `'use server'` et utilise `createClient()` (client Supabase standard avec session cookie).

### `getProfileAccesses(profileId): Promise<ProfileAccessEntry[]>`

Retourne les lignes brutes de `profile_access` pour ce profil. L'enrichissement avec les infos utilisateur (prénom / initiale) se fait dans la couche appelante (Server Component ou route API) via `createAdminClient()`, car `auth.users` est inaccessible au rôle `authenticated`.

```ts
export type ProfileAccessEntry = {
  id: string
  account_id: string
  role: ProfileRole
  invited_by: string | null
  created_at: string
}
```

### `addProfileAccess(profileId, targetAccountId, role, requestingAccountId)`

1. Vérifie `isProfileOwner(profileId, requestingAccountId)` — refuse si non-owner.
2. Vérifie que `targetAccountId !== requestingAccountId` → `{ success: false, message: "Tu ne peux pas t'ajouter toi-même." }`.
3. Vérifie l'absence de doublon dans `profile_access` — si doublon : `{ success: false, message: "Accès ajouté." }` (intentionnellement le message de succès pour ne pas révéler l'existence du compte — voir section Sécurité).
4. Insère avec `invited_by = requestingAccountId`.
5. Retourne `{ success: true, message: "Accès ajouté." }`.

**Note :** la résolution `email → account_id` est faite dans la route API (admin client), pas ici. Ce service ne connaît que les UUIDs.

### `removeProfileAccess(profileId, targetAccountId, requestingAccountId)`

1. Vérifie `isProfileOwner(profileId, requestingAccountId)` — refuse si non-owner.
2. Lit la ligne à supprimer — si elle a `role = 'owner'` : refuse.
3. Supprime la ligne.
4. Retourne `{ success: true, message: "Accès retiré." }` ou message d'erreur.

---

## 2. Route API — `app/api/profile-access/route.ts`

**Méthode :** POST uniquement.

**Authentification :** toujours vérifier `supabase.auth.getUser()` en premier. Retourne 401 si pas de session.

### Body format

```ts
type RequestBody =
  | { action: 'list';   profileId: string }
  | { action: 'add';    profileId: string; email: string; role: 'manager' | 'viewer' }
  | { action: 'remove'; profileId: string; targetAccountId: string }
```

### action = 'list'

- Appelle `getProfileAccesses(profileId)` via client régulier.
- Pour chaque ligne, enrichit avec admin client (`auth.admin.getUserById(account_id)`) → extrait `user_metadata.first_name` ou tronque l'email pour construire `display_name = first_name + ' ' + last_name[0] + '.'`.
- **Ne retourne jamais l'email complet** dans la réponse JSON.
- Format réponse : `{ accesses: Array<{ account_id, role, created_at, display_name }> }`

### action = 'add'

- Vérifie que `role` est `'manager'` ou `'viewer'` (jamais `'owner'`).
- Utilise `adminClient.auth.admin.listUsers()` filtré par email (insensible à la casse) pour trouver le compte.
- **Anti-énumération** : si compte introuvable OU déjà présent → même message neutre : `"Aucun compte IpponId associé à cet email."`. Seul le cas `targetAccountId === currentUserId` a un message distinct.
- Si trouvé et cas nominal : appelle `addProfileAccess(profileId, foundUser.id, role, currentUser.id)`.

### action = 'remove'

- Appelle `removeProfileAccess(profileId, targetAccountId, currentUser.id)`.
- Retourne le résultat directement.

---

## 3. Migration RLS — `0009_profile_access_rls_update.sql`

Les nouvelles politiques sont en **défense en profondeur** (les opérations passent par admin client côté serveur, mais les policies assurent qu'une requête directe via client authentifié serait aussi correctement filtrée).

```sql
-- Owner voit toutes les lignes de ses profils
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

-- Owner peut supprimer les lignes non-owner de ses profils
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
```

**Policies existantes conservées sans modification :**
- `pa_select_own` — chaque user voit sa propre ligne
- `pa_delete_self_non_owner` — auto-suppression (hors owner)

---

## 4. Page dashboard — `app/dashboard/[profileId]/acces/page.tsx`

Server Component.

**Guard :** `isProfileOwner(profileId, user.id)` → si non-owner, `redirect('/dashboard/' + profileId)`.

**Chargement initial :** appelle directement `createAdminClient()` pour enrichir les lignes avec les display names (évite un aller-retour HTTP superflu vers la route API).

**Rendu :** passe les données et `profileId` + `currentAccountId` à `<ProfileAccessManager />`.

---

## 5. Composant — `components/dashboard/ProfileAccessManager.tsx`

Client Component (`'use client'`).

### Props

```ts
type Props = {
  profileId: string
  currentAccountId: string
  initialAccesses: DisplayAccess[]
}

type DisplayAccess = {
  account_id: string
  role: ProfileRole
  created_at: string
  display_name: string
}
```

### Section "Personnes ayant accès"

- Liste tous les accès.
- Badges de rôle (Tailwind) :
  - `owner` → `bg-primary/10 text-primary border border-primary/20`
  - `manager` → `bg-blue-50 text-blue-700 border border-blue-200`
  - `viewer` → `bg-surface-container text-on-surface-variant border border-outline-variant`
- Date formatée (`created_at` → `toLocaleDateString('fr-FR')`).
- Bouton "Retirer" : désactivé sur la ligne owner (et si `account_id === currentAccountId`), sinon appelle `action=remove`.

### Section "Inviter une personne"

- `<form>` avec :
  - `<input type="email" placeholder="Adresse email du compte IpponId" required />`
  - `<select>` : Gestionnaire (`manager`) / Lecteur (`viewer`)
  - Bouton "Inviter" avec état `isPending` (`useState<boolean>`)
- Texte d'aide : "La personne doit avoir un compte IpponId avec cette adresse email pour pouvoir accéder au profil."

### Gestion état et feedback

- `isPending: boolean` pour l'état de chargement du bouton (pas de `useFormStatus` car `fetch()` direct).
- `toast.success(message)` / `toast.error(message)` (sonner).
- Après succès add/remove : recharge la liste via `action=list`.

---

## 6. Navigation — `DashboardProfileNav.tsx`

Ajout conditionnel sur `isOwner` :

- **Desktop sidebar** : nouvel item "Accès & partage" en bas de la liste `NAV_ITEMS`, avec une icône de partage/groupe, visible uniquement si `isOwner`.
- **Mobile bottom tabs** : même item ajouté en 6ème position, visible uniquement si `isOwner` (barre légèrement plus chargée mais accès direct validé).

---

## 7. Sécurité — Anti-énumération

La fonction `addProfileAccess` et la route API retournent **le même message neutre** dans deux cas distincts :
- Email non trouvé dans `auth.users`
- Email trouvé mais déjà présent dans `profile_access`

Ceci empêche de déduire si une adresse email est enregistrée sur IpponId.

**Exception intentionnelle :** `"Tu ne peux pas t'ajouter toi-même."` — ce message est acceptable car l'utilisateur connaît déjà son propre email.

---

## 8. Tests

### `__tests__/security/profileAccessSharing.test.ts`

Tests d'intégration (skippés si `SUPABASE_SERVICE_ROLE_KEY` absent) :

| Cas | Attendu |
|-----|---------|
| Owner ajoute un manager | succès |
| Owner ajoute un viewer | succès |
| Manager essaie d'ajouter quelqu'un | refus (non-owner) |
| Owner s'ajoute lui-même | refus (`"Tu ne peux pas t'ajouter toi-même."`) |
| Owner retire un manager | succès |
| Owner essaie de retirer l'owner | refus |
| Manager essaie de retirer quelqu'un | refus (non-owner) |
| Email inexistant | message neutre |
| Email déjà présent | même message neutre |

### `__tests__/unit/profileAccessService.test.ts`

Tests unitaires avec mocks vitest :

| Cas | Attendu |
|-----|---------|
| `addProfileAccess` avec `targetAccountId` valide | insère ligne avec bon rôle et `invited_by` |
| `removeProfileAccess` sur une ligne `owner` | refus |
| `getProfileAccesses` | retourne toutes les lignes avec les bons rôles |

---

## 9. Scénario de test manuel

1. Connecté avec compte A (owner), ouvrir `/dashboard/[profileId]/acces`.
2. Inviter l'email du compte B en tant que Gestionnaire.
3. Vérifier que la ligne apparaît dans la liste avec badge "Gestionnaire".
4. Se déconnecter, se connecter avec compte B.
5. Vérifier que le profil apparaît dans le dashboard de B avec badge "Gestionnaire".
6. Vérifier que B peut modifier le palmarès.
7. Vérifier que B **ne voit pas** le lien "Accès & partage" dans la nav (ni desktop, ni mobile).
8. Se reconnecter A, retirer l'accès de B → la ligne disparaît.

---

## Fichiers créés / modifiés

| Fichier | Statut |
|---------|--------|
| `lib/profileAccessService.ts` | modifié (3 nouvelles fonctions) |
| `app/api/profile-access/route.ts` | créé |
| `app/dashboard/[profileId]/acces/page.tsx` | créé |
| `components/dashboard/ProfileAccessManager.tsx` | créé |
| `components/dashboard/DashboardProfileNav.tsx` | modifié (lien owner-only) |
| `supabase/migrations/0009_profile_access_rls_update.sql` | créé |
| `__tests__/security/profileAccessSharing.test.ts` | créé |
| `__tests__/unit/profileAccessService.test.ts` | créé |
