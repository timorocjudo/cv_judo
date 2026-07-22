import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GalerieManager from '@/components/dashboard/GalerieManager'

export const metadata: Metadata = { title: 'Galerie' }

export default async function GaleriePage({ params }: { params: { profileId: string } }) {
  const { profileId } = params
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('owner_id')
    .eq('id', profileId)
    .single()

  if (!profile) redirect('/dashboard')

  const { data: photos } = await supabase
    .from('gallery_photos')
    .select('id, photo_url, caption')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })

  return (
    <div className="px-margin-mobile md:px-margin-desktop py-10 max-w-container-max">
      <Link
        href={`/dashboard/${profileId}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-tertiary-container transition-colors mb-6"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Accueil du profil
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
        <h1 className="font-montserrat text-headline-md font-bold text-primary uppercase">
          Galerie
        </h1>
      </div>
      <GalerieManager
        photos={photos ?? []}
        profileId={profileId}
        ownerId={profile.owner_id}
      />
    </div>
  )
}
