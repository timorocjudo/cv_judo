import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import fs from 'fs'
import path from 'path'

const montserratBlack = fs.readFileSync(
  path.join(process.cwd(), 'public/fonts/Montserrat-Black.ttf')
)
const interBold = fs.readFileSync(
  path.join(process.cwd(), 'public/fonts/Inter-Bold.ttf')
)

const MEDAL_ORDER: Record<string, number> = { gold: 0, silver: 1, bronze: 2 }
const MEDAL_COLORS: Record<string, string> = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
}
const MEDAL_LABELS: Record<string, string> = {
  gold: 'OR',
  silver: 'ARG',
  bronze: 'BRZ',
}

type PRow = { result: string | null; competition: string | null; medal: string | null }

function sortByMedal(rows: PRow[]): PRow[] {
  return [...rows].sort((a, b) => {
    const oa = a.medal ? (MEDAL_ORDER[a.medal] ?? 3) : 3
    const ob = b.medal ? (MEDAL_ORDER[b.medal] ?? 3) : 3
    return oa - ob
  })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, club, grade, category, profile_photo_url')
    .eq('slug', params.slug)
    .eq('published', true)
    .maybeSingle()

  if (!profile) {
    return new Response('Not found', { status: 404 })
  }

  const { data: rawPalmares } = await supabase
    .from('palmares')
    .select('result, competition, medal')
    .eq('profile_id', profile.id)
    .limit(20)

  const top3 = sortByMedal(rawPalmares ?? []).slice(0, 3)
  const initials =
    (profile.first_name?.[0] ?? '') + (profile.last_name?.[0] ?? '')

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '1200px',
          height: '630px',
          backgroundColor: '#000666',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            padding: '64px',
            gap: '48px',
            alignItems: 'center',
          }}
        >
          {/* Left column */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              width: '380px',
              flexShrink: 0,
            }}
          >
            {/* Profile photo */}
            <div
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '60px',
                overflow: 'hidden',
                border: '3px solid rgba(255,255,255,0.2)',
                backgroundColor: '#1a237e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {profile.profile_photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.profile_photo_url}
                  alt=""
                  style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                />
              ) : (
                <span
                  style={{
                    fontFamily: 'Montserrat',
                    fontSize: '40px',
                    fontWeight: 900,
                    color: 'white',
                    textTransform: 'uppercase',
                  }}
                >
                  {initials}
                </span>
              )}
            </div>

            {/* Name */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'Montserrat',
                fontSize: '52px',
                fontWeight: 900,
                color: 'white',
                lineHeight: 1.05,
                textTransform: 'uppercase',
              }}
            >
              <span>{profile.first_name}</span>
              <span>{profile.last_name}</span>
            </div>

            {/* Club + grade */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span
                style={{
                  fontFamily: 'Inter',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#e9c349',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {profile.club ?? ''}
              </span>
              <span
                style={{
                  fontFamily: 'Inter',
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                {[profile.grade, profile.category].filter(Boolean).join(' · ')}
              </span>
            </div>
          </div>

          {/* Right column — palmarès */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              flex: 1,
            }}
          >
            {top3.length > 0 ? (
              top3.map((entry, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    backgroundColor: 'rgba(255,255,255,0.07)',
                    borderRadius: '12px',
                    padding: '18px 24px',
                    borderLeft: `4px solid ${entry.medal ? (MEDAL_COLORS[entry.medal] ?? '#c6c5d4') : '#c6c5d4'}`,
                  }}
                >
                  {entry.medal && (
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '18px',
                        backgroundColor: MEDAL_COLORS[entry.medal] ?? '#c6c5d4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'Inter',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#000',
                        }}
                      >
                        {MEDAL_LABELS[entry.medal]}
                      </span>
                    </div>
                  )}
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
                  >
                    <span
                      style={{
                        fontFamily: 'Inter',
                        fontSize: '18px',
                        fontWeight: 700,
                        color: 'white',
                      }}
                    >
                      {entry.result ?? ''}
                    </span>
                    <span
                      style={{
                        fontFamily: 'Inter',
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {entry.competition ?? ''}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                }}
              >
                <span
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '20px',
                    color: 'rgba(255,255,255,0.3)',
                    fontStyle: 'italic',
                  }}
                >
                  Athlète IpponId
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Gold bar bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '8px',
            backgroundColor: '#cba72f',
          }}
        />

        {/* Watermark */}
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
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
          data: montserratBlack as unknown as ArrayBuffer,
          weight: 900,
          style: 'normal',
        },
        {
          name: 'Inter',
          data: interBold as unknown as ArrayBuffer,
          weight: 700,
          style: 'normal',
        },
      ],
      headers: { 'Cache-Control': 'public, max-age=86400' },
    }
  )
}
