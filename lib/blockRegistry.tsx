import type { JudokaData, BlockName } from '@/types/judoka'
import HeroBlock from '@/components/blocks/HeroBlock'
import BioBlock from '@/components/blocks/BioBlock'
import PalmaresBlock from '@/components/blocks/PalmaresBlock'
import VideosBlock from '@/components/blocks/VideosBlock'
import GalleryBlock from '@/components/blocks/GalleryBlock'
import TechniquesBlock from '@/components/blocks/TechniquesBlock'

// Each renderer receives the full JudokaData and extracts only the props its block needs.
// Components never import the data file — this registry is the single coupling point.
type BlockRenderer = (data: JudokaData) => React.ReactElement

export const blockRegistry: Record<BlockName, BlockRenderer> = {
  hero:       (data) => <HeroBlock identity={data.identity} social={data.social} slug={data.slug} />,
  bio:        (data) => <BioBlock bio={data.bio} firstName={data.identity.firstName} />,
  palmares:   (data) => <PalmaresBlock palmares={data.palmares} birthDate={data.identity.birthDate} />,
  videos:     (data) => <VideosBlock videos={data.videos} />,
  gallery:    (data) => <GalleryBlock gallery={data.gallery} />,
  techniques: (data) => <TechniquesBlock techniques={data.techniques} />,
}
