import type { DividerBlock as DividerBlockProps } from '@/payload-types'

import { cn } from '@/utilities/ui'
import React from 'react'

export const DividerBlock: React.FC<DividerBlockProps> = (props) => {
  const { label, style = 'subtle' } = props

  return (
    <div className="divider-block container my-12">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'h-px flex-1 bg-border',
            style === 'strong' && 'h-0.5 bg-foreground/30',
          )}
        />
        {label && (
          <span className="shrink-0 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </span>
        )}
        <div
          className={cn(
            'h-px flex-1 bg-border',
            style === 'strong' && 'h-0.5 bg-foreground/30',
          )}
        />
      </div>
    </div>
  )
}
