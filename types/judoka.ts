// types/judoka.ts
export type MedalType = 'gold' | 'silver' | 'bronze' | null

export interface Identity {
  firstName: string
  lastName: string
  club: string
  birthDate: string   // ISO 8601: "2010-04-02"
  weightCategory: string
  grade: string
  profilePhoto: string
  coverPhoto: string
  height?: number     // cm
  weight?: number     // kg
  nationality?: string
}

export interface PalmaresEntry {
  date: string          // ISO 8601: "2024-03-25"
  competition: string
  result: string
  category: string      // weight class + age category
  level: string         // "National Individuel" | "Régional" | etc.
  medal: MedalType
  city?: string
  podiumPhoto?: string  // relative path to podium photo, e.g. "/images/podium-France-2023.jpg"
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

export interface Technique {
  name: string
  description?: string | null
  image?: string | null
}

export interface Social {
  instagram?: string
  youtube?: string
}

export type BlockName = 'hero' | 'bio' | 'palmares' | 'videos' | 'gallery' | 'techniques'

export interface JudokaData {
  slug: string
  identity: Identity
  bio: string
  palmares: PalmaresEntry[]
  videos: Video[]
  gallery: GalleryImage[]
  techniques: Technique[]
  social: Social
  layout: BlockName[]
}
