'use client'

import { useState } from 'react'
import ShareButtons from '@/components/ShareButtons'

interface PalmaresShareButtonProps {
  slug: string
  resultId: string
}

export default function PalmaresShareButton({ slug, resultId }: PalmaresShareButtonProps) {
  const [open, setOpen] = useState(false)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const url = `${siteUrl}/${slug}#result-${resultId}`
  const imageUrl = `${siteUrl}/api/og/result/${slug}/${resultId}`

  return (
    <div className="relative flex flex-col items-center">
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Partager ce résultat"
        title="Partager ce résultat"
        className="text-on-surface-variant hover:text-primary transition-colors p-1"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-20 p-3 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-lg min-w-max">
          <ShareButtons
            url={url}
            imageUrl={imageUrl}
            title={`Découvrez ce résultat sur IpponId — ipponid.com/${slug}`}
            variant="light"
          />
        </div>
      )}
    </div>
  )
}
