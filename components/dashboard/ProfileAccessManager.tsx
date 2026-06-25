'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import type { ProfileRole } from '@/lib/profileAccessService'

type DisplayAccess = {
  account_id: string
  role: ProfileRole
  created_at: string
  display_name: string
}

type Props = {
  profileId: string
  currentAccountId: string
  initialAccesses: DisplayAccess[]
}

const ROLE_LABELS: Record<ProfileRole, string> = {
  owner: 'Propriétaire',
  manager: 'Gestionnaire',
  viewer: 'Lecteur',
}

const ROLE_BADGE_CLASSES: Record<ProfileRole, string> = {
  owner: 'bg-primary/10 text-primary border border-primary/20',
  manager: 'bg-blue-50 text-blue-700 border border-blue-200',
  viewer: 'bg-surface-container text-on-surface-variant border border-outline-variant',
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
      <h2 className="font-montserrat text-headline-md font-bold text-primary uppercase">
        {children}
      </h2>
    </div>
  )
}

export default function ProfileAccessManager({ profileId, currentAccountId: _currentAccountId, initialAccesses }: Props) {
  const [accesses, setAccesses] = useState<DisplayAccess[]>(initialAccesses)
  const [isPending, setIsPending] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function refreshList() {
    const res = await fetch('/api/profile-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', profileId }),
    })
    if (res.ok) {
      const { accesses: fresh } = await res.json()
      setAccesses(fresh)
    }
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const role = (form.elements.namedItem('role') as HTMLSelectElement).value

    setIsPending(true)
    try {
      const res = await fetch('/api/profile-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', profileId, email, role }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        formRef.current?.reset()
        await refreshList()
      } else {
        toast.error(data.message)
      }
    } catch {
      toast.error('Une erreur est survenue')
    } finally {
      setIsPending(false)
    }
  }

  async function handleRemove(targetAccountId: string) {
    try {
      const res = await fetch('/api/profile-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', profileId, targetAccountId }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        await refreshList()
      } else {
        toast.error(data.message)
      }
    } catch {
      toast.error('Une erreur est survenue')
    }
  }

  return (
    <div className="space-y-10">
      <section>
        <SectionHeader>Personnes ayant accès</SectionHeader>
        <ul className="divide-y divide-outline-variant">
          {accesses.map((access) => (
            <li key={access.account_id} className="flex items-center justify-between py-3 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-medium text-on-surface truncate">{access.display_name}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${ROLE_BADGE_CLASSES[access.role]}`}>
                  {ROLE_LABELS[access.role]}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-on-surface-variant hidden sm:block">
                  {new Date(access.created_at).toLocaleDateString('fr-FR')}
                </span>
                {access.role !== 'owner' && (
                  <button
                    onClick={() => handleRemove(access.account_id)}
                    className="text-xs text-error hover:underline"
                  >
                    Retirer
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionHeader>Inviter une personne</SectionHeader>
        <form ref={formRef} onSubmit={handleAdd} className="space-y-4 max-w-md">
          <input
            type="email"
            name="email"
            placeholder="Adresse email du compte IpponId"
            required
            className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <select
            name="role"
            defaultValue="manager"
            className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="manager">Gestionnaire — peut modifier le profil, ajouter des résultats, des photos, des vidéos</option>
            <option value="viewer">Lecteur — peut voir le profil même s&apos;il est en brouillon ou privé, ne peut pas modifier</option>
          </select>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-primary text-on-primary text-sm font-semibold rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Envoi…
              </span>
            ) : (
              'Inviter'
            )}
          </button>
          <p className="text-xs text-on-surface-variant">
            La personne doit avoir un compte IpponId avec cette adresse email pour pouvoir accéder au profil.
          </p>
        </form>
      </section>
    </div>
  )
}
