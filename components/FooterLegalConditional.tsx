'use client'

import { usePathname } from 'next/navigation'
import LandingFooter from './landing/LandingFooter'

export default function FooterLegalConditional() {
  const pathname = usePathname()
  if (pathname === '/') return null
  // Dashboard profile pages have a fixed w-60 sidebar on desktop
  const hasSidebar = /^\/dashboard\/[^/]+/.test(pathname)
  return (
    <div className={hasSidebar ? 'md:pl-60' : ''}>
      <LandingFooter />
    </div>
  )
}
