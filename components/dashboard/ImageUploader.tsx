'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ImageUploaderProps {
  fieldName: string
  currentUrl: string
  ownerId: string
  onUpload: (url: string) => void
  bucket?: string
  aspectRatio?: 'square' | 'wide'
}

export default function ImageUploader({
  fieldName,
  currentUrl,
  ownerId,
  onUpload,
  bucket = 'media',
  aspectRatio = 'square',
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState(currentUrl)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('Fichier trop lourd (max 5 Mo).')
      return
    }

    setError(null)
    setUploading(true)

    const ext = file.name.split('.').pop()
    const path = `${ownerId}/${fieldName}-${Date.now()}.${ext}`
    const supabase = createClient()

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError("Erreur lors de l'upload. Réessaie.")
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    setPreview(data.publicUrl)
    onUpload(data.publicUrl)
    setUploading(false)
  }

  return (
    <div className="space-y-2">
      <div
        className={`relative overflow-hidden rounded-lg bg-surface-container border border-outline-variant ${
          aspectRatio === 'wide' ? 'aspect-[3/1]' : 'aspect-square w-32'
        }`}
      >
        {preview ? (
          <img src={preview} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-on-surface-variant text-xs">
            Aucune image
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-sm">Envoi…</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
      >
        {preview ? 'Changer' : 'Ajouter une image'}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />

      {error && <p className="text-sm text-secondary">{error}</p>}
    </div>
  )
}
