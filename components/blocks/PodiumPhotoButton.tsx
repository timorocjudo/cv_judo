'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface PodiumPhotoButtonProps {
  photo: string
  alt: string
}

export default function PodiumPhotoButton({ photo, alt }: PodiumPhotoButtonProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Voir la photo du podium"
        className="w-8 h-8 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
          <circle cx="12" cy="13" r="3"/>
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="relative max-w-[90vw] max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="absolute -top-10 right-0 text-white hover:text-white/70 transition-colors font-bold text-2xl leading-none"
            >
              ×
            </button>
            <Image
              src={photo}
              alt={alt}
              width={1200}
              height={900}
              className="rounded-xl object-contain max-h-[85vh] w-auto"
              priority
            />
          </div>
        </div>
      )}
    </>
  )
}
