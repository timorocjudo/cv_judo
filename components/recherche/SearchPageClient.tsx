'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import SearchFilters from '@/components/recherche/SearchFilters'
import FiltersDrawer from '@/components/recherche/FiltersDrawer'
import JudokaCardComponent from '@/components/recherche/JudokaCard'
import Pagination from '@/components/recherche/Pagination'
import type { JudokaCard, SearchResult } from '@/lib/advancedSearch'

const SORT_OPTIONS = [
  { value: 'alpha-asc',  label: 'Alphabétique A→Z' },
  { value: 'alpha-desc', label: 'Alphabétique Z→A' },
  { value: 'poids-asc',  label: 'Poids croissant' },
  { value: 'poids-desc', label: 'Poids décroissant' },
  { value: 'recent',     label: 'Récemment mis à jour' },
]

interface SearchPageClientProps {
  results: JudokaCard[]
  total: number
  resolvedClub: SearchResult['resolvedClub']
}

export default function SearchPageClient({ results, total, resolvedClub }: SearchPageClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchParamsRef = useRef(searchParams)

  // Derived state from URL
  const currentPage = parseInt(searchParams.get('page') ?? '1', 10)
  const activeQ = searchParams.get('q') ?? ''
  const activeCats = searchParams.get('categorie')?.split(',').filter(Boolean) ?? []
  const activeGrades = searchParams.get('grade')?.split(',').filter(Boolean) ?? []
  const activePoids = searchParams.get('poids')?.split(',').filter(Boolean) ?? []
  const activeOrdre = searchParams.get('ordre') ?? 'alpha-asc'

  const hasActiveFilters = !!(
    searchParams.get('q') ||
    searchParams.get('club') ||
    searchParams.get('categorie') ||
    searchParams.get('grade') ||
    searchParams.get('poids')
  )

  const activeFilterCount =
    (activeCats.length) +
    (activeGrades.length) +
    (activePoids.length) +
    (searchParams.get('club') ? 1 : 0) +
    (searchParams.get('q') ? 1 : 0)

  // Keep searchParamsRef in sync with latest searchParams
  useEffect(() => {
    searchParamsRef.current = searchParams
  }, [searchParams])

  // Scroll to grid top when page changes
  const prevPage = useRef(currentPage)
  useEffect(() => {
    if (currentPage !== prevPage.current) {
      gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      prevPage.current = currentPage
    }
  }, [currentPage])

  // URL update helpers
  const pushUrl = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) params.delete(key)
      else params.set(key, value)
    }
    router.push(`/recherche?${params.toString()}`)
  }, [searchParams, router])

  function toggleMultiParam(paramName: string, value: string) {
    const current = searchParams.get(paramName)?.split(',').filter(Boolean) ?? []
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    const params = new URLSearchParams(searchParams.toString())
    if (next.length > 0) params.set(paramName, next.join(','))
    else params.delete(paramName)
    params.delete('page')
    router.push(`/recherche?${params.toString()}`)
  }

  // Filter callbacks
  function handleQChange(q: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParamsRef.current.toString())
      if (q) params.set('q', q)
      else params.delete('q')
      params.delete('page')
      router.push(`/recherche?${params.toString()}`)
    }, 400)
  }

  function handleClubChange(id: string | null, _name: string | null, slug?: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (slug) params.set('club', slug)
    else params.delete('club')
    params.delete('page')
    router.push(`/recherche?${params.toString()}`)
  }

  function handleOrdreChange(ordre: string) {
    pushUrl({ ordre, page: null })
  }

  function handlePageChange(page: number) {
    const params = new URLSearchParams(searchParams.toString())
    if (page === 1) params.delete('page')
    else params.set('page', String(page))
    router.push(`/recherche?${params.toString()}`)
  }

  function handleReset() {
    router.push('/recherche')
  }

  const filterProps = {
    q: activeQ,
    onQChange: handleQChange,
    clubId: resolvedClub?.id ?? null,
    clubName: resolvedClub?.name ?? null,
    onClubChange: handleClubChange,
    selectedCategories: activeCats,
    onCategoryToggle: (slug: string) => toggleMultiParam('categorie', slug),
    selectedGrades: activeGrades,
    onGradeToggle: (slug: string) => toggleMultiParam('grade', slug),
    selectedPoids: activePoids,
    onPoidsToggle: (slug: string) => toggleMultiParam('poids', slug),
    hasActiveFilters,
    onReset: handleReset,
  }

  return (
    <div className="flex gap-8 px-margin-mobile md:px-margin-desktop py-8 max-w-container-max mx-auto min-h-[60vh]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-[280px] shrink-0">
        <div className="sticky top-24">
          <SearchFilters {...filterProps} />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Mobile: filter button */}
        <div className="lg:hidden mb-4">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 border border-outline-variant rounded-xl px-4 py-2.5 text-sm font-semibold text-on-surface bg-surface-container-lowest hover:border-primary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 8h10M10 12h4" />
            </svg>
            Filtres
            {activeFilterCount > 0 && (
              <span className="bg-primary text-on-primary text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Results header: count + sort */}
        <div ref={gridRef} className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <p className="text-sm text-on-surface-variant">
            <span className="font-bold text-on-surface">{total}</span> judoka{total !== 1 ? 's' : ''} trouvé{total !== 1 ? 's' : ''}
          </p>
          <select
            value={activeOrdre}
            onChange={(e) => handleOrdreChange(e.target.value)}
            className="text-sm border border-outline-variant rounded-lg px-3 py-1.5 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Results grid */}
        {results.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-on-surface-variant mb-4">
              Aucun judoka ne correspond à ces critères — essaie d&apos;élargir ta recherche.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="bg-primary text-on-primary px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary-container transition-colors"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((card) => (
              <JudokaCardComponent key={card.slug} card={card} />
            ))}
          </div>
        )}

        {/* Pagination */}
        <Pagination
          page={currentPage}
          total={total}
          perPage={24}
          onPageChange={handlePageChange}
        />
      </main>

      {/* Mobile drawer */}
      <FiltersDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        {...filterProps}
      />
    </div>
  )
}
