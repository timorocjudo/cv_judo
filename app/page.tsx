import type { Metadata } from 'next'
import LandingNav from '@/components/landing/LandingNav'
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

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main className="mt-20">
        <HeroSection />
        <MockupSection />
        <HowItWorksSection />
        <SocialProofSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </>
  )
}
