import { Accordion } from '@/components/ui/accordion'
import type { DocEntry } from '../types'

const FAQ = [
  { id: 'what', title: 'What is this kit?', content: 'Calm controls at rest, a burst of hand-drawn effects on interaction: springs, impacts and sound effects.' },
  { id: 'deps', title: 'What does it need?', content: 'React, Tailwind v4, clsx, tailwind-merge and class-variance-authority. The FX engine is plain canvas.' },
  { id: 'motion', title: 'Reduced motion?', content: 'Canvas effects and slide-ins switch off when the visitor prefers reduced motion.' },
]

export default {
  slug: 'accordion',
  name: 'Accordion',
  jp: 'アコーディオン',
  category: 'Layout',
  description:
    'Sticker panels. Opening slams the panel down past its height with streaks raining down, bounces it back with a puff of dust and spins the chevron; closing snaps it straight up.',
  preview: (
    <div className="w-[min(100%,460px)]">
      <Accordion items={FAQ} defaultOpen={['what']} />
    </div>
  ),
  usage: `import { Accordion } from '@/components/ui/accordion'

<Accordion
  items={[
    { id: 'what', title: 'What is this kit?', content: '…' },
    { id: 'deps', title: 'What does it need?', content: '…' },
  ]}
  defaultOpen={['what']}
/>`,
  examples: [
    {
      title: 'Multiple open',
      preview: (
        <div className="w-[min(100%,460px)]">
          <Accordion items={FAQ} type="multiple" defaultOpen={['what', 'deps']} />
        </div>
      ),
      code: `<Accordion items={items} type="multiple" defaultOpen={['what', 'deps']} />`,
    },
  ],
  props: [
    { name: 'items', type: '{ id: string; title: ReactNode; content: ReactNode }[]', description: 'Sections, in order.' },
    { name: 'type', type: "'single' | 'multiple'", default: "'single'", description: 'Whether opening one closes the others.' },
    { name: 'defaultOpen', type: 'string[]', default: '[]', description: 'Ids open on first render.' },
    { name: 'className', type: 'string', description: 'Extra classes for the wrapper.' },
  ],
} satisfies DocEntry
