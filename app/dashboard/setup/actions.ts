'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/slugify'

async function findUniqueSlug(
  supabase: ReturnType<typeof createClient>,
  firstName: string,
  lastName: string
): Promise<string> {
  const base = generateSlug(firstName, lastName)
  let slug = base
  for (let i = 2; i <= 10; i++) {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('slug', slug)
    if (count === 0) return slug
    slug = `${base}-${i}`
  }
  throw new Error('Impossible de générer un slug unique après 10 tentatives.')
}

export async function createProfile(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const firstName = (formData.get('firstName') as string).trim()
  const lastName = (formData.get('lastName') as string).trim()
  if (!firstName || !lastName) return

  // Idempotence : vérifie si un profil existe déjà
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (existing) {
    redirect('/dashboard')
  }

  const slug = await findUniqueSlug(supabase, firstName, lastName)

  await supabase.from('profiles').insert({
    owner_id: user.id,
    slug,
    first_name: firstName,
    last_name: lastName,
    published: false,
    parental_consent: false,
    layout: ['hero', 'bio', 'palmares', 'videos', 'gallery'],
  })

  redirect('/dashboard')
}
