'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAccount, type AccountType } from '@/lib/accountService'

const VALID_TYPES: AccountType[] = ['manager', 'parent_judoka', 'judoka']

export async function saveAccountType(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const type = formData.get('account_type') as AccountType
  if (!VALID_TYPES.includes(type)) return

  await createAccount(user.id, type)

  redirect(`/dashboard/nouveau?context=${type}`)
}
