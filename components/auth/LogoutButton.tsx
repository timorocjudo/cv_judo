'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <button
      onClick={handleLogout}
      className="bg-surface-container text-on-surface px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-outline-variant transition-colors active:scale-95"
    >
      Se déconnecter
    </button>
  )
}
