import { KineticText } from '@/components/ui/kinetic-text'
import type { DocEntry } from '../types'
import { PlayGate } from '../play-gate'

export default {
  slug: 'kinetic-text',
  name: 'Kinetic Text',
  jp: '動く文字',
  category: 'Display',
  description:
    'Title lettering in the heading face of the active style: glyphs rise and pop in one after another with a slight overshoot, and one word can carry an accent highlight. With `impact` the line lands with a hit (focus lines, burst, debris and a squash) when the last glyph arrives; with `wave` the glyphs ripple when the pointer enters.',
  preview: <KineticText text="HELLO" className="text-6xl" />,
  usage: `import { KineticText } from '@/components/ui/kinetic-text'

<KineticText as="h1" text="Code with Wan" label="codewithwan" seed={2} className="text-8xl" />`,
  examples: [
    {
      title: 'Accent word',
      preview: (
        <div className="grid gap-4 text-5xl">
          <KineticText text="Sukasuki UI kit" seed={0} />
          <KineticText text="Sukasuki UI kit" seed={2} />
        </div>
      ),
      code: `<KineticText text="Sukasuki UI kit" seed={0} />
<KineticText text="Sukasuki UI kit" seed={2} />`,
    },
    {
      title: 'Impact and wave',
      preview: (
        <div className="grid justify-items-center gap-6 text-5xl">
          <PlayGate label="Fight">{(run) => <KineticText key={run} text="Round one" seed={1} impact={run > 0 ? 'ファイト!' : undefined} />}</PlayGate>
          <KineticText text="Hover the wave" seed={1} wave />
        </div>
      ),
      code: `<KineticText text="Round one" seed={1} impact="ファイト!" />
<KineticText text="Hover the wave" seed={1} wave />`,
    },
  ],
  props: [
    { name: 'text', type: 'string', description: 'Text to animate. Spaces split words (they wrap as units).' },
    { name: 'label', type: 'string', description: 'Accessible text if it differs from what is shown.' },
    { name: 'seed', type: 'number', description: 'Picks the highlighted word (seed % word count). Omit, or pass one word, for no highlight.' },
    { name: 'paused', type: 'boolean', default: 'false', description: 'Hold the entrance (e.g. until an intro ends).' },
    { name: 'impact', type: 'boolean | string', default: 'false', description: 'Hit the line when the last glyph lands; a string adds lettering. Scales with the font size.' },
    { name: 'wave', type: 'boolean', default: 'false', description: 'Glyphs ripple in a wave with squash and stretch on pointer enter.' },
    { name: 'as', type: "'span' | 'h1' | 'h2' | 'p'", default: "'span'", description: 'Element to render.' },
    { name: 'className', type: 'string', description: 'Size it with font-size here or on a parent.' },
  ],
} satisfies DocEntry
