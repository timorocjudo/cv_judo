# Design : Fondation Supabase — IpponId

**Date :** 2026-06-17  
**Scope :** Infrastructure technique uniquement — pas d'interface d'édition, pas de migration des données JSON existantes.

---

## 1. Objectif

Ajouter Supabase comme backend d'IpponId : authentification Google OAuth et base de données relationnelle. Cette étape pose les fondations sur lesquelles l'éditeur de profil sera construit ensuite.

---

## 2. Packages

```
@supabase/supabase-js   — SDK principal
@supabase/ssr           — utilitaires cookies pour Next.js App Router
```

---

## 3. Variables d'environnement

Fichier `.env.local` à créer à la racine (non commité) :

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 4. Clients Supabase

### `lib/supabase/client.ts`
Client navigateur via `createBrowserClient()` de `@supabase/ssr`. Utilisé dans les Client Components (`'use client'`).

### `lib/supabase/server.ts`
Client serveur via `createServerClient()` de `@supabase/ssr` avec lecture/écriture des cookies via `next/headers`. Utilisé dans les Server Components, Route Handlers et Server Actions. Doit être appelé à chaque requête (pas de singleton partagé).

---

## 5. Middleware

Fichier `middleware.ts` à la racine. Appelle `updateSession()` sur toutes les routes (sauf assets statiques) pour rafraîchir le token Supabase dans les cookies. Ne redirige rien — la protection des routes est gérée dans les pages elles-mêmes.

```
matcher : exclure _next/static, _next/image, favicon.ico, images publiques
```

---

## 6. Authentification Google OAuth

### Flux complet

```
[LandingNav / Header] → bouton "Se connecter avec Google"
  → signInWithOAuth({ provider: 'google', redirectTo: '[origin]/auth/callback' })
  → Google OAuth
  → /auth/callback?code=...
  → route handler : échange le code → session cookie
  → redirect('/dashboard')
```

### Composants modifiés

- `components/landing/LandingNav.tsx` — Server Component, lit la session. Affiche "Se connecter" si non connecté, "Tableau de bord" si connecté.
- `components/layout/Header.tsx` — idem.

Le clic sur "Se connecter" déclenche `signInWithOAuth` côté client → nécessite un petit Client Component bouton encapsulé (`LoginButton`).

### Route de callback

`app/auth/callback/route.ts` — Route Handler GET :
1. Lit `code` depuis les search params
2. Appelle `supabase.auth.exchangeCodeForSession(code)`
3. Redirige vers `/dashboard`

### Page `/dashboard`

`app/dashboard/page.tsx` — Server Component :
- Lit la session via `createServerClient()`
- Si pas de session → `redirect('/')`
- Si session → affiche email de l'utilisateur + bouton "Se déconnecter"
- Le bouton déconnexion est un Client Component (`LogoutButton`) qui appelle `supabase.auth.signOut()` puis `router.push('/')`

---

## 7. Schéma base de données

### Décision architecturale clé

`profiles.id` est un UUID propre au profil (pas l'ID Supabase Auth). Le lien vers le compte est `owner_id uuid references auth.users(id)`.

**Pourquoi :** aujourd'hui 1 judoka = 1 compte. À terme, un coach (1 compte) pourra gérer N profils judoka. Ce schéma supporte les deux sans migration.

### Tables

```sql
profiles
  id                uuid PK default gen_random_uuid()
  owner_id          uuid NOT NULL references auth.users(id) on delete cascade
  slug              text UNIQUE NOT NULL
  first_name        text NOT NULL
  last_name         text NOT NULL
  club              text
  category          text         -- catégorie de poids
  grade             text         -- ceinture
  bio               text
  profile_photo_url text
  cover_photo_url   text
  layout            jsonb        -- ordre des blocs ex: ["hero","bio","palmares"]
  published         boolean NOT NULL default false
  parental_consent  boolean NOT NULL default false
  created_at        timestamptz NOT NULL default now()
  updated_at        timestamptz NOT NULL default now()

palmares
  id            uuid PK default gen_random_uuid()
  profile_id    uuid NOT NULL references profiles(id) on delete cascade
  date          date
  competition   text
  result        text
  category      text
  position      int              -- ordre d'affichage
  created_at    timestamptz NOT NULL default now()

videos
  id            uuid PK default gen_random_uuid()
  profile_id    uuid NOT NULL references profiles(id) on delete cascade
  title         text
  youtube_url   text
  description   text
  position      int
  created_at    timestamptz NOT NULL default now()

gallery_photos
  id            uuid PK default gen_random_uuid()
  profile_id    uuid NOT NULL references profiles(id) on delete cascade
  photo_url     text
  caption       text
  position      int
  created_at    timestamptz NOT NULL default now()
```

### RLS — Row Level Security

RLS activé sur les 4 tables. Policies :

**`profiles`**

| Policy | Rôle | Opération | Condition |
|--------|------|-----------|-----------|
| public_read | anon | SELECT | `published = true` |
| owner_all | authenticated | ALL | `auth.uid() = owner_id` |

**`palmares`, `videos`, `gallery_photos`** (même logique)

| Policy | Rôle | Opération | Condition |
|--------|------|-----------|-----------|
| public_read | anon | SELECT | `EXISTS (SELECT 1 FROM profiles WHERE id = profile_id AND published = true)` |
| owner_all | authenticated | ALL | `EXISTS (SELECT 1 FROM profiles WHERE id = profile_id AND owner_id = auth.uid())` |

---

## 8. Fichiers créés / modifiés

### Nouveaux fichiers
```
.env.local                          (non commité, gitignore)
lib/supabase/client.ts
lib/supabase/server.ts
middleware.ts
app/auth/callback/route.ts
app/dashboard/page.tsx
components/auth/LoginButton.tsx     (Client Component — déclenche signInWithOAuth)
components/auth/LogoutButton.tsx    (Client Component — déclenche signOut)
supabase/migrations/0001_init.sql
```

### Fichiers modifiés
```
components/landing/LandingNav.tsx   (ajout bouton auth)
components/layout/Header.tsx        (ajout bouton auth)
.gitignore                          (ajout .env.local si absent)
```

---

## 9. Actions manuelles dans Supabase (à faire par le développeur)

1. **Créer le projet Supabase** sur [supabase.com](https://supabase.com) → récupérer `Project URL` et `anon key` → les coller dans `.env.local`
2. **Activer le provider Google** : Authentication → Providers → Google → activer, saisir `Client ID` et `Client Secret` Google OAuth 2.0 (à créer dans Google Cloud Console)
3. **Configurer l'URL de callback** dans Google Cloud Console : ajouter `https://<ton-projet>.supabase.co/auth/v1/callback` dans les "Authorized redirect URIs"
4. **Ajouter l'URL du site** dans Supabase : Authentication → URL Configuration → Site URL = `http://localhost:3000` (dev) / domaine prod
5. **Exécuter le SQL** : SQL Editor → coller le contenu de `supabase/migrations/0001_init.sql` → Run

---

## 10. Ce qui n'est PAS dans ce scope

- Migration des données de `data/judokas.json` vers Supabase
- Interface d'édition de profil
- Upload de photos (Supabase Storage)
- Gestion multi-profils pour les coachs
- Emails transactionnels
