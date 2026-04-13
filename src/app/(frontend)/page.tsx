import type { Metadata } from 'next'
import Link from 'next/link'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { getServerSideURL } from '@/utilities/getURL'

export const dynamic = 'force-static'
export const revalidate = 600

const siteTitle = 'Journalism portfolio'

export default async function HomePage() {
  const payload = await getPayload({ config: configPromise })

  const { docs } = await payload.find({
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
      publishedDate: true,
      author: true,
      meta: true,
    },
  })

  return (
    <div className="pt-24 pb-24">
      <div className="container max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight mb-2">{siteTitle}</h1>
        <p className="text-muted-foreground mb-12">
          Selected reporting and writing. Use the admin panel to add or update articles.
        </p>
        <ul className="space-y-8">
          {docs.map((article) => {
            if (!article.slug) return null
            return (
              <li className="border-b border-border pb-8 last:border-0" key={article.id}>
                <Link className="group block" href={`/articles/${article.slug}`}>
                  <h2 className="text-xl font-medium group-hover:underline">{article.title}</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    {[article.author, article.publishedDate].filter(Boolean).join(' · ')}
                  </p>
                  {article.meta?.description ? (
                    <p className="mt-3 text-muted-foreground leading-relaxed">{article.meta.description}</p>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
        {docs.length === 0 ? (
          <p className="text-muted-foreground">No published articles yet.</p>
        ) : null}
      </div>
    </div>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const url = getServerSideURL()

  return {
    title: siteTitle,
    openGraph: mergeOpenGraph({
      title: siteTitle,
      url,
    }),
  }
}
