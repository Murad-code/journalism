import { formatDateTime } from 'src/utilities/formatDateTime'
import React from 'react'

import type { Article } from '@/payload-types'

import { Media } from '@/components/Media'

export const ArticleHero: React.FC<{
  article: Article
}> = ({ article }) => {
  const { author, featuredImage, publishedDate, title } = article

  return (
    <div className="relative -mt-[10.4rem] flex items-end">
      <div className="container z-10 relative lg:grid lg:grid-cols-[1fr_48rem_1fr] text-white pb-8">
        <div className="col-start-1 col-span-1 md:col-start-2 md:col-span-2">
          <div className="">
            <h1 className="mb-6 text-3xl md:text-5xl lg:text-6xl">{title}</h1>
          </div>

          <div className="flex flex-col md:flex-row gap-4 md:gap-16">
            {author ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <p className="text-sm">Author</p>
                  <p>{author}</p>
                </div>
              </div>
            ) : null}
            {publishedDate ? (
              <div className="flex flex-col gap-1">
                <p className="text-sm">Published</p>
                <time dateTime={publishedDate}>{formatDateTime(publishedDate)}</time>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="min-h-[80vh] select-none">
        {featuredImage && typeof featuredImage !== 'string' && (
          <Media fill priority imgClassName="-z-10 object-cover" resource={featuredImage} />
        )}
        <div className="absolute pointer-events-none left-0 bottom-0 w-full h-1/2 bg-linear-to-t from-black to-transparent" />
      </div>
    </div>
  )
}
