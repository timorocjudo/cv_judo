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

const MEDAL_COLORS: Record<string, string> = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string; resultId: string } }
) {
  const supabase = createClient()

  const { data: entry } = await supabase
    .from('palmares')
    .select('result, competition, medal, date, city, category, profile_id')
    .eq('id', params.resultId)
    .maybeSingle()

  if (!entry) {
    return new Response('Not found', { status: 404 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, profile_photo_url, cover_photo_url')
    .eq('id', entry.profile_id)
    .eq('slug', params.slug)
    .eq('published', true)
    .maybeSingle()

  if (!profile) {
    return new Response('Not found', { status: 404 })
  }

  const medalColor = entry.medal ? (MEDAL_COLORS[entry.medal] ?? '#cba72f') : '#cba72f'
  const initials =
    (profile.first_name?.[0] ?? '') + (profile.last_name?.[0] ?? '')

  const detailParts: string[] = [formatDate(entry.date)]
  if (entry.city) detailParts.push(entry.city)
  if (entry.category) detailParts.push(entry.category)
  const detailLine = detailParts.filter(Boolean).join(' · ')

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '1200px',
          height: '630px',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#000666',
        }}
      >
        {/* Cover photo background */}
        {profile.cover_photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.cover_photo_url}
            alt=""
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '1200px',
              height: '630px',
              objectFit: 'cover',
            }}
          />
        )}

        {/* Dark overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,6,102,0.85)',
          }}
        />

        {/* Center content */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            paddingBottom: '80px',
            gap: '16px',
          }}
        >
          {/* Medal circle */}
          <div
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '48px',
              backgroundColor: medalColor,
              border: '6px solid rgba(255,255,255,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontFamily: 'Montserrat',
                fontSize: '36px',
                fontWeight: 900,
                color: '#000',
              }}
            >
              {entry.medal === 'gold' ? '1' : entry.medal === 'silver' ? '2' : entry.medal === 'bronze' ? '3' : '★'}
            </span>
          </div>

          {/* Result — hero text */}
          <div
            style={{
              fontFamily: 'Montserrat',
              fontSize: entry.result && entry.result.length > 20 ? '56px' : '80px',
              fontWeight: 900,
              color: 'white',
              textTransform: 'uppercase',
              textAlign: 'center',
              lineHeight: 1.05,
              paddingLeft: '80px',
              paddingRight: '80px',
            }}
          >
            {entry.result ?? ''}
          </div>

          {/* Competition name */}
          <div
            style={{
              fontFamily: 'Inter',
              fontSize: '28px',
              fontWeight: 700,
              color: 'white',
              textAlign: 'center',
              paddingLeft: '80px',
              paddingRight: '80px',
            }}
          >
            {entry.competition ?? ''}
          </div>

          {/* Date + city + category */}
          {detailLine && (
            <div
              style={{
                fontFamily: 'Inter',
                fontSize: '18px',
                fontWeight: 700,
                color: '#c6c5d4',
                textAlign: 'center',
              }}
            >
              {detailLine}
            </div>
          )}
        </div>

        {/* Bottom row: profile info + branding */}
        <div
          style={{
            position: 'absolute',
            bottom: '36px',
            left: '64px',
            right: '64px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '28px',
                overflow: 'hidden',
                border: '2px solid rgba(255,255,255,0.2)',
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
                  style={{ width: '56px', height: '56px', objectFit: 'cover' }}
                />
              ) : (
                <span
                  style={{
                    fontFamily: 'Montserrat',
                    fontSize: '18px',
                    fontWeight: 900,
                    color: 'white',
                    textTransform: 'uppercase',
                  }}
                >
                  {initials}
                </span>
              )}
            </div>
            <span
              style={{
                fontFamily: 'Inter',
                fontSize: '18px',
                fontWeight: 700,
                color: 'white',
              }}
            >
              {profile.first_name} {profile.last_name}
            </span>
          </div>

          {/* Branding */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '2px',
            }}
          >
            <span
              style={{
                fontFamily: 'Montserrat',
                fontSize: '22px',
                fontWeight: 900,
                color: 'white',
                textTransform: 'uppercase',
                letterSpacing: '-0.02em',
              }}
            >
              IpponId
            </span>
            <span
              style={{
                fontFamily: 'Inter',
                fontSize: '14px',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.45)',
              }}
            >
              ipponid.com/{params.slug}
            </span>
          </div>
        </div>

        {/* Gold bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '6px',
            backgroundColor: medalColor,
          }}
        />
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
