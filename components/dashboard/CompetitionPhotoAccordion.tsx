'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { CompetitionPhoto } from '@/lib/competitionService'
import {
  fetchCompetitionPhotos,
  addCompetitionPhoto,
  deleteCompetitionPhoto,
  updateCompetitionPhotoCaption,
  reorderCompetitionPhotos,
} from '@/app/dashboard/[profileId]/palmares/actions'

interface Props {
  palmaresId: string
  profileId: string
  ownerId: string
  initialCount: number
}

export default function CompetitionPhotoAccordion({ palmaresId, profileId, ownerId, initialCount }: Props) {
  const [open, setOpen] = useState(false)
  const [photos, setPhotos] = useState<CompetitionPhoto[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [captions, setCaptions] = useState<Record<string, string>>({})

  const count = photos !== null ? photos.length : initialCount

  async function handleToggle() {
    if (!open && photos === null) {
      setLoading(true)
      const fetched = await fetchCompetitionPhotos(palmaresId)
      setPhotos(fetched)
      setCaptions(Object.fromEntries(fetched.map((p) => [p.id, p.caption ?? ''])))
      setLoading(false)
    }
    setOpen((v) => !v)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Fichier trop lourd (max 5 Mo).'); return }

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${ownerId}/competitions/${palmaresId}/${Date.now()}.${ext}`
    const supabase = createClient()

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(path, file, { upsert: false })

    if (uploadError) { toast.error("Erreur lors de l'upload."); setUploading(false); return }

    const { data } = supabase.storage.from('media').getPublicUrl(path)
    const position = (photos?.length ?? 0)
    const result = await addCompetitionPhoto(palmaresId, profileId, data.publicUrl, position)

    if (result.ok && result.photo) {
      setPhotos((prev) => [...(prev ?? []), result.photo!])
      setCaptions((prev) => ({ ...prev, [result.photo!.id]: '' }))
      toast.success('Photo ajoutée')
    } else {
      toast.error('Erreur lors de la sauvegarde.')
    }
    setUploading(false)
    e.target.value = ''
  }

  async function handleDelete(photo: CompetitionPhoto) {
    const result = await deleteCompetitionPhoto(photo.id, photo.photo_url)
    if (result.ok) {
      setPhotos((prev) => prev?.filter((p) => p.id !== photo.id) ?? null)
      toast.success('Photo supprimée')
    } else {
      toast.error('Erreur lors de la suppression.')
    }
  }

  async function handleCaptionSave(id: string) {
    const caption = captions[id] ?? ''
    const result = await updateCompetitionPhotoCaption(id, caption)
    if (!result.ok) toast.error('Erreur lors de la sauvegarde.')
  }

  async function handleMove(id: string, direction: 'up' | 'down') {
    if (!photos) return
    const idx = photos.findIndex((p) => p.id === id)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === photos.length - 1) return

    const newPhotos = [...photos]
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    ;[newPhotos[idx], newPhotos[swapIdx]] = [newPhotos[swapIdx], newPhotos[idx]]
    setPhotos(newPhotos)
    await reorderCompetitionPhotos(newPhotos.map((p) => p.id))
  }

  return (
    <div className="w-full">
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant hover:text-primary transition-colors"
        aria-expanded={open}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
        </svg>
        {count > 0 ? `${count} photo${count > 1 ? 's' : ''}` : 'Photos'}
      </button>

      {/* Accordion panel */}
      {open && (
        <div className="mt-3 border-t border-outline-variant pt-3">
          {loading ? (
            <p className="text-xs text-on-surface-variant">Chargement…</p>
          ) : (
            <>
              {/* Photo grid */}
              {(photos ?? []).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {(photos ?? []).map((photo, idx) => (
                    <div key={photo.id} className="flex flex-col gap-1" style={{ width: 96 }}>
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-surface-container border border-outline-variant group">
                        <Image
                          src={photo.photo_url}
                          alt={photo.caption ?? `Photo ${idx + 1}`}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                        <button
                          type="button"
                          onClick={() => handleDelete(photo)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Supprimer cette photo"
                        >
                          ✕
                        </button>
                      </div>
                      {/* Reorder buttons */}
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleMove(photo.id, 'up')}
                          disabled={idx === 0}
                          className="text-xs px-1.5 py-0.5 rounded border border-outline-variant text-on-surface-variant hover:text-primary disabled:opacity-30 transition-colors"
                          aria-label="Déplacer vers la gauche"
                        >↑</button>
                        <button
                          type="button"
                          onClick={() => handleMove(photo.id, 'down')}
                          disabled={idx === (photos ?? []).length - 1}
                          className="text-xs px-1.5 py-0.5 rounded border border-outline-variant text-on-surface-variant hover:text-primary disabled:opacity-30 transition-colors"
                          aria-label="Déplacer vers la droite"
                        >↓</button>
                      </div>
                      {/* Caption */}
                      <input
                        type="text"
                        value={captions[photo.id] ?? ''}
                        onChange={(e) => setCaptions((prev) => ({ ...prev, [photo.id]: e.target.value }))}
                        onBlur={() => handleCaptionSave(photo.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur() } }}
                        placeholder="Légende…"
                        className="w-full text-xs border border-outline-variant rounded px-1.5 py-1 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button */}
              <label className={`inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                {uploading ? 'Envoi…' : 'Ajouter une photo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
            </>
          )}
        </div>
      )}
    </div>
  )
}
