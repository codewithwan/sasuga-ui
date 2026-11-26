import { ToggleGroup } from '@/components/ui/toggle-group'
import type { DocEntry } from '../types'

const VIEWS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
]

const MODS = [
  { value: 'turbo', label: 'Turbo' },
  { value: 'shield', label: 'Shield' },
  { value: 'magnet', label: 'Magnet' },
  { value: 'ghost', label: 'Ghost', disabled: true },
]

export default {
  slug: 'toggle-group',
  name: 'Toggle Group',
  jp: 'トグル',
  category: 'Forms',
  description:
    'A segmented control. In single mode a sticker slides under the picked item: its leading edge shoots ahead, the trailing edge catches up and it lands with a hit. Multiple mode pops a sticker onto each pressed item. Arrow keys, Home and End move between items.',
  preview: <ToggleGroup label="Calendar view" items={VIEWS} defaultValue="week" />,
  usage: `import { ToggleGroup } from '@/components/ui/toggle-group'

<ToggleGroup
  label="Calendar view"
  items={[
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
  ]}
  defaultValue="week"
  onValueChange={setView}
/>`,
  examples: [
    {
      title: 'Multiple',
      preview: <ToggleGroup type="multiple" label="Power-ups" items={MODS} defaultValue={['shield']} sfx="ON!" />,
      code: `<ToggleGroup
  type="multiple"
  label="Power-ups"
  items={[
    { value: 'turbo', label: 'Turbo' },
    { value: 'shield', label: 'Shield' },
    { value: 'magnet', label: 'Magnet' },
    { value: 'ghost', label: 'Ghost', disabled: true },
  ]}
  defaultValue={['shield']}
  onValueChange={setMods}
/>`,
    },
    {
      title: 'Small',
      preview: <ToggleGroup size="sm" label="Speed" items={[{ value: '1', label: '1x' }, { value: '2', label: '2x' }, { value: '4', label: '4x' }]} defaultValue="1" sfx={false} />,
      code: `<ToggleGroup size="sm" label="Speed" items={speeds} defaultValue="1" sfx={false} />`,
    },
  ],
  props: [
    { name: 'items', type: '{ value: string; label: ReactNode; disabled?: boolean }[]', description: 'Items, in order.' },
    { name: 'label', type: 'string', description: 'Accessible name for the group.' },
    { name: 'type', type: "'single' | 'multiple'", default: "'single'", description: 'Single is a radio group (one value); multiple is a group of aria-pressed toggles.' },
    { name: 'value', type: 'string | string[]', description: 'Controlled value (a string in single mode, an array in multiple).' },
    { name: 'defaultValue', type: 'string | string[]', description: 'Initial value when uncontrolled.' },
    { name: 'onValueChange', type: '(value: string) => void | (value: string[]) => void', description: 'Called when the selection changes.' },
    { name: 'size', type: "'sm' | 'md'", default: "'md'", description: 'Item padding and type size.' },
    { name: 'sfx', type: 'string | false', default: "'ピタッ'", description: 'Lettering on select.' },
    { name: 'className', type: 'string', description: 'Extra classes for the bar.' },
  ],
} satisfies DocEntry
