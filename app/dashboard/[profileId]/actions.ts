'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isProfileOwner } from '@/lib/profileAccessService'
import { getMissingFieldsForPublishing } from '@/lib/profileValidation'

export type SetVisibilityResult = {
  ok: boolean | null
  missing: string[]
}

export async function setVisibility(
  _prevState: SetVisibilityResult,
  formData: FormData
): Promise<SetVisibilityResult> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const profileId = formData.get('profileId') as string
    const visibility = formData.get('visibility') as 'draft' | 'private' | 'public'

    if (!['draft', 'private', 'public'].includes(visibility)) {
      return { ok: false, missing: [] }
    }

    const owner = await isProfileOwner(profileId, user.id)
    if (!owner) return { ok: false, missing: [] }

    if (visibility !== 'draft') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('club, category, grade, bio, profile_photo_url, birth_date')
        .eq('id', profileId)
        .single()

      if (!profile) return { ok: false, missing: [] }

      const missing = getMissingFieldsForPublishing(profile)
      if (missing.length > 0) return { ok: false, missing }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('slug')
      .eq('id', profileId)
      .single()

    await supabase
      .from('profiles')
      .update({ visibility, published: visibility === 'public' })
      .eq('id', profileId)

    revalidatePath(`/dashboard/${profileId}`)
    if (profile) revalidatePath(`/${profile.slug}`)
    revalidatePath('/', 'layout')
    return { ok: true, missing: [] }
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
    return { ok: false, missing: [] }
  }
}
