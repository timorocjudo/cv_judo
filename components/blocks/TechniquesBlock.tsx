import Image from 'next/image'
import type { Technique } from '@/types/judoka'

interface TechniquesBlockProps {
  techniques: Technique[]
}

export default function TechniquesBlock({ techniques }: TechniquesBlockProps) {
  if (!techniques.length) return null

  return (
    <section className="py-16 md:py-24 px-margin-mobile md:px-margin-desktop">
      <div className="max-w-container-max mx-auto">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
          <h2 className="font-montserrat text-headline-md font-bold text-primary uppercase tracking-tight">
            Techniques préférées
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {techniques.map((technique, i) => (
            <div
              key={i}
              className="rounded-xl bg-surface-container overflow-hidden group"
            >
              <div className="relative aspect-[4/3]">
                {technique.image ? (
                  <Image
                    src={technique.image}
                    alt={technique.name}
                    fill
                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-105"
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-container" />
                )}
              </div>

              <div className="p-4">
                <p className="font-montserrat font-bold text-primary text-base uppercase tracking-tight">
                  {technique.name}
                </p>
                {technique.description && (
                  <p className="font-inter text-sm text-on-surface-variant mt-1 leading-relaxed">
                    {technique.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
