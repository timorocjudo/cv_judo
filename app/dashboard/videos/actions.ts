'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const YOUTUBE_RE =
  /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=[\w-]+|youtu\.be\/[\w-]+|youtube\.com\/shorts\/[\w-]+)/

async function getProfileId(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', userId)
    .single()
  return data?.id ?? null
}

export type VideoState = { ok: boolean | null; error: string | null }

export async function addVideo(
  _state: VideoState,
  formData: FormData
): Promise<VideoState> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const profileId = await getProfileId(supabase, user.id)
    if (!profileId) redirect('/')

    const youtubeUrl = (formData.get('youtube_url') as string).trim()
    if (!YOUTUBE_RE.test(youtubeUrl)) {
      return { ok: false, error: 'Lien YouTube invalide. Utilise un lien youtube.com/watch?v=… ou youtu.be/…' }
    }

    await supabase.from('videos').insert({
      profile_id: profileId,
      title: formData.get('title') as string || null,
      youtube_url: youtubeUrl,
      description: formData.get('description') as string || null,
    })

    revalidatePath('/dashboard/videos')
    return { ok: true, error: null }
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
    return { ok: false, error: 'Une erreur est survenue, réessaie' }
  }
}

export async function deleteVideo(id: string): Promise<{ ok: boolean }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const profileId = await getProfileId(supabase, user.id)
    if (!profileId) return { ok: false }

    await supabase
      .from('videos')
      .delete()
      .eq('id', id)
      .eq('profile_id', profileId)

    revalidatePath('/dashboard/videos')
    return { ok: true }
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
    return { ok: false }
  }
}
