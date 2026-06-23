'use client'

import { useEffect, useRef } from 'react'
import { useFormState } from 'react-dom'
import { toast } from 'sonner'
import { setVisibility, type SetVisibilityResult } from './actions'
import { SubmitButton } from '@/components/dashboard/SubmitButton'

const OPTIONS: Array<{
  value: 'draft' | 'private' | 'public'
  label: string
  description: string
  icon: string
}> = [
  { value: 'draft',   label: 'Brouillon', description: 'Visible uniquement par toi',               icon: '🔒' },
  { value: 'private', label: 'Privé',     description: 'Visible par les membres IpponId connectés', icon: '👥' },
  { value: 'public',  label: 'Public',    description: 'Visible par tout le monde, indexé',         icon: '🌍' },
]

const INITIAL: SetVisibilityResult = { ok: null, missing: [] }

type Props = {
  profileId: string
  slug: string
  currentVisibility: 'draft' | 'private' | 'public'
  isOwner: boolean
  missingFields: string[]
}

export default function VisibilityForm({
  profileId,
  slug,
  currentVisibility,
  isOwner,
  missingFields,
}: Props) {
  const [state, formAction] = useFormState(setVisibility, INITIAL)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    if (state.ok === true) {
      toast.success('Visibilité mise à jour')
    } else if (state.ok === false) {
      if (state.missing.length > 0) {
        toast.error(`Champs manquants : ${state.missing.join(', ')}`)
      } else {
        toast.error('Une erreur est survenue')
      }
    }
  }, [state])

  if (!isOwner) {
    const current = OPTIONS.find((o) => o.value === currentVisibility)
    return (
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5">
        <p className="font-montserrat font-bold text-primary text-sm mb-2 uppercase tracking-wide">
          Visibilité
        </p>
        <p className="text-on-surface-variant text-sm">
          {current?.icon} {current?.label} — {current?.description}
        </p>
        <p className="text-xs text-on-surface-variant mt-2">Seul le propriétaire peut modifier la visibilité.</p>
      </div>
    )
  }

  return (
    <form action={formAction} className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5">
      <p className="font-montserrat font-bold text-primary text-sm mb-4 uppercase tracking-wide">
        Visibilité
      </p>
      <input type="hidden" name="profileId" value={profileId} />
      <div className="space-y-2 mb-4">
        {OPTIONS.map((opt) => {
          const isDisabled = opt.value !== 'draft' && missingFields.length > 0
          return (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                currentVisibility === opt.value
                  ? 'border-primary bg-primary/5'
                  : 'border-outline-variant hover:bg-surface-container'
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="radio"
                name="visibility"
                value={opt.value}
                defaultChecked={currentVisibility === opt.value}
                disabled={isDisabled}
                className="mt-0.5 accent-primary"
              />
              <div>
                <span className="text-sm font-semibold text-on-surface">
                  {opt.icon} {opt.label}
                </span>
                <p className="text-xs text-on-surface-variant">{opt.description}</p>
              </div>
            </label>
          )
        })}
      </div>
      {missingFields.length > 0 && (
        <p className="text-xs text-secondary mb-3">
          Champs manquants pour Privé/Public : {missingFields.join(', ')}
        </p>
      )}
      <SubmitButton pendingText="Mise à jour…" className="bg-primary text-on-primary font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-primary-container transition-colors">
        Enregistrer
      </SubmitButton>
    </form>
  )
}
