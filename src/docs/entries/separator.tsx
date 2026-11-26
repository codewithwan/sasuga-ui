import { Separator } from '@/components/ui/separator'
import type { DocEntry } from '../types'

export default {
  slug: 'separator',
  name: 'Separator',
  jp: 'セパレーター',
  category: 'Display',
  description: 'A rounded rule in the style\'s line weight, with an optional label pill in the middle. The first time it scrolls into view the line draws out from the middle and the label pops in.',
  preview: (
    <div className="w-[min(100%,360px)]">
      <Separator label="Chapter 2" />
    </div>
  ),
  usage: `import { Separator } from '@/components/ui/separator'

<Separator label="Chapter 2" />`,
  examples: [
    {
      title: 'Plain and vertical',
      preview: (
        <div className="grid w-[min(100%,360px)] gap-6">
          <Separator />
          <div className="ui-head flex h-8 items-center justify-center">
            Work
            <Separator orientation="vertical" />
            Stats
            <Separator orientation="vertical" />
            Play
          </div>
        </div>
      ),
      code: `<Separator />

<div className="flex items-center">
  Work <Separator orientation="vertical" /> Stats
</div>`,
    },
  ],
  props: [
    { name: 'orientation', type: "'horizontal' | 'vertical'", default: "'horizontal'", description: 'Direction of the line.' },
    { name: 'label', type: 'ReactNode', description: 'Text in a pill in the middle (horizontal only).' },
    { name: 'decorative', type: 'boolean', default: 'true', description: 'When false, exposed as role="separator" to assistive tech.' },
    { name: 'animated', type: 'boolean', default: 'true', description: 'Draw-in on first view (horizontal only). false renders it static.' },
  ],
} satisfies DocEntry
