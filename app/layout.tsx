import type { Metadata } from 'next'
import { Montserrat, Inter } from 'next/font/google'
import NextTopLoader from 'nextjs-toploader'
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

export const metadata: Metadata = {
  metadataBase: new URL('https://ipponid.com'),
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
      </body>
    </html>
  )
}
