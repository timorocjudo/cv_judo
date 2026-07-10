'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateAccountType, type AccountType } from '@/lib/accountService'

const VALID_TYPES: AccountType[] = ['manager', 'parent_judoka', 'judoka']

export async function changeAccountType(
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const newType = formData.get('new_type') as AccountType
  if (!VALID_TYPES.includes(newType)) return { error: 'Type invalide.' }

  const result = await updateAccountType(user.id, newType)
  if (!result.success) return { error: result.error }

  // Si upgrade vers parent_judoka depuis manager, rediriger pour créer le profil perso
  if (newType === 'parent_judoka') {
    redirect('/dashboard/nouveau?context=parent_judoka')
  }

  return {}
}
