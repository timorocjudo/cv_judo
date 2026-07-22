'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAccount, hasAccount, type AccountType } from '@/lib/accountService'

const VALID_TYPES: AccountType[] = ['manager', 'parent_judoka', 'judoka']

const DESTINATION_BY_TYPE: Record<AccountType, string> = {
  manager: '/dashboard/nouveau?context=manager',
  parent_judoka: '/dashboard/nouveau?context=parent_judoka',
  judoka: '/dashboard/bienvenue',
}

export async function saveAccountType(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/creer-mon-profil?error=session_expired')

  const type = formData.get('account_type') as AccountType
  if (!VALID_TYPES.includes(type)) {
    redirect('/creer-mon-profil?error=invalid_type')
  }

  // Si le compte existe déjà (double-soumission), aller directement au dashboard
  const existing = await hasAccount(user.id)
  if (existing) {
    redirect('/dashboard')
  }

  try {
    await createAccount(user.id, type)
  } catch {
    redirect(`/creer-mon-profil?type=${type}&error=account_creation_failed`)
  }

  redirect(DESTINATION_BY_TYPE[type])
}
