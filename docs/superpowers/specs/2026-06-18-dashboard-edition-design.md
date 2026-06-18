# Dashboard d'édition judoka — Spec de design

**Date :** 2026-06-18
**Projet :** IpponId — cv_judo
**Stack :** Next.js 14 App Router, Supabase (Auth + DB + Storage), TypeScript, Tailwind

---

## Contexte

Le judoka connecté (via Google OAuth) doit pouvoir gérer son profil public depuis un tableau de bord privé. La page publique `app/[slug]/page.tsx` doit respecter le statut `published` du profil.

---

## Architecture générale

**Approche retenue : Middleware + Layout (Approche A)**

- `middleware.ts` à la racine : intercept toutes les routes `/dashboard/*`, vérifie la session Supabase SSR, redirige vers `/` si absente.
- `app/dashboard/layout.tsx` : second garde-barrière, charge `profiles` où `owner_id = uid`. Si aucun profil → redirect vers `/dashboard/setup`. Rend le shell de navigation sans passer de données aux pages enfants (chaque page recharge ce dont elle a besoin).
- Server Actions colocalisées dans chaque sous-dossier (`app/dashboard/<section>/actions.ts`).

---

## Structure de fichiers

```
middleware.ts

app/
  dashboard/
    layout.tsx                   ← garde-barrière auth + profil, shell nav
    page.tsx                     ← accueil dashboard
    setup/
      page.tsx                   ← formulaire prénom/nom (si Google ne les fournit pas)
      actions.ts                 ← createProfile()
    profil/
      page.tsx                   ← formulaire identité/bio
      actions.ts                 ← saveProfile()
    palmares/
      page.tsx                   ← liste + formulaire ajout/modif
      actions.ts                 ← addPalmares(), updatePalmares(), deletePalmares()
    videos/
      page.tsx                   ← liste + formulaire ajout
      actions.ts                 ← addVideo(), deleteVideo()
    galerie/
      page.tsx                   ← grille + upload
      actions.ts                 ← addPhoto(), deletePhoto()

components/
  dashboard/
    DashboardNav.tsx             ← sidebar desktop + bottom tabs mobile
    ImageUploader.tsx            ← upload client → Supabase Storage, retourne URL
```

---

## Section 1 — Middleware & protection des routes

`middleware.ts` utilise `@supabase/ssr` pour lire la session depuis les cookies sur toutes les routes `/dashboard/*`. Redirection vers `/` si pas de session valide.

Le `layout.tsx` vérifie ensuite l'existence d'un profil pour l'uid connecté. Si absent → redirect `/dashboard/setup`.

---

## Section 2 — Flow de setup & création automatique de profil

### Déclenchement

Après le callback OAuth `/auth/callback`, le user atterrit sur `/dashboard`. Le layout détecte l'absence de profil et redirige vers `/dashboard/setup`.

### Page `/dashboard/setup`

Formulaire avec deux champs : **Prénom** et **Nom**.

Pré-remplissage depuis `user_metadata` Google :
- `given_name` + `family_name` disponibles → pré-remplit directement.
- Seulement `full_name` (ex. "Timothé François") → découpe au premier espace (premier mot = prénom, reste = nom), pré-remplit pour validation.
- Rien → champs vides, saisie manuelle.

### Server Action `createProfile()`

1. Vérifie qu'aucun profil n'existe déjà pour cet `uid` (idempotence).
2. Génère le slug : `generateSlug(firstName, lastName)` depuis `lib/slugify.ts`.
3. Vérifie l'unicité : si le slug existe, essaie `slug-2`, `slug-3`, … (max 10 tentatives).
4. INSERT dans `profiles` : `published = false`, `parental_consent = false`, autres champs vides.
5. Redirect vers `/dashboard`.

---

## Section 3 — Layout du dashboard & navigation

### `DashboardNav.tsx` (Client Component)

**Desktop — sidebar fixe gauche (~240px)**
- Logo IpponId en haut.
- 4 liens de navigation avec icône + label.
- Lien actif : `bg-tertiary-container/20` + barre accent `w-1 bg-tertiary-container` à gauche.
- Bouton Déconnexion en bas.

**Mobile — barre fixe en bas (h-16)**
- 4 onglets icône + label, fond `bg-surface`, border-top.
- Même pattern que le `MobileNav` existant.

| Label | Route | Icône (Heroicons outline) |
|---|---|---|
| Profil | `/dashboard/profil` | `UserCircleIcon` |
| Palmarès | `/dashboard/palmares` | `TrophyIcon` |
| Vidéos | `/dashboard/videos` | `PlayCircleIcon` |
| Galerie | `/dashboard/galerie` | `PhotoIcon` |

### `app/dashboard/layout.tsx`

Shell : `<DashboardNav />` + `<main className="md:pl-60 pb-16 md:pb-0">`.

---

## Section 4 — Page d'accueil du dashboard

### Carte résumé

- Photo de profil 64px ronde (ou placeholder initiales sur `bg-primary-container`).
- Nom complet + slug grisé.
- Badge statut : "Brouillon" (`bg-surface-container`) ou "Publié" (`bg-tertiary-container/20 text-tertiary-container`).

### Actions

- **Lien "Voir ma page publique"** → `/{slug}`, nouvel onglet. Toujours visible (permet de prévisualiser un brouillon).
- **Toggle publier/dépublier** : bouton "Publier mon profil" (primaire) ou "Dépublier" (outline destructif).

### Server Action `togglePublished()`

```
UPDATE profiles SET published = !currentValue WHERE id = profileId AND owner_id = uid
revalidatePath('/dashboard')
revalidatePath(`/${slug}`)
revalidatePath('/', 'layout')   // régénère generateStaticParams
```

---

## Section 5 — Page Profil

### Formulaire

| Champ | Type | Colonne DB |
|---|---|---|
| Prénom | text readonly (info) | `first_name` |
| Nom | text readonly (info) | `last_name` |
| Club | text input | `club` |
| Catégorie de poids | text input | `category` |
| Grade | select (6e kyu, 5e kyu, 4e kyu, 3e kyu, 2e kyu, 1er kyu, 1er dan, 2e dan, 3e dan+) | `grade` |
| Bio | textarea max 500 car. | `bio` |
| Photo de profil | `ImageUploader` | `profile_photo_url` |
| Photo de couverture | `ImageUploader` | `cover_photo_url` |

Prénom/Nom sont readonly avec note "modifiable via les paramètres Google" pour éviter la désynchronisation avec le slug.

### Server Action `saveProfile()`

```
UPDATE profiles SET club, category, grade, bio, profile_photo_url, cover_photo_url
  WHERE id = profileId AND owner_id = uid
revalidatePath('/dashboard/profil')
revalidatePath(`/${slug}`)
```

### Composant `ImageUploader` (Client Component)

Props : `fieldName`, `currentUrl`, `ownerId`, `bucket = 'media'`.

Flow :
1. Affiche image courante ou placeholder.
2. Input `type="file"` `accept="image/*"` max 5 Mo (validation côté client).
3. Au `onChange` : upload vers `media/{ownerId}/{fieldName}-{timestamp}.{ext}` via le client Supabase navigateur.
4. Pendant l'upload : spinner. En cas d'erreur : message inline.
5. Succès : récupère l'URL publique via `getPublicUrl()`, met à jour un `<input type="hidden" name={fieldName} value={url} />`.

L'upload se fait côté client (direct navigateur → Storage) pour éviter de faire transiter les fichiers par le serveur Next.js.

---

## Section 6 — Page Palmarès

### Liste

Cartes par entrée : date, compétition, médaille/position. Actions par ligne : **Modifier** (pré-remplit le formulaire) et **Supprimer** (confirmation inline "Confirmer ? / Annuler" sans modal).

### Formulaire d'ajout/modification

| Champ | Type | Notes |
|---|---|---|
| Date | `<input type="date">` | calendrier natif |
| Compétition | text input | |
| Ville | text input | optionnel |
| Catégorie de poids | text input | ex. "-66 kg" |
| Niveau | select | Départemental / Régional / National / International |
| Place | select | 1re / 2e / 3e / 5e / 7e / 9e |
| Résultat (calculé) | badge readonly | dérivé de la place |

**Dérivation place → médaille (dans la Server Action) :**
- 1 → `medal = "or"`, `result = "1re place — Médaille d'or"`
- 2 → `medal = "argent"`, `result = "2e place — Médaille d'argent"`
- 3 → `medal = "bronze"`, `result = "3e place — Médaille de bronze"`
- 5, 7, 9 → `medal = null`, `result = "Xe place"`

### Server Actions

```
addPalmares(formData)         → dérive medal+result, INSERT, revalidatePath
updatePalmares(id, formData)  → UPDATE WHERE id AND owner (via JOIN profiles)
deletePalmares(id)            → DELETE WHERE id AND owner (via JOIN profiles)
```

---

## Section 7 — Page Vidéos

### Liste + formulaire

Champs : **Titre**, **Lien YouTube**, **Description** (optionnelle).

**Validation URL YouTube** dans la Server Action (regex) :
- `youtube.com/watch?v=`
- `youtu.be/`
- `youtube.com/shorts/`

Si invalide → erreur retournée et affichée sous le champ, sans redirection.

Suppression avec confirmation inline (même pattern que Palmarès).

### Server Actions

```
addVideo(formData)   → valide URL, INSERT, revalidatePath
deleteVideo(id)      → DELETE WHERE id AND owner
```

---

## Section 8 — Page Galerie

### Grille

3 colonnes desktop, 2 colonnes mobile. Sur chaque vignette : bouton Supprimer en overlay hover (desktop) / toujours visible (mobile).

### Ajout

`ImageUploader` en mode galerie : stocke dans `media/{ownerId}/gallery/{timestamp}.{ext}`. Champ **Légende** optionnel.

### Server Actions

```
addPhoto(url, caption)  → INSERT gallery_photos, revalidatePath
deletePhoto(id)         → DELETE gallery_photos (fichier Storage laissé en place — v1)
```

> Suppression de l'objet Storage nécessiterait la `service_role` key. Laissé pour une v2.

---

## Section 9 — Restriction page publique

### Modification de `getJudokaBySlug`

Ajoute un second paramètre `options?: { allowDraft?: boolean }`. Si `allowDraft = true`, la query ne filtre pas sur `published = true`.

Il faut aussi exposer `ownerId` et `published` dans `JudokaData` (ou retourner un objet étendu depuis la page).

`generateMetadata` doit également appeler `getJudokaBySlug(params.slug, { allowDraft: true })` pour que les balises OG soient correctement générées lors d'une prévisualisation de brouillon par le propriétaire. Les métadonnées d'un brouillon ne sont pas indexées (le profil n'est pas encore public), donc pas de risque SEO.

### Logique dans `app/[slug]/page.tsx`

```ts
const [judoka, { data: { user } }] = await Promise.all([
  getJudokaBySlug(params.slug, { allowDraft: true }),
  createClient().auth.getUser(),
])

const isOwner = !!user && judoka?.ownerId === user.id

if (!judoka) notFound()
if (!judoka.published && !isOwner) notFound()
```

Si `!judoka.published && isOwner` : affiche la page normalement + bandeau fixe en haut :

> **"Brouillon — cette page n'est pas visible publiquement"** + lien "Gérer →" vers `/dashboard`

Bandeau : `bg-surface-container border-b border-outline-variant`, position sticky top.

`generateStaticParams` reste inchangé (published only). Les drafts sont rendus dynamiquement (`dynamicParams = true` par défaut dans Next.js 14).

---

## Ce qui reste hors scope (v2)

- Suppression des fichiers orphelins dans Storage lors de la suppression d'une photo de galerie.
- Réorganisation par drag-and-drop du palmarès / galerie (colonne `position`).
- Édition du champ `parental_consent` (géré hors dashboard pour l'instant).
- Modification du prénom/nom (et mise à jour du slug).
