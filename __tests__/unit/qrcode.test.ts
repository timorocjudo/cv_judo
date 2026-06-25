import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mocks AVANT les imports du module testé
const mockMaybeSingle = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ from: mockFrom }),
}))

vi.mock('qrcode', () => ({
  default: { toBuffer: vi.fn().mockResolvedValue(Buffer.from('fake-png-data')) },
}))

import { GET } from '@/app/api/qrcode/[slug]/route'

function setupProfile(profile: { slug: string; visibility: string } | null) {
  mockMaybeSingle.mockResolvedValue({ data: profile, error: null })
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }),
    }),
  })
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/qrcode/[slug]', () => {
  it('retourne un PNG 200 pour un slug valide et public', async () => {
    setupProfile({ slug: 'timothe-francois', visibility: 'public' })
    const res = await GET(null as never, { params: { slug: 'timothe-francois' } })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/png')
  })

  it('retourne un PNG 200 pour un profil privé (private)', async () => {
    setupProfile({ slug: 'judoka-prive', visibility: 'private' })
    const res = await GET(null as never, { params: { slug: 'judoka-prive' } })
    expect(res.status).toBe(200)
  })

  it('retourne 404 pour un slug inexistant', async () => {
    setupProfile(null)
    const res = await GET(null as never, { params: { slug: 'inexistant' } })
    expect(res.status).toBe(404)
  })

  it('retourne 404 pour un profil en brouillon (draft)', async () => {
    setupProfile({ slug: 'brouillon', visibility: 'draft' })
    const res = await GET(null as never, { params: { slug: 'brouillon' } })
    expect(res.status).toBe(404)
  })
})
