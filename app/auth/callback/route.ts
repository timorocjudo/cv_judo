import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAccount, hasAccount, type AccountType } from '@/lib/accountService'

const VALID_TYPES: AccountType[] = ['manager', 'parent_judoka', 'judoka']

const DESTINATION_BY_TYPE: Record<AccountType, string> = {
  manager: '/dashboard/nouveau?context=manager',
  parent_judoka: '/dashboard/nouveau?context=parent_judoka',
  judoka: '/dashboard/bienvenue',
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawType = searchParams.get('type')
  const type = rawType && VALID_TYPES.includes(rawType as AccountType) ? (rawType as AccountType) : undefined

  if (!code) {
    return NextResponse.redirect(`${origin}/creer-mon-profil?error=missing_code`)
  }

  const supabase = createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/creer-mon-profil?error=auth_failed`)
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/creer-mon-profil?error=auth_failed`)
  }

  if (await hasAccount(user.id)) {
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  if (!type) {
    // No account yet and no type was chosen beforehand (e.g. login triggered
    // directly from the landing page) — let them pick one.
    return NextResponse.redirect(`${origin}/creer-mon-profil`)
  }

  try {
    await createAccount(user.id, type)
  } catch {
    return NextResponse.redirect(`${origin}/creer-mon-profil?type=${type}&error=account_creation_failed`)
  }

  return NextResponse.redirect(`${origin}${DESTINATION_BY_TYPE[type]}`)
}
