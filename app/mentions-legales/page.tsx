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
            href="mailto:oliv.francois@gmail.com"
            className="text-primary hover:underline"
          >
            oliv.francois@gmail.com
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
            eu-north-1.
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
