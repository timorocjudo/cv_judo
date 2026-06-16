const navItems = [
  {
    href: '#bio',
    label: 'Profil',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
      </svg>
    ),
  },
  {
    href: '#palmares',
    label: 'Palmarès',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M19 5h-2V3H7v2H5C3.9 5 3 5.9 3 7v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V18H9v2h6v-2h-2v-2.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zm-2 3.1V7h2v1c0 1.37-.8 2.55-2 3.1V8.1zM5 8V7h2v3.1C5.8 9.55 5 8.37 5 7v1z" />
      </svg>
    ),
  },
  {
    href: '#videos',
    label: 'Highlights',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M8 5v14l11-7z" />
      </svg>
    ),
  },
  {
    href: '#gallery',
    label: 'Galerie',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
      </svg>
    ),
  },
]

export default function MobileNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-surface/95 backdrop-blur-sm border-t border-outline-variant"
      aria-label="Navigation mobile"
    >
      <div className="flex justify-around items-center h-16">
        {navItems.map(({ href, label, icon }) => (
          <a
            key={href}
            href={href}
            className="flex flex-col items-center gap-0.5 py-2 px-3 text-on-surface-variant hover:text-primary active:text-primary transition-colors min-w-[60px]"
          >
            {icon}
            <span className="font-inter text-[10px] font-bold uppercase tracking-wider leading-none">
              {label}
            </span>
          </a>
        ))}
      </div>
    </nav>
  )
}
