import { Rating } from '@/components/ui/rating'
import type { DocEntry } from '../types'

export default {
  slug: 'rating',
  name: 'Rating',
  jp: '評価',
  category: 'Forms',
  description:
    'Outlined stars in a radio group. Picking fills them in a quick chain, each popping with a sparkle after the one before; hovering previews the score with a wiggle. The top score fires a big 最高! hit and the row jumps again. Arrow keys, Home and End work.',
  preview: <Rating label="Rate this" />,
  usage: `import { Rating } from '@/components/ui/rating'

<Rating label="Rate this episode" onChange={setStars} />`,
  examples: [
    { title: 'Pre-filled', preview: <Rating label="Rated" defaultValue={4} />, code: `<Rating label="Rated" defaultValue={4} />` },
    { title: 'Three stars', preview: <Rating label="Difficulty" count={3} sfx="鬼!" />, code: `<Rating label="Difficulty" count={3} sfx="鬼!" />` },
  ],
  props: [
    { name: 'label', type: 'string', description: 'Accessible name for the radio group.' },
    { name: 'defaultValue', type: 'number', default: '0', description: 'Initial stars (0 to count).' },
    { name: 'value', type: 'number', description: 'Controlled value.' },
    { name: 'count', type: 'number', default: '5', description: 'Number of stars.' },
    { name: 'sfx', type: 'string | false', default: "'最高!'", description: 'Lettering when the top score is picked.' },
    { name: 'className', type: 'string', description: 'Extra classes for the row.' },
    { name: 'onChange', type: '(value: number) => void', description: 'Called with the picked star count.' },
  ],
} satisfies DocEntry
