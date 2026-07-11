'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { searchClubs, createClub, type Club } from '@/lib/clubService'

const DEBOUNCE_MS = 300
const MIN_QUERY_LEN = 2

interface ClubAutocompleteProps {
  value: string | null
  valueName: string | null
  onChange: (clubId: string | null, clubName: string | null) => void
  placeholder?: string
}

export default function ClubAutocomplete({
  value,
  valueName,
  onChange,
  placeholder = 'Recherche ton club...',
}: ClubAutocompleteProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Club[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [creating, setCreating] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchIdRef = useRef(0)

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  const showCreateOption =
    query.trim().length >= MIN_QUERY_LEN &&
    !results.some((c) => c.name.toLowerCase() === query.trim().toLowerCase())

  const totalItems = results.length + (showCreateOption ? 1 : 0)

  const selectClub = useCallback(
    (club: Club) => {
      onChange(club.id, club.name)
      setIsOpen(false)
      setQuery('')
      setResults([])
      setActiveIndex(-1)
    },
    [onChange]
  )

  const handleCreate = useCallback(async () => {
    const name = query.trim()
    setCreating(true)
    try {
      const club = await createClub(name)
      selectClub(club)
      toast.success('Club créé et sélectionné')
    } catch (err) {
      if (err instanceof Error && err.message === 'CLUB_ALREADY_EXISTS') {
        toast.error('Ce club existe déjà — recherche-le dans la liste')
      } else {
        toast.error('Erreur lors de la création du club')
      }
    } finally {
      setCreating(false)
    }
  }, [query, selectClub])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    setActiveIndex(-1)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (val.trim().length < MIN_QUERY_LEN) {
      setResults([])
      setIsOpen(false)
      setLoading(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      const id = ++searchIdRef.current
      setLoading(true)
      try {
        const data = await searchClubs(val)
        if (id !== searchIdRef.current) return
        setResults(data)
        setIsOpen(true)
      } catch {
        if (id !== searchIdRef.current) return
        setResults([])
        setIsOpen(true)
      } finally {
        if (id === searchIdRef.current) setLoading(false)
      }
    }, DEBOUNCE_MS)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, totalItems - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && activeIndex < results.length) {
        selectClub(results[activeIndex])
      } else if (activeIndex === results.length && showCreateOption) {
        handleCreate()
      } else if (results.length > 0) {
        selectClub(results[0])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }

  if (value && valueName) {
    return (
      <div className="flex items-center gap-2 border border-outline-variant rounded-lg px-4 py-2.5 bg-surface-container-lowest">
        <span className="flex-1 text-sm text-on-surface">{valueName}</span>
        <button
          type="button"
          onClick={() => onChange(null, null)}
          className="text-outline hover:text-on-surface transition-colors"
          aria-label="Désélectionner le club"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center border border-outline-variant rounded-lg bg-surface-container-lowest">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          className="flex-1 border-none outline-none focus:ring-0 px-4 py-2.5 text-on-surface text-sm placeholder:text-outline bg-transparent"
        />
        {loading && (
          <svg
            className="animate-spin h-4 w-4 text-outline flex-shrink-0 mr-3"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
      </div>

      {isOpen && (results.length > 0 || showCreateOption) && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-outline-variant shadow-[0_8px_30px_rgba(0,6,102,0.12)] overflow-hidden z-50"
        >
          {results.length > 0 && (
            <ul>
              {results.map((club, i) => (
                <li
                  key={club.id}
                  role="option"
                  aria-selected={activeIndex === i}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    selectClub(club)
                  }}
                  className={`flex items-center justify-between px-4 py-2.5 cursor-pointer text-sm border-b border-outline-variant/40 last:border-0 transition-colors ${
                    activeIndex === i ? 'bg-primary/5' : 'hover:bg-surface-container'
                  }`}
                >
                  <span className="font-medium text-on-surface">{club.name}</span>
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    {club.city && <span>{club.city}</span>}
                    {club.verified && (
                      <span className="font-semibold text-tertiary-container">✓ Vérifié</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {showCreateOption && (
            <button
              type="button"
              role="option"
              aria-selected={activeIndex === results.length}
              onMouseEnter={() => setActiveIndex(results.length)}
              onMouseDown={(e) => {
                e.preventDefault()
                handleCreate()
              }}
              disabled={creating}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm border-t border-dashed border-outline-variant text-secondary font-medium transition-colors disabled:opacity-50 ${
                activeIndex === results.length ? 'bg-secondary/5' : 'hover:bg-secondary/5'
              }`}
            >
              <span>+</span>
              <span>
                Créer le club «&nbsp;{query.trim()}&nbsp;»
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
