'use client'

import { usePathname } from 'next/navigation'
import LandingFooter from './landing/LandingFooter'

export default function FooterLegalConditional() {
  const pathname = usePathname()
  if (pathname === '/') return null
  return <LandingFooter />
}
