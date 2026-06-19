import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileForm from './ProfileForm'
import DeleteAccountSection from './DeleteAccountSection'

export default async function ProfilPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, club, category, grade, bio, profile_photo_url, cover_photo_url, owner_id, birth_date')
    .eq('owner_id', user.id)
    .single()

  if (!profile) redirect('/dashboard/setup')

  return (
    <div className="px-margin-mobile md:px-margin-desktop py-10 max-w-container-max">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors mb-6"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Tableau de bord
      </Link>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
        <h1 className="font-montserrat text-headline-md font-bold text-primary uppercase">
          Mon profil
        </h1>
      </div>
      <ProfileForm profile={profile} />
      <DeleteAccountSection />
    </div>
  )
}
