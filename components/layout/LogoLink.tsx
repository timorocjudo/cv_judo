'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import IpponIdWordmark from '@/components/IpponIdWordmark'

export default function LogoLink() {
  const pathname = usePathname()

  if (pathname === '/') {
    return (
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Retour en haut de page"
      >
        <IpponIdWordmark className="text-xl tracking-tighter" />
      </button>
    )
  }

  return (
    <Link href="/">
      <IpponIdWordmark className="text-xl tracking-tighter" />
    </Link>
  )
}
