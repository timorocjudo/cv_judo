import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfilesForAccount } from '@/lib/profileAccessService'
import { getAccount, canCreateMoreProfiles, type AccountType } from '@/lib/accountService'
import Alert from '@/components/ui/Alert'

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

  const [profiles, account] = await Promise.all([
    getProfilesForAccount(user.id),
    getAccount(user.id),
  ])

  if (profiles.length === 0) {
    const WELCOME: Record<AccountType, string> = {
      manager: 'Bienvenue ! Crée le premier profil de tes enfants judokas.',
      parent_judoka: 'Bienvenue ! Commençons par créer ton profil judoka.',
      judoka: 'Bienvenue ! Crée ton profil judoka.',
    }
    const welcomeMsg = account ? WELCOME[account.account_type] : 'Bienvenue !'

    return (
      <div className="flex-1 flex items-center justify-center px-margin-mobile">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-on-primary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <h1 className="font-montserrat text-headline-md font-bold text-primary">{welcomeMsg}</h1>
          <Link
            href="/dashboard/nouveau"
            className="inline-block bg-primary text-on-primary font-semibold px-8 py-3 rounded-lg hover:bg-primary-container transition-colors"
          >
            Créer mon premier judoka
          </Link>
        </div>
      </div>
    )
  }

  const ownedCount = profiles.filter((p) => p.role === 'owner').length
  const canCreate = canCreateMoreProfiles(account?.max_profiles ?? 1, ownedCount)

  return (
    <div className="px-margin-mobile md:px-margin-desktop py-10">
      <div className="max-w-container-max mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <h1 className="font-montserrat text-headline-md font-bold text-primary uppercase">
            Mes judokas
          </h1>
          {canCreate ? (
            <Link
              href="/dashboard/nouveau"
              className="bg-primary text-on-primary font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-primary-container transition-colors w-full text-center md:w-auto"
            >
              + Créer un nouveau judoka
            </Link>
          ) : (
            <div className="md:max-w-xs">
              <Alert
                variant="warning"
                title="Limite de profils atteinte"
                description="Ton type de compte actuel permet de gérer un seul profil judoka."
                action={{ label: 'Passer en compte famille →', href: '/dashboard/parametres' }}
              />
            </div>
          )}
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
