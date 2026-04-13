import type { Metadata } from 'next'

import type { Article, Media, Page, Config } from '../payload-types'

import { mergeOpenGraph } from './mergeOpenGraph'
import { getServerSideURL } from './getURL'

const getImageURL = (image?: Media | Config['db']['defaultIDType'] | null) => {
  const serverUrl = getServerSideURL()

  let url = serverUrl + '/website-template-OG.webp'

  if (image && typeof image === 'object' && 'url' in image) {
    const ogUrl = image.sizes?.og?.url

    url = ogUrl ? serverUrl + ogUrl : serverUrl + image.url
  }

  return url
}

const siteTitle = 'Journalism portfolio'

function canonicalPath(doc: Partial<Page> | Partial<Article> | null | undefined): string {
  if (!doc?.slug || typeof doc.slug !== 'string') return '/'
  if ('layout' in doc && doc.layout !== undefined) {
    return doc.slug === 'home' ? '/' : `/${doc.slug}`
  }
  return `/articles/${doc.slug}`
}

export const generateMeta = async (args: {
  doc: Partial<Page> | Partial<Article> | null
}): Promise<Metadata> => {
  const { doc } = args

  const ogImage = getImageURL(doc?.meta?.image)

  const title = doc?.meta?.title ? `${doc.meta.title} | ${siteTitle}` : siteTitle

  return {
    description: doc?.meta?.description,
    openGraph: mergeOpenGraph({
      description: doc?.meta?.description || '',
      images: ogImage
        ? [
            {
              url: ogImage,
            },
          ]
        : undefined,
      title,
      url: canonicalPath(doc),
    }),
    title,
  }
}
