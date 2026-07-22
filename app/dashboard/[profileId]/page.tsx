import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMissingFieldsForPublishing, REQUIRED_FIELD_LABELS } from '@/lib/profileValidation'
import VisibilityForm from './VisibilityForm'
import QRCodeDisplay from '@/components/QRCodeDisplay'
import DeleteProfileSection from '@/components/dashboard/DeleteProfileSection'
import Alert from '@/components/ui/Alert'

export const metadata: Metadata = { title: 'Tableau de bord' }

function BackToJudokasLink() {
  return (
    <Link
      href="/dashboard"
      className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-tertiary-container transition-colors mb-6"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
      </svg>
      Mes judokas
    </Link>
  )
}

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
    .select('id, slug, first_name, last_name, profile_photo_url, visibility, club, club_id, category, grade, bio, birth_date')
    .eq('id', profileId)
    .single()

  if (!profile) redirect('/dashboard')

  // Récupère le rôle ET les champs manquants en parallèle
  const [{ data: accessRow }, missingFields] = await Promise.all([
    supabase
      .from('profile_access')
      .select('role')
      .eq('profile_id', profileId)
      .eq('account_id', user.id)
      .maybeSingle(),
    Promise.resolve(getMissingFieldsForPublishing(profile)),
  ])

  const userRole = (accessRow?.role ?? null) as 'owner' | 'manager' | 'viewer' | null
  const ownerStatus = userRole === 'owner'

  const initials = (profile.first_name?.[0] ?? '') + (profile.last_name?.[0] ?? '')

  return (
    <div className="px-margin-mobile md:px-margin-desktop py-6 md:py-10 max-w-container-max">
      <BackToJudokasLink />

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
      <Alert
        variant={missingFields.length > 0 ? 'warning' : 'info'}
        title="Avant de publier"
        className="mb-6"
      >
        <ul className="space-y-2 mt-3">
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
      </Alert>

      {/* Visibilité */}
      <div className="mb-6">
        <VisibilityForm
          profileId={profileId}
          currentVisibility={profile.visibility as 'draft' | 'private' | 'public'}
          isOwner={ownerStatus}
          missingFields={missingFields}
          firstName={profile.first_name}
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

      {profile.visibility !== 'draft' && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 mt-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-8 bg-tertiary-container rounded-full" />
            <p className="font-montserrat font-bold text-primary text-sm uppercase tracking-wide">
              Mon QR Code
            </p>
          </div>
          <QRCodeDisplay slug={profile.slug} size={220} showLabel={false} />
          <p className="text-sm text-on-surface-variant mt-4 max-w-sm">
            Imprime ce QR code et colle-le sur ton sac, ton kimono, ou donne-le à ton club
            pour t&apos;identifier facilement.
          </p>
        </div>
      )}

      {(userRole === 'owner' || userRole === 'manager') && (
        <DeleteProfileSection
          profileId={profileId}
          firstName={profile.first_name}
          userRole={userRole as 'owner' | 'manager'}
        />
      )}
    </div>
  )
}
