'use client'

import { useState } from 'react'
import ImageUploader from '@/components/dashboard/ImageUploader'
import { addPhoto, deletePhoto } from './actions'

interface Photo {
  id: string
  photo_url: string | null
  caption: string | null
}

export default function GalerieManager({
  photos,
  ownerId,
  profileId,
}: {
  photos: Photo[]
  ownerId: string
  profileId: string
}) {
  const [pendingUrl, setPendingUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [confirming, setConfirming] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!pendingUrl) return
    setSaving(true)
    await addPhoto(pendingUrl, caption, profileId)
    setPendingUrl('')
    setCaption('')
    setSaving(false)
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
            className="bg-primary text-on-primary font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-primary-container transition-colors disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Ajouter à la galerie'}
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
                        onClick={async () => { await deletePhoto(photo.id); setConfirming(null) }}
                        className="text-xs font-semibold bg-secondary text-white px-3 py-1.5 rounded-lg"
                      >
                        Confirmer
                      </button>
                      <button
                        onClick={() => setConfirming(null)}
                        className="text-xs bg-white/80 text-on-surface px-3 py-1.5 rounded-lg"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirming(photo.id)}
                      className="text-xs font-semibold bg-secondary text-white px-3 py-1.5 rounded-lg"
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
                        onClick={async () => { await deletePhoto(photo.id); setConfirming(null) }}
                        className="text-xs font-semibold bg-secondary text-white px-2 py-1 rounded"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setConfirming(null)}
                        className="text-xs bg-white/80 text-on-surface px-2 py-1 rounded"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirming(photo.id)}
                      className="text-xs font-semibold bg-secondary/80 text-white px-2 py-1 rounded"
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
