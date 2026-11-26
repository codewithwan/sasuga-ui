import { Slider } from '@/components/ui/slider'
import type { DocEntry } from '../types'

export default {
  slug: 'slider',
  name: 'Slider',
  jp: 'スライダー',
  category: 'Forms',
  description:
    'A native range input with an animated knob. Click the track and the knob winds up, dashes there with afterimages and speed lines, and lands in a puff of dust while the bubble counts along. Ticks pop as it passes, the ends hit back with MAX! / ゼロ, and a fling overshoots and bounces.',
  preview: <Slider label="Power level" />,
  usage: `import { Slider } from '@/components/ui/slider'

<Slider label="Power level" defaultValue={30} onChange={setPower} />`,
  examples: [
    {
      title: 'Custom range',
      preview: <Slider label="Combo" min={0} max={10} defaultValue={7} />,
      code: `<Slider label="Combo" min={0} max={10} defaultValue={7} />`,
    },
    {
      title: 'Fine steps, no ticks',
      preview: <Slider label="Volume" min={0} max={1} step={0.05} defaultValue={0.4} ticks={false} maxSfx="FULL!" />,
      code: `<Slider label="Volume" min={0} max={1} step={0.05} defaultValue={0.4} ticks={false} maxSfx="FULL!" />`,
    },
  ],
  props: [
    { name: 'label', type: 'string', description: 'Accessible name for the range input.' },
    { name: 'min', type: 'number', default: '0', description: 'Lowest value.' },
    { name: 'max', type: 'number', default: '100', description: 'Highest value.' },
    { name: 'step', type: 'number', default: '1', description: 'Value increment (decimals are kept in the bubble).' },
    { name: 'defaultValue', type: 'number', default: '30', description: 'Starting value.' },
    { name: 'ticks', type: 'number | false', default: 'auto', description: 'Number of segments marked on the track; one per step up to 20 steps, else 10.' },
    { name: 'maxSfx / minSfx', type: 'string | false', default: "'MAX!' / 'ゼロ'", description: 'Lettering when the knob slams into either end.' },
    { name: 'className', type: 'string', description: 'Extra classes for the wrapper.' },
    { name: 'onChange', type: '(value: number) => void', description: 'Called while dragging, flinging or using the keyboard.' },
  ],
} satisfies DocEntry
