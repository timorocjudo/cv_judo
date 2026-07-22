import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hasAccount, type AccountType } from '@/lib/accountService'
import AccountTypeSelector from '@/components/onboarding/AccountTypeSelector'
import LogoLink from '@/components/layout/LogoLink'

export const metadata: Metadata = { title: 'Créer mon compte — IpponId' }

const VALID_TYPES: AccountType[] = ['manager', 'parent_judoka', 'judoka']

export default async function CreerMonProfilPage({
  searchParams,
}: {
  searchParams: { type?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const accountExists = await hasAccount(user.id)
    if (accountExists) redirect('/dashboard')
  }

  const rawType = searchParams.type as AccountType | undefined
  const defaultType = rawType && VALID_TYPES.includes(rawType) ? rawType : undefined

  return (
    <>
      <header className="px-margin-mobile md:px-margin-desktop h-16 flex items-center">
        <LogoLink />
      </header>
      <main className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-margin-mobile py-16">
        <div className="w-full max-w-3xl">
          <div className="text-center mb-10">
            <h1 className="font-montserrat text-headline-md font-bold text-primary mb-3">
              Bienvenue sur IpponId
            </h1>
            <p className="text-body-lg text-on-surface-variant max-w-xl mx-auto">
              Dis-nous qui tu es pour personnaliser ton expérience.
            </p>
          </div>
          <AccountTypeSelector defaultType={defaultType} isAuthenticated={!!user} />
        </div>
      </main>
    </>
  )
}
