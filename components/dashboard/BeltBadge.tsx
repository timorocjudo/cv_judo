import type { Belt } from '@/lib/judo-belts'

interface BeltBadgeProps {
  belt: Belt
  width?: number
  height?: number
}

export function BeltBadge({ belt, width = 140, height = 24 }: BeltBadgeProps) {
  const r = 4
  const lisere = 3
  const stripeWidth = 10
  const patternId = `stripe-${belt.slug}`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label={belt.label}
      role="img"
    >
      <defs>
        {belt.color2 && (
          <pattern id={patternId} x="0" y="0" width={stripeWidth * 2} height={height} patternUnits="userSpaceOnUse">
            <rect x={0}           y={0} width={stripeWidth} height={height} fill={belt.color} />
            <rect x={stripeWidth} y={0} width={stripeWidth} height={height} fill={belt.color2} />
          </pattern>
        )}
        <linearGradient id={`vol-${belt.slug}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="white" stopOpacity="0.18" />
          <stop offset="45%"  stopColor="white" stopOpacity="0" />
          <stop offset="100%" stopColor="black" stopOpacity="0.18" />
        </linearGradient>
      </defs>

      {/* Corps */}
      <rect x={0} y={0} width={width} height={height} rx={r}
        fill={belt.color2 ? `url(#${patternId})` : belt.color}
      />

      {/* Liséré haut */}
      {belt.lisere && (
        <rect x={0} y={0} width={width} height={lisere} rx={r} fill={belt.lisere} opacity={0.85} />
      )}

      {/* Liséré bas */}
      {belt.lisere && (
        <rect x={0} y={height - lisere} width={width} height={lisere} fill={belt.lisere} opacity={0.85} />
      )}

      {/* Volume */}
      <rect x={0} y={0} width={width} height={height} rx={r} fill={`url(#vol-${belt.slug})`} />

      {/* Contour */}
      <rect x={0.75} y={0.75} width={width - 1.5} height={height - 1.5} rx={r - 0.5}
        fill="none" stroke={belt.border} strokeWidth={1.5} strokeOpacity={0.5}
      />
    </svg>
  )
}
