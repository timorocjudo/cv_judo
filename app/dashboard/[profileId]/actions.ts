'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

export async function removeFromManagement(formData: FormData): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const profileId = formData.get('profileId') as string

  const { data: access } = await supabase
    .from('profile_access')
    .select('role')
    .eq('profile_id', profileId)
    .eq('account_id', user.id)
    .maybeSingle()

  // Garde : ne pas supprimer si owner ou si pas d'accès
  if (!access || access.role === 'owner') return

  const { error: deleteError } = await supabase
    .from('profile_access')
    .delete()
    .eq('profile_id', profileId)
    .eq('account_id', user.id)

  if (deleteError) {
    console.error('[removeFromManagement] Delete failed:', deleteError.message)
    return
  }

  redirect('/dashboard')
}

export async function deleteProfile(formData: FormData): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const profileId = formData.get('profileId') as string
  const confirmedName = (formData.get('confirmedName') as string | null)?.trim() ?? ''

  const owner = await isProfileOwner(profileId, user.id)
  if (!owner) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, profile_photo_url, cover_photo_url')
    .eq('id', profileId)
    .single()

  if (!confirmedName) return

  if (!profile || confirmedName !== profile.first_name) return

  // Récupérer les URLs des photos de galerie avant suppression cascade
  const { data: galleryPhotos } = await supabase
    .from('gallery_photos')
    .select('photo_url')
    .eq('profile_id', profileId)

  // Extraire les chemins Storage depuis les URLs publiques Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const storagePrefix = `${supabaseUrl}/storage/v1/object/public/media/`
  const rawUrls: (string | null)[] = [
    profile.profile_photo_url,
    profile.cover_photo_url,
    ...(galleryPhotos ?? []).map((g) => g.photo_url),
  ]
  const storagePaths = rawUrls
    .filter((url): url is string => !!url && url.startsWith(storagePrefix))
    .map((url) => url.slice(storagePrefix.length))

  if (storagePaths.length > 0) {
    const adminClient = createAdminClient()
    const { error: storageError } = await adminClient.storage.from('media').remove(storagePaths)
    if (storageError) console.error('[deleteProfile] Storage cleanup failed:', storageError.message)
  }

  const { error: profileDeleteError } = await supabase.from('profiles').delete().eq('id', profileId)

  if (profileDeleteError) {
    console.error('[deleteProfile] Profile delete failed:', profileDeleteError.message)
    return
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
