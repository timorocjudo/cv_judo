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

async function getProfileId(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', userId)
    .single()
  return data?.id ?? null
}

export async function addPalmares(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const profileId = await getProfileId(supabase, user.id)
  if (!profileId) redirect('/')

  const position = Number(formData.get('position'))
  const { medal, result } = deriveFromPosition(position)

  await supabase.from('palmares').insert({
    profile_id: profileId,
    date: formData.get('date') as string || null,
    competition: formData.get('competition') as string || null,
    city: formData.get('city') as string || null,
    category: formData.get('category') as string || null,
    level: formData.get('level') as string || null,
    position,
    medal,
    result,
  })

  revalidatePath('/dashboard/palmares')
}

export async function updatePalmares(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const profileId = await getProfileId(supabase, user.id)
  if (!profileId) return

  const id = formData.get('id') as string
  const position = Number(formData.get('position'))
  const { medal, result } = deriveFromPosition(position)

  // RLS vérifie ownership via join profiles
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
    .eq('profile_id', profileId)

  revalidatePath('/dashboard/palmares')
}

export async function deletePalmares(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // RLS s'assure que seul le propriétaire peut supprimer
  await supabase.from('palmares').delete().eq('id', id)

  revalidatePath('/dashboard/palmares')
}
