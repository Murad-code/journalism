import type { Media, PartnerLogoRowBlock as PartnerLogoRowBlockProps } from '@/payload-types'

import { Media as MediaComponent } from '@/components/Media'
import React from 'react'

export const PartnerLogoRowBlock: React.FC<PartnerLogoRowBlockProps> = (props) => {
  const { caption, logos } = props

  if (!logos?.length) {
    return null
  }

  return (
    <div className="partner-logo-row-block container my-12">
      {caption && (
        <p className="mb-4 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {caption}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
        {logos.map((row, index) => {
          const resource = row.image
          if (!resource || typeof resource === 'string' || typeof resource === 'number') {
            return null
          }
          return (
            <div
              className="relative h-10 w-28 shrink-0 opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0 md:h-12 md:w-36"
              key={index}
            >
              <MediaComponent
                className="absolute inset-0"
                fill
                imgClassName="object-contain"
                resource={resource as Media}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
