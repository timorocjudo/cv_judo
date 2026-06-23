import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileForm from '@/components/dashboard/ProfileForm'
import DeleteAccountSection from '@/components/dashboard/DeleteAccountSection'

export default async function ProfilPage({ params }: { params: { profileId: string } }) {
  const { profileId } = params
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, club, category, grade, bio, profile_photo_url, cover_photo_url, owner_id, birth_date')
    .eq('id', profileId)
    .single()

  if (!profile) redirect('/dashboard')

  return (
    <div className="px-margin-mobile md:px-margin-desktop py-10 max-w-container-max">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
        <h1 className="font-montserrat text-headline-md font-bold text-primary uppercase">
          Profil
        </h1>
      </div>
      <ProfileForm profile={profile} profileId={profileId} />
      <DeleteAccountSection />
    </div>
  )
}
