import { TextRotate } from '@/components/ui/text-rotate'
import type { DocEntry } from '../types'

export default {
  slug: 'text-rotate',
  name: 'Text Rotate',
  jp: 'ローテート',
  category: 'Motion',
  description:
    "Cycles words in place inside a sentence. The old word's letters roll up and out one by one, the new word's letters roll in from below with a small overshoot, and the slot's width eases between the two so the rest of the line slides instead of jumping. Pauses when off-screen or in a hidden tab; static with reduced motion. Screen readers get the full list once.",
  preview: (
    <p className="ui-head m-0 text-center text-4xl leading-tight">
      UI that feels <TextRotate words={['snappy', 'alive', 'playful', 'yours']} className="text-accent" />
    </p>
  ),
  usage: `import { TextRotate } from '@/components/ui/text-rotate'

<h1 className="ui-head text-6xl">
  UI that feels <TextRotate words={['snappy', 'alive', 'playful']} className="text-accent" />
</h1>`,
  examples: [
    {
      title: 'Fast cycle, mixed lengths',
      preview: (
        <p className="ui-head m-0 text-center text-3xl leading-tight">
          Press <TextRotate words={['A', 'Start', 'any button', 'X']} interval={1400} className="text-pop" /> to continue
        </p>
      ),
      code: `Press <TextRotate words={['A', 'Start', 'any button', 'X']} interval={1400} className="text-pop" /> to continue`,
    },
  ],
  props: [
    { name: 'words', type: 'string[]', description: 'Words to cycle through, in order. The first one shows on mount and with reduced motion.' },
    { name: 'interval', type: 'number', default: '2200', description: 'Time each word stays, in ms.' },
    { name: 'className', type: 'string', description: 'Colour / font for the rotating word. It inherits the size of the line.' },
  ],
} satisfies DocEntry
