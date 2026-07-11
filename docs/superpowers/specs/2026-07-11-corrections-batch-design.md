# Design — Corrections batch IpponId

**Date :** 2026-07-11  
**Branche :** feat/onboarding-account-types  
**Périmètre :** 7 corrections UI/logique/partage sans changement de schéma DB majeur

---

## C1 · Bloc Bio conditionnel

**Fichier :** `lib/blockRegistry.tsx`

La ligne `bio` du registre teste `data.bio?.trim()` avant de rendre le bloc. Si vide, null ou chaîne blanche → retourne `null`, la section disparaît de la page.

```ts
bio: (data) =>
  data.bio?.trim()
    ? <FadeInOnScroll delay={0.1}><BioBlock bio={data.bio} /></FadeInOnScroll>
    : null
```

`BioBlock.tsx` n'est pas modifié (le guard est au niveau du registre, point de couplage canonique).

---

## C2 · Calcul automatique de la catégorie d'âge

### Correction du bug dans `lib/ageCategory.ts`

Fichier existant mis à jour en place (tous les imports restent valides).

**Bug actuel :** `age = seasonStartYear - birthYear` → off-by-one. La saison 2025/2026 commence en sept 2025 (`seasonStartYear = 2025`) mais l'âge de référence est celui atteint dans l'**année civile de fin** de saison (2026).

**Correction :** `age = (seasonStartYear + 1) - birthYear`

**Catégories complètes (FFJudo) :**

| Âge (fin de saison) | Catégorie       | Année |
|---------------------|-----------------|-------|
| 4–5                 | Éveil Judo      | —     |
| 6                   | Pré-Poussins    | 1     |
| 7                   | Pré-Poussins    | 2     |
| 8                   | Poussins        | 1     |
| 9                   | Poussins        | 2     |
| 10                  | Benjamins       | 1     |
| 11                  | Benjamins       | 2     |
| 12                  | Minimes         | 1     |
| 13                  | Minimes         | 2     |
| 14                  | Cadets          | 1     |
| 15                  | Cadets          | 2     |
| 16                  | Cadets          | 3     |
| 17                  | Juniors         | 1     |
| 18                  | Juniors         | 2     |
| 19                  | Juniors         | 3     |
| 20–29               | Séniors         | —     |
| 30+                 | Vétérans        | —     |

**Signature :** `computeAgeCategory(birthDate: string | undefined, referenceDate?: string): string` — inchangée pour les callers.

**Exemples à valider :**
- Anna Lucia, née 2017-04-15, saison 2025/2026 → âge 2026−2017 = 9 → `"Poussins 2"` ✓
- Anna Lucia, saison 2026/2027 → âge 10 → `"Benjamins 1"` ✓
- Né le 1er sept 2010, référence 2025-09-01 → saison 2025/2026, âge 16 → `"Cadets 3"` ✓
- Né le 31 août 2010, référence 2025-08-31 → saison 2024/2025, âge 15 → `"Cadets 2"` ✓
- 30 ans → `"Vétérans"` ✓
- 4 ans → `"Éveil Judo"` ✓

### Tests : `__tests__/unit/judoCategory.test.ts`

Couvre : Anna Lucia (2 saisons), Éveil, Pré-Poussins 1, Poussins 2, Benjamins 1, Minimes, Cadets 1/2/3, Juniors, Séniors, Vétérans, cas limites 1er sept / 31 août.

### Dashboard — affichage en temps réel (`components/dashboard/ProfileForm.tsx`)

- Après le champ `birth_date`, afficher la computed value sous forme de chip texte : `"Calculé automatiquement : Poussins 2 (saison 2025/2026)"` (calculé avec `computeAgeCategory(birthDate)`, mis à jour à chaque changement)
- Bouton `"Utiliser cette valeur"` → appelle `setAgeGroup(derivedAgeGroup)`, où `derivedAgeGroup` est déduit de la catégorie calculée (Éveil/Pré-Poussins/Poussins → `"Benjamin"`, Benjamins → `"Benjamin"`, Minimes → `"Minime"`, etc.)
- `getAgeGroupFromCategory` étendue pour les nouvelles catégories

---

## C3 · Badge poids conditionnel dans le palmarès

**Fichier :** `components/blocks/PalmaresBlock.tsx`

La capsule `entry.category` (catégorie de poids de la compétition, ex: `-44 kg`) est conditionnelle :

```tsx
{entry.category && (
  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
    {entry.category}
  </span>
)}
```

Si `entry.category` est vide ou null → aucun rendu, aucun espace réservé.

---

## C4 · Labels menu mobile centrés

**Fichier :** `components/landing/LandingMobileNav.tsx`

Les labels texte sous les icônes sont dans des `<span>`. Les `<a>` et `<Link>` ont déjà `flex flex-col items-center`, mais les spans peuvent aligner à gauche si le texte est multiline. Ajout de `text-center` sur chaque span de label.

---

## C5 · Bloc Timothé entièrement cliquable

**Fichier :** `components/landing/MockupSection.tsx`

Le `<div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white">` est enveloppé dans un `<Link href={`/${featured.slug}`}>`. Le lien texte `"Voir le profil complet de…"` en bas est conservé tel quel (il reste utile sur les écrans qui ne perçoivent pas le hover).

Hover : `hover:shadow-2xl hover:ring-2 hover:ring-primary/30 transition-all cursor-pointer` sur le wrapper Link.

---

## C6 · Partage avec image (WhatsApp et autres)

### Bug principal (correctif immédiat)

**Fichier :** `app/api/og/result/[slug]/[resultId]/route.tsx`, ligne ~51

```ts
// Avant (cassé — colonne published toujours false)
.eq('published', true)

// Après
.in('visibility', ['public', 'private'])
```

### URL og:image dans generateMetadata

**Fichier :** `app/[slug]/page.tsx`

Déjà correct (`NEXT_PUBLIC_SITE_URL`). Garde défensive ajoutée :

```ts
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ipponid.com'
```

La route `/api/og/result/[slug]/[resultId]` existe et génère une image 1200×630 (photo de couverture en fond, résultat centré, profil en bas, logo IpponId). Elle est référencée dans `PalmaresShareButton` via l'URL absolue `${siteUrl}/api/og/result/${slug}/${resultId}`.

### PalmaresShareButton

À vérifier que l'URL partagée sur WhatsApp et les métadonnées og:image sont cohérentes. Si le bouton partage l'URL de la page profil avec ancre `#result-{id}`, s'assurer que les scrapers (WhatsApp, Telegram) peuvent accéder à la route OG résultat.

---

## C7 · Suppression d'un judoka par un parent

### Emplacement UI

Section "Zone dangereuse" ajoutée en bas de `app/dashboard/[profileId]/page.tsx`, visible uniquement après les actions existantes.

### Chargement du rôle

La page charge déjà `ownerStatus` via `isProfileOwner`. Ajout de la récupération du rôle complet (`owner` | `manager`) depuis `profile_access` pour conditionner l'affichage des deux actions.

### ACTION 1 — "Me retirer de la gestion de ce profil"

- Visible : managers uniquement (pas les owners)
- Confirmation simple : bouton inline avec texte "Confirmer" (pas de modale — l'action est réversible via le dashboard)
- Server action : supprime la ligne `profile_access` où `account_id = user.id` AND `profile_id = profileId` AND `role != 'owner'`
- Redirection : `/dashboard`

### ACTION 2 — "Supprimer définitivement le profil de [Prénom]"

- Visible : owners uniquement
- Confirmation en deux étapes :
  1. Modale d'avertissement HTML `<dialog>` : texte irréversibilité, liste de ce qui sera supprimé
  2. Input de confirmation : taper le prénom exact du judoka
  3. Bouton "Supprimer définitivement" activé (`disabled` → actif) uniquement quand `input.value === profile.first_name`

- Server action `deleteProfile(profileId, confirmedName)` :
  1. Vérifie `isProfileOwner(profileId, user.id)`
  2. Vérifie `confirmedName === profile.first_name` (garde serveur)
  3. Liste et supprime les fichiers Supabase Storage dans le dossier `{profile.id}/`
  4. `DELETE FROM profiles WHERE id = profileId` (cascade supprime palmares, videos, gallery_photos, profile_access)
  5. Redirige vers `/dashboard`

**Ne supprime pas** le compte auth (`auth.users`). Le compte parent continue d'exister.

### Migration SQL

Aucune migration requise pour C7. La suppression en cascade sur `profiles` est déjà en place (migration 0005).

---

## Plan de tests manuels par correction

| # | Ce qu'il faut tester |
|---|---------------------|
| C1 | Profil sans bio : la section "Profil" n'apparaît pas. Profil avec bio non vide : la section apparaît. |
| C2 | Anna Lucia (née 2017-04-15) affiche "Poussins 2" dans le dashboard. "Utiliser cette valeur" sélectionne le bon groupe d'âge. PalmaresBlock affiche la bonne catégorie d'âge pour chaque entrée. |
| C3 | Entrée de palmarès sans catégorie de poids : aucun badge vide. Entrée avec catégorie : badge affiché. |
| C4 | Sur mobile (< 768px), les 3 items du menu ont icône + label centrés. |
| C5 | Cliquer n'importe où sur le bloc Timothé redirige vers `/timothe-francois`. Hover → ombre et ring visibles. |
| C6 | Partager un résultat individuel via WhatsApp → image de résultat dans l'aperçu. Partager un profil → image de profil dans l'aperçu. |
| C7 | En tant que manager : bouton "Me retirer" visible, bouton "Supprimer" absent. En tant qu'owner : bouton "Supprimer" visible, confirmation en 2 étapes, saisie du mauvais prénom garde le bouton désactivé. Après suppression : profil absent de `/dashboard`, page profil → 404. |
