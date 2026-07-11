'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import SearchAutocomplete from '@/components/SearchAutocomplete'

function SearchFallback() {
  return (
    <div className="max-w-2xl mx-auto flex items-center bg-white rounded-xl shadow-xl border border-outline-variant p-2">
      <input
        type="text"
        disabled
        placeholder="Rechercher un judoka…"
        className="flex-1 border-none outline-none px-4 py-3 text-on-surface placeholder:text-outline bg-transparent"
      />
    </div>
  )
}

export default function SearchWithAdvancedLink() {
  const [query, setQuery] = useState('')

  const advancedHref = query.trim()
    ? `/recherche?q=${encodeURIComponent(query.trim())}`
    : '/recherche'

  return (
    <div>
      <Suspense fallback={<SearchFallback />}>
        <SearchAutocomplete className="max-w-2xl mx-auto" onQueryChange={setQuery} />
      </Suspense>
      <div className="mt-3 text-center">
        <Link
          href={advancedHref}
          className="text-sm text-on-surface-variant hover:text-primary transition-colors"
        >
          Recherche avancée →
        </Link>
      </div>
    </div>
  )
}
