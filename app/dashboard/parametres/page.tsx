'use client'

import { useFormState } from 'react-dom'
import Link from 'next/link'
import { changeAccountType } from './actions'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Account, AccountType } from '@/lib/accountService'
import LogoutButton from '@/components/auth/LogoutButton'
import DeleteAccountSection from '@/components/dashboard/DeleteAccountSection'

// Note : cette page est un Client Component car elle utilise useFormState.
// Les données de compte sont chargées côté client depuis Supabase.

const TYPE_LABELS: Record<AccountType, string> = {
  judoka:        'Judoka',
  parent_judoka: 'Judoka & Parent',
  manager:       'Parent / Manager',
}

const TRANSITIONS: { from: AccountType; to: AccountType; label: string }[] = [
  { from: 'judoka',        to: 'parent_judoka', label: 'Passer en Judoka & Parent' },
  { from: 'judoka',        to: 'manager',       label: 'Passer en Parent / Manager' },
  { from: 'parent_judoka', to: 'manager',       label: 'Passer en Parent / Manager' },
  { from: 'parent_judoka', to: 'judoka',        label: 'Repasser en Judoka seul' },
  { from: 'manager',       to: 'parent_judoka', label: 'Passer en Judoka & Parent' },
  { from: 'manager',       to: 'judoka',        label: 'Repasser en Judoka seul' },
]

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

  const availableTransitions = account
    ? TRANSITIONS.filter((t) => t.from === account.account_type)
    : []

  return (
    <div className="min-h-screen bg-background px-margin-mobile md:px-margin-desktop py-10">
      <div className="max-w-lg mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors mb-6"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Mes judokas
        </Link>

        <h1 className="font-montserrat text-headline-md font-bold text-primary uppercase mb-8">
          Paramètres du compte
        </h1>

        {/* Type actuel */}
        <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6 mb-6">
          <h2 className="font-montserrat font-bold text-primary mb-1">Type de compte</h2>
          {account ? (
            <p className="text-on-surface-variant">
              Ton compte est de type{' '}
              <span className="font-semibold text-on-surface">
                {TYPE_LABELS[account.account_type]}
              </span>
              .{' '}
              {account.max_profiles === -1
                ? 'Tu peux créer un nombre illimité de profils.'
                : `Tu peux créer jusqu'à ${account.max_profiles} profil.`}
            </p>
          ) : (
            <p className="text-on-surface-variant text-sm">Chargement…</p>
          )}
        </section>

        {/* Changement de type */}
        {availableTransitions.length > 0 && (
          <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6 mb-6">
            <h2 className="font-montserrat font-bold text-primary mb-4">Changer de type</h2>
            {state.error && (
              <p className="text-sm text-error bg-error/10 rounded-lg px-4 py-2 mb-4">
                {state.error}
              </p>
            )}
            <div className="flex flex-col gap-3">
              {availableTransitions.map(({ to, label }) => (
                <form key={to} action={formAction}>
                  <input type="hidden" name="new_type" value={to} />
                  <button
                    type="submit"
                    className="w-full text-left bg-surface-container px-4 py-3 rounded-lg border border-outline-variant hover:border-primary/40 hover:shadow-sm transition-all text-sm font-medium text-on-surface"
                  >
                    {label}
                  </button>
                </form>
              ))}
            </div>
          </section>
        )}

        {/* Déconnexion */}
        <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6 mb-6">
          <h2 className="font-montserrat font-bold text-primary mb-3">Session</h2>
          <LogoutButton />
        </section>

        {/* Suppression de compte */}
        <section className="bg-surface-container-lowest rounded-2xl border border-error/20 p-6">
          <DeleteAccountSection />
        </section>
      </div>
    </div>
  )
}
