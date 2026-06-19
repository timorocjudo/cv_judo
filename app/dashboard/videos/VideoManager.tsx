'use client'

import { useFormState } from 'react-dom'
import { useState } from 'react'
import { addVideo, deleteVideo } from './actions'
import { SubmitButton } from '@/components/dashboard/SubmitButton'

interface VideoRow {
  id: string
  title: string | null
  youtube_url: string | null
  description: string | null
}

const initialState = { ok: null, error: null }

export default function VideoManager({ videos }: { videos: VideoRow[] }) {
  const [state, formAction] = useFormState(addVideo, initialState)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-montserrat font-bold text-primary text-lg mb-4">Ajouter une vidéo</h2>
        <form action={formAction} className="space-y-4 bg-surface-container-low rounded-xl p-5 border border-outline-variant max-w-xl">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="vid-title">Titre</label>
            <input
              id="vid-title"
              name="title"
              type="text"
              placeholder="Mon passage en finale"
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="vid-url">Lien YouTube *</label>
            <input
              id="vid-url"
              name="youtube_url"
              type="url"
              required
              placeholder="https://youtube.com/watch?v=..."
              className={`w-full border rounded-lg px-3 py-2 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm ${
                state.error ? 'border-secondary' : 'border-outline-variant'
              }`}
            />
            {state.error && (
              <p className="text-sm text-secondary mt-1">{state.error}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="vid-desc">Description</label>
            <textarea
              id="vid-desc"
              name="description"
              rows={2}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm resize-none"
            />
          </div>
          <SubmitButton
            pendingText="Ajout…"
            className="bg-primary text-on-primary font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-primary-container"
          >
            Ajouter
          </SubmitButton>
        </form>
      </div>

      {videos.length > 0 && (
        <div>
          <h2 className="font-montserrat font-bold text-primary text-lg mb-3">Mes vidéos</h2>
          <div className="space-y-3">
            {videos.map((v) => (
              <div
                key={v.id}
                className="flex justify-between items-start gap-4 bg-surface-container-lowest rounded-xl border border-outline-variant p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-on-surface text-sm">{v.title}</p>
                  <a
                    href={v.youtube_url ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline break-all"
                  >
                    {v.youtube_url}
                  </a>
                  {v.description && (
                    <p className="text-xs text-on-surface-variant mt-1">{v.description}</p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {confirming === v.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          setDeleting(v.id)
                          await deleteVideo(v.id)
                          setConfirming(null)
                          setDeleting(null)
                        }}
                        disabled={deleting === v.id}
                        className="text-xs font-semibold text-secondary hover:underline active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-secondary/50 rounded transition-all disabled:opacity-60"
                      >
                        {deleting === v.id ? 'Suppression…' : 'Confirmer'}
                      </button>
                      <button
                        onClick={() => setConfirming(null)}
                        disabled={deleting === v.id}
                        className="text-xs text-on-surface-variant hover:underline active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30 rounded transition-all disabled:opacity-60"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirming(v.id)}
                      className="text-xs font-medium text-secondary hover:underline active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-secondary/50 rounded transition-all"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
