import { RadioGroup } from '@/components/ui/radio-group'
import type { DocEntry } from '../types'

const DIFFICULTY = [
  { value: 'easy', label: 'Easy' },
  { value: 'normal', label: 'Normal' },
  { value: 'hard', label: 'Hard' },
]

export default {
  slug: 'radio-group',
  name: 'Radio Group',
  jp: 'ラジオ',
  category: 'Forms',
  description:
    'Native radios dressed as sticker chips, so arrow keys, form submission and screen readers just work. Picking another option launches the dot out of the old chip in an arc with afterimages; it lands in the new one with a burst and both chips bounce.',
  preview: <RadioGroup label="Difficulty" options={DIFFICULTY} defaultValue="normal" />,
  usage: `import { RadioGroup } from '@/components/ui/radio-group'

<RadioGroup
  label="Difficulty"
  options={[
    { value: 'easy', label: 'Easy' },
    { value: 'normal', label: 'Normal' },
    { value: 'hard', label: 'Hard' },
  ]}
  defaultValue="normal"
  onValueChange={setDifficulty}
/>`,
  examples: [
    {
      title: 'Vertical with hints',
      preview: (
        <RadioGroup
          label="Plan"
          orientation="vertical"
          sfx="決定!"
          defaultValue="pro"
          options={[
            { value: 'free', label: 'Free', hint: 'Every component, no FX tuning' },
            { value: 'pro', label: 'Pro', hint: 'Themes and custom sound effects' },
            { value: 'team', label: 'Team', hint: 'Shared design tokens' },
          ]}
        />
      ),
      code: `<RadioGroup
  label="Plan"
  orientation="vertical"
  sfx="決定!"
  options={[
    { value: 'free', label: 'Free', hint: 'Every component, no FX tuning' },
    { value: 'pro', label: 'Pro', hint: 'Themes and custom sound effects' },
  ]}
/>`,
    },
  ],
  props: [
    { name: 'options', type: '{ value: string; label: ReactNode; hint?: ReactNode }[]', description: 'Choices, in order.' },
    { name: 'label', type: 'string', description: 'Accessible group name (rendered as a hidden legend).' },
    { name: 'value', type: 'string', description: 'Controlled value.' },
    { name: 'defaultValue', type: 'string', description: 'Initial value when uncontrolled.' },
    { name: 'onValueChange', type: '(value: string) => void', description: 'Called when the user picks an option.' },
    { name: 'name', type: 'string', default: 'auto id', description: 'Form field name shared by the radios.' },
    { name: 'sfx', type: 'string | false', default: "'ピッ'", description: 'Lettering on pick.' },
    { name: 'orientation', type: "'horizontal' | 'vertical'", default: "'horizontal'", description: 'Layout direction.' },
  ],
} satisfies DocEntry
