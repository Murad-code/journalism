import type { Block } from 'payload'

export const EmbedBlock: Block = {
  slug: 'embedBlock',
  interfaceName: 'EmbedBlock',
  fields: [
    {
      name: 'embedUrl',
      type: 'text',
      required: true,
      label: 'Video URL',
      admin: {
        description:
          'YouTube (watch, youtu.be, or embed) or Vimeo page URLs. Other hosts are not embedded.',
      },
    },
    {
      name: 'title',
      type: 'text',
      label: 'Accessible title',
      admin: {
        description: 'Short label for screen readers (e.g. segment title).',
      },
    },
  ],
  labels: {
    plural: 'Embeds',
    singular: 'Embed',
  },
}
