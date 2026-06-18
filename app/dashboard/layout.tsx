import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import DashboardNav from '@/components/dashboard/DashboardNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const pathname = headers().get('x-pathname') ?? ''

  if (pathname !== '/dashboard/setup') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!profile) redirect('/dashboard/setup')
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="md:pl-60 pb-16 md:pb-0">
        {children}
      </main>
    </div>
  )
}
