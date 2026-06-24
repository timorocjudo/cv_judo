'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canEditProfile } from '@/lib/profileAccessService'

export async function addPhoto(
  url: string,
  caption: string,
  profileId: string
): Promise<{ ok: boolean }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    if (!(await canEditProfile(profileId, user.id))) return { ok: false }

    await supabase.from('gallery_photos').insert({
      profile_id: profileId,
      photo_url: url,
      caption: caption || null,
    })

    revalidatePath(`/dashboard/${profileId}/galerie`)
    return { ok: true }
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
    return { ok: false }
  }
}

export async function deletePhoto(id: string, profileId: string): Promise<{ ok: boolean }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    if (!(await canEditProfile(profileId, user.id))) return { ok: false }

    await supabase
      .from('gallery_photos')
      .delete()
      .eq('id', id)
      .eq('profile_id', profileId)

    revalidatePath(`/dashboard/${profileId}/galerie`)
    return { ok: true }
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
    return { ok: false }
  }
}
