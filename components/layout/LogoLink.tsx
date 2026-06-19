'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function LogoLink() {
  const pathname = usePathname()

  if (pathname === '/') {
    return (
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="font-montserrat text-xl font-black text-primary tracking-tighter"
        aria-label="Retour en haut de page"
      >
        IpponId
      </button>
    )
  }

  return (
    <Link
      href="/"
      className="font-montserrat text-xl font-black text-primary tracking-tighter"
    >
      IpponId
    </Link>
  )
}
