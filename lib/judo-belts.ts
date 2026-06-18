export type Belt = {
  slug: string
  label: string
  color: string
  color2?: string
  lisere: string | null
  border: string
}

export const BELTS: Belt[] = [
  { slug: 'blanc',        label: '6e kyu',     color: '#FFFFFF',            lisere: null,      border: '#d1d5db' },
  { slug: 'blanc-jaune',  label: '6e/5e kyu',  color: '#FFFFFF', color2: '#FFD700', lisere: null, border: '#d4a800' },
  { slug: 'jaune',        label: '5e kyu',     color: '#FFD700',            lisere: '#FFFFFF', border: '#d4a800' },
  { slug: 'jaune-orange', label: '5e/4e kyu',  color: '#FFD700', color2: '#FF8C00', lisere: null, border: '#cc7000' },
  { slug: 'orange',       label: '4e kyu',     color: '#FF8C00',            lisere: '#FFFFFF', border: '#cc7000' },
  { slug: 'orange-verte', label: '4e/3e kyu',  color: '#FF8C00', color2: '#2e7d32', lisere: null, border: '#1b5e20' },
  { slug: 'verte',        label: '3e kyu',     color: '#2e7d32',            lisere: '#FFFFFF', border: '#1b5e20' },
  { slug: 'verte-bleue',  label: '3e/2e kyu',  color: '#2e7d32', color2: '#1565C0', lisere: null, border: '#0d47a1' },
  { slug: 'bleue',        label: '2e kyu',     color: '#1565C0',            lisere: '#FFFFFF', border: '#0d47a1' },
  { slug: 'bleue-marron', label: '2e/1er kyu', color: '#1565C0', color2: '#8B4513', lisere: null, border: '#6d3410' },
  { slug: 'violette',     label: 'Violette',   color: '#6A0DAD',            lisere: null,      border: '#5b0091' },
  { slug: 'marron',       label: '1er kyu',    color: '#8B4513',            lisere: '#FFFFFF', border: '#6d3410' },
  { slug: 'noire-1',      label: '1er dan',    color: '#1a1a1a',            lisere: null,      border: '#444444' },
  { slug: 'noire-2',      label: '2e dan',     color: '#1a1a1a',            lisere: null,      border: '#444444' },
  { slug: 'noire-3',      label: '3e dan+',    color: '#1a1a1a',            lisere: null,      border: '#444444' },
]

export function getBeltBySlug(slug: string): Belt | undefined {
  return BELTS.find((b) => b.slug === slug)
}

export function getBeltByLabel(label: string): Belt | undefined {
  return BELTS.find((b) => b.label === label)
}
