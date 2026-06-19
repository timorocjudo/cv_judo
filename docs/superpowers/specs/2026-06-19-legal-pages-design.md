# Design — Pages légales & consentement CGU

**Date :** 2026-06-19  
**Statut :** Approuvé

---

## Objectif

Créer les trois pages légales obligatoires du site IpponId (Mentions légales, Politique de confidentialité, CGU), ajouter des liens vers ces pages dans le footer de la landing page, et recueillir le consentement explicite de l'utilisateur aux CGU lors de la création de son profil.

---

## Architecture

### Nouvelles pages

```
app/mentions-legales/page.tsx
app/confidentialite/page.tsx
app/cgu/page.tsx
```

Pages statiques, standalone (pas de layout Next.js partagé au sens du fichier `layout.tsx`). Elles utilisent directement un composant `LegalLayout` partagé.

### Nouveau composant partagé

```
components/legal/LegalLayout.tsx
```

Fournit :
- Barre de nav minimale : logo IpponId (lien `/`) + lien "Retour à l'accueil"
- Container centré `max-w-[70ch]`, padding adapté mobile/desktop
- Typographie : `font-inter` pour le corps, `font-montserrat` pour les titres de section
- Footer minimal avec liens vers les trois pages légales

### Footer landing

`components/landing/LandingFooter.tsx` — remplace les `href="#"` existants :
- Mentions légales → `/mentions-legales`
- Politique de confidentialité → `/confidentialite`
- Contact → `mailto:[À COMPLÉTER]`
- Ajoute : CGU → `/cgu`

Le `Footer.tsx` (pages CV judoka) n'est pas modifié — il n'est pas le bon endroit pour des liens éditeur.

### Migration SQL

Fichier : `supabase/migrations/0006_terms_consent.sql`

```sql
alter table public.profiles
  add column terms_accepted     boolean     not null default false,
  add column terms_accepted_at  timestamptz;
```

Ces colonnes sont distinctes de `parental_consent` (existant) qui concerne les mineurs.

### Consentement sur le setup

`app/dashboard/setup/page.tsx` — case à cocher required ajoutée avant le bouton submit :

```
[x] J'ai lu et j'accepte les CGU et la politique de confidentialité
```

Les liens ouvrent les pages légales. Le formulaire ne peut pas être soumis sans cocher.

`app/dashboard/setup/actions.ts` — `createProfile` ajoute `terms_accepted: true` et `terms_accepted_at: new Date().toISOString()` dans l'insert Supabase.

---

## Contenu des pages

### Mentions légales

Sections :
1. Éditeur du site (particulier non-professionnel, dispense LCEN d'adresse postale, email de contact public)
2. Hébergement (Vercel Inc. + Supabase, données hébergées en Europe)
3. Propriété intellectuelle (charte graphique, code, marque IpponId)
4. Contenus utilisateurs (palmarès, photos — propriété de l'utilisateur, droit d'affichage limité au service)

### Politique de confidentialité

Sections :
1. Données collectées (email/identité Google, données profil saisies volontairement)
2. Base légale (consentement pour adultes ; contrôle parental pour les mineurs)
3. Finalité (création et publication d'un CV judoka public)
4. Visibilité des données (profils publiés = visibles publiquement sur internet)
5. Durée de conservation (tant que compte actif, suppression possible à tout moment)
6. Sous-traitants (Supabase, Google, Vercel)
7. Droits RGPD (accès, rectification, suppression, opposition)
8. Cookies (session Supabase Auth ; placeholder analytics)

### CGU

Sections :
1. Objet du service
2. Conditions d'inscription (Google Auth, contrôle parental pour mineurs)
3. Responsabilité utilisateur (exactitude des données publiées)
4. Caractère public des profils
5. Modération (droit de suppression en cas d'abus)
6. Évolution du service (fonctionnalités peuvent évoluer, potentiellement payantes)
7. Limitation de responsabilité

---

## Placeholders à compléter avant mise en ligne

| Placeholder | Où | Description |
|---|---|---|
| `[À COMPLÉTER : email de contact]` | Mentions légales, Politique de confidentialité | Email public de l'éditeur |
| `[À COMPLÉTER : région Supabase, ex. eu-west-1]` | Mentions légales, Politique de confidentialité | Région du projet Supabase |
| `mailto:[À COMPLÉTER : email]` | LandingFooter | Lien Contact dans le footer |

---

## Fichiers modifiés

| Fichier | Action |
|---|---|
| `app/mentions-legales/page.tsx` | Créé |
| `app/confidentialite/page.tsx` | Créé |
| `app/cgu/page.tsx` | Créé |
| `components/legal/LegalLayout.tsx` | Créé |
| `components/landing/LandingFooter.tsx` | Modifié (liens réels + CGU) |
| `app/dashboard/setup/page.tsx` | Modifié (case à cocher consentement) |
| `app/dashboard/setup/actions.ts` | Modifié (terms_accepted + terms_accepted_at) |
| `supabase/migrations/0006_terms_consent.sql` | Créé |
