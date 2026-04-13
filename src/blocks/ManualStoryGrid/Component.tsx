import type { Article, ManualStoryGridBlock as ManualStoryGridBlockProps } from '@/payload-types'

import configPromise from '@payload-config'
import { Card, type CardArticleData } from '@/components/Card'
import { getPayload } from 'payload'
import React from 'react'

type ManualSlot = NonNullable<NonNullable<ManualStoryGridBlockProps['slots']>[number]>

const spanClass: Record<string, string> = {
  '12': 'col-span-4 lg:col-span-12',
  '4': 'col-span-4 lg:col-span-4',
  '6': 'col-span-4 lg:col-span-6',
  '8': 'col-span-4 lg:col-span-8',
}

async function resolveArticle(ref: ManualSlot['article']): Promise<Article | null> {
  if (!ref) return null
  const value = typeof ref === 'object' ? ref : null
  if (value && 'title' in value && value.title) {
    return value as Article
  }

  const id = typeof ref === 'object' && ref !== null ? ref.id : ref
  if (id === undefined || id === null) return null

  const payload = await getPayload({ config: configPromise })
  try {
    const doc = await payload.findByID({
      collection: 'articles',
      id: String(id),
      depth: 1,
      overrideAccess: false,
    })
    return doc as Article
  } catch {
    return null
  }
}

export const ManualStoryGridBlock: React.FC<
  ManualStoryGridBlockProps & { id?: string }
> = async (props) => {
  const { id, slots } = props

  if (!slots?.length) {
    return null
  }

  const resolved = await Promise.all(
    slots.map(async (slot) => {
      const article = await resolveArticle(slot.article)
      return { article, kicker: slot.kicker, span: slot.span }
    }),
  )

  return (
    <div className="manual-story-grid-block container my-16" id={id ? `block-${id}` : undefined}>
      <div className="grid grid-cols-4 gap-6 lg:grid-cols-12 lg:gap-8">
        {resolved.map(({ article, kicker, span }, index) => {
          if (!article?.slug) return null
          const cardData: CardArticleData = {
            slug: article.slug,
            title: article.title,
            meta: article.meta,
          }
          const variant =
            span === '12' || span === '8' ? ('lead' as const) : ('default' as const)

          return (
            <div className={spanClass[span || '4'] ?? spanClass['4']} key={index}>
              {kicker && (
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {kicker}
                </p>
              )}
              <Card className="h-full" doc={cardData} relationTo="articles" variant={variant} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
