import type { Metadata } from 'next'
import judokaData from '@/data/judoka.json'
import type { JudokaData } from '@/types/judoka'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import MobileNav from '@/components/layout/MobileNav'
import { blockRegistry } from '@/lib/blockRegistry'

const data = judokaData as JudokaData

export const metadata: Metadata = {
  title: `${data.identity.firstName} ${data.identity.lastName} — ${data.identity.club} · IpponId`,
  description: data.bio.slice(0, 155) + '…',
  openGraph: {
    title: `${data.identity.firstName} ${data.identity.lastName} — IpponId`,
    description: data.bio.slice(0, 155) + '…',
    images: [
      {
        url: data.identity.coverPhoto,
        width: 1200,
        height: 630,
        alt: `${data.identity.firstName} ${data.identity.lastName} en compétition`,
      },
    ],
    type: 'profile',
    locale: 'fr_FR',
    siteName: 'IpponId',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${data.identity.firstName} ${data.identity.lastName} — IpponId`,
    description: data.bio.slice(0, 155) + '…',
    images: [data.identity.coverPhoto],
  },
}

export default function HomePage() {
  return (
    <>
      <Header identity={data.identity} social={data.social} />
      <main>
        {data.layout.map((blockName) => {
          const render = blockRegistry[blockName]
          if (!render) return null
          return (
            <div key={blockName} id={blockName} className="scroll-mt-20">
              {render(data)}
            </div>
          )
        })}
        <div className="h-16 md:hidden" aria-hidden="true" />
      </main>
      <Footer identity={data.identity} social={data.social} />
      <MobileNav />
    </>
  )
}
