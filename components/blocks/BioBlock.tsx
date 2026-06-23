interface BioBlockProps {
  bio: string
}

export default function BioBlock({ bio }: BioBlockProps) {
  return (
    <section className="py-10 md:py-14">
      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
          <h2 className="font-montserrat text-headline-md font-bold text-primary tracking-tight">
            Profil
          </h2>
        </div>
        <p className="font-inter text-justify text-body-lg text-on-surface-variant leading-relaxed">
          {bio}
        </p>
      </div>
    </section>
  )
}
