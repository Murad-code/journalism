import type { Block } from 'payload'

export const ManualStoryGrid: Block = {
  slug: 'manualStoryGrid',
  interfaceName: 'ManualStoryGridBlock',
  fields: [
    {
      name: 'slots',
      type: 'array',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'kicker',
          type: 'text',
          label: 'Kicker',
        },
        {
          name: 'article',
          type: 'relationship',
          relationTo: 'articles',
          required: true,
          label: 'Article',
        },
        {
          name: 'span',
          type: 'select',
          defaultValue: '4',
          label: 'Column span (12-col)',
          options: [
            { label: '4 columns', value: '4' },
            { label: '6 columns', value: '6' },
            { label: '8 columns', value: '8' },
            { label: 'Full width (12)', value: '12' },
          ],
        },
      ],
      labels: {
        plural: 'Slots',
        singular: 'Slot',
      },
    },
  ],
  labels: {
    plural: 'Manual story grids',
    singular: 'Manual story grid',
  },
}
