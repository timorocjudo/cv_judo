import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Toaster } from 'sonner'
import LogoLink from '@/components/layout/LogoLink'
import NavUserAvatar from '@/components/NavUserAvatar'

export const metadata: Metadata = {
  title: {
    template: '%s — IpponId',
    default: 'Dashboard — IpponId',
  },
  robots: { index: false, follow: false },
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur-sm border-b border-outline-variant">
        <div className="flex justify-between items-center px-margin-mobile md:px-margin-desktop h-16 max-w-container-max mx-auto">
          <LogoLink />
          <NavUserAvatar initialIsLoggedIn />
        </div>
      </header>
      {children}
      <Toaster richColors position="top-center" />
    </div>
  )
}
