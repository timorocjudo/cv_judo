import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PalmaresManager from '@/components/dashboard/PalmaresManager'

export const metadata: Metadata = { title: 'Palmarès' }

export default async function PalmaresPage({ params }: { params: { profileId: string } }) {
  const { profileId } = params
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('slug, visibility')
    .eq('id', profileId)
    .single()

  if (!profile) redirect('/dashboard')

  const { data: entries } = await supabase
    .from('palmares')
    .select('id, date, competition, city, category, level, position, result, medal')
    .eq('profile_id', profileId)
    .order('date', { ascending: true })

  return (
    <div className="px-margin-mobile md:px-margin-desktop py-10 max-w-container-max">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
        <h1 className="font-montserrat text-headline-md font-bold text-primary uppercase">
          Palmarès
        </h1>
      </div>
      <PalmaresManager
        entries={entries ?? []}
        isPublished={profile.visibility === 'public'}
        profileSlug={profile.slug}
        profileId={profileId}
      />
    </div>
  )
}
