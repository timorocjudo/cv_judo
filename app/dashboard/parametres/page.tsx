'use client'

import { useFormState } from 'react-dom'
import Link from 'next/link'
import { changeAccountType } from './actions'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Account, AccountType } from '@/lib/accountService'
import { SubmitButton } from '@/components/dashboard/SubmitButton'
import LogoutButton from '@/components/auth/LogoutButton'
import DeleteAccountSection from '@/components/dashboard/DeleteAccountSection'
import Alert from '@/components/ui/Alert'

// Note : cette page est un Client Component car elle utilise useFormState.
// Les données de compte sont chargées côté client depuis Supabase.

const TYPE_LABELS: Record<AccountType, string> = {
  judoka:        'Judoka',
  parent_judoka: 'Judoka & Parent',
  manager:       'Parent / Manager',
}

const ALL_TYPES: AccountType[] = ['judoka', 'parent_judoka', 'manager']

export default function ParametresPage() {
  const [account, setAccount] = useState<Account | null>(null)
  const [state, formAction] = useFormState(changeAccountType, {})

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('accounts')
        .select('id, account_type, max_profiles, created_at')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => setAccount(data as Account | null))
    })
  }, [state])

  return (
    <div className="px-margin-mobile md:px-margin-desktop py-10">
      <div className="max-w-lg mx-auto md:max-w-2xl md:mx-0 lg:max-w-3xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-tertiary-container transition-colors mb-6"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Mes judokas
        </Link>

        <h1 className="font-montserrat text-headline-md font-bold text-primary uppercase mb-8">
          Paramètres du compte
        </h1>

        <div className="space-y-6">
          {/* Type actuel */}
          <Alert
            variant="info"
            title="Type de compte"
            description={
              account
                ? `Ton compte est de type ${TYPE_LABELS[account.account_type]}. ${
                    account.max_profiles === -1
                      ? 'Tu peux créer un nombre illimité de profils.'
                      : `Tu peux créer jusqu'à ${account.max_profiles} profil.`
                  }`
                : 'Chargement…'
            }
            className="md:p-6"
          />

          {/* Changement de type */}
          <Alert variant="info" title="Changer de type" className="md:p-6">
            {state.error && (
              <p className="text-sm text-error bg-error/10 rounded-lg px-4 py-2 mt-3">
                {state.error}
              </p>
            )}
            <div className="flex flex-wrap gap-3 mt-3">
              {!account && (
                <p className="text-sm text-on-surface-variant">Chargement…</p>
              )}
              {account && ALL_TYPES.map((type) => {
                const isCurrent = account.account_type === type
                if (isCurrent) {
                  return (
                    <div
                      key={type}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-full border-2 border-primary bg-primary/5 text-sm font-semibold text-primary"
                    >
                      {TYPE_LABELS[type]}
                      <span className="text-[10px] font-bold uppercase tracking-wide bg-primary text-on-primary px-2 py-0.5 rounded-full">
                        Actuel
                      </span>
                    </div>
                  )
                }
                return (
                  <form key={type} action={formAction}>
                    <input type="hidden" name="new_type" value={type} />
                    <SubmitButton
                      pendingText={TYPE_LABELS[type]}
                      className="px-4 py-2.5 rounded-full border-2 border-outline-variant text-sm font-semibold text-on-surface hover:border-primary hover:bg-primary/5"
                    >
                      {TYPE_LABELS[type]}
                    </SubmitButton>
                  </form>
                )
              })}
            </div>
          </Alert>

          {/* Déconnexion */}
          <Alert
            variant="warning"
            title="Session"
            description="Déconnecte-toi de ton compte IpponId sur cet appareil."
            className="md:p-6"
          >
            <div className="mt-3">
              <LogoutButton />
            </div>
          </Alert>

          {/* Suppression de compte */}
          <Alert
            variant="danger"
            title="Zone dangereuse"
            description="Supprime définitivement ton compte, toutes tes données et tes fichiers. Cette action est irréversible."
            className="md:p-6"
          >
            <div className="mt-3">
              <DeleteAccountSection />
            </div>
          </Alert>
        </div>
      </div>
    </div>
  )
}
