'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface ShareButtonsProps {
  url: string
  imageUrl: string
  title: string
  variant?: 'light' | 'dark'
}

export default function ShareButtons({
  url,
  imageUrl,
  title,
  variant = 'dark',
}: ShareButtonsProps) {
  const [canNativeShare, setCanNativeShare] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    setCanNativeShare(typeof navigator.share === 'function')
  }, [])

  const isDark = variant === 'dark'
  const btnClass = isDark
    ? 'flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors'
    : 'flex items-center gap-2 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant px-3 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors'

  async function handleNativeShare() {
    try {
      await navigator.share({ title, url })
    } catch {
      // User cancelled — no-op
    }
  }

  async function handleDownload() {
    setIsDownloading(true)
    try {
      const res = await fetch(imageUrl)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const slug = url.split('/').filter(Boolean).pop() ?? 'profil'
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

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Lien copié !')
    } catch {
      toast.error('Impossible de copier le lien')
    }
  }

  if (canNativeShare) {
    return (
      <button onClick={handleNativeShare} className={btnClass}>
        <ShareIcon />
        Partager
      </button>
    )
  }

  return (
    <div className="flex flex-wrap gap-2 items-start">
      {/* WhatsApp */}
      <a
        href={`https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={btnClass}
      >
        <WhatsAppIcon />
        WhatsApp
      </a>

      {/* Facebook */}
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={btnClass}
      >
        <FacebookIcon />
        Facebook
      </a>

      {/* Instagram / TikTok download */}
      <div className="flex flex-col gap-1">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className={`${btnClass} disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          <DownloadIcon />
          {isDownloading ? 'Téléchargement…' : 'Instagram / TikTok'}
        </button>
        <p
          className={`text-[10px] leading-tight max-w-[180px] ${
            isDark ? 'text-white/40' : 'text-on-surface-variant'
          }`}
        >
          Télécharge l&apos;image et partage-la depuis l&apos;app Instagram ou TikTok
        </p>
      </div>

      {/* Copy link */}
      <button onClick={handleCopyLink} className={btnClass}>
        <CopyIcon />
        Copier le lien
      </button>
    </div>
  )
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM11.999 0C5.373 0 0 5.373 0 12c0 2.117.554 4.106 1.523 5.833L0 24l6.335-1.508A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 11.999 0zm.001 21.818c-1.9 0-3.664-.514-5.175-1.408l-.371-.22-3.76.895.954-3.663-.242-.383A9.817 9.817 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z"/>
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
    </svg>
  )
}
