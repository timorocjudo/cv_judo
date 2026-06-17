import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/auth/LogoutButton'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-margin-mobile gap-6">
      <h1 className="font-montserrat text-headline-md font-bold text-primary">
        Tableau de bord
      </h1>
      <p className="text-on-surface-variant text-body-lg">
        Connecté en tant que <strong className="text-on-surface">{user.email}</strong>
      </p>
      <LogoutButton />
    </main>
  )
}
