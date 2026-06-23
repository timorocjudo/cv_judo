'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { GalleryImage } from '@/types/judoka'
import Lightbox from '@/components/Lightbox'

interface GalleryBlockProps {
  gallery: GalleryImage[]
}

export default function GalleryBlock({ gallery }: GalleryBlockProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (!gallery.length) return null

  return (
    <section className="py-10 md:py-14 bg-surface-container-lowest">
      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
          <h2 className="font-montserrat text-headline-md font-bold text-primary">
            Galerie
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {gallery.map((image, i) => {
            const isFeature = i === 2
            return (
              <figure
                key={i}
                onClick={() => setLightboxIndex(i)}
                className={`relative overflow-hidden rounded-xl bg-surface-container-high group cursor-pointer ${
                  isFeature ? 'col-span-2 md:col-span-2 md:row-span-2' : ''
                }`}
              >
                <div className={isFeature ? 'aspect-[4/3] md:aspect-auto md:h-full min-h-[240px]' : 'aspect-square'}>
                  <Image
                    src={image.src}
                    alt={image.caption}
                    fill
                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-105"
                    sizes={
                      isFeature
                        ? '(min-width: 768px) 50vw, 100vw'
                        : '(min-width: 768px) 25vw, 50vw'
                    }
                  />
                </div>
                {image.caption && (
                  <figcaption className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-primary/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <p className="font-inter text-xs font-bold uppercase tracking-wider text-white">
                      {image.caption}
                    </p>
                  </figcaption>
                )}
              </figure>
            )
          })}
        </div>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          images={gallery}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </section>
  )
}
