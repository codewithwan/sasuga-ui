import { SplitReveal } from '@/components/ui/split-reveal'
import type { DocEntry } from '../types'
import { PlayGate } from '../play-gate'

export default {
  slug: 'split-reveal',
  name: 'Split Reveal',
  jp: 'スプリット',
  category: 'Motion',
  description:
    'Text that rises into place the first time it scrolls into view: each word (or character) comes up out of its own clipped line on the style’s overshoot curve, one after another. Translate and opacity only. The real text stays in the element for search engines and screen readers.',
  preview: <PlayGate>{(run) => <SplitReveal key={run} as="h2" text="Every frame counts" className="ui-head m-0 text-center text-5xl leading-tight" />}</PlayGate>,
  usage: `import { SplitReveal } from '@/components/ui/split-reveal'

<SplitReveal as="h2" text="Every frame counts" className="ui-head text-6xl" />`,
  examples: [
    {
      title: 'By character',
      preview: (
        <PlayGate>{(run) => <SplitReveal key={run} as="h3" by="char" text="Level up" className="ui-head m-0 text-5xl text-accent" />}</PlayGate>
      ),
      code: `<SplitReveal as="h3" by="char" text="Level up" className="ui-head text-5xl text-accent" />`,
    },
    {
      title: 'Body copy, slower stagger',
      preview: (
        <PlayGate>
          {(run) => (
            <SplitReveal
              key={run}
              as="p"
              stagger={40}
              text="Calm controls at rest, a burst of drawn effects the moment you touch them."
              className="m-0 max-w-md text-center text-lg text-mute"
            />
          )}
        </PlayGate>
      ),
      code: `<SplitReveal as="p" stagger={40} text="Calm controls at rest, a burst of drawn effects the moment you touch them." className="text-lg text-mute" />`,
    },
  ],
  props: [
    { name: 'text', type: 'string', description: 'Text to reveal. Spaces split words (they wrap as units).' },
    { name: 'as', type: "'h1' | 'h2' | 'h3' | 'p' | 'span'", default: "'span'", description: 'Element to render. Headings carry the text as aria-label; p / span keep a visually hidden copy.' },
    { name: 'by', type: "'word' | 'char'", default: "'word'", description: 'Rise word by word or character by character.' },
    { name: 'stagger', type: 'number', default: '70 (word) / 24 (char)', description: 'Delay between pieces, in ms.' },
    { name: 'className', type: 'string', description: 'Classes for the element (font, size, colour).' },
  ],
} satisfies DocEntry
