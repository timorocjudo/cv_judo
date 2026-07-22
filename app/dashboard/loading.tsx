export default function Loading() {
  return (
    <div className="min-h-screen bg-background px-margin-mobile md:px-margin-desktop py-10 animate-pulse">
      <div className="max-w-container-max mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="h-9 w-48 bg-surface-container-highest rounded" />
          <div className="h-11 w-full md:w-56 bg-surface-container-highest rounded-lg" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-5 flex flex-col gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-surface-container-highest shrink-0" />
                <div className="flex flex-col gap-2 min-w-0 flex-1">
                  <div className="h-4 w-3/4 bg-surface-container-highest rounded" />
                  <div className="h-3 w-1/2 bg-surface-container-high rounded" />
                </div>
              </div>
              <div className="h-5 w-20 bg-surface-container-high rounded-full" />
              <div className="h-10 w-full bg-surface-container-highest rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
