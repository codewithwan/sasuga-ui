import { Checkbox } from '@/components/ui/checkbox'
import type { DocEntry } from '../types'

export default {
  slug: 'checkbox',
  name: 'Checkbox',
  jp: 'チェック',
  category: 'Forms',
  description:
    'A native checkbox under a sticker box. Ticking squashes the box, draws the check stroke by stroke and ends in a burst with sparkles and OK! lettering. Unticking erases the check backwards under a quick reverse slash.',
  preview: <Checkbox>Remember me</Checkbox>,
  usage: `import { Checkbox } from '@/components/ui/checkbox'

<Checkbox onChange={(on) => setRemember(on)}>Remember me</Checkbox>`,
  examples: [
    {
      title: 'Group',
      preview: (
        <div className="grid gap-5">
          <Checkbox defaultChecked>Ship it</Checkbox>
          <Checkbox>Break it</Checkbox>
          <Checkbox>Fix it</Checkbox>
        </div>
      ),
      code: `<Checkbox defaultChecked>Ship it</Checkbox>
<Checkbox>Break it</Checkbox>
<Checkbox>Fix it</Checkbox>`,
    },
  ],
  props: [
    { name: 'children', type: 'ReactNode', description: 'The label.' },
    { name: 'checked', type: 'boolean', description: 'Controlled state.' },
    { name: 'defaultChecked', type: 'boolean', default: 'false', description: 'Initial state when uncontrolled.' },
    { name: 'onChange', type: '(checked: boolean) => void', description: 'Called on every change.' },
    { name: 'sfx', type: 'string | false', default: "'OK!'", description: 'Lettering when it gets ticked.' },
    { name: 'name / disabled', type: 'string / boolean', description: 'Passed to the native input.' },
  ],
} satisfies DocEntry
