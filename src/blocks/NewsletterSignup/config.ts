import type { Block } from 'payload'

export const NewsletterSignup: Block = {
  slug: 'newsletterSignup',
  interfaceName: 'NewsletterSignupBlock',
  fields: [
    {
      name: 'headline',
      type: 'text',
      required: true,
      label: 'Headline',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
    },
    {
      name: 'buttonLabel',
      type: 'text',
      defaultValue: 'Subscribe',
      label: 'Button label',
    },
    {
      name: 'formUrl',
      type: 'text',
      required: true,
      label: 'Signup URL',
      admin: {
        description: 'External newsletter signup page (e.g. Mailchimp, Buttondown, Substack).',
      },
    },
  ],
  labels: {
    plural: 'Newsletter signups',
    singular: 'Newsletter signup',
  },
}
