'use server'

import { createClient } from '@/lib/supabase/server'
import { getJudokaBySlug } from '@/lib/judokaService'
import type { JudokaData } from '@/types/judoka'

export type ProfileRole = 'owner' | 'manager' | 'viewer'

export type ProfileWithRole = {
  id: string
  slug: string
  first_name: string
  last_name: string
  club: string | null
  profile_photo_url: string | null
  visibility: 'draft' | 'private' | 'public'
  role: ProfileRole
  created_at: string
}

export async function getProfilesForAccount(accountId: string): Promise<ProfileWithRole[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profile_access')
    .select(`
      role,
      profiles!inner (
        id, slug, first_name, last_name, club, profile_photo_url, visibility, created_at
      )
    `)
    .eq('account_id', accountId)
    .in('role', ['owner', 'manager'])

  if (error || !data) return []

  return (data as unknown as Array<{ role: ProfileRole; profiles: Omit<ProfileWithRole, 'role'> }>)
    .map((row) => ({ ...row.profiles, role: row.role }))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

// RLS handles visibility filtering — if the profile is returned, the user has access.
// For draft profiles, only owner/manager can see them (enforced by RLS policy).
export async function getAccessibleProfile(
  slug: string,
  accountId?: string | null
): Promise<JudokaData | null> {
  // accountId is informational only here; the Supabase server client uses
  // the session cookie to apply RLS automatically.
  void accountId
  return getJudokaBySlug(slug, { allowDraft: true })
}

export async function canEditProfile(profileId: string, accountId: string): Promise<boolean> {
  const supabase = createClient()
  const { data } = await supabase
    .from('profile_access')
    .select('id')
    .eq('profile_id', profileId)
    .eq('account_id', accountId)
    .in('role', ['owner', 'manager'])
    .maybeSingle()
  return !!data
}

export async function isProfileOwner(profileId: string, accountId: string): Promise<boolean> {
  const supabase = createClient()
  const { data } = await supabase
    .from('profile_access')
    .select('id')
    .eq('profile_id', profileId)
    .eq('account_id', accountId)
    .eq('role', 'owner')
    .maybeSingle()
  return !!data
}

export type ProfileAccessEntry = {
  id: string
  account_id: string
  role: ProfileRole
  invited_by: string | null
  created_at: string
}

export async function getProfileAccesses(profileId: string): Promise<ProfileAccessEntry[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profile_access')
    .select('id, account_id, role, invited_by, created_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return data as ProfileAccessEntry[]
}

export async function addProfileAccess(
  profileId: string,
  targetAccountId: string,
  role: 'manager' | 'viewer',
  requestingAccountId: string
): Promise<{ success: boolean; message: string }> {
  const ownerCheck = await isProfileOwner(profileId, requestingAccountId)
  if (!ownerCheck) return { success: false, message: 'Accès refusé.' }

  if (targetAccountId === requestingAccountId) {
    return { success: false, message: "Tu ne peux pas t'ajouter toi-même." }
  }

  const supabase = createClient()
  const { data: existing } = await supabase
    .from('profile_access')
    .select('id')
    .eq('profile_id', profileId)
    .eq('account_id', targetAccountId)
    .maybeSingle()

  if (existing) return { success: false, message: 'Aucun compte IpponId associé à cet email.' }

  const { error } = await supabase
    .from('profile_access')
    .insert({ profile_id: profileId, account_id: targetAccountId, role, invited_by: requestingAccountId })

  if (error) return { success: false, message: 'Une erreur est survenue.' }

  return { success: true, message: 'Accès ajouté.' }
}

export async function removeProfileAccess(
  profileId: string,
  targetAccountId: string,
  requestingAccountId: string
): Promise<{ success: boolean; message: string }> {
  const ownerCheck = await isProfileOwner(profileId, requestingAccountId)
  if (!ownerCheck) return { success: false, message: 'Accès refusé.' }

  const supabase = createClient()
  const { data: target } = await supabase
    .from('profile_access')
    .select('id, role')
    .eq('profile_id', profileId)
    .eq('account_id', targetAccountId)
    .maybeSingle()

  if (!target) return { success: false, message: 'Accès introuvable.' }
  if (target.role === 'owner') return { success: false, message: 'Impossible de retirer le propriétaire du profil.' }

  const { error } = await supabase
    .from('profile_access')
    .delete()
    .eq('profile_id', profileId)
    .eq('account_id', targetAccountId)

  if (error) return { success: false, message: 'Une erreur est survenue.' }

  return { success: true, message: 'Accès retiré.' }
}
