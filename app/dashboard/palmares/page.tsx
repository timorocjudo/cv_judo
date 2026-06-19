import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PalmaresManager from './PalmaresManager'

export default async function PalmaresPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, slug, published')
    .eq('owner_id', user.id)
    .single()

  if (!profile) redirect('/dashboard/setup')

  const { data: entries } = await supabase
    .from('palmares')
    .select('id, date, competition, city, category, level, position, result, medal')
    .eq('profile_id', profile.id)
    .order('date', { ascending: true })

  return (
    <div className="px-margin-mobile md:px-margin-desktop py-10 max-w-container-max">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
        <h1 className="font-montserrat text-headline-md font-bold text-primary uppercase">
          Mon Palmarès
        </h1>
      </div>
      <PalmaresManager
        entries={entries ?? []}
        isPublished={profile.published}
        profileSlug={profile.slug}
      />
    </div>
  )
}
