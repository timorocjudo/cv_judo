'use client'

import { useEffect, useRef, useState } from 'react'
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
  {
    value: 'draft',
    label: 'Brouillon',
    description: "La page de ce judoka n'existe pas encore. Seuls toi et tes gestionnaires pouvez la prévisualiser depuis le dashboard.",
    icon: '🔒',
  },
  {
    value: 'private',
    label: 'Privé',
    description: "La page existe et est accessible via son URL directe. Tu peux la partager à la famille et aux proches. Elle n'apparaît pas dans les moteurs de recherche.",
    icon: '🔗',
  },
  {
    value: 'public',
    label: 'Public',
    description: "La page est visible par tout le monde et référencée sur Google. C'est l'objectif final pour que le palmarès ressorte dans les recherches.",
    icon: '🌍',
  },
]

const DOWNGRADE_MESSAGES: Record<'draft' | 'private', { title: string; body: string }> = {
  draft: {
    title: 'Repasser en brouillon ?',
    body: "La page ne sera plus accessible du tout. Les liens déjà partagés ne fonctionneront plus.",
  },
  private: {
    title: 'Repasser en privé ?',
    body: "La page ne sera plus référencée sur Google mais restera accessible par lien direct.",
  },
}

const INITIAL: SetVisibilityResult = { ok: null, missing: [] }

type Props = {
  profileId: string
  currentVisibility: 'draft' | 'private' | 'public'
  isOwner: boolean
  missingFields: string[]
  firstName?: string
}

export default function VisibilityForm({
  profileId,
  currentVisibility,
  isOwner,
  missingFields,
  firstName,
}: Props) {
  const [state, formAction] = useFormState(setVisibility, INITIAL)
  const isFirstRender = useRef(true)
  const [pendingValue, setPendingValue] = useState<'draft' | 'private' | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

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
    <>
      <form
        ref={formRef}
        action={formAction}
        className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5"
      >
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
        <SubmitButton
          pendingText="Mise à jour…"
          className="bg-primary text-on-primary font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-primary-container transition-colors"
          onClick={(e) => {
            const form = formRef.current
            if (!form) return
            const selected = (form.elements.namedItem('visibility') as RadioNodeList | null)?.value as 'draft' | 'private' | 'public' | undefined
            if (currentVisibility === 'public' && selected && selected !== 'public') {
              e.preventDefault()
              setPendingValue(selected as 'draft' | 'private')
            }
          }}
        >
          Enregistrer
        </SubmitButton>
      </form>

      {pendingValue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-surface rounded-2xl border border-outline-variant p-6 max-w-sm w-full mx-4 shadow-lg">
            <p className="font-montserrat font-bold text-primary text-base mb-2">
              {DOWNGRADE_MESSAGES[pendingValue].title}
            </p>
            <p className="text-sm text-on-surface-variant mb-5">
              {DOWNGRADE_MESSAGES[pendingValue].body}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setPendingValue(null)}
                className="text-sm font-semibold text-on-surface-variant px-4 py-2 rounded-lg hover:bg-surface-container transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingValue(null)
                  formRef.current?.requestSubmit()
                }}
                className="text-sm font-semibold text-on-error bg-error px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
