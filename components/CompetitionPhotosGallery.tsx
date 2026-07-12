'use client'

import { useState } from 'react'
import Image from 'next/image'
import Lightbox from '@/components/Lightbox'
import type { GalleryImage } from '@/types/judoka'

interface Props {
  photos: GalleryImage[]
}

export default function CompetitionPhotosGallery({ photos }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {photos.map((photo, i) => (
          <figure
            key={i}
            role="button"
            tabIndex={0}
            onClick={() => setLightboxIndex(i)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setLightboxIndex(i) }}
            className="relative overflow-hidden rounded-xl bg-surface-container-high group cursor-pointer aspect-square"
          >
            <Image
              src={photo.src}
              alt={photo.caption}
              fill
              className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-105"
              sizes="(min-width: 768px) 25vw, 50vw"
            />
            {photo.caption && (
              <figcaption className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-primary/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <p className="font-inter text-xs font-bold uppercase tracking-wider text-white">
                  {photo.caption}
                </p>
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          images={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}
