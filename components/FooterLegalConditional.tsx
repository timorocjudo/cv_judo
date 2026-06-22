'use client'

import { usePathname } from 'next/navigation'
import FooterLegal from './FooterLegal'

export default function FooterLegalConditional() {
  const pathname = usePathname()
  if (pathname === '/') return null
  return <FooterLegal />
}
