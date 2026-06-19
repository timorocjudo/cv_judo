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
          d&apos;une disponibilité continue, d&apos;exactitude ou d&apos;adéquation
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
