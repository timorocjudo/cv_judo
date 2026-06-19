import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { computeAgeCategory } from '@/lib/ageCategory'
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

export type ProfileCard = {
  slug: string
  first_name: string
  last_name: string
  profile_photo_url: string | null
}

export type FeaturedProfile = ProfileCard & {
  cover_photo_url: string | null
  grade: string | null
  category: string | null
  club: string | null
  ageCategory: string
  palmares: { competition: string | null; result: string | null; medal: string | null }[]
}

export default async function LandingPage() {
  const supabase = createClient()
  const [{ data: { user } }, { data: rawProfiles }, { count: totalProfiles }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('profiles')
      .select('id, slug, first_name, last_name, profile_photo_url, cover_photo_url, grade, category, club, birth_date')
      .eq('published', true)
      .order('created_at', { ascending: true })
      .limit(6),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('published', true),
  ])

  const profiles: ProfileCard[] = (rawProfiles ?? []).map((p) => ({
    slug: p.slug,
    first_name: p.first_name,
    last_name: p.last_name,
    profile_photo_url: p.profile_photo_url,
  }))

  let featured: FeaturedProfile | null = null
  if (rawProfiles && rawProfiles.length > 0) {
    const first = rawProfiles[0]
    const { data: palmaresRows } = await supabase
      .from('palmares')
      .select('competition, result, medal')
      .eq('profile_id', first.id)
      .order('date', { ascending: false })
      .limit(2)

    featured = {
      slug: first.slug,
      first_name: first.first_name,
      last_name: first.last_name,
      profile_photo_url: first.profile_photo_url,
      cover_photo_url: first.cover_photo_url,
      grade: first.grade,
      category: first.category,
      club: first.club,
      ageCategory: computeAgeCategory(first.birth_date ?? undefined),
      palmares: palmaresRows ?? [],
    }
  }

  return (
    <>
      <LandingNav isLoggedIn={!!user} />
      <main className="mt-20">
        <HeroSection />
        <MockupSection featured={featured} />
        <HowItWorksSection />
        <SocialProofSection profiles={profiles} totalCount={totalProfiles ?? profiles.length} />
        <CtaSection />
        <div className="h-16 md:hidden" aria-hidden="true" />
      </main>
      <LandingFooter />
      <LandingMobileNav />
    </>
  )
}
