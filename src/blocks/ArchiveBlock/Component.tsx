import type { Article, ArchiveBlock as ArchiveBlockProps } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import RichText from '@/components/RichText'

import { CollectionArchive } from '@/components/CollectionArchive'

export const ArchiveBlock: React.FC<
  ArchiveBlockProps & {
    id?: string
  }
> = async (props) => {
  const {
    id,
    introContent,
    layoutVariant = 'uniformGrid',
    limit: limitFromProps,
    populateBy,
    selectedDocs,
    sort = '-publishedDate',
  } = props

  const limit = limitFromProps || 3

  let articles: Article[] = []

  if (populateBy === 'collection') {
    const payload = await getPayload({ config: configPromise })

    const fetched = await payload.find({
      collection: 'articles',
      depth: 1,
      limit,
      overrideAccess: false,
      sort: sort ?? '-publishedDate',
    })

    articles = fetched.docs
  } else if (selectedDocs?.length) {
    articles = selectedDocs
      .map((ref) => {
        const v = ref.value
        return typeof v === 'object' && v !== null ? (v as Article) : null
      })
      .filter((doc): doc is Article => Boolean(doc))
  }

  return (
    <div className="archive-block my-16" id={`block-${id}`}>
      {introContent && (
        <div className="container mb-16">
          <RichText className="ms-0 max-w-[48rem]" data={introContent} enableGutter={false} />
        </div>
      )}
      <CollectionArchive articles={articles} layoutVariant={layoutVariant ?? 'uniformGrid'} />
    </div>
  )
}
