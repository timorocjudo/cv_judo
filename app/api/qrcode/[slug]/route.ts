import { NextRequest } from 'next/server'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createClient()
  const { data } = await supabase
    .from('profiles')
    .select('slug, visibility')
    .eq('slug', params.slug)
    .maybeSingle()

  if (!data || data.visibility === 'draft') {
    return new Response(null, { status: 404 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ipponid.com'
  const profileUrl = `${siteUrl}/${params.slug}`

  const buffer = await QRCode.toBuffer(profileUrl, {
    width: 512,
    margin: 2,
    color: { dark: '#1B3A6B', light: '#FFFFFF' },
    errorCorrectionLevel: 'M',
  })

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
