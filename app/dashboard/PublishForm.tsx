'use client'

import { useEffect, useRef } from 'react'
import { useFormState } from 'react-dom'
import { toast } from 'sonner'
import { togglePublished, type ToggleResult } from './actions'
import { SubmitButton } from '@/components/dashboard/SubmitButton'

const INITIAL: ToggleResult = { ok: null, missing: [], unpublished: false }

export default function PublishForm({
  profileId,
  slug,
  published,
  isPublishable,
  missingFields,
}: {
  profileId: string
  slug: string
  published: boolean
  isPublishable: boolean
  missingFields: string[]
}) {
  const [state, formAction] = useFormState(togglePublished, INITIAL)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    if (state.ok === true) {
      if (state.unpublished) {
        toast.success("Ta page n'est plus visible publiquement")
      } else {
        toast.success('Ta page est maintenant en ligne !')
      }
    } else if (state.ok === false) {
      if (state.missing.length > 0) {
        toast.error(`Champs manquants : ${state.missing.join(', ')}`)
      } else {
        toast.error('Une erreur est survenue, réessaie')
      }
    }
  }, [state])

  return (
    <form action={formAction}>
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="next" value={String(!published)} />
      <SubmitButton
        disabled={!published && !isPublishable}
        pendingText={published ? 'Dépublication…' : 'Publication…'}
        title={
          !published && !isPublishable
            ? `Champs manquants : ${missingFields.join(', ')}`
            : undefined
        }
        className={`w-full sm:w-auto font-semibold px-6 py-3 rounded-lg text-sm ${
          published
            ? 'border border-secondary text-secondary hover:bg-secondary/5'
            : isPublishable
              ? 'bg-primary text-on-primary hover:bg-primary-container'
              : 'bg-primary/30 text-on-primary'
        }`}
      >
        {published ? 'Dépublier' : 'Publier mon profil'}
      </SubmitButton>
    </form>
  )
}
