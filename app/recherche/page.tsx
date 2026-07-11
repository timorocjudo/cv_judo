import { Suspense } from 'react'
import type { Metadata } from 'next'
import { searchJudokasAdvanced, parseSearchParams } from '@/lib/advancedSearch'
import SearchPageClient from '@/components/recherche/SearchPageClient'
import Loading from './loading'
import { AGE_CATEGORY_GROUPS, GRADE_FILTER_OPTIONS } from '@/lib/searchFilterConfig'

type Props = {
  searchParams: Record<string, string | string[] | undefined>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const hasFilters = Object.values(searchParams).some((v) => v !== undefined)

  if (!hasFilters) {
    return {
      title: 'Annuaire des judokas — IpponId',
      description: "Retrouve tous les judokas sur IpponId. Filtre par catégorie d'âge, grade, poids et club.",
      robots: { index: true, follow: true },
    }
  }

  // Build dynamic title from active filters
  const parts: string[] = []
  const categorieSlug = (searchParams.categorie as string | undefined)?.split(',')[0]
  const gradeSlug = (searchParams.grade as string | undefined)?.split(',')[0]
  if (categorieSlug) {
    const label = AGE_CATEGORY_GROUPS.find((g) => g.slug === categorieSlug)?.label
    if (label) parts.push(label)
  }
  if (gradeSlug) {
    const label = GRADE_FILTER_OPTIONS.find((g) => g.slug === gradeSlug)?.label
    if (label) parts.push(`Ceinture ${label}`)
  }

  const title =
    parts.length > 0
      ? `Judokas ${parts.join(' · ')} — IpponId`
      : 'Recherche avancée — IpponId'

  return {
    title,
    description: `Recherche de judokas avec filtres sur IpponId.`,
    robots: { index: false },
  }
}

export default async function RecherchePage({ searchParams }: Props) {
  const params = parseSearchParams(searchParams)
  const { results, total, resolvedClub } = await searchJudokasAdvanced(params)

  return (
    <>
      {/* Page header */}
      <div className="px-margin-mobile md:px-margin-desktop pt-8 max-w-container-max mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-8 bg-tertiary-container" />
          <h1 className="font-montserrat text-headline-md font-bold text-primary uppercase">
            Annuaire des judokas
          </h1>
        </div>
      </div>

      <Suspense fallback={<Loading />}>
        <SearchPageClient results={results} total={total} resolvedClub={resolvedClub} />
      </Suspense>
    </>
  )
}
