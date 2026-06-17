import Link from 'next/link'

const navItems = [
  {
    href: '#how-it-works',
    label: 'Comment ça marche',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
      </svg>
    ),
  },
  {
    href: '#profiles',
    label: 'Exemples',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
      </svg>
    ),
  },
]

export default function LandingMobileNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-surface/95 backdrop-blur-sm border-t border-outline-variant"
      aria-label="Navigation mobile landing"
    >
      <div className="flex items-center h-16">
        {navItems.map(({ href, label, icon }) => (
          <a
            key={href}
            href={href}
            className="flex flex-col items-center gap-0.5 py-2 px-3 text-on-surface-variant hover:text-primary active:text-primary transition-colors flex-1"
          >
            {icon}
            <span className="font-inter text-[10px] font-bold uppercase tracking-wider leading-none">
              {label}
            </span>
          </a>
        ))}
        <Link
          href="/creer-mon-profil"
          className="flex flex-col items-center gap-0.5 py-2 px-3 text-primary flex-1"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          <span className="font-inter text-[10px] font-bold uppercase tracking-wider leading-none">
            Créer
          </span>
        </Link>
      </div>
    </nav>
  )
}
