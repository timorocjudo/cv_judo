import type { PalmaresEntry } from '@/types/judoka'

export interface PalmaresStats {
  totalCompetitions: number
  totalPodiums: number
  goldCount: number
  silverCount: number
  bronzeCount: number
}

export function computePalmaresStats(palmares: PalmaresEntry[]): PalmaresStats {
  return {
    totalCompetitions: palmares.length,
    totalPodiums: palmares.filter((e) => e.medal != null).length,
    goldCount: palmares.filter((e) => e.medal === 'gold').length,
    silverCount: palmares.filter((e) => e.medal === 'silver').length,
    bronzeCount: palmares.filter((e) => e.medal === 'bronze').length,
  }
}
