import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { togglePublished } from './actions'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, slug, first_name, last_name, profile_photo_url, published')
    .eq('owner_id', user.id)
    .single()

  if (!profile) redirect('/dashboard/setup')

  const initials =
    (profile.first_name?.[0] ?? '') + (profile.last_name?.[0] ?? '')

  return (
    <div className="px-margin-mobile md:px-margin-desktop py-10 max-w-container-max">
      {/* Carte résumé */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6 flex items-center gap-5 mb-8">
        {profile.profile_photo_url ? (
          <img
            src={profile.profile_photo_url}
            alt={`${profile.first_name} ${profile.last_name}`}
            className="w-16 h-16 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
            <span className="font-montserrat font-black text-on-primary text-lg">
              {initials.toUpperCase()}
            </span>
          </div>
        )}
        <div className="min-w-0">
          <p className="font-montserrat font-bold text-primary text-xl">
            {profile.first_name} {profile.last_name}
          </p>
          <p className="text-on-surface-variant text-sm">@{profile.slug}</p>
          <span
            className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
              profile.published
                ? 'bg-tertiary-container/20 text-tertiary'
                : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            {profile.published ? 'Publié' : 'Brouillon'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={`/${profile.slug}`}
          target="_blank"
          className="flex items-center justify-center gap-2 border border-outline-variant text-on-surface font-semibold px-6 py-3 rounded-lg hover:bg-surface-container transition-colors text-sm"
        >
          Voir ma page publique ↗
        </Link>

        <form action={togglePublished}>
          <input type="hidden" name="profileId" value={profile.id} />
          <input type="hidden" name="slug" value={profile.slug} />
          <input type="hidden" name="next" value={String(!profile.published)} />
          <button
            type="submit"
            className={`w-full sm:w-auto font-semibold px-6 py-3 rounded-lg text-sm transition-colors ${
              profile.published
                ? 'border border-secondary text-secondary hover:bg-secondary/5'
                : 'bg-primary text-on-primary hover:bg-primary-container'
            }`}
          >
            {profile.published ? 'Dépublier' : 'Publier mon profil'}
          </button>
        </form>
      </div>
    </div>
  )
}
