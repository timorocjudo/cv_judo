import type { Metadata } from 'next'
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
