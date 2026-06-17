# Design : Migration données mock → Supabase

**Date :** 2026-06-17  
**Scope :** Storage bucket "media", complétion du schéma palmares, script de migration ponctuel pour Timothé François.

---

## 1. Objectif

Migrer les données mock de Timothé (actuellement dans `data/judokas.json` + images statiques dans `public/images/`) vers Supabase Storage et les tables relationnelles créées en `0001_init.sql`. Ce script est ponctuel — il sera lancé une seule fois par le développeur une fois que Timothé se sera connecté via Google OAuth.

---

## 2. Migrations SQL

### `supabase/migrations/0002_palmares_columns.sql`

Ajoute 3 colonnes manquantes à `public.palmares` (présentes dans le JSON mais absentes du schéma initial) :

```sql
alter table public.palmares add column level text;
alter table public.palmares add column medal text;
alter table public.palmares add column city  text;
```

Aucune modification RLS nécessaire : les policies `for all` existantes couvrent automatiquement les nouvelles colonnes.

### `supabase/migrations/0003_storage.sql`

Crée le bucket Supabase Storage "media" (lecture publique) et sa policy d'écriture :

```sql
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "users_manage_own_folder"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

**Explication :**
- `public = true` → les URLs publiques sont accessibles sans auth (lecture)
- La policy d'écriture restreint chaque utilisateur authentifié à son propre sous-dossier `{uid}/`
- Le script de migration utilise la SERVICE_ROLE_KEY qui contourne RLS — intentionnel pour cette opération admin ponctuelle

---

## 3. Rename fichier seed

`data/judokas.json` → `data/judokas.seed.json`

Ce renommage signale que le fichier est un jeu de données de démarrage, pas la source de vérité en production. Deux imports à mettre à jour :
- `lib/judokaService.ts` : `import judokasData from '@/data/judokas.seed.json'`
- `app/[slug]/page.tsx` : `import judokasData from '@/data/judokas.seed.json'`

---

## 4. Script `scripts/migrate-mock-data.ts`

### Prérequis

- Package `tsx` installé en devDependency (`npm install -D tsx`)
- Variable d'environnement `SUPABASE_SERVICE_ROLE_KEY` ajoutée à `.env.local` (à récupérer dans Supabase → Settings → API → service_role key)
- `NEXT_PUBLIC_SUPABASE_URL` déjà présent dans `.env.local`

### Usage

```bash
npx tsx scripts/migrate-mock-data.ts <owner-uuid>
```

`<owner-uuid>` est l'UUID Supabase Auth de Timothé, récupéré après sa première connexion Google sur `/dashboard`.

### Flow détaillé

```
1. Valider que owner_id est passé en argv et est un UUID valide
2. Initialiser le client Supabase avec createClient(url, SERVICE_ROLE_KEY)
   — utilise @supabase/supabase-js directement, pas lib/supabase/
3. Lire data/judokas.seed.json, prendre le premier élément
4. Upload des images vers storage :
   - public/images/profile.jpg   → {owner_id}/profile.jpg
   - public/images/cover.jpg     → {owner_id}/cover.jpg
   - public/images/gallery-1.jpg → {owner_id}/gallery-1.jpg
   - public/images/gallery-2.jpg → {owner_id}/gallery-2.jpg
   - public/images/gallery-3.jpg → {owner_id}/gallery-3.jpg
   - public/images/gallery-4.jpg → {owner_id}/gallery-4.jpg
   Récupérer les URLs publiques après chaque upload (upsert: true)
   Si un fichier est absent localement : afficher un warning et continuer
5. Insert dans profiles → récupérer l'UUID du profil créé (profiles.id)
6. Insert dans palmares (16 entrées, position = index dans le tableau)
7. Insert dans videos (2 entrées, youtube_url ← youtubeUrl)
8. Insert dans gallery_photos (4 entrées, photo_url ← URL Storage)
9. Afficher résumé console :
   - Profile UUID
   - Nombre de lignes insérées par table
   - Avertissement si parental_consent = false
```

### Valeurs fixes lors de l'insert

| Champ | Valeur |
|---|---|
| `profiles.published` | `true` |
| `profiles.parental_consent` | `false` — à activer manuellement après consentement |
| `profiles.slug` | `"timothe-francois"` (lu depuis le JSON) |
| `profiles.layout` | tableau layout du JSON, inséré comme jsonb |

### Mapping de champs

**profiles :**
| DB | JSON |
|---|---|
| `first_name` | `identity.firstName` |
| `last_name` | `identity.lastName` |
| `club` | `identity.club` |
| `category` | `identity.weightCategory` |
| `grade` | `identity.grade` |
| `bio` | `bio` |
| `profile_photo_url` | URL Storage `{owner_id}/profile.jpg` |
| `cover_photo_url` | URL Storage `{owner_id}/cover.jpg` |
| `layout` | `layout` (jsonb) |

**palmares :**
| DB | JSON |
|---|---|
| `date` | `palmares[i].date` |
| `competition` | `palmares[i].competition` |
| `result` | `palmares[i].result` |
| `category` | `palmares[i].category` |
| `level` | `palmares[i].level` |
| `medal` | `palmares[i].medal` |
| `city` | `palmares[i].city` |
| `position` | `i` (index 0-based) |

**videos :**
| DB | JSON |
|---|---|
| `title` | `videos[i].title` |
| `youtube_url` | `videos[i].youtubeUrl` |
| `description` | `videos[i].description` |
| `position` | `i` |

**gallery_photos :**
| DB | JSON |
|---|---|
| `photo_url` | URL Storage `{owner_id}/gallery-{n}.jpg` |
| `caption` | `gallery[i].caption` |
| `position` | `i` |

### Champs JSON ignorés (pas de colonne DB)

- `identity.birthDate`, `identity.height`, `identity.weight`, `identity.nationality`
- `social[]` (pas de table)
- `techniques[]` (pas de table)
- `palmares[i].podiumPhoto` (pas de colonne — l'image `podium-France-2023.jpg` n'est pas uploadée)

---

## 5. Fichiers créés / modifiés

```
supabase/migrations/0002_palmares_columns.sql   (nouveau)
supabase/migrations/0003_storage.sql            (nouveau)
data/judokas.seed.json                          (renommé depuis judokas.json)
lib/judokaService.ts                            (import mis à jour)
app/[slug]/page.tsx                             (import mis à jour)
scripts/migrate-mock-data.ts                    (nouveau)
.env.local                                      (ajouter SUPABASE_SERVICE_ROLE_KEY)
package.json                                    (ajouter tsx en devDependency)
```

---

## 6. Actions manuelles après exécution du script

1. Exécuter `0002_palmares_columns.sql` dans l'éditeur SQL Supabase
2. Exécuter `0003_storage.sql` dans l'éditeur SQL Supabase
3. Récupérer la `service_role key` dans Supabase → Settings → API → ajouter à `.env.local` comme `SUPABASE_SERVICE_ROLE_KEY`
4. Demander à Timothé de se connecter via Google sur le site → récupérer son UUID depuis `/dashboard` (affiché dans la console Supabase → Authentication → Users)
5. Lancer : `npx tsx scripts/migrate-mock-data.ts <uuid-timothe>`
6. Vérifier dans Supabase Table Editor que les 4 tables sont peuplées
7. Mettre `parental_consent = true` manuellement dans Supabase si le consentement parental est obtenu
