import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getProfileAccesses,
  addProfileAccess,
  removeProfileAccess,
} from '@/lib/profileAccessService'

function buildDisplayName(
  firstName: string | null,
  lastName: string | null,
  email: string | null
): string {
  if (firstName && lastName) return `${firstName} ${lastName[0]}.`
  if (firstName) return firstName
  if (email) return email.split('@')[0]
  return 'Inconnu'
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: Record<string, string>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
  }

  const { action, profileId } = body
  if (!action || !profileId) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  if (action === 'list') {
    const adminClient = createAdminClient()
    const rows = await getProfileAccesses(profileId)
    const accountIds = rows.map((r) => r.account_id)

    const [profilesResult, usersResult] = await Promise.all([
      adminClient.from('profiles').select('owner_id, first_name, last_name').in('owner_id', accountIds),
      adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ])

    const profileMap = new Map(profilesResult.data?.map((p) => [p.owner_id, p]) ?? [])
    const userMap = new Map(usersResult.data?.users.map((u) => [u.id, u]) ?? [])

    const accesses = rows.map((row) => {
      const profile = profileMap.get(row.account_id)
      const authUser = userMap.get(row.account_id)
      return {
        account_id: row.account_id,
        role: row.role,
        created_at: row.created_at,
        display_name: buildDisplayName(
          profile?.first_name ?? null,
          profile?.last_name ?? null,
          authUser?.email ?? null
        ),
      }
    })

    return NextResponse.json({ accesses })
  }

  if (action === 'add') {
    const { email, role } = body
    if (!email || !['manager', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const { data: targetAccountId } = await adminClient.rpc('get_account_id_by_email', {
      p_email: email,
    })

    if (!targetAccountId) {
      return NextResponse.json({
        success: false,
        message: 'Aucun compte IpponId associé à cet email.',
      })
    }

    const result = await addProfileAccess(
      profileId,
      targetAccountId as string,
      role as 'manager' | 'viewer',
      user.id
    )
    return NextResponse.json(result)
  }

  if (action === 'remove') {
    const { targetAccountId } = body
    if (!targetAccountId) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }
    const result = await removeProfileAccess(profileId, targetAccountId, user.id)
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
}
