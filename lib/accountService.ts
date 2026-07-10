'use server'

import { createClient } from '@/lib/supabase/server'

export type AccountType = 'manager' | 'parent_judoka' | 'judoka'

export type Account = {
  id: string
  account_type: AccountType
  max_profiles: number
  created_at: string
}

// ── Fonctions pures (testables sans Supabase) ────────────────────────────────

export function maxProfilesForType(type: AccountType): number {
  return type === 'judoka' ? 1 : -1
}

export function canCreateMoreProfiles(maxProfiles: number, ownedCount: number): boolean {
  return maxProfiles === -1 || ownedCount < maxProfiles
}

export function validateTypeChange(
  current: AccountType,
  next: AccountType,
  ownedCount: number
): { allowed: boolean; error?: string } {
  if (current === next) return { allowed: true }

  // Downgrade vers judoka : autorisé seulement si ≤ 1 profil en propriété
  if (next === 'judoka' && ownedCount > 1) {
    return {
      allowed: false,
      error: `Tu possèdes ${ownedCount} profils actifs. Supprime-en ${ownedCount - 1} avant de passer en compte judoka.`,
    }
  }

  // Toutes les autres transitions sont autorisées
  return { allowed: true }
}

// ── Fonctions Supabase ────────────────────────────────────────────────────────

export async function getAccount(userId: string): Promise<Account | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('accounts')
    .select('id, account_type, max_profiles, created_at')
    .eq('id', userId)
    .maybeSingle()
  return data as Account | null
}

export async function hasAccount(userId: string): Promise<boolean> {
  const supabase = createClient()
  const { data } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', userId)
    .maybeSingle()
  return !!data
}

export async function createAccount(userId: string, type: AccountType): Promise<void> {
  const supabase = createClient()
  await supabase.from('accounts').insert({
    id: userId,
    account_type: type,
    max_profiles: maxProfilesForType(type),
  })
}

export async function getOwnedProfileCount(userId: string): Promise<number> {
  const supabase = createClient()
  const { count } = await supabase
    .from('profile_access')
    .select('profile_id', { count: 'exact', head: true })
    .eq('account_id', userId)
    .eq('role', 'owner')
  return count ?? 0
}

export async function updateAccountType(
  userId: string,
  newType: AccountType
): Promise<{ success: boolean; error?: string }> {
  const account = await getAccount(userId)
  if (!account) return { success: false, error: 'Compte introuvable.' }

  const ownedCount = await getOwnedProfileCount(userId)
  const validation = validateTypeChange(account.account_type, newType, ownedCount)
  if (!validation.allowed) return { success: false, error: validation.error }

  const supabase = createClient()
  const { error } = await supabase
    .from('accounts')
    .update({ account_type: newType, max_profiles: maxProfilesForType(newType) })
    .eq('id', userId)

  if (error) return { success: false, error: 'Erreur lors de la mise à jour.' }
  return { success: true }
}
