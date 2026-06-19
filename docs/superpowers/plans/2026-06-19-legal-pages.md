# Pages légales & consentement CGU — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer les trois pages légales (mentions légales, politique de confidentialité, CGU), les lier depuis le footer landing, et recueillir un consentement CGU lors de la création de profil.

**Architecture:** Pages statiques Next.js App Router standalone, un composant `LegalLayout` partagé, une migration SQL pour deux nouvelles colonnes sur `profiles`, et une case à cocher required sur la page setup.

**Tech Stack:** Next.js 14 App Router (server components), Tailwind CSS (tokens du projet), Supabase (migration SQL manuelle via SQL Editor), TypeScript.

## Global Constraints

- Aucun test runner configuré — vérification via `npx tsc --noEmit` puis `npm run build`
- Tokens Tailwind du projet uniquement : `text-primary`, `text-on-surface`, `text-on-surface-variant`, `font-montserrat`, `font-inter`, `bg-background`, `bg-surface-container-highest`, `border-outline-variant`, `px-margin-mobile`, `md:px-margin-desktop`, `max-w-container-max`
- Pas d'import de `judoka.json` ni du Header/Footer judoka dans les pages légales
- Tout le texte en français
- Conserver les placeholders `[À COMPLÉTER : ...]` tels quels dans le code — l'éditeur les remplacera avant mise en ligne

---

## File Map

| Fichier | Action |
|---|---|
| `supabase/migrations/0006_terms_consent.sql` | Créer |
| `components/legal/LegalLayout.tsx` | Créer |
| `app/mentions-legales/page.tsx` | Créer |
| `app/confidentialite/page.tsx` | Créer |
| `app/cgu/page.tsx` | Créer |
| `components/landing/LandingFooter.tsx` | Modifier |
| `app/dashboard/setup/page.tsx` | Modifier |
| `app/dashboard/setup/actions.ts` | Modifier |

---

### Task 1 — Migration SQL : colonnes de consentement

**Files:**
- Create: `supabase/migrations/0006_terms_consent.sql`

**Interfaces:**
- Produces: colonnes `terms_accepted boolean not null default false` et `terms_accepted_at timestamptz` sur `public.profiles`, utilisées par Task 7

- [ ] **Step 1 : Créer le fichier de migration**

Créer `supabase/migrations/0006_terms_consent.sql` avec ce contenu exact :

```sql
-- 0006_terms_consent.sql
-- Ajout des colonnes de traçabilité d'acceptation des CGU.
-- Distinct de parental_consent (existant) qui concerne la tutelle des mineurs.

alter table public.profiles
  add column terms_accepted     boolean     not null default false,
  add column terms_accepted_at  timestamptz;
```

- [ ] **Step 2 : Appliquer la migration**

Ouvrir le Supabase SQL Editor du projet et exécuter le contenu du fichier. Vérifier que la requête s'exécute sans erreur, puis vérifier dans Table Editor > profiles que les deux colonnes apparaissent.

- [ ] **Step 3 : Commit**

```bash
git add supabase/migrations/0006_terms_consent.sql
git commit -m "feat(db): add terms_accepted and terms_accepted_at columns to profiles"
```

---

### Task 2 — Composant LegalLayout

**Files:**
- Create: `components/legal/LegalLayout.tsx`

**Interfaces:**
- Consumes: rien
- Produces: `LegalLayout({ title: string, lastUpdated: string, children: React.ReactNode })` — utilisé par Tasks 3, 4, 5

- [ ] **Step 1 : Créer le composant**

Créer `components/legal/LegalLayout.tsx` :

```tsx
import Link from 'next/link'

interface LegalLayoutProps {
  title: string
  lastUpdated: string
  children: React.ReactNode
}

export default function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="border-b border-outline-variant bg-surface-container-highest">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-4 flex items-center justify-between">
          <Link
            href="/"
            className="font-montserrat text-lg font-black text-primary tracking-tight"
          >
            IpponId
          </Link>
          <Link
            href="/"
            className="font-inter text-sm text-on-surface-variant hover:text-primary transition-colors"
          >
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-[70ch] mx-auto px-margin-mobile md:px-8 py-12">
        <header className="mb-10">
          <h1 className="font-montserrat text-headline-md font-bold text-primary mb-2">
            {title}
          </h1>
          <p className="font-inter text-sm text-on-surface-variant">
            Dernière mise à jour : {lastUpdated}
          </p>
        </header>
        <div className="space-y-10 font-inter text-on-surface leading-relaxed">
          {children}
        </div>
      </main>

      <footer className="border-t border-outline-variant mt-auto">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8 flex flex-wrap gap-6 justify-center">
          <Link href="/mentions-legales" className="font-inter text-xs text-on-surface-variant hover:text-primary transition-colors">
            Mentions légales
          </Link>
          <Link href="/confidentialite" className="font-inter text-xs text-on-surface-variant hover:text-primary transition-colors">
            Politique de confidentialité
          </Link>
          <Link href="/cgu" className="font-inter text-xs text-on-surface-variant hover:text-primary transition-colors">
            CGU
          </Link>
        </div>
      </footer>
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier les types**

```bash
npx tsc --noEmit
```

Attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add components/legal/LegalLayout.tsx
git commit -m "feat: add LegalLayout shared component for legal pages"
```

---

### Task 3 — Page Mentions légales

**Files:**
- Create: `app/mentions-legales/page.tsx`

**Interfaces:**
- Consumes: `LegalLayout` depuis `@/components/legal/LegalLayout`
- Produces: route `/mentions-legales`

- [ ] **Step 1 : Créer la page**

Créer `app/mentions-legales/page.tsx` :

```tsx
import type { Metadata } from 'next'
import LegalLayout from '@/components/legal/LegalLayout'

export const metadata: Metadata = {
  title: 'Mentions légales — IpponId',
  robots: { index: false },
}

export default function MentionsLegalesPage() {
  return (
    <LegalLayout title="Mentions légales" lastUpdated="19 juin 2026">
      <section className="space-y-3">
        <h2 className="font-montserrat text-lg font-bold text-primary">
          Éditeur du site
        </h2>
        <p>
          Le site IpponId est édité par un particulier non-professionnel, qui
          bénéficie de la faculté prévue par l&apos;article 6-III-2 de la loi
          n° 2004-575 du 21 juin 2004 pour la confiance dans l&apos;économie
          numérique (LCEN) de ne pas divulguer publiquement ses coordonnées
          personnelles.
        </p>
        <p>
          Pour toute question relative au site, vous pouvez contacter
          l&apos;éditeur à l&apos;adresse suivante :
        </p>
        <p>
          <strong>Email :</strong>{' '}
          <a
            href="mailto:[À COMPLÉTER : adresse email de contact]"
            className="text-primary hover:underline"
          >
            [À COMPLÉTER : adresse email de contact]
          </a>
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-montserrat text-lg font-bold text-primary">
          Hébergement
        </h2>
        <div className="space-y-1">
          <p className="font-semibold">Hébergement applicatif :</p>
          <p>Vercel Inc.</p>
          <p>340 S Lemon Ave #4133, Walnut, CA 91789, USA</p>
          <p>
            <a
              href="https://vercel.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              vercel.com
            </a>
          </p>
        </div>
        <div className="space-y-1">
          <p className="font-semibold">Hébergement des données et fichiers :</p>
          <p>Supabase</p>
          <p>
            Les données des utilisateurs et les fichiers (photos, etc.) sont
            hébergés sur des serveurs situés en Europe{' '}
            [À COMPLÉTER : région exacte du projet Supabase, ex. eu-west-1].
          </p>
          <p>
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              supabase.com
            </a>
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-montserrat text-lg font-bold text-primary">
          Propriété intellectuelle
        </h2>
        <p>
          La marque IpponId, la charte graphique et le code source du site sont
          la propriété de l&apos;éditeur. Toute reproduction, représentation ou
          diffusion, intégrale ou partielle, sans autorisation écrite préalable
          de l&apos;éditeur, est interdite et constitue une contrefaçon
          sanctionnée par le Code de la propriété intellectuelle.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-montserrat text-lg font-bold text-primary">
          Contenus publiés par les utilisateurs
        </h2>
        <p>
          Les contenus publiés par les utilisateurs — palmarès, photos, vidéos,
          biographies — restent la propriété exclusive de leurs auteurs. En
          publiant un contenu sur IpponId, l&apos;utilisateur accorde à
          l&apos;éditeur un droit d&apos;affichage non exclusif, strictement
          limité au fonctionnement du service. Ce droit prend fin lors de la
          suppression du contenu ou du profil concerné.
        </p>
      </section>
    </LegalLayout>
  )
}
```

- [ ] **Step 2 : Vérifier les types**

```bash
npx tsc --noEmit
```

Attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/mentions-legales/page.tsx
git commit -m "feat: add mentions légales page"
```

---

### Task 4 — Page Politique de confidentialité

**Files:**
- Create: `app/confidentialite/page.tsx`

**Interfaces:**
- Consumes: `LegalLayout` depuis `@/components/legal/LegalLayout`
- Produces: route `/confidentialite`

- [ ] **Step 1 : Créer la page**

Créer `app/confidentialite/page.tsx` :

```tsx
import type { Metadata } from 'next'
import LegalLayout from '@/components/legal/LegalLayout'

export const metadata: Metadata = {
  title: 'Politique de confidentialité — IpponId',
  robots: { index: false },
}

export default function ConfidentialitePage() {
  return (
    <LegalLayout title="Politique de confidentialité" lastUpdated="19 juin 2026">
      <p className="text-on-surface-variant">
        Cette politique décrit comment IpponId collecte, utilise et protège les
        données personnelles de ses utilisateurs, conformément au Règlement
        Général sur la Protection des Données (RGPD — Règlement UE 2016/679).
      </p>

      <section className="space-y-3">
        <h2 className="font-montserrat text-lg font-bold text-primary">
          1. Données collectées
        </h2>
        <p>Nous collectons les données suivantes :</p>
        <ul className="list-disc list-inside space-y-2 pl-2">
          <li>
            <strong>Données d&apos;authentification</strong> : adresse email et
            identité Google (prénom, nom de famille) transmises lors de la
            connexion via Google OAuth.
          </li>
          <li>
            <strong>Données de profil</strong> saisies volontairement : nom,
            prénom, club, catégorie de compétition, grade de ceinture,
            biographie, palmarès sportif, photos et vidéos.
          </li>
        </ul>
        <p>
          Nous ne collectons pas de données de navigation au-delà du cookie de
          session nécessaire à l&apos;authentification (voir section Cookies).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-montserrat text-lg font-bold text-primary">
          2. Base légale du traitement
        </h2>
        <p>
          Le traitement de vos données repose sur votre{' '}
          <strong>consentement explicite</strong>, recueilli lors de la création
          de votre profil (acceptation des CGU et de la présente politique).
          Vous pouvez retirer ce consentement à tout moment en supprimant votre
          compte.
        </p>
        <p>
          <strong>Concernant les mineurs :</strong> La création d&apos;un profil
          pour ou par une personne mineure doit être effectuée avec
          l&apos;autorisation et sous le contrôle d&apos;un parent ou tuteur
          légal. Dans la pratique, c&apos;est généralement le compte du parent
          qui gère le profil de l&apos;enfant. L&apos;éditeur se réserve le
          droit de supprimer tout profil dont il est établi qu&apos;il a été
          créé par un mineur sans supervision parentale.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-montserrat text-lg font-bold text-primary">
          3. Finalité du traitement
        </h2>
        <p>
          Vos données sont utilisées uniquement pour vous permettre de créer et
          de publier un CV de judoka public sur la plateforme IpponId. Elles ne
          sont pas utilisées à des fins commerciales, ni partagées avec des tiers
          à des fins de prospection.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-montserrat text-lg font-bold text-primary">
          4. Visibilité des données
        </h2>
        <div className="border-l-4 border-tertiary-container pl-4 py-1 space-y-2">
          <p className="font-semibold">
            Tout profil que vous choisissez de publier est visible publiquement
            sur internet, sans nécessiter d&apos;authentification.
          </p>
          <p>
            Cela inclut votre nom, photo de profil, club, catégorie, grade,
            biographie, palmarès, galerie photos et vidéos YouTube.
          </p>
        </div>
        <p>
          Vérifiez soigneusement le contenu de votre profil avant de le
          publier, en particulier lorsqu&apos;il s&apos;agit du profil
          d&apos;un enfant mineur. Tant que votre profil n&apos;est pas publié,
          il reste privé et inaccessible depuis l&apos;extérieur.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-montserrat text-lg font-bold text-primary">
          5. Durée de conservation
        </h2>
        <p>
          Vos données sont conservées tant que votre compte est actif. Vous
          pouvez à tout moment supprimer l&apos;ensemble de votre compte et de
          vos données depuis votre tableau de bord (section &laquo; Paramètres
          du compte &raquo;). La suppression est définitive et immédiate.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-montserrat text-lg font-bold text-primary">
          6. Sous-traitants
        </h2>
        <p>IpponId fait appel aux sous-traitants suivants :</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="text-left py-2 pr-4 font-semibold">Sous-traitant</th>
                <th className="text-left py-2 pr-4 font-semibold">Rôle</th>
                <th className="text-left py-2 font-semibold">Localisation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              <tr>
                <td className="py-2 pr-4">Supabase</td>
                <td className="py-2 pr-4">Hébergement données et fichiers</td>
                <td className="py-2">Europe [À COMPLÉTER : région exacte]</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Google</td>
                <td className="py-2 pr-4">Authentification (Google OAuth)</td>
                <td className="py-2">Voir politique Google</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Vercel</td>
                <td className="py-2 pr-4">Hébergement applicatif</td>
                <td className="py-2">USA (logs de navigation uniquement)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-montserrat text-lg font-bold text-primary">
          7. Vos droits (RGPD)
        </h2>
        <p>Conformément au RGPD, vous disposez des droits suivants :</p>
        <ul className="list-disc list-inside space-y-2 pl-2">
          <li>
            <strong>Droit d&apos;accès</strong> : consulter vos données (depuis
            votre tableau de bord)
          </li>
          <li>
            <strong>Droit de rectification</strong> : modifier vos données
            (depuis votre tableau de bord)
          </li>
          <li>
            <strong>Droit à l&apos;effacement</strong> : supprimer votre compte
            et toutes vos données (depuis votre tableau de bord)
          </li>
          <li>
            <strong>Droit d&apos;opposition</strong> et{' '}
            <strong>droit à la portabilité</strong> : exercer ces droits en
            contactant l&apos;éditeur à l&apos;adresse ci-dessous
          </li>
        </ul>
        <p>
          Contact pour l&apos;exercice de vos droits :{' '}
          <a
            href="mailto:[À COMPLÉTER : adresse email de contact]"
            className="text-primary hover:underline"
          >
            [À COMPLÉTER : adresse email de contact]
          </a>
        </p>
        <p>
          En cas de litige non résolu, vous disposez du droit
          d&apos;introduire une réclamation auprès de la{' '}
          <strong>CNIL</strong> (
          <a
            href="https://www.cnil.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            www.cnil.fr
          </a>
          ).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-montserrat text-lg font-bold text-primary">
          8. Cookies
        </h2>
        <p>
          IpponId utilise un cookie de session strictement nécessaire au
          fonctionnement de l&apos;authentification (Supabase Auth). Ce cookie
          ne peut pas être désactivé sans désactiver le service et ne requiert
          pas votre consentement au titre de la directive ePrivacy.
        </p>
        <p className="text-on-surface-variant text-sm">
          [À COMPLÉTER : cette section devra être mise à jour si des outils
          d&apos;analyse d&apos;audience sont ajoutés à l&apos;avenir.]
        </p>
      </section>
    </LegalLayout>
  )
}
```

- [ ] **Step 2 : Vérifier les types**

```bash
npx tsc --noEmit
```

Attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/confidentialite/page.tsx
git commit -m "feat: add politique de confidentialité page"
```

---

### Task 5 — Page CGU

**Files:**
- Create: `app/cgu/page.tsx`

**Interfaces:**
- Consumes: `LegalLayout` depuis `@/components/legal/LegalLayout`
- Produces: route `/cgu`

- [ ] **Step 1 : Créer la page**

Créer `app/cgu/page.tsx` :

```tsx
import type { Metadata } from 'next'
import LegalLayout from '@/components/legal/LegalLayout'

export const metadata: Metadata = {
  title: 'Conditions Générales d\'Utilisation — IpponId',
  robots: { index: false },
}

export default function CguPage() {
  return (
    <LegalLayout title="Conditions Générales d'Utilisation" lastUpdated="19 juin 2026">
      <section className="space-y-3">
        <h2 className="font-montserrat text-lg font-bold text-primary">
          Article 1 — Objet du service
        </h2>
        <p>
          IpponId est une plateforme en ligne permettant à tout judoka de créer
          et de publier une page CV publique présentant son identité sportive :
          club, grade, catégorie de compétition, palmarès, galerie photos et
          vidéos. Le service est édité par un particulier non-professionnel (voir
          mentions légales).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-montserrat text-lg font-bold text-primary">
          Article 2 — Conditions d&apos;inscription
        </h2>
        <p>
          L&apos;accès au service requiert une connexion via un compte Google.
          Toute personne physique capable juridiquement peut créer un compte.
        </p>
        <p>
          Pour les personnes <strong>mineures</strong>, la création et la gestion
          d&apos;un profil doivent être effectuées par un parent ou tuteur légal,
          sous sa responsabilité. En créant un profil, l&apos;adulte responsable
          atteste disposer des autorisations nécessaires et prend en charge la
          supervision du profil de l&apos;enfant.
        </p>
        <p>
          En utilisant le service, l&apos;utilisateur accepte sans réserve les
          présentes conditions et la{' '}
          <a href="/confidentialite" className="text-primary hover:underline">
            politique de confidentialité
          </a>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-montserrat text-lg font-bold text-primary">
          Article 3 — Responsabilité de l&apos;utilisateur
        </h2>
        <p>
          L&apos;utilisateur est seul responsable des informations qu&apos;il
          publie sur son profil, notamment l&apos;exactitude de son palmarès
          sportif. IpponId ne procède à aucune vérification des résultats de
          compétition déclarés.
        </p>
        <p>L&apos;utilisateur s&apos;engage à :</p>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li>Ne publier que des informations exactes et véridiques le concernant</li>
          <li>Ne pas porter atteinte aux droits de tiers (droit à l&apos;image, droits d&apos;auteur, etc.)</li>
          <li>Ne pas publier de contenu illicite, diffamatoire ou contraire à l&apos;ordre public</li>
          <li>Ne pas usurper l&apos;identité d&apos;un tiers</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-montserrat text-lg font-bold text-primary">
          Article 4 — Caractère public des profils
        </h2>
        <div className="border-l-4 border-tertiary-container pl-4 py-1">
          <p>
            Tout profil publié est librement accessible sur internet sans
            nécessiter d&apos;authentification. L&apos;utilisateur en est
            pleinement informé et en assume l&apos;entière responsabilité.
          </p>
        </div>
        <p>
          L&apos;utilisateur peut dépublier ou supprimer son profil à tout moment
          depuis son tableau de bord. La suppression d&apos;un profil entraîne la
          suppression définitive et immédiate de l&apos;ensemble des données
          associées (palmarès, photos, vidéos, biographie).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-montserrat text-lg font-bold text-primary">
          Article 5 — Modération
        </h2>
        <p>
          L&apos;éditeur se réserve le droit de supprimer tout contenu ou compte
          sans préavis en cas d&apos;abus, notamment : contenu inapproprié ou
          illicite, fausses informations, usurpation d&apos;identité, ou toute
          violation des présentes CGU.
        </p>
        <p>
          Dans la mesure du possible, l&apos;utilisateur concerné sera informé de
          la suppression et de son motif.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-montserrat text-lg font-bold text-primary">
          Article 6 — Évolution du service
        </h2>
        <p>
          IpponId est un service en développement actif. Ses fonctionnalités
          peuvent évoluer, être modifiées ou supprimées à tout moment.
        </p>
        <p>
          Certaines fonctionnalités actuellement gratuites pourront devenir
          payantes à l&apos;avenir. L&apos;utilisateur sera informé de tout
          changement tarifaire avant son entrée en vigueur, avec un préavis
          raisonnable lui permettant de supprimer son compte s&apos;il le
          souhaite.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-montserrat text-lg font-bold text-primary">
          Article 7 — Limitation de responsabilité
        </h2>
        <p>
          IpponId est fourni &laquo; en l&apos;état &raquo;, sans garantie
          d&apos;disponibilité continue, d&apos;exactitude ou d&apos;adéquation
          à un usage particulier.
        </p>
        <p>
          L&apos;éditeur ne saurait être tenu responsable des dommages directs ou
          indirects résultant de l&apos;utilisation du service, d&apos;une
          interruption technique, ou de la perte de données imputable à un
          tiers prestataire (voir sous-traitants dans la politique de
          confidentialité).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-montserrat text-lg font-bold text-primary">
          Article 8 — Droit applicable
        </h2>
        <p>
          Les présentes CGU sont soumises au droit français. Tout litige relatif
          à leur interprétation ou à leur exécution relève de la compétence des
          juridictions françaises.
        </p>
      </section>
    </LegalLayout>
  )
}
```

- [ ] **Step 2 : Vérifier les types**

```bash
npx tsc --noEmit
```

Attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/cgu/page.tsx
git commit -m "feat: add CGU page"
```

---

### Task 6 — Mise à jour du LandingFooter

**Files:**
- Modify: `components/landing/LandingFooter.tsx`

**Interfaces:**
- Consumes: routes `/mentions-legales`, `/confidentialite`, `/cgu` créées en Tasks 3-5
- Produces: liens cliquables vers les pages légales + lien CGU ajouté

- [ ] **Step 1 : Lire le fichier existant**

Lire `components/landing/LandingFooter.tsx` pour confirmer le contenu actuel avant modification. Le fichier actuel a :
- 3 liens `<a href="#">` pour "Mentions légales", "Politique de confidentialité", "Contact"
- Pas de lien CGU

- [ ] **Step 2 : Remplacer le contenu**

Remplacer l'intégralité de `components/landing/LandingFooter.tsx` par :

```tsx
import Link from 'next/link'

export default function LandingFooter() {
  return (
    <footer className="bg-surface-container-highest border-t border-outline-variant">
      <div className="flex flex-col md:flex-row justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-10 max-w-container-max mx-auto gap-6">
        <div className="flex flex-col items-center md:items-start gap-1">
          <span className="font-montserrat text-lg font-black text-primary tracking-tight">IpponId</span>
          <p className="text-on-surface-variant text-xs">© 2026 IpponId. Tous droits réservés.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-on-surface-variant text-xs">
          <Link href="/mentions-legales" className="hover:text-secondary transition-colors">
            Mentions légales
          </Link>
          <Link href="/confidentialite" className="hover:text-secondary transition-colors">
            Politique de confidentialité
          </Link>
          <Link href="/cgu" className="hover:text-secondary transition-colors">
            CGU
          </Link>
          <a
            href="mailto:[À COMPLÉTER : adresse email de contact]"
            className="hover:text-secondary transition-colors"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 3 : Vérifier les types**

```bash
npx tsc --noEmit
```

Attendu : aucune erreur.

- [ ] **Step 4 : Commit**

```bash
git add components/landing/LandingFooter.tsx
git commit -m "feat: wire legal page links in landing footer"
```

---

### Task 7 — Consentement CGU sur la page setup

**Files:**
- Modify: `app/dashboard/setup/page.tsx`
- Modify: `app/dashboard/setup/actions.ts`

**Interfaces:**
- Consumes:
  - Colonnes `terms_accepted` et `terms_accepted_at` sur `profiles` (Task 1)
  - Routes `/cgu` et `/confidentialite` (Tasks 4 et 5)
- Produces: profil créé avec `terms_accepted: true` et `terms_accepted_at` renseigné

- [ ] **Step 1 : Modifier la page setup**

La page actuelle (`app/dashboard/setup/page.tsx`) a un formulaire avec prénom, nom et un bouton submit. Il faut ajouter une case à cocher required entre le champ nom et le bouton.

Remplacer l'intégralité de `app/dashboard/setup/page.tsx` par :

```tsx
import { createClient } from '@/lib/supabase/server'
import { createProfile } from './actions'
import Link from 'next/link'

export default async function SetupPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const meta = user?.user_metadata ?? {}
  const defaultFirst: string = meta.given_name ?? meta.full_name?.split(' ')[0] ?? ''
  const defaultLast: string =
    meta.family_name ?? meta.full_name?.split(' ').slice(1).join(' ') ?? ''

  return (
    <div className="min-h-screen flex items-center justify-center px-margin-mobile">
      <div className="w-full max-w-md">
        <h1 className="font-montserrat text-headline-md font-bold text-primary mb-2">
          Complète ton profil
        </h1>
        <p className="text-on-surface-variant text-body-md mb-8">
          Ces informations seront visibles sur ta page publique.
        </p>
        <form action={createProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="firstName">
              Prénom
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              defaultValue={defaultFirst}
              required
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="lastName">
              Nom
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              defaultValue={defaultLast}
              required
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex items-start gap-3 pt-2">
            <input
              id="termsAccepted"
              name="termsAccepted"
              type="checkbox"
              required
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary cursor-pointer"
            />
            <label htmlFor="termsAccepted" className="text-sm text-on-surface leading-snug cursor-pointer">
              J&apos;ai lu et j&apos;accepte les{' '}
              <Link href="/cgu" target="_blank" className="text-primary hover:underline">
                Conditions Générales d&apos;Utilisation
              </Link>{' '}
              et la{' '}
              <Link href="/confidentialite" target="_blank" className="text-primary hover:underline">
                politique de confidentialité
              </Link>
              .
            </label>
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-on-primary font-semibold py-3 rounded-lg hover:bg-primary-container transition-colors"
          >
            Créer mon profil
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Modifier l'action createProfile**

Remplacer l'intégralité de `app/dashboard/setup/actions.ts` par :

```ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/slugify'

async function findUniqueSlug(
  supabase: ReturnType<typeof createClient>,
  firstName: string,
  lastName: string
): Promise<string> {
  const base = generateSlug(firstName, lastName)
  let slug = base
  for (let i = 2; i <= 10; i++) {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('slug', slug)
    if (count === 0) return slug
    slug = `${base}-${i}`
  }
  throw new Error('Impossible de générer un slug unique après 10 tentatives.')
}

export async function createProfile(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const firstName = (formData.get('firstName') as string).trim()
  const lastName = (formData.get('lastName') as string).trim()
  if (!firstName || !lastName) return

  // Idempotence : vérifie si un profil existe déjà
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (existing) {
    redirect('/dashboard')
  }

  const slug = await findUniqueSlug(supabase, firstName, lastName)

  await supabase.from('profiles').insert({
    owner_id: user.id,
    slug,
    first_name: firstName,
    last_name: lastName,
    published: false,
    parental_consent: false,
    terms_accepted: true,
    terms_accepted_at: new Date().toISOString(),
    layout: ['hero', 'bio', 'palmares', 'videos', 'gallery'],
  })

  redirect('/dashboard')
}
```

- [ ] **Step 3 : Vérifier les types**

```bash
npx tsc --noEmit
```

Attendu : aucune erreur. Note : si TypeScript signale que `terms_accepted` ou `terms_accepted_at` ne sont pas dans le type généré Supabase, c'est que les types Supabase auto-générés n'ont pas encore été régénérés. Dans ce cas, exécuter :

```bash
npx supabase gen types typescript --local > types/supabase.ts
```

Si `supabase` CLI n'est pas disponible localement, ignorer l'erreur de type pour l'instant — les colonnes existent en base depuis la migration Task 1 et l'insert fonctionnera à l'exécution.

- [ ] **Step 4 : Build complet**

```bash
npm run build
```

Attendu : build réussi sans erreur.

- [ ] **Step 5 : Commit**

```bash
git add app/dashboard/setup/page.tsx app/dashboard/setup/actions.ts
git commit -m "feat: add mandatory CGU consent checkbox to profile setup"
```

---

## Récapitulatif des placeholders

Ces 3 éléments doivent être remplis avant mise en ligne :

| Placeholder | Fichiers concernés |
|---|---|
| `[À COMPLÉTER : adresse email de contact]` | `app/mentions-legales/page.tsx`, `app/confidentialite/page.tsx`, `components/landing/LandingFooter.tsx` |
| `[À COMPLÉTER : région exacte du projet Supabase, ex. eu-west-1]` | `app/mentions-legales/page.tsx`, `app/confidentialite/page.tsx` |
