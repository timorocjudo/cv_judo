import type { JudokaData, BlockName } from '@/types/judoka'
import HeroBlock from '@/components/blocks/HeroBlock'
import BioBlock from '@/components/blocks/BioBlock'
import PalmaresBlock from '@/components/blocks/PalmaresBlock'
import VideosBlock from '@/components/blocks/VideosBlock'
import GalleryBlock from '@/components/blocks/GalleryBlock'
import TechniquesBlock from '@/components/blocks/TechniquesBlock'
import FadeInOnScroll from '@/components/FadeInOnScroll'

// Each renderer receives the full JudokaData and extracts only the props its block needs.
// Components never import the data file — this registry is the single coupling point.
type BlockRenderer = (data: JudokaData) => React.ReactElement

export const blockRegistry: Record<BlockName, BlockRenderer> = {
  hero:       (data) => <HeroBlock identity={data.identity} social={data.social} slug={data.slug} />,
  bio:        (data) => <FadeInOnScroll delay={0.1}><BioBlock bio={data.bio} /></FadeInOnScroll>,
  palmares:   (data) => <FadeInOnScroll delay={0.1}><PalmaresBlock palmares={data.palmares} birthDate={data.identity.birthDate} slug={data.slug} /></FadeInOnScroll>,
  videos:     (data) => <FadeInOnScroll delay={0.1}><VideosBlock videos={data.videos} /></FadeInOnScroll>,
  gallery:    (data) => <FadeInOnScroll delay={0.1}><GalleryBlock gallery={data.gallery} /></FadeInOnScroll>,
  techniques: (data) => <FadeInOnScroll delay={0.1}><TechniquesBlock techniques={data.techniques} /></FadeInOnScroll>,
}
