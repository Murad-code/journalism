import type { Block } from 'payload'

import { link } from '@/fields/link'

export const BreakingNewsBar: Block = {
  slug: 'breakingNewsBar',
  interfaceName: 'BreakingNewsBarBlock',
  fields: [
    {
      name: 'message',
      type: 'text',
      required: true,
      label: 'Message',
    },
    {
      name: 'emphasis',
      type: 'select',
      defaultValue: 'alert',
      label: 'Emphasis',
      options: [
        { label: 'Info', value: 'info' },
        { label: 'Alert', value: 'alert' },
        { label: 'Urgent', value: 'urgent' },
      ],
    },
    {
      name: 'showLink',
      type: 'checkbox',
      defaultValue: false,
      label: 'Link message',
    },
    link({
      appearances: false,
      overrides: {
        admin: {
          condition: (_data, siblingData) =>
            Boolean((siblingData as { showLink?: boolean } | undefined)?.showLink),
        },
      },
    }),
  ],
  labels: {
    plural: 'Breaking news bars',
    singular: 'Breaking news bar',
  },
}
