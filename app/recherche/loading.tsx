import CardSkeleton from '@/components/recherche/CardSkeleton'

export default function Loading() {
  return (
    <div className="flex gap-8 px-margin-mobile md:px-margin-desktop py-8 max-w-container-max mx-auto">
      {/* Sidebar skeleton */}
      <aside className="hidden lg:block w-[280px] shrink-0 space-y-4 animate-pulse">
        <div className="h-6 w-20 bg-surface-container rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-28 bg-surface-container rounded" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-4 w-full bg-surface-container rounded" />
            ))}
          </div>
        ))}
      </aside>

      {/* Grid skeleton */}
      <main className="flex-1 min-w-0">
        <div className="h-5 w-36 bg-surface-container rounded mb-6 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </main>
    </div>
  )
}
