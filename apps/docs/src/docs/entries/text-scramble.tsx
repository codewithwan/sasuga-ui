import { TextScramble } from '@/components/ui/text-scramble'
import { Button } from '@/components/ui/button'
import type { DocEntry } from '../types'
import { PlayGate } from '../play-gate'

export default {
  slug: 'text-scramble',
  name: 'Text Scramble',
  jp: 'スクランブル',
  category: 'Motion',
  description:
    'Letters cycle through random glyphs (A–Z, 0–9 and a few katakana) and resolve left to right, each landing with a small pop. Every character keeps its real glyph in place under the noise, so the line never changes width. Fires on mount, on hover / keyboard focus, or once when scrolled into view.',
  preview: <TextScramble text="ACCESS GRANTED" trigger="hover" className="ui-head text-4xl" />,
  usage: `import { TextScramble } from '@/components/ui/text-scramble'

<TextScramble text="ACCESS GRANTED" trigger="view" className="ui-head text-5xl" />`,
  examples: [
    {
      title: 'On mount (replay)',
      preview: <PlayGate label="Decode">{(run) => <TextScramble key={run} text="Stage 3 unlocked" trigger={run > 0 ? 'mount' : 'hover'} duration={900} className="ui-head text-3xl" />}</PlayGate>,
      code: `<TextScramble text="Stage 3 unlocked" duration={900} className="ui-head text-3xl" />`,
    },
    {
      title: 'Inside a button',
      preview: (
        <Button variant="accent" sfx={false}>
          <TextScramble text="New game" trigger="hover" />
        </Button>
      ),
      code: `<Button variant="accent">
  <TextScramble text="New game" trigger="hover" />
</Button>`,
    },
  ],
  props: [
    { name: 'text', type: 'string', description: 'The text it resolves to. Changing it scrambles again with the mount trigger.' },
    { name: 'trigger', type: "'mount' | 'hover' | 'view'", default: "'mount'", description: 'When to scramble. Hover listens to the closest link / button if there is one, and to keyboard focus.' },
    { name: 'duration', type: 'number', default: '700', description: 'Time until the last glyph resolves, in ms.' },
    { name: 'className', type: 'string', description: 'Font, size and colour of the resolved text (the noise uses the accent).' },
  ],
} satisfies DocEntry
