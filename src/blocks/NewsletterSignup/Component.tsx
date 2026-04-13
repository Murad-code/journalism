import type { NewsletterSignupBlock as NewsletterSignupBlockProps } from '@/payload-types'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import React from 'react'

export const NewsletterSignupBlock: React.FC<NewsletterSignupBlockProps> = (props) => {
  const { buttonLabel = 'Subscribe', description, formUrl, headline } = props

  if (!formUrl) {
    return null
  }

  return (
    <div className="newsletter-signup-block container my-16">
      <div className="rounded-lg border border-border bg-card p-8 md:p-10">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{headline}</h2>
        {description && <p className="mt-3 max-w-2xl text-muted-foreground">{description}</p>}
        <div className="mt-6">
          <Button asChild size="lg">
            <Link href={formUrl} rel="noopener noreferrer" target="_blank">
              {buttonLabel}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
