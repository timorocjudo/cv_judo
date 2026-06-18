'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function togglePublished(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const profileId = formData.get('profileId') as string
  const slug = formData.get('slug') as string
  const next = formData.get('next') === 'true'

  await supabase
    .from('profiles')
    .update({ published: next })
    .eq('id', profileId)
    .eq('owner_id', user.id)

  revalidatePath('/dashboard')
  revalidatePath(`/${slug}`)
  revalidatePath('/', 'layout')
}
