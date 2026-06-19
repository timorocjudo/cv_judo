export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* Cover photo skeleton */}
      <div className="w-full h-64 md:h-80 bg-surface-container-high" />

      {/* Identity block skeleton */}
      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto py-10 flex gap-6 items-end -mt-16">
        <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-surface-container-highest shrink-0 border-4 border-background" />
        <div className="flex flex-col gap-3 pb-2">
          <div className="h-8 w-48 bg-surface-container-highest rounded" />
          <div className="h-4 w-32 bg-surface-container-high rounded" />
          <div className="h-4 w-24 bg-surface-container-high rounded" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto pb-10 grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="h-10 w-16 bg-surface-container-highest rounded" />
            <div className="h-3 w-20 bg-surface-container-high rounded" />
          </div>
        ))}
      </div>

      {/* Section skeleton */}
      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto py-10 space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 bg-surface-container-highest rounded" />
          <div className="h-6 w-40 bg-surface-container-highest rounded" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-4 bg-surface-container-high rounded w-full" style={{ width: `${85 - i * 10}%` }} />
        ))}
      </div>
    </div>
  )
}
