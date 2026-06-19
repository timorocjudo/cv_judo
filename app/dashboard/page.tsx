import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { togglePublished, ToggleResult } from './actions'
import { getMissingFieldsForPublishing, REQUIRED_FIELD_LABELS } from '@/lib/profileValidation'
import { SubmitButton } from '@/components/dashboard/SubmitButton'

const TOGGLE_INITIAL: ToggleResult = { ok: null, missing: [], unpublished: false }
async function togglePublishedAction(formData: FormData): Promise<void> {
  'use server'
  await togglePublished(TOGGLE_INITIAL, formData)
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { error?: string | string[] }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, slug, first_name, last_name, profile_photo_url, published, club, category, grade, bio, birth_date')
    .eq('owner_id', user.id)
    .single()

  if (!profile) redirect('/dashboard/setup')

  const missingFields = getMissingFieldsForPublishing(profile)
  const isPublishable = missingFields.length === 0

  const initials =
    (profile.first_name?.[0] ?? '') + (profile.last_name?.[0] ?? '')

  const rawError = Array.isArray(searchParams.error)
    ? searchParams.error[0]
    : searchParams.error
  const errorFields = rawError
    ? decodeURIComponent(rawError).split(',').filter((f) => REQUIRED_FIELD_LABELS.includes(f))
    : []

  return (
    <div className="px-margin-mobile md:px-margin-desktop py-10 max-w-container-max">

      {/* Bannière d'erreur (contournement UI) */}
      {errorFields.length > 0 && (
        <div className="mb-6 bg-secondary/10 border border-secondary/30 text-secondary rounded-lg px-4 py-3 text-sm">
          Impossible de publier — champs manquants :{' '}
          <span className="font-semibold">{errorFields.join(', ')}</span>.
        </div>
      )}

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
                    href="/dashboard/profil"
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

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={`/${profile.slug}`}
          target="_blank"
          className="flex items-center justify-center gap-2 border border-outline-variant text-on-surface font-semibold px-6 py-3 rounded-lg hover:bg-surface-container transition-colors text-sm"
        >
          Voir ma page publique ↗
        </Link>

        <form action={togglePublishedAction}>
          <input type="hidden" name="profileId" value={profile.id} />
          <input type="hidden" name="slug" value={profile.slug} />
          <input type="hidden" name="next" value={String(!profile.published)} />
          <SubmitButton
            disabled={!profile.published && !isPublishable}
            pendingText={profile.published ? 'Dépublication…' : 'Publication…'}
            title={
              !profile.published && !isPublishable
                ? `Champs manquants : ${missingFields.join(', ')}`
                : undefined
            }
            className={`w-full sm:w-auto font-semibold px-6 py-3 rounded-lg text-sm ${
              profile.published
                ? 'border border-secondary text-secondary hover:bg-secondary/5'
                : isPublishable
                  ? 'bg-primary text-on-primary hover:bg-primary-container'
                  : 'bg-primary/30 text-on-primary'
            }`}
          >
            {profile.published ? 'Dépublier' : 'Publier mon profil'}
          </SubmitButton>
        </form>
      </div>
    </div>
  )
}
