'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { saveAccountType } from '@/app/creer-mon-profil/actions'
import { readPendingAccountTypeCookie, clearPendingAccountTypeCookie } from '@/lib/pendingAccountType'

// Safety net for the landing page: if Supabase's Redirect URLs allow-list
// rejects our enriched /auth/callback?type=... redirectTo, it silently falls
// back to the Site URL instead of erroring — the browser client's
// detectSessionInUrl still completes the login right here on '/', bypassing
// /auth/callback (and the account-creation logic it holds) entirely. If a
// pending account type is waiting in a cookie, finish onboarding ourselves.
export default function PendingAccountTypeHandler() {
  const handledRef = useRef(false)

  useEffect(() => {
    const pendingType = readPendingAccountTypeCookie()
    if (!pendingType) return

    const supabase = createClient()

    async function finishOnboarding() {
      if (handledRef.current) return
      handledRef.current = true
      clearPendingAccountTypeCookie()

      const formData = new FormData()
      formData.set('account_type', pendingType!)
      await saveAccountType(formData)
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) finishOnboarding()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        finishOnboarding()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return null
}
