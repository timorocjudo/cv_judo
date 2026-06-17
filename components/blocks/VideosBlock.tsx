import type { Video } from '@/types/judoka'

interface VideosBlockProps {
  videos: Video[]
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([^&?/]+)/)
  return match?.[1] ?? null
}

export default function VideosBlock({ videos }: VideosBlockProps) {
  if (!videos.length) return null

  return (
    <section className="py-10 md:py-14 bg-surface-container border-y border-outline-variant">
      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-1 h-8 bg-tertiary-container rounded-full flex-shrink-0" />
          <h2 className="font-montserrat text-headline-md font-bold text-primary uppercase tracking-tight">
            Highlights
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {videos.map((video, i) => {
            const videoId = extractYouTubeId(video.youtubeUrl)
            return (
              <div key={i}>
                <div className="relative aspect-video rounded-xl overflow-hidden shadow-lg bg-primary-container">
                  {videoId ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title={video.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full border-0"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-on-primary-container">
                      <p className="font-inter text-sm">Vidéo non disponible</p>
                    </div>
                  )}
                </div>
                <div className="mt-3 px-1">
                  <h3 className="font-montserrat text-base font-bold text-primary leading-snug">
                    {video.title}
                  </h3>
                  {video.description && (
                    <p className="font-inter text-sm text-on-surface-variant mt-1 leading-relaxed">
                      {video.description}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
