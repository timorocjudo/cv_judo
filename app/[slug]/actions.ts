'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getMissingFieldsForPublishing } from '@/lib/profileValidation'
import { isProfileOwner } from '@/lib/profileAccessService'

export async function switchToPrivate(formData: FormData): Promise<void> {
  const slug = formData.get('slug') as string
  if (!slug) return

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, club, category, grade, bio, profile_photo_url, birth_date')
    .eq('slug', slug)
    .maybeSingle()

  if (!profile) return

  const ownerCheck = await isProfileOwner(profile.id, user.id)
  if (!ownerCheck) return

  const missing = getMissingFieldsForPublishing(profile)
  if (missing.length > 0) return

  await supabase
    .from('profiles')
    .update({ visibility: 'private', published: false })
    .eq('id', profile.id)

  revalidatePath(`/${slug}`)
  revalidatePath(`/dashboard/${profile.id}`)
  revalidatePath('/', 'layout')
}
