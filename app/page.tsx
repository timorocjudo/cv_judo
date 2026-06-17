import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import LandingNav from '@/components/landing/LandingNav'
import LandingMobileNav from '@/components/landing/LandingMobileNav'
import HeroSection from '@/components/landing/HeroSection'
import MockupSection from '@/components/landing/MockupSection'
import HowItWorksSection from '@/components/landing/HowItWorksSection'
import SocialProofSection from '@/components/landing/SocialProofSection'
import CtaSection from '@/components/landing/CtaSection'
import LandingFooter from '@/components/landing/LandingFooter'

export const metadata: Metadata = {
  title: 'IpponId — Crée ton CV judoka en ligne | Partage ton palmarès',
  description:
    'Crée gratuitement ta page de judoka en quelques secondes. Partage tes grades, compétitions et victoires avec ton URL personnalisée.',
  openGraph: {
    title: 'IpponId — Crée ton CV judoka en ligne',
    description:
      'Crée gratuitement ta page de judoka en quelques secondes. Partage tes grades, compétitions et victoires avec ton URL personnalisée.',
    type: 'website',
    locale: 'fr_FR',
    siteName: 'IpponId',
  },
}

export default async function LandingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <>
      <LandingNav isLoggedIn={!!user} />
      <main className="mt-20">
        <HeroSection />
        <MockupSection />
        <HowItWorksSection />
        <SocialProofSection />
        <CtaSection />
        <div className="h-16 md:hidden" aria-hidden="true" />
      </main>
      <LandingFooter />
      <LandingMobileNav />
    </>
  )
}
