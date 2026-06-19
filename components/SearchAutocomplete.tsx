'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { searchJudokasAutocomplete, type JudokaAutocompleteResult } from '@/lib/judokaService'

const DEBOUNCE_MS = 300
const MIN_QUERY_LEN = 3

export default function SearchAutocomplete({
  className = '',
  placeholder = 'Rechercher un judoka…',
}: {
  className?: string
  placeholder?: string
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<JudokaAutocompleteResult[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [hasSearched, setHasSearched] = useState(false)
  const [hasError, setHasError] = useState(false)

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

  const navigate = useCallback(
    (slug: string) => {
      setIsOpen(false)
      setQuery('')
      setResults([])
      setHasSearched(false)
      router.push(`/${slug}`)
    },
    [router]
  )

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setQuery(value)
    setActiveIndex(-1)
    setHasError(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.trim().length < MIN_QUERY_LEN) {
      setResults([])
      setIsOpen(false)
      setHasSearched(false)
      setLoading(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      const id = ++searchIdRef.current
      setLoading(true)
      try {
        const data = await searchJudokasAutocomplete(value)
        if (id !== searchIdRef.current) return
        setResults(data)
        setHasSearched(true)
        setIsOpen(true)
      } catch {
        if (id !== searchIdRef.current) return
        setResults([])
        setHasError(true)
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
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && results[activeIndex]) {
        navigate(results[activeIndex].slug)
      } else if (results.length > 0) {
        navigate(results[0].slug)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex items-center bg-white rounded-xl shadow-xl border border-outline-variant p-2">
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
          aria-haspopup="listbox"
          className="flex-1 border-none outline-none focus:ring-0 px-4 py-3 text-on-surface placeholder:text-outline bg-transparent"
        />
        {loading && (
          <svg
            className="animate-spin h-5 w-5 text-outline flex-shrink-0 mr-3"
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

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl border border-outline-variant shadow-[0_8px_30px_rgba(0,6,102,0.12)] overflow-hidden z-50"
        >
          {results.length > 0 && (
            <ul>
              {results.map((j, i) => {
                const meta = [j.club, j.grade, j.category].filter(Boolean).join(' · ')
                const initials = (j.first_name[0] ?? '') + (j.last_name[0] ?? '')
                return (
                  <li
                    key={j.slug}
                    role="option"
                    aria-selected={activeIndex === i}
                    onMouseEnter={() => setActiveIndex(i)}
                    onMouseDown={(e) => { e.preventDefault(); navigate(j.slug) }}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-outline-variant/40 last:border-0 ${
                      activeIndex === i
                        ? 'bg-primary/5'
                        : 'hover:bg-surface-container'
                    }`}
                  >
                    {j.profile_photo_url ? (
                      <Image
                        src={j.profile_photo_url}
                        alt=""
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover object-top flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                        <span className="font-montserrat font-bold text-on-primary text-sm uppercase">
                          {initials}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-on-surface text-sm truncate">
                        {j.first_name} {j.last_name}
                      </p>
                      {meta && (
                        <p className="text-xs text-on-surface-variant truncate">{meta}</p>
                      )}
                    </div>
                    <svg
                      className="w-4 h-4 text-outline flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </li>
                )
              })}
            </ul>
          )}

          {!loading && hasSearched && results.length === 0 && (
            <div className="p-5 text-center">
              <p className="text-on-surface-variant text-sm mb-4">
                Aucun profil trouvé pour «&nbsp;{query}&nbsp;» — sois le premier à créer le tien&nbsp;!
              </p>
              <Link
                href="/creer-mon-profil"
                className="inline-block bg-secondary text-on-secondary px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-secondary-container transition-colors active:scale-95"
              >
                Créer mon profil gratuitement
              </Link>
            </div>
          )}

          {!loading && hasError && (
            <div className="px-4 py-3 text-center">
              <p className="text-sm text-secondary">Une erreur est survenue, réessaie.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
