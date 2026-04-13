import type { Block } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

export const CategoryFeed: Block = {
  slug: 'categoryFeed',
  interfaceName: 'CategoryFeedBlock',
  fields: [
    {
      name: 'introContent',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [
            ...rootFeatures,
            HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
            FixedToolbarFeature(),
            InlineToolbarFeature(),
          ]
        },
      }),
      label: 'Intro content',
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      label: 'Category',
    },
    {
      name: 'limit',
      type: 'number',
      defaultValue: 6,
      min: 1,
      max: 24,
      admin: { step: 1 },
    },
    {
      name: 'sort',
      type: 'select',
      defaultValue: '-publishedDate',
      label: 'Sort',
      options: [
        { label: 'Newest by publish date', value: '-publishedDate' },
        { label: 'Oldest by publish date', value: 'publishedDate' },
        { label: 'Recently updated', value: '-updatedAt' },
      ],
    },
    {
      name: 'layoutVariant',
      type: 'select',
      defaultValue: 'uniformGrid',
      label: 'Layout',
      options: [
        { label: 'Uniform grid', value: 'uniformGrid' },
        { label: 'Lead story + sidebar', value: 'leadAndGrid' },
        { label: 'Horizontal rail', value: 'horizontalRail' },
      ],
    },
  ],
  labels: {
    plural: 'Category feeds',
    singular: 'Category feed',
  },
}
