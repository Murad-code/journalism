import type { SectionHeaderBlock as SectionHeaderBlockProps } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import React from 'react'

export const SectionHeaderBlock: React.FC<SectionHeaderBlockProps> = (props) => {
  const { eyebrow, link, showLink, title } = props

  return (
    <div className="section-header-block container my-12 border-b border-border pb-6">
      {eyebrow && (
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {eyebrow}
        </p>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
        {showLink && link && link.label && (link.type === 'custom' || link.reference) && (
          <CMSLink
            appearance="inline"
            className="shrink-0 text-sm font-medium underline-offset-4 hover:underline"
            label={link.label}
            newTab={link.newTab}
            reference={link.reference}
            type={link.type}
            url={link.url}
          />
        )}
      </div>
    </div>
  )
}
