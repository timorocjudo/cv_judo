import type { Identity, Social } from '@/types/judoka'

interface FooterProps {
  identity: Identity
  social: Social
}

export default function Footer({ identity, social }: FooterProps) {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-surface-container-highest border-t border-outline-variant">
      <div className="px-margin-mobile md:px-margin-desktop py-10 max-w-container-max mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="font-montserrat text-xl font-black text-primary tracking-tighter">
          IpponId
        </div>

        <nav className="flex gap-6" aria-label="Réseaux sociaux">
          {social.map(({ network, url }) => (
            <a
              key={network}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-inter text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
            >
              {network}
            </a>
          ))}
        </nav>

        <p className="font-inter text-xs text-on-surface-variant opacity-70 text-center">
          © {year} {identity.firstName} {identity.lastName}. Tous droits réservés.
        </p>
      </div>
    </footer>
  )
}
