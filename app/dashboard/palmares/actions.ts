'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type MedalValue = 'gold' | 'silver' | 'bronze' | null

function deriveFromPosition(position: number): { medal: MedalValue; result: string } {
  if (position === 1) return { medal: 'gold', result: "1re place — Médaille d'or" }
  if (position === 2) return { medal: 'silver', result: "2e place — Médaille d'argent" }
  if (position === 3) return { medal: 'bronze', result: '3e place — Médaille de bronze' }
  return { medal: null, result: `${position}e place` }
}

async function getProfile(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('id, slug')
    .eq('owner_id', userId)
    .single()
  return data ?? null
}

export async function addPalmares(formData: FormData): Promise<{ ok: true; id: string } | { ok: false }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const profile = await getProfile(supabase, user.id)
    if (!profile) redirect('/')

    const position = Number(formData.get('position'))
    const { medal, result } = deriveFromPosition(position)

    const { data: inserted, error: insertError } = await supabase
      .from('palmares')
      .insert({
        profile_id: profile.id,
        date: formData.get('date') as string || null,
        competition: formData.get('competition') as string || null,
        city: formData.get('city') as string || null,
        category: formData.get('category') as string || null,
        level: formData.get('level') as string || null,
        position,
        medal,
        result,
      })
      .select('id')
      .single()

    if (insertError || !inserted) return { ok: false }

    revalidatePath('/dashboard/palmares')
    revalidatePath(`/${profile.slug}`)
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

    const profile = await getProfile(supabase, user.id)
    if (!profile) return { ok: false }

    const id = formData.get('id') as string
    const position = Number(formData.get('position'))
    const { medal, result } = deriveFromPosition(position)

    await supabase
      .from('palmares')
      .update({
        date: formData.get('date') as string || null,
        competition: formData.get('competition') as string || null,
        city: formData.get('city') as string || null,
        category: formData.get('category') as string || null,
        level: formData.get('level') as string || null,
        position,
        medal,
        result,
      })
      .eq('id', id)
      .eq('profile_id', profile.id)

    revalidatePath('/dashboard/palmares')
    revalidatePath(`/${profile.slug}`)
    return { ok: true }
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
    return { ok: false }
  }
}

export async function deletePalmares(id: string): Promise<{ ok: boolean }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const profile = await getProfile(supabase, user.id)

    await supabase.from('palmares').delete().eq('id', id)

    revalidatePath('/dashboard/palmares')
    if (profile) revalidatePath(`/${profile.slug}`)
    return { ok: true }
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
    return { ok: false }
  }
}
