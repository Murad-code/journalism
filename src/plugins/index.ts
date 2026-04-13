import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { Plugin } from 'payload'
import { revalidateRedirects } from '@/hooks/revalidateRedirects'
import { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'

import { Article, Page } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getURL'

const siteTitle = 'Journalism portfolio'

const generateTitle: GenerateTitle<Article | Page> = ({ doc }) => {
  return doc?.title ? `${doc.title} | ${siteTitle}` : siteTitle
}

const generateURL: GenerateURL<Article | Page> = ({ doc }) => {
  const url = getServerSideURL()

  if (!doc?.slug) return url

  // CMS pages use /:slug; articles use /articles/:slug
  if ('layout' in doc) {
    return `${url}/${doc.slug}`
  }

  return `${url}/articles/${doc.slug}`
}

export const plugins: Plugin[] = [
  redirectsPlugin({
    collections: ['pages', 'articles'],
    overrides: {
      // @ts-expect-error - This is a valid override, mapped fields don't resolve to the same type
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'from') {
            return {
              ...field,
              admin: {
                description: 'You will need to rebuild the website when changing this field.',
              },
            }
          }
          return field
        })
      },
      hooks: {
        afterChange: [revalidateRedirects],
      },
    },
  }),
  seoPlugin({
    generateTitle,
    generateURL,
  }),
]
