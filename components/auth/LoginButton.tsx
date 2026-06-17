'use client'
import { createClient } from '@/lib/supabase/client'

export default function LoginButton() {
  async function handleLogin() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <button
      onClick={handleLogin}
      className="bg-primary text-on-primary px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors active:scale-95"
    >
      Se connecter avec Google
    </button>
  )
}
