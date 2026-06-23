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
