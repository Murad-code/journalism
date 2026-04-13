import type { Block } from 'payload'

export const PartnerLogoRow: Block = {
  slug: 'partnerLogoRow',
  interfaceName: 'PartnerLogoRowBlock',
  fields: [
    {
      name: 'caption',
      type: 'text',
      label: 'Caption',
    },
    {
      name: 'logos',
      type: 'array',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
      labels: {
        plural: 'Logos',
        singular: 'Logo',
      },
    },
  ],
  labels: {
    plural: 'Partner logo rows',
    singular: 'Partner logo row',
  },
}
