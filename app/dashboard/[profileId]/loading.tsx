export default function Loading() {
  return (
    <div className="px-margin-mobile md:px-margin-desktop py-6 md:py-10 max-w-container-max animate-pulse">
      {/* Carte résumé */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6 flex items-center gap-5 mb-8">
        <div className="w-16 h-16 rounded-full bg-surface-container-highest shrink-0" />
        <div className="flex flex-col gap-2 min-w-0">
          <div className="h-6 w-40 bg-surface-container-highest rounded" />
          <div className="h-4 w-24 bg-surface-container-high rounded" />
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 mb-6 space-y-3">
        <div className="h-4 w-32 bg-surface-container-highest rounded mb-2" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-4 bg-surface-container-high rounded" style={{ width: `${70 - i * 8}%` }} />
        ))}
      </div>

      {/* Visibilité */}
      <div className="h-24 w-full bg-surface-container-highest rounded-xl mb-6" />

      {/* Lien page publique */}
      <div className="h-11 w-52 bg-surface-container-highest rounded-lg" />
    </div>
  )
}
