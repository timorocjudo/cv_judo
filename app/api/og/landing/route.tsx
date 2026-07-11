import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { origin } = new URL(request.url)

  const [montserratBlack, interBold] = await Promise.all([
    fetch(`${origin}/fonts/Montserrat-Black.ttf`).then(r => r.arrayBuffer()),
    fetch(`${origin}/fonts/Inter-Bold.ttf`).then(r => r.arrayBuffer()),
  ])

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '1200px',
          height: '630px',
          backgroundColor: '#1B3A6B',
          position: 'relative',
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Cercle déco top-left */}
        <div
          style={{
            position: 'absolute',
            top: '-200px',
            left: '-200px',
            width: '600px',
            height: '600px',
            borderRadius: '300px',
            backgroundColor: '#1E4A8A',
            opacity: 0.15,
          }}
        />
        {/* Cercle déco bottom-right */}
        <div
          style={{
            position: 'absolute',
            bottom: '-150px',
            right: '-150px',
            width: '500px',
            height: '500px',
            borderRadius: '250px',
            backgroundColor: '#1E4A8A',
            opacity: 0.15,
          }}
        />

        {/* Contenu centré */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          {/* Wordmark */}
          <div
            style={{
              display: 'flex',
              fontFamily: 'Montserrat',
              fontSize: '72px',
              fontWeight: 900,
              letterSpacing: '-0.02em',
            }}
          >
            <span style={{ color: 'white' }}>Ippon</span>
            <span style={{ color: '#D4A017' }}>Id</span>
          </div>

          {/* Barre or */}
          <div
            style={{
              width: '80px',
              height: '4px',
              backgroundColor: '#D4A017',
              margin: '24px 0',
            }}
          />

          {/* Slogan */}
          <div
            style={{
              fontFamily: 'Montserrat',
              fontSize: '56px',
              fontWeight: 900,
              color: 'white',
              lineHeight: 1.1,
              textAlign: 'center',
              maxWidth: '900px',
            }}
          >
            Ton palmarès mérite sa propre page.
          </div>

          {/* Sous-titre */}
          <div
            style={{
              fontFamily: 'Inter',
              fontSize: '22px',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.6)',
              marginTop: '24px',
              textAlign: 'center',
              maxWidth: '700px',
            }}
          >
            Crée gratuitement ta page judoka avec ton palmarès, tes vidéos et ta galerie photo.
          </div>
        </div>

        {/* Watermark */}
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            right: '64px',
            fontFamily: 'Inter',
            fontSize: '13px',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
          }}
        >
          ipponid.com
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Montserrat',
          data: montserratBlack,
          weight: 900,
          style: 'normal',
        },
        {
          name: 'Inter',
          data: interBold,
          weight: 700,
          style: 'normal',
        },
      ],
      headers: { 'Cache-Control': 'public, max-age=604800, immutable' },
    }
  )
}
