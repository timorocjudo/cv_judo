'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canEditProfile } from '@/lib/profileAccessService'
import { generateCompetitionSlug, resolveUniqueCompetitionSlug } from '@/lib/slugify'
import type { CompetitionPhoto } from '@/lib/competitionService'

type MedalValue = 'gold' | 'silver' | 'bronze' | null

function deriveFromPosition(position: number): { medal: MedalValue; result: string } {
  if (position === 1) return { medal: 'gold', result: "1re place — Médaille d'or" }
  if (position === 2) return { medal: 'silver', result: "2e place — Médaille d'argent" }
  if (position === 3) return { medal: 'bronze', result: '3e place — Médaille de bronze' }
  return { medal: null, result: `${position}e place` }
}

async function getSlug(supabase: ReturnType<typeof createClient>, profileId: string) {
  const { data } = await supabase.from('profiles').select('slug').eq('id', profileId).single()
  return data?.slug ?? null
}

async function buildCompetitionSlug(
  supabase: ReturnType<typeof createClient>,
  profileId: string,
  competition: string,
  date: string,
  excludeId?: string
): Promise<string | null> {
  if (!competition || !date) return null
  const base = generateCompetitionSlug(competition, date)
  // Must use let + reassign: each Supabase chain method returns a new builder
  let queryBuilder = supabase
    .from('palmares')
    .select('competition_slug')
    .eq('profile_id', profileId)
    .not('competition_slug', 'is', null)
  if (excludeId) {
    queryBuilder = queryBuilder.neq('id', excludeId)
  }
  const { data: existing } = await queryBuilder
  const taken = (existing ?? [])
    .map((r: { competition_slug: string | null }) => r.competition_slug)
    .filter(Boolean) as string[]
  return resolveUniqueCompetitionSlug(base, taken)
}

export async function addPalmares(formData: FormData): Promise<{ ok: true; id: string } | { ok: false }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const profileId = formData.get('profileId') as string
    if (!(await canEditProfile(profileId, user.id))) redirect('/dashboard')

    const position = Number(formData.get('position'))
    const { medal, result } = deriveFromPosition(position)

    const competition = (formData.get('competition') as string) || null
    const date = (formData.get('date') as string) || null
    const competitionSlug = competition && date
      ? await buildCompetitionSlug(supabase, profileId, competition, date)
      : null

    const { data: inserted, error: insertError } = await supabase
      .from('palmares')
      .insert({
        profile_id: profileId,
        date: date,
        competition: competition,
        city: (formData.get('city') as string) || null,
        category: (formData.get('category') as string) || null,
        level: (formData.get('level') as string) || null,
        position,
        medal,
        result,
        competition_slug: competitionSlug,
      })
      .select('id')
      .single()

    if (insertError || !inserted) return { ok: false }

    const slug = await getSlug(supabase, profileId)
    revalidatePath(`/dashboard/${profileId}/palmares`)
    if (slug) revalidatePath(`/${slug}`)
    return { ok: true, id: inserted.id }
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
    return { ok: false }
  }
}

export async function updatePalmares(formData: FormData): Promise<{ ok: boolean }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const profileId = formData.get('profileId') as string
    if (!(await canEditProfile(profileId, user.id))) return { ok: false }

    const id = formData.get('id') as string
    const competition = (formData.get('competition') as string) || null
    const date = (formData.get('date') as string) || null
    const position = Number(formData.get('position'))
    const { medal, result } = deriveFromPosition(position)
    const competitionSlug = competition && date
      ? await buildCompetitionSlug(supabase, profileId, competition, date, id)
      : null

    await supabase
      .from('palmares')
      .update({
        date,
        competition,
        city: (formData.get('city') as string) || null,
        category: (formData.get('category') as string) || null,
        level: (formData.get('level') as string) || null,
        position,
        medal,
        result,
        competition_slug: competitionSlug,
      })
      .eq('id', id)
      .eq('profile_id', profileId)

    const slug = await getSlug(supabase, profileId)
    revalidatePath(`/dashboard/${profileId}/palmares`)
    if (slug) revalidatePath(`/${slug}`)
    return { ok: true }
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
    return { ok: false }
  }
}

export async function deletePalmares(id: string, profileId: string): Promise<{ ok: boolean }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    if (!(await canEditProfile(profileId, user.id))) return { ok: false }

    await supabase.from('palmares').delete().eq('id', id).eq('profile_id', profileId)

    const slug = await getSlug(supabase, profileId)
    revalidatePath(`/dashboard/${profileId}/palmares`)
    if (slug) revalidatePath(`/${slug}`)
    return { ok: true }
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
    return { ok: false }
  }
}

// ─── Competition photo actions ────────────────────────────────────────────────

export async function fetchCompetitionPhotos(
  palmaresId: string
): Promise<CompetitionPhoto[]> {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('competition_photos')
      .select('id, photo_url, caption, position')
      .eq('palmares_id', palmaresId)
      .order('position', { ascending: true })
    return (data ?? []) as CompetitionPhoto[]
  } catch {
    return []
  }
}

export async function addCompetitionPhoto(
  palmaresId: string,
  profileId: string,
  photoUrl: string,
  position: number
): Promise<{ ok: boolean; photo?: CompetitionPhoto }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false }
    if (!(await canEditProfile(profileId, user.id))) return { ok: false }

    const { data, error } = await supabase
      .from('competition_photos')
      .insert({ palmares_id: palmaresId, profile_id: profileId, photo_url: photoUrl, position })
      .select('id, photo_url, caption, position')
      .single()

    if (error || !data) return { ok: false }
    return { ok: true, photo: data as CompetitionPhoto }
  } catch {
    return { ok: false }
  }
}

export async function deleteCompetitionPhoto(
  photoId: string,
  photoUrl: string
): Promise<{ ok: boolean }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false }

    const { error } = await supabase
      .from('competition_photos')
      .delete()
      .eq('id', photoId)

    if (error) return { ok: false }

    // Remove from Storage — extract path after /media/
    try {
      const url = new URL(photoUrl)
      const marker = '/object/public/media/'
      const idx = url.pathname.indexOf(marker)
      if (idx !== -1) {
        const storagePath = url.pathname.slice(idx + marker.length)
        await supabase.storage.from('media').remove([storagePath])
      }
    } catch {
      // Storage removal failure is non-fatal — DB row is already deleted
    }

    return { ok: true }
  } catch {
    return { ok: false }
  }
}

export async function updateCompetitionPhotoCaption(
  photoId: string,
  caption: string
): Promise<{ ok: boolean }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false }

    const { error } = await supabase
      .from('competition_photos')
      .update({ caption: caption || null })
      .eq('id', photoId)
    return { ok: !error }
  } catch {
    return { ok: false }
  }
}

export async function reorderCompetitionPhotos(
  orderedIds: string[]
): Promise<{ ok: boolean }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false }

    const results = await Promise.all(
      orderedIds.map((id, i) =>
        supabase.from('competition_photos').update({ position: i }).eq('id', id)
      )
    )
    if (results.some(r => r.error)) return { ok: false }
    return { ok: true }
  } catch {
    return { ok: false }
  }
}
