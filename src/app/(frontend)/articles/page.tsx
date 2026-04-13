import type { Metadata } from 'next/types'

import { CollectionArchive } from '@/components/CollectionArchive'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import PageClient from './page.client'

export const dynamic = 'force-static'
export const revalidate = 600

export default async function ArticlesIndexPage() {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'articles',
    depth: 1,
    limit: 50,
    overrideAccess: false,
    pagination: false,
    sort: '-publishedDate',
    where: {
      _status: {
        equals: 'published',
      },
    },
    select: {
      title: true,
      slug: true,
      meta: true,
    },
  })

  return (
    <div className="pt-24 pb-24">
      <PageClient />
      <div className="container mb-16">
        <div className="prose dark:prose-invert max-w-none">
          <h1>Articles</h1>
        </div>
      </div>

      <CollectionArchive articles={result.docs} />
    </div>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Articles | Journalism portfolio',
  }
}
