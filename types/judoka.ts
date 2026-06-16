// types/judoka.ts
export type MedalType = 'gold' | 'silver' | 'bronze' | null

export interface Identity {
  firstName: string
  lastName: string
  club: string
  category: string
  grade: string
  profilePhoto: string
  coverPhoto: string
}

export interface PalmaresEntry {
  date: string          // ISO 8601: "2024-03-25"
  competition: string
  result: string
  category: string      // weight class + age category
  level: string         // "National Individuel" | "Régional" | etc.
  medal: MedalType
}

export interface Video {
  title: string
  youtubeUrl: string
  description: string
}

export interface GalleryImage {
  src: string
  caption: string
}

export interface Social {
  instagram?: string
  youtube?: string
}

export type BlockName = 'hero' | 'bio' | 'palmares' | 'videos' | 'gallery'

export interface JudokaData {
  slug: string
  identity: Identity
  bio: string
  palmares: PalmaresEntry[]
  videos: Video[]
  gallery: GalleryImage[]
  social: Social
  layout: BlockName[]
}
