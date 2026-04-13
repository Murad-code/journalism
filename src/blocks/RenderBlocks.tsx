import React, { Fragment } from 'react'

import type { Page } from '@/payload-types'

import { ArchiveBlock } from '@/blocks/ArchiveBlock/Component'
import { BreakingNewsBarBlock } from '@/blocks/BreakingNewsBar/Component'
import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { CategoryFeedBlock } from '@/blocks/CategoryFeed/Component'
import { ContentBlock } from '@/blocks/Content/Component'
import { DividerBlock } from '@/blocks/Divider/Component'
import { EmbedBlockComponent } from '@/blocks/EmbedBlock/Component'
import { LatestHeadlinesBlock } from '@/blocks/LatestHeadlines/Component'
import { ManualStoryGridBlock } from '@/blocks/ManualStoryGrid/Component'
import { MediaBlock } from '@/blocks/MediaBlock/Component'
import { NewsletterSignupBlock } from '@/blocks/NewsletterSignup/Component'
import { PartnerLogoRowBlock } from '@/blocks/PartnerLogoRow/Component'
import { SectionHeaderBlock } from '@/blocks/SectionHeader/Component'

const blockComponents = {
  archive: ArchiveBlock,
  breakingNewsBar: BreakingNewsBarBlock,
  categoryFeed: CategoryFeedBlock,
  content: ContentBlock,
  cta: CallToActionBlock,
  divider: DividerBlock,
  embedBlock: EmbedBlockComponent,
  latestHeadlines: LatestHeadlinesBlock,
  manualStoryGrid: ManualStoryGridBlock,
  mediaBlock: MediaBlock,
  newsletterSignup: NewsletterSignupBlock,
  partnerLogoRow: PartnerLogoRowBlock,
  sectionHeader: SectionHeaderBlock,
}

export const RenderBlocks: React.FC<{
  blocks: Page['layout'][0][]
}> = (props) => {
  const { blocks } = props

  const hasBlocks = blocks && Array.isArray(blocks) && blocks.length > 0

  if (hasBlocks) {
    return (
      <Fragment>
        {blocks.map((block, index) => {
          const { blockType } = block

          if (blockType && blockType in blockComponents) {
            const Block = blockComponents[blockType]

            if (Block) {
              return (
                <div className="my-16" key={index}>
                  {/* @ts-expect-error there may be some mismatch between the expected types here */}
                  <Block {...block} disableInnerContainer />
                </div>
              )
            }
          }
          return null
        })}
      </Fragment>
    )
  }

  return null
}
