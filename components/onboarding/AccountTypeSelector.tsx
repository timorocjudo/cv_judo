'use client'

import { useState } from 'react'
import { saveAccountType } from '@/app/creer-mon-profil/actions'
import { createClient } from '@/lib/supabase/client'
import { setPendingAccountTypeCookie } from '@/lib/pendingAccountType'
import type { AccountType } from '@/lib/accountService'

const CARDS: {
  type: AccountType
  title: string
  description: string
  icon: React.ReactNode
}[] = [
  {
    type: 'manager',
    title: 'Je gère les profils de mes enfants',
    description: 'Tu créeras et géreras les profils judokas de tes enfants. Parfait si tu n\'es pas judoka toi-même.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    type: 'parent_judoka',
    title: 'Je suis judoka ET parent d\'un judoka',
    description: 'Tu auras ton propre profil judoka et pourras aussi créer les profils de tes enfants.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    type: 'judoka',
    title: 'Je suis judoka',
    description: 'Tu créeras ton propre profil judoka. Simple et rapide.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

export default function AccountTypeSelector({
  defaultType,
}: {
  defaultType?: AccountType
}) {
  const [selected, setSelected] = useState<AccountType | null>(defaultType ?? null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selected || pending) return
    setPending(true)

    // Re-check the live session at submit time rather than trusting a flag
    // captured when the page was rendered — a cached/stale render could
    // otherwise still think the user is logged out and needlessly bounce an
    // already-authenticated user through Google OAuth again.
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const formData = new FormData()
      formData.set('account_type', selected)
      await saveAccountType(formData)
      return
    }

    setPendingAccountTypeCookie(selected)

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?type=${selected}`,
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {CARDS.map((card) => {
          const isSelected = selected === card.type
          return (
            <button
              key={card.type}
              type="button"
              onClick={() => setSelected(card.type)}
              className={[
                'flex flex-col items-center text-center p-6 rounded-2xl border-2 transition-all cursor-pointer',
                isSelected
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-outline-variant bg-surface-container-lowest hover:border-primary/40 hover:shadow-sm',
              ].join(' ')}
            >
              <div
                className={[
                  'w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors',
                  isSelected ? 'bg-primary text-on-primary' : 'bg-primary/10 text-primary',
                ].join(' ')}
              >
                {card.icon}
              </div>
              <h3
                className={[
                  'font-montserrat font-bold text-base mb-2 leading-snug',
                  isSelected ? 'text-primary' : 'text-on-surface',
                ].join(' ')}
              >
                {card.title}
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {card.description}
              </p>
              {isSelected && (
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                  Sélectionné
                </span>
              )}
            </button>
          )
        })}
      </div>

      <button
        type="submit"
        disabled={!selected || pending}
        className="w-full bg-primary text-on-primary font-semibold py-3 rounded-lg hover:bg-primary-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {pending ? 'Un instant…' : 'Continuer'}
      </button>
    </form>
  )
}
