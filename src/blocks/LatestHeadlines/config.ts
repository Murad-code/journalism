import type { Block } from 'payload'

import { link } from '@/fields/link'

export const LatestHeadlines: Block = {
  slug: 'latestHeadlines',
  interfaceName: 'LatestHeadlinesBlock',
  fields: [
    {
      name: 'sectionTitle',
      type: 'text',
      label: 'Section title',
    },
    {
      name: 'limit',
      type: 'number',
      defaultValue: 5,
      min: 1,
      max: 20,
      admin: {
        step: 1,
      },
    },
    {
      name: 'showLink',
      type: 'checkbox',
      defaultValue: false,
      label: 'Show footer link',
    },
    link({
      overrides: {
        admin: {
          condition: (_data, siblingData) =>
            Boolean((siblingData as { showLink?: boolean } | undefined)?.showLink),
        },
      },
    }),
  ],
  labels: {
    plural: 'Latest headlines',
    singular: 'Latest headlines',
  },
}
