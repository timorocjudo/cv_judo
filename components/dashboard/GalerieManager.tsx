'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import ImageUploader from '@/components/dashboard/ImageUploader'
import { addPhoto, deletePhoto } from '@/app/dashboard/[profileId]/galerie/actions'

interface Photo {
  id: string
  photo_url: string | null
  caption: string | null
}

export default function GalerieManager({
  photos,
  profileId,
  ownerId,
}: {
  photos: Photo[]
  profileId: string
  ownerId: string
}) {
  const [pendingUrl, setPendingUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [confirming, setConfirming] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!pendingUrl) return
    setSaving(true)
    try {
      const result = await addPhoto(pendingUrl, caption, profileId)
      if (result.ok) {
        toast.success('Ajouté avec succès')
        setPendingUrl('')
        setCaption('')
      } else {
        toast.error('Une erreur est survenue, réessaie')
      }
    } catch {
      toast.error('Une erreur est survenue, réessaie')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-montserrat font-bold text-primary text-lg mb-4">Ajouter une photo</h2>
        <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant max-w-sm space-y-3">
          <ImageUploader
            fieldName="gallery"
            currentUrl={pendingUrl}
            ownerId={ownerId}
            onUpload={setPendingUrl}
            bucket="media"
          />
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="gal-caption">
              Légende (optionnelle)
            </label>
            <input
              id="gal-caption"
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!pendingUrl || saving}
            className="bg-primary text-on-primary font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-primary-container transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 disabled:opacity-50 disabled:active:scale-100"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Enregistrement…
              </span>
            ) : 'Ajouter à la galerie'}
          </button>
        </div>
      </div>

      {photos.length > 0 && (
        <div>
          <h2 className="font-montserrat font-bold text-primary text-lg mb-4">Ma galerie</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group aspect-square rounded-xl overflow-hidden bg-surface-container">
                {photo.photo_url && (
                  <img
                    src={photo.photo_url}
                    alt={photo.caption ?? ''}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors md:flex hidden items-center justify-center opacity-0 group-hover:opacity-100">
                  {confirming === photo.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          try {
                            const result = await deletePhoto(photo.id, profileId)
                            if (result.ok) toast.success('Supprimé')
                            else toast.error('Une erreur est survenue, réessaie')
                          } catch {
                            toast.error('Une erreur est survenue, réessaie')
                          } finally {
                            setConfirming(null)
                          }
                        }}
                        className="text-xs font-semibold bg-secondary text-white px-3 py-1.5 rounded-lg active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50"
                      >
                        Confirmer
                      </button>
                      <button
                        onClick={() => setConfirming(null)}
                        className="text-xs bg-white/80 text-on-surface px-3 py-1.5 rounded-lg active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirming(photo.id)}
                      className="text-xs font-semibold bg-secondary text-white px-3 py-1.5 rounded-lg active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
                {/* Mobile: toujours visible */}
                <div className="md:hidden absolute top-1 right-1">
                  {confirming === photo.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={async () => {
                          try {
                            const result = await deletePhoto(photo.id, profileId)
                            if (result.ok) toast.success('Supprimé')
                            else toast.error('Une erreur est survenue, réessaie')
                          } catch {
                            toast.error('Une erreur est survenue, réessaie')
                          } finally {
                            setConfirming(null)
                          }
                        }}
                        className="text-xs font-semibold bg-secondary text-white px-2 py-1 rounded active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setConfirming(null)}
                        className="text-xs bg-white/80 text-on-surface px-2 py-1 rounded active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirming(photo.id)}
                      className="text-xs font-semibold bg-secondary/80 text-white px-2 py-1 rounded active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50"
                    >
                      ✕
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
