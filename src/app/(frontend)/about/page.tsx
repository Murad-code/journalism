import type { Metadata } from 'next'
import React from 'react'

import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { getServerSideURL } from '@/utilities/getURL'

export default function AboutPage() {
  return (
    <div className="pt-24 pb-24">
      <div className="container max-w-2xl prose dark:prose-invert">
        <h1>About</h1>
        <p>
          This is a portfolio site built with Payload CMS and Next.js. Replace this page with your
          bio, contact details, and clips — or create an &quot;about&quot; entry in the Pages
          collection if you prefer to manage it from the CMS.
        </p>
      </div>
    </div>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const title = 'About | Journalism portfolio'
  return {
    title,
    openGraph: mergeOpenGraph({
      title,
      url: `${getServerSideURL()}/about`,
    }),
  }
}
