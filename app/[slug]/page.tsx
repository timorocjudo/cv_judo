import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getJudokaBySlug } from '@/lib/judokaService'
import { createClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import { blockRegistry } from '@/lib/blockRegistry'

type Props = { params: { slug: string } }

export async function generateStaticParams() {
  const supabase = createBrowserClient()
  const { data } = await supabase.from('profiles').select('slug').eq('published', true)
  return (data ?? []).map((row) => ({ slug: row.slug as string }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const judoka = await getJudokaBySlug(params.slug, { allowDraft: true })
  if (!judoka) return {}

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const ogImageUrl = `${siteUrl}/api/og/profile/${params.slug}`

  return {
    title: `${judoka.identity.firstName} ${judoka.identity.lastName} — ${judoka.identity.club} · IpponId`,
    description: judoka.bio.slice(0, 155) + '…',
    openGraph: {
      title: `${judoka.identity.firstName} ${judoka.identity.lastName} — IpponId`,
      description: judoka.bio.slice(0, 155) + '…',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: `${judoka.identity.firstName} ${judoka.identity.lastName} — IpponId` }],
      type: 'profile',
      locale: 'fr_FR',
      siteName: 'IpponId',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${judoka.identity.firstName} ${judoka.identity.lastName} — IpponId`,
      description: judoka.bio.slice(0, 155) + '…',
      images: [ogImageUrl],
    },
  }
}

export default async function JudokaPage({ params }: Props) {
  const [judoka, { data: { user } }] = await Promise.all([
    getJudokaBySlug(params.slug, { allowDraft: true }),
    createClient().auth.getUser(),
  ])

  const isOwner = !!user && !!judoka && judoka.ownerId === user.id

  if (!judoka) notFound()
  if (!judoka.published && !isOwner) notFound()

  return (
    <>
      {!judoka.published && isOwner && (
        <div className="sticky top-0 z-50 bg-surface-container border-b border-outline-variant px-margin-mobile md:px-margin-desktop py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-on-surface-variant font-medium">
            Brouillon — cette page n&apos;est pas visible publiquement.
          </p>
          <a
            href="/dashboard"
            className="text-sm font-semibold text-primary hover:underline whitespace-nowrap"
          >
            Gérer →
          </a>
        </div>
      )}
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
      </main>
<MobileNav />
    </>
  )
}
