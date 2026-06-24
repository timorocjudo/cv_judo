'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canEditProfile } from '@/lib/profileAccessService'

type MedalValue = 'gold' | 'silver' | 'bronze' | null

function deriveFromPosition(position: number): { medal: MedalValue; result: string } {
  if (position === 1) return { medal: 'gold', result: "1re place — Médaille d'or" }
  if (position === 2) return { medal: 'silver', result: "2e place — Médaille d'argent" }
  if (position === 3) return { medal: 'bronze', result: '3e place — Médaille de bronze' }
  return { medal: null, result: `${position}e place` }
}

async function getSlug(supabase: ReturnType<typeof createClient>, profileId: string) {
  const { data } = await supabase.from('profiles').select('slug').eq('id', profileId).single()
  return data?.slug ?? null
}

export async function addPalmares(formData: FormData): Promise<{ ok: true; id: string } | { ok: false }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const profileId = formData.get('profileId') as string
    if (!(await canEditProfile(profileId, user.id))) redirect('/dashboard')

    const position = Number(formData.get('position'))
    const { medal, result } = deriveFromPosition(position)

    const { data: inserted, error: insertError } = await supabase
      .from('palmares')
      .insert({
        profile_id: profileId,
        date: (formData.get('date') as string) || null,
        competition: (formData.get('competition') as string) || null,
        city: (formData.get('city') as string) || null,
        category: (formData.get('category') as string) || null,
        level: (formData.get('level') as string) || null,
        position,
        medal,
        result,
      })
      .select('id')
      .single()

    if (insertError || !inserted) return { ok: false }

    const slug = await getSlug(supabase, profileId)
    revalidatePath(`/dashboard/${profileId}/palmares`)
    if (slug) revalidatePath(`/${slug}`)
    return { ok: true, id: inserted.id }
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
    return { ok: false }
  }
}

export async function updatePalmares(formData: FormData): Promise<{ ok: boolean }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const profileId = formData.get('profileId') as string
    if (!(await canEditProfile(profileId, user.id))) return { ok: false }

    const id = formData.get('id') as string
    const position = Number(formData.get('position'))
    const { medal, result } = deriveFromPosition(position)

    await supabase
      .from('palmares')
      .update({
        date: (formData.get('date') as string) || null,
        competition: (formData.get('competition') as string) || null,
        city: (formData.get('city') as string) || null,
        category: (formData.get('category') as string) || null,
        level: (formData.get('level') as string) || null,
        position,
        medal,
        result,
      })
      .eq('id', id)
      .eq('profile_id', profileId)

    const slug = await getSlug(supabase, profileId)
    revalidatePath(`/dashboard/${profileId}/palmares`)
    if (slug) revalidatePath(`/${slug}`)
    return { ok: true }
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
    return { ok: false }
  }
}

export async function deletePalmares(id: string, profileId: string): Promise<{ ok: boolean }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    if (!(await canEditProfile(profileId, user.id))) return { ok: false }

    await supabase.from('palmares').delete().eq('id', id).eq('profile_id', profileId)

    const slug = await getSlug(supabase, profileId)
    revalidatePath(`/dashboard/${profileId}/palmares`)
    if (slug) revalidatePath(`/${slug}`)
    return { ok: true }
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
    return { ok: false }
  }
}
