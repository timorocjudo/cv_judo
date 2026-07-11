import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileForm from '@/components/dashboard/ProfileForm'
import DeleteAccountSection from '@/components/dashboard/DeleteAccountSection'

export const metadata: Metadata = { title: 'Profil' }

export default async function ProfilPage({ params }: { params: { profileId: string } }) {
  const { profileId } = params
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, club, club_id, clubs(id, name), category, grade, bio, profile_photo_url, cover_photo_url, owner_id, birth_date')
    .eq('id', profileId)
    .single()

  if (!profile) redirect('/dashboard')

  const clubJoin = profile.clubs as unknown as { id: string; name: string } | null
  const profileData = {
    ...profile,
    club_id: clubJoin?.id ?? (profile.club_id as string | null) ?? null,
    club_name: clubJoin?.name ?? profile.club ?? null,
  }

  return (
    <div className="px-margin-mobile md:px-margin-desktop py-10 max-w-container-max">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
        <h1 className="font-montserrat text-headline-md font-bold text-primary uppercase">
          Profil
        </h1>
      </div>
      <ProfileForm profile={profileData} profileId={profileId} />
      <DeleteAccountSection />
    </div>
  )
}
