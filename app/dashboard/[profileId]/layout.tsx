import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canEditProfile, isProfileOwner } from '@/lib/profileAccessService'
import DashboardProfileNav from '@/components/dashboard/DashboardProfileNav'

export async function generateMetadata({ params }: { params: { profileId: string } }): Promise<Metadata> {
  const supabase = createClient()
  const { data } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', params.profileId)
    .single()

  const name = data ? `${data.first_name} ${data.last_name}` : 'Judoka'
  return {
    title: {
      template: `%s · ${name} — IpponId`,
      default: `${name} — IpponId`,
    },
  }
}

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
