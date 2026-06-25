'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface QRCodeDisplayProps {
  slug: string
  size?: number
  showLabel?: boolean
}

export default function QRCodeDisplay({ slug, size = 200, showLabel = true }: QRCodeDisplayProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  async function handleDownload() {
    setIsDownloading(true)
    try {
      const res = await fetch(`/api/qrcode/${slug}`)
      if (!res.ok) throw new Error('QR code unavailable')
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `ipponid-${slug}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      toast.error('Échec du téléchargement')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-4 inline-flex flex-col items-center gap-3">
      {showLabel && (
        <p className="font-montserrat font-bold text-primary text-xs uppercase tracking-wide">
          Mon QR Code IpponId
        </p>
      )}
      <img
        src={`/api/qrcode/${slug}`}
        alt={`QR code du profil IpponId de ${slug}`}
        width={size}
        height={size}
        className="rounded-lg"
      />
      <p className="text-xs text-on-surface-variant">ipponid.com/{slug}</p>
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className="flex items-center gap-2 border border-outline-variant text-on-surface text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full hover:bg-surface-container transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isDownloading ? 'Téléchargement…' : 'Télécharger en PNG'}
      </button>
    </div>
  )
}
