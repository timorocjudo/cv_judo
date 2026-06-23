import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canEditProfile, isProfileOwner } from '@/lib/profileAccessService'
import DashboardProfileNav from '@/components/dashboard/DashboardProfileNav'

export default async function ProfileDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { profileId: string }
}) {
  const { profileId } = params
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const hasAccess = await canEditProfile(profileId, user.id)
  if (!hasAccess) redirect('/dashboard')

  const [ownerStatus, profileData] = await Promise.all([
    isProfileOwner(profileId, user.id),
    supabase.from('profiles').select('first_name, last_name').eq('id', profileId).single(),
  ])

  const profile = profileData.data
  const profileName = profile
    ? `${profile.first_name} ${profile.last_name}`
    : 'Judoka'

  return (
    <div className="min-h-screen bg-background">
      <DashboardProfileNav
        profileId={profileId}
        profileName={profileName}
        isOwner={ownerStatus}
      />
      <main className="md:pl-60 pb-16 md:pb-0">
        {children}
      </main>
    </div>
  )
}
