import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hasAccount, type AccountType } from '@/lib/accountService'
import AccountTypeSelector from '@/components/onboarding/AccountTypeSelector'
import LogoLink from '@/components/layout/LogoLink'
import HeroZone from '@/components/landing/HeroZone'

export const metadata: Metadata = { title: 'Créer mon compte — IpponId' }

const VALID_TYPES: AccountType[] = ['manager', 'parent_judoka', 'judoka']

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "La connexion avec Google a échoué. Réessaie.",
  auth_failed: "La connexion avec Google a échoué. Réessaie.",
  invalid_type: 'Choisis un profil avant de continuer.',
  account_creation_failed: "La création de ton compte a échoué. Réessaie, et si le problème persiste, contacte-nous.",
  session_expired: 'Ta session a expiré. Reconnecte-toi pour continuer.',
}

export default async function CreerMonProfilPage({
  searchParams,
}: {
  searchParams: { type?: string; error?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const accountExists = await hasAccount(user.id)
    if (accountExists) redirect('/dashboard')
  }

  const rawType = searchParams.type as AccountType | undefined
  const defaultType = rawType && VALID_TYPES.includes(rawType) ? rawType : undefined
  const errorMessage = searchParams.error ? ERROR_MESSAGES[searchParams.error] : undefined

  return (
    <>
      <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur-sm border-b border-outline-variant px-margin-mobile md:px-margin-desktop h-16 flex items-center">
        <LogoLink />
      </header>
      <HeroZone
        title="Crée ton profil IpponId"
        subtitle="Choisis le profil qui te correspond pour commencer"
        showWordmark={false}
        minHeightClassName="min-h-[35vh] md:min-h-[40vh]"
        cta={null}
      />
      <main className="flex flex-col items-center px-margin-mobile py-12 md:py-16">
        <div className="w-full max-w-3xl">
          {errorMessage && (
            <div className="mb-6 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm font-medium text-error">
              {errorMessage}
            </div>
          )}
          <AccountTypeSelector defaultType={defaultType} isAuthenticated={!!user} />
        </div>
      </main>
    </>
  )
}
