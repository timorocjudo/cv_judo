'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function saveProfile(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, slug')
    .eq('owner_id', user.id)
    .single()

  if (!profile) redirect('/')

  await supabase
    .from('profiles')
    .update({
      club: formData.get('club') as string || null,
      category: formData.get('category') as string || null,
      grade: formData.get('grade') as string || null,
      bio: formData.get('bio') as string || null,
      profile_photo_url: formData.get('profile_photo_url') as string || null,
      cover_photo_url: formData.get('cover_photo_url') as string || null,
    })
    .eq('id', profile.id)
    .eq('owner_id', user.id)

  revalidatePath('/dashboard/profil')
  revalidatePath(`/${profile.slug}`)
  revalidatePath('/dashboard')
}
