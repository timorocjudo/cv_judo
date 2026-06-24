import type { Metadata } from 'next'
import { Montserrat, Inter } from 'next/font/google'
import NextTopLoader from 'nextjs-toploader'
import FooterLegalConditional from '@/components/FooterLegalConditional'
import './globals.css'

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
  weight: ['400', '700', '900'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '700'],
})

// INDEXATION PILOTABLE — basculer NEXT_PUBLIC_SITE_INDEXABLE à "true" sur Vercel
// uniquement au moment de l'ouverture publique réelle (après mise en place des pages légales).
const isIndexable = process.env.NEXT_PUBLIC_SITE_INDEXABLE === 'true'

export const metadata: Metadata = {
  metadataBase: new URL('https://ipponid.com'),
  ...(isIndexable ? {} : { robots: { index: false, follow: false } }),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${montserrat.variable} ${inter.variable}`}>
      <body className="bg-background text-on-surface font-inter overflow-x-hidden">
        <NextTopLoader color="#cba72f" height={3} showSpinner={false} />
        {children}
        <FooterLegalConditional />
      </body>
    </html>
  )
}
