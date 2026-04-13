import type { Article, CategoryFeedBlock as CategoryFeedBlockProps } from '@/payload-types'

import configPromise from '@payload-config'
import { CollectionArchive, type CollectionArchiveLayout } from '@/components/CollectionArchive'
import { getPayload } from 'payload'
import React from 'react'
import RichText from '@/components/RichText'

export const CategoryFeedBlock: React.FC<
  CategoryFeedBlockProps & { id?: string }
> = async (props) => {
  const { category, id, introContent, layoutVariant = 'uniformGrid', limit = 6, sort = '-publishedDate' } = props

  if (!category) {
    return null
  }

  const categoryId =
    typeof category === 'object' && category !== null ? category.id : category

  if (categoryId === null || categoryId === undefined) {
    return null
  }

  const payload = await getPayload({ config: configPromise })

  const fetched = await payload.find({
    collection: 'articles',
    depth: 1,
    limit: limit ?? 6,
    overrideAccess: false,
    sort: sort ?? '-publishedDate',
    where: {
      categories: {
        contains: categoryId,
      },
    },
  })

  const articles = fetched.docs as Article[]

  return (
    <div className="category-feed-block my-16" id={id ? `block-${id}` : undefined}>
      {introContent && (
        <div className="container mb-12">
          <RichText className="ms-0 max-w-[48rem]" data={introContent} enableGutter={false} />
        </div>
      )}
      <CollectionArchive
        articles={articles}
        layoutVariant={(layoutVariant ?? 'uniformGrid') as CollectionArchiveLayout}
      />
    </div>
  )
}
