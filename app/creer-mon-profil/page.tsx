import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hasAccount, type AccountType } from '@/lib/accountService'
import AccountTypeSelector from '@/components/onboarding/AccountTypeSelector'
import LogoLink from '@/components/layout/LogoLink'
import HeroZone from '@/components/landing/HeroZone'

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
          <AccountTypeSelector defaultType={defaultType} isAuthenticated={!!user} />
        </div>
      </main>
    </>
  )
}
