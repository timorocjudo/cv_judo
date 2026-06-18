'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function saveProfile(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, slug, first_name, last_name')
    .eq('owner_id', user.id)
    .single()

  if (!profile) redirect('/')

  await supabase
    .from('profiles')
    .update({
      first_name: formData.get('first_name') as string || profile.first_name,
      last_name: formData.get('last_name') as string || profile.last_name,
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

export async function deleteAccount() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const uid = user.id
  const adminClient = createAdminClient()

  // Supprimer tous les fichiers du bucket "media" pour cet utilisateur
  const { data: files, error: listError } = await adminClient.storage.from('media').list(uid)
  if (listError) throw new Error(`Échec liste fichiers : ${listError.message}`)
  if (files && files.length > 0) {
    const paths = files.map((f) => `${uid}/${f.name}`)
    const { error: removeError } = await adminClient.storage.from('media').remove(paths)
    if (removeError) throw new Error(`Échec suppression fichiers : ${removeError.message}`)
  }

  // Supprimer l'utilisateur — la cascade supprime profiles, palmares, videos, gallery_photos
  const { error } = await adminClient.auth.admin.deleteUser(uid)
  if (error) throw new Error(`Échec suppression compte : ${error.message}`)

  // Effacer les cookies de session localement (l'utilisateur n'existe plus côté serveur)
  await supabase.auth.signOut({ scope: 'local' })

  redirect('/')
}
