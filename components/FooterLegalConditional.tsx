'use client'

import { usePathname } from 'next/navigation'
import LandingFooter from './landing/LandingFooter'

// Static top-level routes — anything else at depth 1 is a judoka profile page (/[slug])
const RESERVED_TOP_LEVEL_ROUTES = new Set([
  'creer-mon-profil',
  'cgu',
  'confidentialite',
  'mentions-legales',
  'recherche',
  'dashboard',
  'auth',
])

// /dashboard/nouveau, /dashboard/parametres, /dashboard/setup use the plain
// dashboard layout, not the profile layout with its sidebar + bottom tabs
const RESERVED_DASHBOARD_SEGMENTS = new Set(['nouveau', 'parametres', 'setup'])

function isDashboardProfileRoute(segments: string[]) {
  return segments[0] === 'dashboard' && segments.length >= 2 && !RESERVED_DASHBOARD_SEGMENTS.has(segments[1])
}

function isJudokaProfileRoute(segments: string[]) {
  return segments.length === 1 && !RESERVED_TOP_LEVEL_ROUTES.has(segments[0])
}

export default function FooterLegalConditional() {
  const pathname = usePathname()
  if (pathname === '/') return null

  const segments = pathname.split('/').filter(Boolean)
  // Dashboard profile pages have a fixed w-60 sidebar on desktop, plus a
  // sticky mobile bottom tab bar — both /[slug] and dashboard profile pages
  // need the footer's extra bottom padding to clear that bar on mobile
  const hasDashboardSidebar = isDashboardProfileRoute(segments)
  const hasStickyBottomNav = hasDashboardSidebar || isJudokaProfileRoute(segments)

  return (
    <div className={hasDashboardSidebar ? 'md:pl-60' : ''}>
      <LandingFooter hasStickyBottomNav={hasStickyBottomNav} />
    </div>
  )
}
