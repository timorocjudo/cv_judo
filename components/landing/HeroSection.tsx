'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { searchJudokas } from '@/lib/judokaService'

export default function HeroSection() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [noResult, setNoResult] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setNoResult(false)
    const results = await searchJudokas(query)
    setLoading(false)
    if (results.length > 0) {
      router.push(`/${results[0].slug}`)
    } else {
      setNoResult(true)
    }
  }

  return (
    <section className="relative px-margin-mobile md:px-margin-desktop pt-16 pb-10 text-center overflow-hidden">
      {/* Décorations de fond */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <h1 className="font-montserrat text-headline-lg-mobile md:text-headline-lg font-black text-primary mb-6 leading-tight">
          Ton palmarès judo mérite<br className="hidden md:block" /> sa propre page
        </h1>
        <p className="text-body-lg text-on-surface-variant mb-10 max-w-2xl mx-auto">
          Crée ta page CV de judoka gratuitement. Partage ton parcours, tes grades et tes victoires avec ton URL personnalisée.
        </p>

        <form
          onSubmit={handleSearch}
          className="flex flex-col md:flex-row items-center gap-2 max-w-2xl mx-auto bg-white rounded-xl shadow-xl border border-outline-variant p-2"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setNoResult(false) }}
            placeholder="Rechercher un judoka…"
            className="flex-1 w-full border-none focus:ring-0 px-4 py-3 text-on-surface placeholder:text-outline bg-transparent"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto bg-secondary text-on-secondary px-8 py-3 rounded-lg font-semibold whitespace-nowrap hover:bg-secondary-container transition-colors active:scale-95 disabled:opacity-60"
          >
            {loading ? 'Recherche…' : 'Rechercher'}
          </button>
        </form>

        {noResult && (
          <div className="mt-6 p-5 bg-surface-container rounded-xl border border-outline-variant">
            <p className="text-on-surface-variant mb-4">
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
      </div>
    </section>
  )
}
