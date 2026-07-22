import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isProfileOwner } from '@/lib/profileAccessService'
import ProfileAccessManager from '@/components/dashboard/ProfileAccessManager'

export const metadata: Metadata = { title: 'Accès & partage' }

export default async function ProfileAccessPage({ params }: { params: { profileId: string } }) {
  const { profileId } = params
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const owner = await isProfileOwner(profileId, user.id)
  if (!owner) redirect(`/dashboard/${profileId}`)

  const adminClient = createAdminClient()

  const { data: accessRows } = await adminClient
    .from('profile_access')
    .select('account_id, role, created_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true })

  const rows = accessRows ?? []

  const usersResult = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const userMap = new Map(usersResult.data?.users.map((u) => [u.id, u]) ?? [])

  const accesses = rows.map((row) => {
    const authUser = userMap.get(row.account_id)
    const email = authUser?.email ?? null
    const meta = authUser?.user_metadata ?? {}
    const display_name: string =
      meta.full_name ?? meta.name ?? email?.split('@')[0] ?? 'Inconnu'
    const email_masked = email
      ? `${email.slice(0, 3)}***@${email.split('@')[1]}`
      : null
    return { account_id: row.account_id, role: row.role as 'owner' | 'manager' | 'viewer', created_at: row.created_at, display_name, email_masked }
  })

  return (
    <div className="px-margin-mobile md:px-margin-desktop py-6 md:py-10 max-w-container-max">
      <Link
        href={`/dashboard/${profileId}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-tertiary-container transition-colors mb-6"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Accueil du profil
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
        <h1 className="font-montserrat text-headline-md font-bold text-primary uppercase">
          Accès & partage
        </h1>
      </div>
      <ProfileAccessManager
        profileId={profileId}
        currentAccountId={user.id}
        initialAccesses={accesses}
      />
    </div>
  )
}
