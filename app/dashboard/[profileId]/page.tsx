import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isProfileOwner } from '@/lib/profileAccessService'
import { getMissingFieldsForPublishing, REQUIRED_FIELD_LABELS } from '@/lib/profileValidation'
import VisibilityForm from './VisibilityForm'

export default async function ProfileDashboardHome({
  params,
}: {
  params: { profileId: string }
}) {
  const { profileId } = params
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, slug, first_name, last_name, profile_photo_url, visibility, club, category, grade, bio, birth_date')
    .eq('id', profileId)
    .single()

  if (!profile) redirect('/dashboard')

  const [ownerStatus, missingFields] = await Promise.all([
    isProfileOwner(profileId, user.id),
    Promise.resolve(getMissingFieldsForPublishing(profile)),
  ])

  const initials = (profile.first_name?.[0] ?? '') + (profile.last_name?.[0] ?? '')

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
        </div>
      </div>

      {/* Checklist avant publication */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 mb-6">
        <p className="font-montserrat font-bold text-primary text-sm mb-3 uppercase tracking-wide">
          Avant de publier
        </p>
        <ul className="space-y-2">
          {REQUIRED_FIELD_LABELS.map((label) => {
            const isMissing = missingFields.includes(label)
            return (
              <li key={label} className="flex items-center gap-2 text-sm">
                <span className={isMissing ? 'text-secondary' : 'text-tertiary'}>
                  {isMissing ? '✗' : '✓'}
                </span>
                <span className={isMissing ? 'text-on-surface font-medium' : 'text-on-surface-variant'}>
                  {label}
                </span>
                {isMissing && (
                  <Link
                    href={`/dashboard/${profileId}/profil`}
                    className="ml-auto text-xs text-primary underline hover:no-underline"
                  >
                    Compléter →
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      {/* Visibilité */}
      <div className="mb-6">
        <VisibilityForm
          profileId={profileId}
          currentVisibility={profile.visibility as 'draft' | 'private' | 'public'}
          isOwner={ownerStatus}
          missingFields={missingFields}
        />
      </div>

      {/* Lien page publique */}
      <Link
        href={`/${profile.slug}`}
        target="_blank"
        className="inline-flex items-center gap-2 border border-outline-variant text-on-surface font-semibold px-6 py-3 rounded-lg hover:bg-surface-container transition-colors text-sm"
      >
        Voir la page publique ↗
      </Link>
    </div>
  )
}
