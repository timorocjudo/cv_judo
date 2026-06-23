import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function getEnv(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Variable d'environnement manquante pour les tests : ${key}`)
  return value
}

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321'
}

const CLIENT_OPTIONS = {
  auth: { autoRefreshToken: false, persistSession: false },
}

export function createAnonClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'), CLIENT_OPTIONS)
}

export function createAdminSetupClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), getEnv('SUPABASE_SERVICE_ROLE_KEY'), CLIENT_OPTIONS)
}

export async function createAuthenticatedClient(
  email: string,
  password: string
): Promise<SupabaseClient> {
  const client = createClient(getSupabaseUrl(), getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'), CLIENT_OPTIONS)
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Impossible de connecter ${email} : ${error.message}`)
  return client
}

export async function createTestUser(
  admin: SupabaseClient,
  email: string,
  password: string
): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw new Error(`Impossible de créer l'utilisateur de test ${email} : ${error.message}`)
  return data.user.id
}

export async function deleteTestUser(admin: SupabaseClient, userId: string): Promise<void> {
  await admin.auth.admin.deleteUser(userId)
}
