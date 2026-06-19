'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMissingFieldsForPublishing } from '@/lib/profileValidation'

export type ToggleResult = {
  ok: boolean | null
  missing: string[]
  unpublished: boolean
}

export async function togglePublished(
  _prevState: ToggleResult,
  formData: FormData
): Promise<ToggleResult> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const profileId = formData.get('profileId') as string
    const slug = formData.get('slug') as string
    const next = formData.get('next') === 'true'

    if (next) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('club, category, grade, bio, profile_photo_url, birth_date')
        .eq('id', profileId)
        .eq('owner_id', user.id)
        .single()

      if (!profile) redirect('/')

      const missing = getMissingFieldsForPublishing(profile)
      if (missing.length > 0) {
        return { ok: false, missing, unpublished: false }
      }
    }

    await supabase
      .from('profiles')
      .update({ published: next })
      .eq('id', profileId)
      .eq('owner_id', user.id)

    revalidatePath('/dashboard')
    revalidatePath(`/${slug}`)
    revalidatePath('/', 'layout')
    return { ok: true, missing: [], unpublished: !next }
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
    return { ok: false, missing: [], unpublished: false }
  }
}
