import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfilesForAccount } from '@/lib/profileAccessService'

export const metadata: Metadata = { title: 'Mes judokas' }

const VISIBILITY_BADGE: Record<string, { label: string; className: string }> = {
  draft:   { label: 'Brouillon', className: 'bg-surface-container text-on-surface-variant' },
  private: { label: 'Privé',     className: 'bg-primary-container/20 text-primary' },
  public:  { label: 'Public',    className: 'bg-tertiary-container/20 text-tertiary' },
}

const ROLE_BADGE: Record<string, string> = {
  owner:   'Propriétaire',
  manager: 'Gestionnaire',
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const profiles = await getProfilesForAccount(user.id)
  if (profiles.length === 0) redirect('/dashboard/nouveau')

  return (
    <div className="min-h-screen bg-background px-margin-mobile md:px-margin-desktop py-10">
      <div className="max-w-container-max mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-montserrat text-headline-md font-bold text-primary uppercase">
            Mes judokas
          </h1>
          <Link
            href="/dashboard/nouveau"
            className="bg-primary text-on-primary font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-primary-container transition-colors"
          >
            + Créer un nouveau judoka
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => {
            const initials = (profile.first_name?.[0] ?? '') + (profile.last_name?.[0] ?? '')
            const vis = VISIBILITY_BADGE[profile.visibility] ?? VISIBILITY_BADGE.draft
            return (
              <div
                key={profile.id}
                className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-5 flex flex-col gap-4"
              >
                <div className="flex items-center gap-4">
                  {profile.profile_photo_url ? (
                    <img
                      src={profile.profile_photo_url}
                      alt={`${profile.first_name} ${profile.last_name}`}
                      className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                      <span className="font-montserrat font-black text-on-primary text-base">
                        {initials.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-montserrat font-bold text-primary truncate">
                      {profile.first_name} {profile.last_name}
                    </p>
                    {profile.club && (
                      <p className="text-on-surface-variant text-sm truncate">{profile.club}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${vis.className}`}>
                    {vis.label}
                  </span>
                  {ROLE_BADGE[profile.role] && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                      {ROLE_BADGE[profile.role]}
                    </span>
                  )}
                </div>

                <Link
                  href={`/dashboard/${profile.id}`}
                  className="w-full text-center bg-primary text-on-primary font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-primary-container transition-colors"
                >
                  Gérer
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
