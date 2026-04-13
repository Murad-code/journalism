import { cn } from '@/utilities/ui'
import React from 'react'

import { Card, CardArticleData } from '@/components/Card'

export type CollectionArchiveLayout = 'uniformGrid' | 'leadAndGrid' | 'horizontalRail'

export type Props = {
  articles: CardArticleData[]
  layoutVariant?: CollectionArchiveLayout
}

export const CollectionArchive: React.FC<Props> = (props) => {
  const { articles, layoutVariant = 'uniformGrid' } = props

  if (!articles?.length) {
    return null
  }

  if (layoutVariant === 'horizontalRail') {
    return (
      <div className={cn('container')}>
        <div className="-mx-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
          <div className="flex w-max min-w-full gap-4 md:gap-6">
            {articles.map((result, index) => {
              if (typeof result === 'object' && result !== null) {
                return (
                  <div className="w-[min(100%,20rem)] shrink-0" key={index}>
                    <Card className="h-full" doc={result} relationTo="articles" variant="compact" />
                  </div>
                )
              }
              return null
            })}
          </div>
        </div>
      </div>
    )
  }

  if (layoutVariant === 'leadAndGrid') {
    const [lead, ...rest] = articles
    const leadDoc = typeof lead === 'object' && lead !== null ? lead : null

    return (
      <div className={cn('container')}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-8">
          {leadDoc && (
            <div className="lg:col-span-8">
              <Card className="h-full" doc={leadDoc} relationTo="articles" variant="lead" />
            </div>
          )}
          <div className="flex flex-col gap-6 lg:col-span-4">
            {rest.map((result, index) => {
              if (typeof result === 'object' && result !== null) {
                return (
                  <Card
                    className="h-full"
                    doc={result}
                    key={index}
                    relationTo="articles"
                    variant="default"
                  />
                )
              }
              return null
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('container')}>
      <div>
        <div className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-12 gap-y-4 gap-x-4 lg:gap-y-8 lg:gap-x-8 xl:gap-x-8">
          {articles?.map((result, index) => {
            if (typeof result === 'object' && result !== null) {
              return (
                <div className="col-span-4" key={index}>
                  <Card className="h-full" doc={result} relationTo="articles" />
                </div>
              )
            }

            return null
          })}
        </div>
      </div>
    </div>
  )
}
