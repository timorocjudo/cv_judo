import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAccount, hasAccount, type AccountType } from '@/lib/accountService'
import { PENDING_ACCOUNT_TYPE_COOKIE } from '@/lib/pendingAccountType'

const VALID_TYPES: AccountType[] = ['manager', 'parent_judoka', 'judoka']

const DESTINATION_BY_TYPE: Record<AccountType, string> = {
  manager: '/dashboard/nouveau?context=manager',
  parent_judoka: '/dashboard/nouveau?context=parent_judoka',
  judoka: '/dashboard/bienvenue',
}

function redirectAndClearPendingType(url: string) {
  const response = NextResponse.redirect(url)
  response.cookies.delete(PENDING_ACCOUNT_TYPE_COOKIE)
  return response
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawType = searchParams.get('type') ?? request.cookies.get(PENDING_ACCOUNT_TYPE_COOKIE)?.value
  const type = rawType && VALID_TYPES.includes(rawType as AccountType) ? (rawType as AccountType) : undefined

  if (!code) {
    return redirectAndClearPendingType(`${origin}/creer-mon-profil?error=missing_code`)
  }

  const supabase = createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return redirectAndClearPendingType(`${origin}/creer-mon-profil?error=auth_failed`)
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return redirectAndClearPendingType(`${origin}/creer-mon-profil?error=auth_failed`)
  }

  if (await hasAccount(user.id)) {
    return redirectAndClearPendingType(`${origin}/dashboard`)
  }

  if (!type) {
    // No account yet and no type was chosen beforehand (e.g. login triggered
    // directly from the landing page) — let them pick one.
    return redirectAndClearPendingType(`${origin}/creer-mon-profil`)
  }

  try {
    await createAccount(user.id, type)
  } catch {
    return redirectAndClearPendingType(`${origin}/creer-mon-profil?type=${type}&error=account_creation_failed`)
  }

  return redirectAndClearPendingType(`${origin}${DESTINATION_BY_TYPE[type]}`)
}
