'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import type { GalleryImage } from '@/types/judoka'

interface LightboxProps {
  images: GalleryImage[]
  initialIndex: number
  onClose: () => void
}

export default function Lightbox({ images, initialIndex, onClose }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [visible, setVisible] = useState(true)
  const [mounted, setMounted] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Body scroll lock
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [])

  // Focus close button once portal renders
  useEffect(() => {
    if (mounted) {
      setTimeout(() => closeButtonRef.current?.focus(), 0)
    }
  }, [mounted])

  // Preload adjacent images
  useEffect(() => {
    const preload = (src: string) => {
      const img = new window.Image()
      img.src = src
    }
    preload(images[(currentIndex - 1 + images.length) % images.length].src)
    preload(images[(currentIndex + 1) % images.length].src)
  }, [currentIndex, images])

  const navigate = useCallback((direction: 'prev' | 'next') => {
    setVisible(false)
    setTimeout(() => {
      setCurrentIndex(prev =>
        direction === 'next'
          ? (prev + 1) % images.length
          : (prev - 1 + images.length) % images.length
      )
      setVisible(true)
    }, 150)
  }, [images.length])

  // Keyboard navigation + focus trap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowRight') navigate('next')
      if (e.key === 'ArrowLeft') navigate('prev')
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus() }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus() }
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [navigate, onClose])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) navigate(diff > 0 ? 'next' : 'prev')
    touchStartX.current = null
  }

  const current = images[currentIndex]

  if (!mounted) return null

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Galerie photos"
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 4, 30, 0.93)' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Top bar: counter + close button */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3">
        <span className="font-inter text-sm font-semibold text-white/60 select-none">
          {currentIndex + 1} / {images.length}
        </span>
        <button
          ref={closeButtonRef}
          aria-label="Fermer la galerie"
          onClick={onClose}
          className="w-11 h-11 flex items-center justify-center rounded-full text-white/70 hover:text-tertiary-container hover:bg-white/10 transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Prev arrow */}
      {images.length > 1 && (
        <button
          aria-label="Photo précédente"
          onClick={(e) => { e.stopPropagation(); navigate('prev') }}
          className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full text-white/60 hover:text-tertiary-container hover:bg-white/10 transition-colors"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* Next arrow */}
      {images.length > 1 && (
        <button
          aria-label="Photo suivante"
          onClick={(e) => { e.stopPropagation(); navigate('next') }}
          className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full text-white/60 hover:text-tertiary-container hover:bg-white/10 transition-colors"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Image container — stops propagation so click on image doesn't close */}
      <div
        className="relative z-10 mx-14 md:mx-20"
        style={{ height: '82vh', width: 'calc(100vw - 112px)', maxWidth: '1200px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative w-full h-full transition-opacity duration-[150ms]"
          style={{ opacity: visible ? 1 : 0 }}
        >
          <Image
            src={current.src}
            alt={current.caption || `Photo ${currentIndex + 1}`}
            fill
            className="object-contain rounded-lg"
            sizes="(min-width: 768px) 80vw, calc(100vw - 56px)"
            priority
          />
          {current.caption && (
            <figcaption
              className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-10 text-center pointer-events-none rounded-b-lg"
              style={{ background: 'linear-gradient(to top, rgba(0,4,30,0.85) 0%, transparent 100%)' }}
            >
              <p className="font-inter text-sm text-white/90">{current.caption}</p>
            </figcaption>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
