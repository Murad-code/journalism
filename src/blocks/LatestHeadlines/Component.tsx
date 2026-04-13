import type { Article, LatestHeadlinesBlock as LatestHeadlinesBlockProps, Media } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media as MediaComponent } from '@/components/Media'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import React from 'react'

function articleThumbnail(article: Pick<Article, 'featuredImage' | 'meta'>): Media | null {
  const metaImage = article.meta && typeof article.meta === 'object' ? article.meta.image : null
  if (metaImage && typeof metaImage === 'object') {
    return metaImage as Media
  }
  const featured = article.featuredImage
  if (featured && typeof featured === 'object') {
    return featured as Media
  }
  return null
}

function formatDate(value: string | null | undefined) {
  if (!value) return null
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
    }).format(new Date(value))
  } catch {
    return null
  }
}

export const LatestHeadlinesBlock: React.FC<
  LatestHeadlinesBlockProps & { id?: string }
> = async (props) => {
  const { id, limit: limitFromProps, link: linkField, sectionTitle, showLink } = props
  const limit = limitFromProps ?? 5

  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'articles',
    depth: 1,
    limit,
    overrideAccess: false,
    sort: '-publishedDate',
    select: {
      title: true,
      slug: true,
      publishedDate: true,
      featuredImage: true,
      meta: {
        image: true,
      },
    },
  })

  const articles = docs as Pick<
    Article,
    'title' | 'slug' | 'publishedDate' | 'featuredImage' | 'meta'
  >[]

  if (!articles.length) {
    return null
  }

  return (
    <section className="latest-headlines-block container my-16" id={id ? `block-${id}` : undefined}>
      {sectionTitle && (
        <h2 className="mb-6 text-2xl font-bold tracking-tight">{sectionTitle}</h2>
      )}
      <ul className="divide-y divide-border border-y border-border">
        {articles.map((article) => {
          const dateLabel = formatDate(article.publishedDate)
          const thumb = articleThumbnail(article)
          return (
            <li className="py-4" key={article.slug}>
              <Link
                className="group flex gap-4 sm:items-start"
                href={`/articles/${article.slug}`}
              >
                <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                  {thumb ? (
                    <MediaComponent
                      className="absolute inset-0"
                      fill
                      imgClassName="object-cover"
                      resource={thumb}
                      size="112px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <span className="text-lg font-medium group-hover:underline">{article.title}</span>
                  {dateLabel && (
                    <time
                      className="shrink-0 text-sm text-muted-foreground"
                      dateTime={article.publishedDate ?? undefined}
                    >
                      {dateLabel}
                    </time>
                  )}
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
      {showLink && linkField && linkField.label && (linkField.type === 'custom' || linkField.reference) && (
        <div className="mt-4">
          <CMSLink
            appearance="outline"
            label={linkField.label}
            newTab={linkField.newTab}
            reference={linkField.reference}
            type={linkField.type}
            url={linkField.url}
          />
        </div>
      )}
    </section>
  )
}
