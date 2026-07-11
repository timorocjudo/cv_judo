export default function CardSkeleton() {
  return (
    <div className="flex flex-col items-center p-5 bg-surface-container-lowest border border-outline-variant rounded-2xl animate-pulse">
      <div className="w-16 h-16 rounded-full bg-surface-container mb-3" />
      <div className="h-4 w-24 bg-surface-container rounded mb-1" />
      <div className="h-3 w-20 bg-surface-container rounded mb-3" />
      <div className="flex gap-1">
        <div className="h-5 w-14 bg-surface-container rounded-full" />
        <div className="h-5 w-10 bg-surface-container rounded-full" />
      </div>
    </div>
  )
}
