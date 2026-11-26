import { Select } from '@/components/ui/select'
import type { DocEntry } from '../types'

const STUDIOS = [
  { value: 'key', label: 'Key animation', hint: 'The poses that sell the shot' },
  { value: 'inbetween', label: 'In-between', hint: 'Every frame between the keys' },
  { value: 'fx', label: 'Effects', hint: 'Smoke, sparks, impact frames' },
  { value: 'comp', label: 'Compositing', hint: 'Layers, glow and camera' },
]

export default {
  slug: 'select',
  name: 'Select',
  jp: 'セレクト',
  category: 'Forms',
  description:
    'A "card deal" select: the sticker trigger squashes, the menu pops out and deals its options in from alternating sides, a cursor springs between them, and the picked card flies into the trigger and lands with a hit. Full listbox keyboard support (arrows, Home/End, Enter, Esc, type-ahead).',
  preview: <Select label="Role" placeholder="Pick a role" options={STUDIOS} />,
  usage: `import { Select } from '@/components/ui/select'

<Select
  label="Role"
  placeholder="Pick a role"
  options={[
    { value: 'key', label: 'Key animation' },
    { value: 'fx', label: 'Effects' },
  ]}
  onValueChange={setRole}
/>`,
  examples: [
    {
      title: 'With a default and form name',
      preview: <Select label="Role" name="role" defaultValue="fx" sfx="ガチャ" options={STUDIOS} />,
      code: `<form>
  <Select label="Role" name="role" defaultValue="fx" sfx="ガチャ" options={roles} />
</form>`,
    },
  ],
  props: [
    { name: 'options', type: '{ value: string; label: string; hint?: string }[]', description: 'Choices, in order. `hint` adds a small second line.' },
    { name: 'label', type: 'string', description: 'Visible label; also names the listbox.' },
    { name: 'value', type: 'string', description: 'Controlled value.' },
    { name: 'defaultValue', type: 'string', description: 'Initial value when uncontrolled.' },
    { name: 'onValueChange', type: '(value: string) => void', description: 'Called when the user picks an option.' },
    { name: 'placeholder', type: 'string', default: "'Choose…'", description: 'Shown when nothing is picked.' },
    { name: 'name', type: 'string', description: 'Adds a hidden input so the value submits with a form.' },
    { name: 'sfx', type: 'string | false', default: "'キマリ!'", description: 'Lettering when the picked card lands.' },
  ],
} satisfies DocEntry
