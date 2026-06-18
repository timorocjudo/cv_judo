'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function addPhoto(url: string, caption: string, profileId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  await supabase.from('gallery_photos').insert({
    profile_id: profileId,
    photo_url: url,
    caption: caption || null,
  })

  revalidatePath('/dashboard/galerie')
}

export async function deletePhoto(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!profile) return

  // L'objet Storage n'est pas supprimé (v1) — seule la ligne DB est retirée
  await supabase
    .from('gallery_photos')
    .delete()
    .eq('id', id)
    .eq('profile_id', profile.id)

  revalidatePath('/dashboard/galerie')
}
