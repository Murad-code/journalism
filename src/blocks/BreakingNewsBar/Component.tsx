import type { BreakingNewsBarBlock as BreakingNewsBarBlockProps } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { cn } from '@/utilities/ui'
import React from 'react'

const emphasisStyles = {
  alert: 'border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100',
  info: 'border-primary/30 bg-primary/5 text-foreground',
  urgent: 'border-destructive/50 bg-destructive/15 text-destructive dark:text-red-100',
} as const

export const BreakingNewsBarBlock: React.FC<BreakingNewsBarBlockProps> = (props) => {
  const { emphasis: emphasisFromProps, link, message, showLink } = props
  const emphasis = emphasisFromProps ?? 'alert'
  const style = emphasisStyles[emphasis] ?? emphasisStyles.alert

  return (
    <div className={cn('breaking-news-bar-block border-y', style)}>
      <div className="container flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-6">
        <span className="shrink-0 text-xs font-bold uppercase tracking-widest">Breaking</span>
        {showLink && link && link.label && (link.type === 'custom' || link.reference) ? (
          <CMSLink
            appearance="inline"
            className="text-sm font-medium sm:text-base"
            label={message}
            newTab={link.newTab}
            reference={link.reference}
            type={link.type}
            url={link.url}
          />
        ) : (
          <p className="text-sm font-medium sm:text-base">{message}</p>
        )}
      </div>
    </div>
  )
}
