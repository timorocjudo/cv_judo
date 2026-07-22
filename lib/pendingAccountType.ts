import type { AccountType } from '@/lib/accountService'

// Persists the account type chosen on /creer-mon-profil across the OAuth
// round-trip. Query params on redirectTo aren't reliable here: if Supabase's
// Redirect URLs allow-list doesn't match our enriched callback URL, it falls
// back to the Site URL (losing the query string) instead of erroring — a
// cookie survives that fallback since it isn't tied to the final URL at all.
export const PENDING_ACCOUNT_TYPE_COOKIE = 'pending_account_type'

export function setPendingAccountTypeCookie(type: AccountType) {
  document.cookie = `${PENDING_ACCOUNT_TYPE_COOKIE}=${type}; path=/; max-age=600; SameSite=Lax`
}

export function readPendingAccountTypeCookie(): AccountType | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${PENDING_ACCOUNT_TYPE_COOKIE}=([^;]*)`))
  return (match?.[1] as AccountType | undefined) ?? null
}

export function clearPendingAccountTypeCookie() {
  document.cookie = `${PENDING_ACCOUNT_TYPE_COOKIE}=; path=/; max-age=0`
}
