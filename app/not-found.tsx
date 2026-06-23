import type { Metadata } from 'next'
import NotFoundContent from '@/components/NotFoundContent'

export const metadata: Metadata = {
  title: 'Page introuvable — IpponId',
  robots: { index: false },
}

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <NotFoundContent />
    </div>
  )
}
