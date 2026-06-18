# Design : Validation avant publication d'un profil judoka

Date : 2026-06-18

## Objectif

Empêcher la publication d'un profil incomplet. Un profil ne peut passer à `published = true` que si les 5 champs requis sont renseignés. La modification du profil reste toujours possible, quelle que soit la complétude.

---

## Champs requis pour la publication

| Champ DB          | Label affiché      |
|-------------------|--------------------|
| `club`            | Club               |
| `category`        | Catégorie          |
| `grade`           | Grade              |
| `bio`             | Bio                |
| `profile_photo_url` | Photo de profil  |

Palmarès et galerie : optionnels (un débutant peut n'avoir aucun résultat).

---

## Architecture

### `lib/profileValidation.ts` (nouveau fichier)

```ts
export type PublishableProfile = {
  club: string | null
  category: string | null
  grade: string | null
  bio: string | null
  profile_photo_url: string | null
}

export function getMissingFieldsForPublishing(profile: PublishableProfile): string[]
```

Retourne les labels lisibles des champs vides (chaîne vide ou `null`).
Ex : `["Club", "Bio", "Photo de profil"]` — vide si le profil est publiable.

Règle de validation : un champ est considéré manquant si sa valeur est `null` ou une chaîne vide après trim.

Ce fichier n'importe rien de Next.js ni de Supabase — il est testable unitairement sans dépendances externes.

---

### `app/dashboard/actions.ts` — modification de `togglePublished`

Quand `next === true` (tentative de publication) :
1. Refetch le profil depuis la DB avec les 5 champs requis
2. Appelle `getMissingFieldsForPublishing`
3. Si des champs manquent → `redirect('/dashboard?error=' + encodeURIComponent(missingFields.join(',')))`
4. Sinon → `update({ published: true })` puis revalidation

Quand `next === false` (dépublication) : aucune validation, comportement inchangé.

Le redirect-with-error-param est la stratégie choisie car `togglePublished` est une Server Action appelée via `<form action={...}>` (pas de `useActionState`), donc pas de retour de valeur possible vers le client sans rendre le composant Client.

---

### `app/dashboard/page.tsx` — modifications

**SELECT élargi** : ajouter `club, category, grade, bio` au SELECT existant (` profile_photo_url` est déjà présent).

**Calcul côté serveur** : appeler `getMissingFieldsForPublishing(profile)` dans le Server Component, produire `missingFields: string[]`.

**Bannière d'erreur** : si `searchParams.error` est présent dans l'URL, afficher une bannière rouge listant les champs manquants.

**Checklist "Avant de publier"** : toujours visible, 5 lignes, une par champ requis.
- Champ renseigné → icône verte ✓ + label
- Champ manquant → icône rouge ✗ + label + lien `/dashboard/profil`

**Bouton "Publier mon profil"** :
- `missingFields.length > 0` → `disabled`, opacité réduite, attribut `title` listant les champs manquants
- `missingFields.length === 0` → bouton actif, comportement inchangé

Le bouton "Dépublier" reste toujours actif.

---

## Flux utilisateur

### Profil incomplet
1. L'utilisateur arrive sur `/dashboard`
2. La checklist montre les champs manquants en rouge avec liens vers `/dashboard/profil`
3. Le bouton "Publier" est désactivé visuellement
4. S'il contourne le UI et soumet le form manuellement → server action redirige vers `/dashboard?error=Club,Bio` et la bannière s'affiche

### Profil complet
1. La checklist montre tous les champs en vert
2. Le bouton "Publier" est actif
3. Clic → publication normale

---

## Ce qu'il faut tester

1. **Profil incomplet — UI** : le bouton "Publier" doit être désactivé et la checklist doit montrer les champs manquants en rouge
2. **Profil complet — UI** : checklist toute verte, bouton actif
3. **Contournement UI — server action** : soumettre le form avec un profil incomplet doit rediriger avec `?error=...` et afficher la bannière
4. **Publication normale** : un profil complet peut être publié, `published` passe à `true` en DB
5. **Dépublication** : toujours possible quel que soit l'état du profil
6. **Champs partiels** : un seul champ manquant suffit à bloquer — vérifier chaque champ isolément
7. **Valeur vide (chaîne vide)** : `""` doit être traité comme manquant, pas seulement `null`
