import type { Block } from 'payload'

import { link } from '@/fields/link'

export const SectionHeader: Block = {
  slug: 'sectionHeader',
  interfaceName: 'SectionHeaderBlock',
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      label: 'Eyebrow',
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Title',
    },
    {
      name: 'showLink',
      type: 'checkbox',
      defaultValue: false,
      label: 'Show link',
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
    plural: 'Section headers',
    singular: 'Section header',
  },
}
