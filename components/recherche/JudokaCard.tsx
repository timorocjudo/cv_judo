import Link from 'next/link'
import Image from 'next/image'
import type { JudokaCard as JudokaCardType } from '@/lib/advancedSearch'

// Belt color swatch: 16×4px rectangle inline with grade badge
function GradeColor({ grade }: { grade: string }) {
  const colorMap: Record<string, string> = {
    '6e kyu': '#FFFFFF', '6e/5e kyu': '#FFD700',
    '5e kyu': '#FFD700', '5e/4e kyu': '#FF8C00',
    '4e kyu': '#FF8C00', '4e/3e kyu': '#2e7d32',
    '3e kyu': '#2e7d32', '3e/2e kyu': '#1565C0',
    '2e kyu': '#1565C0', '2e/1er kyu': '#8B4513',
    'Violette': '#6A0DAD',
    '1er kyu': '#8B4513',
    '1er dan': '#1a1a1a', '2e dan': '#1a1a1a', '3e dan+': '#1a1a1a',
  }
  const color = colorMap[grade]
  if (!color) return null
  return (
    <span
      className="inline-block w-4 h-1 rounded-sm border border-outline-variant/60 mr-1 align-middle"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  )
}

export default function JudokaCard({ card }: { card: JudokaCardType }) {
  const initials = (card.firstName[0] ?? '') + (card.lastName[0] ?? '')

  return (
    <Link
      href={`/${card.slug}`}
      className="group flex flex-col items-center p-5 bg-surface-container-lowest border border-outline-variant rounded-2xl
                 hover:shadow-md hover:border-tertiary-container transition-all duration-150"
    >
      {/* Photo / Initials */}
      <div className="mb-3">
        {card.profilePhotoUrl ? (
          <Image
            src={card.profilePhotoUrl}
            alt=""
            width={64}
            height={64}
            className="w-16 h-16 rounded-full object-cover object-top"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center">
            <span className="font-montserrat font-bold text-on-primary text-xl uppercase">
              {initials}
            </span>
          </div>
        )}
      </div>

      {/* Name */}
      <p className="font-montserrat font-bold text-on-surface text-sm text-center leading-tight mb-1 group-hover:text-primary transition-colors">
        {card.firstName} {card.lastName}
      </p>

      {/* Club */}
      {card.club && (
        <p className="text-xs text-on-surface-variant text-center mb-2 truncate max-w-full">
          {card.club.name}
        </p>
      )}

      {/* Badges */}
      <div className="flex flex-wrap justify-center gap-1 mt-auto">
        {card.grade && (
          <span className="inline-flex items-center text-xs bg-surface-container px-2 py-0.5 rounded-full text-on-surface-variant">
            <GradeColor grade={card.grade} />
            {card.grade}
          </span>
        )}
        {card.weightCategory && (
          <span className="text-xs bg-surface-container px-2 py-0.5 rounded-full text-on-surface-variant">
            {card.weightCategory}
          </span>
        )}
      </div>
    </Link>
  )
}
