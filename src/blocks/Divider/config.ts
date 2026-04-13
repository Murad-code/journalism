import type { Block } from 'payload'

export const Divider: Block = {
  slug: 'divider',
  interfaceName: 'DividerBlock',
  fields: [
    {
      name: 'label',
      type: 'text',
      label: 'Center label (optional)',
    },
    {
      name: 'style',
      type: 'select',
      defaultValue: 'subtle',
      options: [
        { label: 'Subtle', value: 'subtle' },
        { label: 'Strong', value: 'strong' },
      ],
    },
  ],
  labels: {
    plural: 'Dividers',
    singular: 'Divider',
  },
}
