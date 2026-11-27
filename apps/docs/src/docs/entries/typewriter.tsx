import { Typewriter } from '@/components/ui/typewriter'
import type { DocEntry } from '../types'

export default {
  slug: 'typewriter',
  name: 'Typewriter',
  jp: 'タイプ',
  category: 'Motion',
  description:
    'Types a line, holds it, deletes it and types the next, with uneven keystrokes and a beat after punctuation (flat types more evenly). A block cursor in the accent stays solid while typing and blinks while it waits. Pauses off-screen and in hidden tabs; each full line is announced to screen readers once.',
  preview: <Typewriter texts={['Hello, traveller.', 'Pick a class.', 'Press start.']} className="ui-head text-3xl" />,
  usage: `import { Typewriter } from '@/components/ui/typewriter'

<Typewriter texts={['Hello, traveller.', 'Pick a class.', 'Press start.']} className="ui-head text-4xl" />`,
  examples: [
    {
      title: 'Once, no loop',
      preview: <Typewriter texts={['Loading save data…', 'Welcome back.']} loop={false} speed={40} pause={900} className="font-mono text-xl" />,
      code: `<Typewriter texts={['Loading save data…', 'Welcome back.']} loop={false} speed={40} pause={900} className="font-mono text-xl" />`,
    },
    {
      title: 'Without cursor',
      preview: <Typewriter texts={['Quiet mode.', 'No cursor here.']} cursor={false} className="text-xl text-mute" />,
      code: `<Typewriter texts={['Quiet mode.', 'No cursor here.']} cursor={false} />`,
    },
  ],
  props: [
    { name: 'texts', type: 'string[]', description: 'Lines to type, in order. With reduced motion the first line shows, static.' },
    { name: 'speed', type: 'number', default: '55', description: 'Time per typed character, in ms (deleting runs about twice as fast).' },
    { name: 'pause', type: 'number', default: '1600', description: 'How long a finished line holds before it is deleted, in ms.' },
    { name: 'loop', type: 'boolean', default: 'true', description: 'Start over after the last line. Without it the last line stays.' },
    { name: 'cursor', type: 'boolean', default: 'true', description: 'Block cursor in the accent colour.' },
    { name: 'className', type: 'string', description: 'Font, size and colour.' },
  ],
} satisfies DocEntry
