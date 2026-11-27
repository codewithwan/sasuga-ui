import { WaveText } from '@/components/ui/wave-text'
import { Button } from '@/components/ui/button'
import type { DocEntry } from '../types'

export default {
  slug: 'wave-text',
  name: 'Wave Text',
  jp: 'ウェーブ',
  category: 'Motion',
  description:
    'Glyphs ripple in a wave when the pointer enters or keyboard focus arrives, once per hover. Inside a link or button it listens to that control, so the whole hit area triggers it. Flat ripples lower; reduced motion keeps it still.',
  preview: <WaveText text="Hover me" className="ui-head text-5xl" />,
  usage: `import { WaveText } from '@/components/ui/wave-text'

<WaveText text="Hover me" className="ui-head text-5xl" />`,
  examples: [
    {
      title: 'In buttons and links',
      preview: (
        <div className="flex flex-wrap items-center justify-center gap-6">
          <Button variant="accent" sfx={false}>
            <WaveText text="Continue" />
          </Button>
          <a href="#wave" onClick={(e) => e.preventDefault()} className="ui-head text-lg text-accent underline-offset-4 hover:underline focus-visible:ui-focus">
            <WaveText text="Read the patch notes" />
          </a>
        </div>
      ),
      code: `<Button variant="accent">
  <WaveText text="Continue" />
</Button>
<a href="/notes"><WaveText text="Read the patch notes" /></a>`,
    },
  ],
  props: [
    { name: 'text', type: 'string', description: 'Text to show. Spaces split words (they wrap as units).' },
    { name: 'className', type: 'string', description: 'Font, size and colour.' },
  ],
} satisfies DocEntry
