interface BioBlockProps {
  bio: string
  firstName: string
}

export default function BioBlock({ bio, firstName }: BioBlockProps) {
  return (
    <section className="py-10 md:py-14 px-margin-mobile md:px-margin-desktop">
      <div className="max-w-container-max mx-auto grid grid-cols-1 md:grid-cols-12 gap-gutter items-start">
        {/* Left column: section label */}
        <div className="md:col-span-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
            <h2 className="font-montserrat text-headline-md font-bold text-primary uppercase tracking-tight">
              Profil
            </h2>
          </div>
          <p className="font-inter text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-4">
            {firstName}
          </p>
        </div>

        {/* Right column: bio text */}
        <div className="md:col-span-8">
          <p className="font-inter text-body-lg text-on-surface-variant leading-relaxed">
            {bio}
          </p>
        </div>
      </div>
    </section>
  )
}
