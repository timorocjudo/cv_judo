'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import SearchFilters, { type SearchFiltersProps } from '@/components/recherche/SearchFilters'

interface FiltersDrawerProps extends SearchFiltersProps {
  isOpen: boolean
  onClose: () => void
}

export default function FiltersDrawer({ isOpen, onClose, ...filterProps }: FiltersDrawerProps) {
  const [mounted, setMounted] = useState(false)

  // Mount check for SSR
  useEffect(() => {
    setMounted(true)
  }, [])

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = original }
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!mounted) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Filtres de recherche"
      className={`fixed inset-0 z-[200] lg:hidden transition-opacity duration-200 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-surface-container-lowest rounded-t-2xl max-h-[85vh] flex flex-col
                    transition-transform duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-outline-variant rounded-full" />
        </div>

        {/* Scrollable filter content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <SearchFilters {...filterProps} />
        </div>

        {/* Sticky "Voir les résultats" button */}
        <div className="px-4 py-3 border-t border-outline-variant bg-surface-container-lowest">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-primary text-on-primary font-montserrat font-bold py-3 rounded-xl
                       hover:bg-primary-container transition-colors"
          >
            Voir les résultats
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
