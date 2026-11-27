import { Stepper } from '@/components/ui/stepper'
import type { DocEntry } from '../types'

export default {
  slug: 'stepper',
  name: 'Stepper',
  jp: 'カウンター',
  category: 'Forms',
  description:
    'A numeric stepper (role="spinbutton") with − / + buttons. The number is a Rolling Number, so each digit rolls in its own clipped column the way you went and nothing overlaps. Buttons squash on press, holding one repeats faster and faster with speed lines, and hitting min or max shakes the box with lettering.',
  preview: <Stepper label="Players" defaultValue={2} min={1} max={8} />,
  usage: `import { Stepper } from '@/components/ui/stepper'

<Stepper label="Players" defaultValue={2} min={1} max={8} onValueChange={setPlayers} />`,
  examples: [
    {
      title: 'Hold to race',
      preview: <Stepper label="Gold" defaultValue={95} min={0} max={250} step={5} />,
      code: `<Stepper label="Gold" defaultValue={95} min={0} max={250} step={5} />`,
    },
    {
      title: 'Formatted',
      preview: <Stepper label="Speed" defaultValue={1} min={0.5} max={3} step={0.5} format={(n) => `${n}x`} maxSfx="速い!" />,
      code: `<Stepper label="Speed" defaultValue={1} min={0.5} max={3} step={0.5} format={(n) => \`\${n}x\`} maxSfx="速い!" />`,
    },
  ],
  props: [
    { name: 'label', type: 'string', description: 'Visible label, also the spinbutton name.' },
    { name: 'value', type: 'number', description: 'Controlled value.' },
    { name: 'defaultValue', type: 'number', default: '0', description: 'Initial value when uncontrolled.' },
    { name: 'onValueChange', type: '(value: number) => void', description: 'Called on every step.' },
    { name: 'min / max / step', type: 'number', default: '0 / 99 / 1', description: 'Range and increment. Arrows step by one, PageUp/PageDown by ten, Home/End jump to the ends.' },
    { name: 'format', type: '(value: number) => string', description: 'Display text for the number (also used as aria-valuetext).' },
    { name: 'name', type: 'string', description: 'Renders a hidden input so the value submits with a form.' },
    { name: 'maxSfx / minSfx', type: 'string | false', default: "'MAX!' / 'MIN'", description: 'Lettering when it reaches either end.' },
    { name: 'className', type: 'string', description: 'Extra classes for the wrapper.' },
  ],
} satisfies DocEntry
