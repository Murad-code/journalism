import type { EmbedBlock as EmbedBlockProps } from '@/payload-types'

import React from 'react'

function toEmbedSrc(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  if (trimmed.includes('youtube.com/embed/')) {
    return trimmed
  }

  const watchMatch = trimmed.match(/[?&]v=([\w-]{6,})/)
  if (watchMatch && trimmed.includes('youtube.com')) {
    return `https://www.youtube.com/embed/${watchMatch[1]}`
  }

  const shortMatch = trimmed.match(/youtu\.be\/([\w-]{6,})/)
  if (shortMatch) {
    return `https://www.youtube.com/embed/${shortMatch[1]}`
  }

  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  }

  return null
}

export const EmbedBlockComponent: React.FC<EmbedBlockProps> = (props) => {
  const { embedUrl, title } = props
  const src = embedUrl ? toEmbedSrc(embedUrl) : null

  if (!src) {
    return (
      <div className="embed-block-component container my-12 rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        This URL is not supported for embedding. Use a YouTube or Vimeo link.
      </div>
    )
  }

  return (
    <div className="embed-block-component container my-16">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted">
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
          src={src}
          title={title || 'Embedded video'}
        />
      </div>
    </div>
  )
}
