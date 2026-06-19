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
