'use client'
import { cn } from '@/utilities/ui'
import useClickableCard from '@/utilities/useClickableCard'
import Link from 'next/link'
import React from 'react'

import type { Article } from '@/payload-types'

import { Media } from '@/components/Media'

export type CardArticleData = Pick<Article, 'slug' | 'meta' | 'title'>

export type CardVariant = 'default' | 'compact' | 'lead'

export const Card: React.FC<{
  alignItems?: 'center'
  className?: string
  doc?: CardArticleData
  relationTo?: 'articles'
  title?: string
  variant?: CardVariant
}> = (props) => {
  const { card, link } = useClickableCard({})
  const { className, doc, relationTo, title: titleFromProps, variant = 'default' } = props

  const { slug, meta, title } = doc || {}
  const { description, image: metaImage } = meta || {}

  const titleToUse = titleFromProps || title
  const sanitizedDescription = description?.replace(/\s/g, ' ')
  const href = relationTo === 'articles' && slug ? `/articles/${slug}` : slug ? `/${slug}` : '#'

  const isLead = variant === 'lead'
  const isCompact = variant === 'compact'

  const mediaAspectClass = isLead
    ? 'aspect-[16/10]'
    : isCompact
      ? 'aspect-video'
      : 'aspect-[3/2]'

  const imageSizes = isLead ? '66vw' : isCompact ? '25vw' : '33vw'

  return (
    <article
      className={cn(
        'border border-border rounded-lg overflow-hidden bg-card hover:cursor-pointer',
        isCompact && 'shadow-sm',
        className,
      )}
      ref={card.ref}
    >
      <div className={cn('relative w-full overflow-hidden', mediaAspectClass)}>
        {!metaImage && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted text-sm text-muted-foreground">
            No image
          </div>
        )}
        {metaImage && typeof metaImage !== 'string' && (
          <Media
            className="absolute inset-0 h-full w-full"
            fill
            imgClassName="object-cover"
            resource={metaImage}
            size={imageSizes}
          />
        )}
      </div>
      <div className={cn('p-4', isLead && 'p-6', isCompact && 'p-3')}>
        {titleToUse && (
          <div className="prose">
            {isLead ? (
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                <Link className="not-prose" href={href} ref={link.ref}>
                  {titleToUse}
                </Link>
              </h2>
            ) : isCompact ? (
              <h4 className="text-base font-semibold leading-snug">
                <Link className="not-prose" href={href} ref={link.ref}>
                  {titleToUse}
                </Link>
              </h4>
            ) : (
              <h3>
                <Link className="not-prose" href={href} ref={link.ref}>
                  {titleToUse}
                </Link>
              </h3>
            )}
          </div>
        )}
        {description && !isCompact && (
          <div className={cn('mt-2', isLead && 'mt-3 text-base')}>
            <p className={cn(isLead && 'line-clamp-3')}>{sanitizedDescription}</p>
          </div>
        )}
      </div>
    </article>
  )
}
