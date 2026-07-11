import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getProfileAccesses,
  addProfileAccess,
  removeProfileAccess,
  isProfileOwner,
} from '@/lib/profileAccessService'

function buildDisplayName(metaName: string | null, email: string | null): string {
  if (metaName) return metaName
  if (email) return email.split('@')[0]
  return 'Inconnu'
}

function maskEmail(email: string | null): string | null {
  if (!email) return null
  const [local, domain] = email.split('@')
  return `${local.slice(0, 3)}***@${domain}`
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
    const ownerCheck = await isProfileOwner(profileId, user.id)
    if (!ownerCheck) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    const adminClient = createAdminClient()
    const rows = await getProfileAccesses(profileId)
    const accountIds = rows.map((r) => r.account_id)

    const usersResult = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const userMap = new Map(usersResult.data?.users.map((u) => [u.id, u]) ?? [])

    const accesses = rows.map((row) => {
      const authUser = userMap.get(row.account_id)
      const email = authUser?.email ?? null
      const meta = authUser?.user_metadata ?? {}
      return {
        account_id: row.account_id,
        role: row.role,
        created_at: row.created_at,
        display_name: buildDisplayName(meta.full_name ?? meta.name ?? null, email),
        email_masked: maskEmail(email),
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
