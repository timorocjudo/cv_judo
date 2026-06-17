import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getJudokaBySlug } from '@/lib/judokaService'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import MobileNav from '@/components/layout/MobileNav'
import { blockRegistry } from '@/lib/blockRegistry'
import judokasData from '@/data/judokas.seed.json'

type Props = { params: { slug: string } }

export async function generateStaticParams() {
  return (judokasData as { slug: string }[]).map((j) => ({ slug: j.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const judoka = await getJudokaBySlug(params.slug)
  if (!judoka) return {}
  return {
    title: `${judoka.identity.firstName} ${judoka.identity.lastName} — ${judoka.identity.club} · IpponId`,
    description: judoka.bio.slice(0, 155) + '…',
    openGraph: {
      title: `${judoka.identity.firstName} ${judoka.identity.lastName} — IpponId`,
      description: judoka.bio.slice(0, 155) + '…',
      images: [{ url: judoka.identity.coverPhoto, width: 1200, height: 630, alt: `${judoka.identity.firstName} ${judoka.identity.lastName} en compétition` }],
      type: 'profile',
      locale: 'fr_FR',
      siteName: 'IpponId',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${judoka.identity.firstName} ${judoka.identity.lastName} — IpponId`,
      description: judoka.bio.slice(0, 155) + '…',
      images: [judoka.identity.coverPhoto],
    },
  }
}

export default async function JudokaPage({ params }: Props) {
  const [judoka, { data: { user } }] = await Promise.all([
    getJudokaBySlug(params.slug),
    createClient().auth.getUser(),
  ])

  if (!judoka) notFound()

  return (
    <>
      <Header identity={judoka.identity} social={judoka.social} isLoggedIn={!!user} />
      <main>
        {judoka.layout.map((blockName) => {
          const render = blockRegistry[blockName]
          if (!render) return null
          return (
            <div key={blockName} id={blockName} className="scroll-mt-20">
              {render(judoka)}
            </div>
          )
        })}
        <div className="h-16 md:hidden" aria-hidden="true" />
      </main>
      <Footer identity={judoka.identity} social={judoka.social} />
      <MobileNav />
    </>
  )
}
