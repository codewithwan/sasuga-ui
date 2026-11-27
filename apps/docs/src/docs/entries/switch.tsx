import { Switch } from '@/components/ui/switch'
import type { DocEntry } from '../types'

export default {
  slug: 'switch',
  name: 'Switch',
  jp: 'スイッチ',
  category: 'Forms',
  description:
    'A pill track with a round knob. Flipping winds the knob back, dashes it across with afterimages while the accent wipes in behind, and slams the far end with a burst, ON! / OFF lettering and a jolt of the track.',
  preview: <Switch label="Dark mode" />,
  usage: `import { Switch } from '@/components/ui/switch'

<Switch label="Dark mode" onChange={(on) => setDark(on)} />`,
  examples: [
    {
      title: 'Starts on',
      preview: <Switch label="Notifications" defaultChecked />,
      code: `<Switch label="Notifications" defaultChecked />`,
    },
  ],
  props: [
    { name: 'label', type: 'string', description: 'Accessible name (the switch has no visible text label).' },
    { name: 'checked', type: 'boolean', description: 'Controlled state.' },
    { name: 'defaultChecked', type: 'boolean', default: 'false', description: 'Initial state when uncontrolled.' },
    { name: 'onChange', type: '(checked: boolean) => void', description: 'Called after every flip.' },
    { name: 'sfxOn / sfxOff', type: 'string | false', default: "'ON!' / 'OFF'", description: 'Lettering on landing.' },
    { name: 'disabled', type: 'boolean', default: 'false', description: 'Disables the switch.' },
  ],
} satisfies DocEntry
