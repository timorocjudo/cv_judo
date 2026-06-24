import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import VideoManager from '@/components/dashboard/VideoManager'

export const metadata: Metadata = { title: 'Vidéos' }

export default async function VideosPage({ params }: { params: { profileId: string } }) {
  const { profileId } = params
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', profileId)
    .single()

  if (!profile) redirect('/dashboard')

  const { data: videos } = await supabase
    .from('videos')
    .select('id, title, youtube_url, description')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })

  return (
    <div className="px-margin-mobile md:px-margin-desktop py-10 max-w-container-max">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
        <h1 className="font-montserrat text-headline-md font-bold text-primary uppercase">
          Vidéos
        </h1>
      </div>
      <VideoManager videos={videos ?? []} profileId={profileId} />
    </div>
  )
}
