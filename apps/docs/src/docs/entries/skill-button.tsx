import { useState } from 'react'
import { Icon } from '@/components/ui/icon'
import { SkillButton } from '@/components/ui/skill-button'
import type { DocEntry } from '../types'

function HotbarDemo() {
  const [log, setLog] = useState('Press Q, W, E or click')
  return (
    <div className="grid justify-items-center gap-5">
      <div className="flex items-start gap-5">
        <SkillButton label="Fireball" keybind="Q" cooldown={2500} sfx="ボッ!" onCast={() => setLog('Fireball!')}>
          <Icon name="fire" size="1em" />
        </SkillButton>
        <SkillButton label="Thunder" keybind="W" cooldown={5000} sfx="ズドン!" onCast={() => setLog('Thunder!')}>
          <Icon name="bolt" size="1em" />
        </SkillButton>
        <SkillButton label="Guard" keybind="E" cooldown={8000} shape="round" sfx="ガキン!" onCast={() => setLog('Guard up!')}>
          <Icon name="shield" size="1em" />
        </SkillButton>
      </div>
      <p className="ui-head text-sm leading-none text-mute" aria-hidden="true">
        {log}
      </p>
    </div>
  )
}

export default {
  slug: 'skill-button',
  name: 'Skill Button',
  jp: 'スキル',
  category: 'Game',
  description:
    'An ability button for a hotbar. Casting hits like an impact frame and starts a radial cooldown sweep with a countdown number; when it comes back it flashes, rings and shouts READY. Pressing it early just shakes. Its keybind works as a real hotkey.',
  preview: <HotbarDemo />,
  usage: `import { Icon } from '@/components/ui/icon'
import { SkillButton } from '@/components/ui/skill-button'

<SkillButton label="Fireball" keybind="Q" cooldown={2500} onCast={castFireball}>
  <Icon name="fire" size="1em" />
</SkillButton>`,
  examples: [
    {
      title: 'Sizes, shapes and states',
      preview: (
        <div className="flex flex-wrap items-start gap-6">
          <SkillButton label="Dash" size="sm" cooldown={1200} sfx="シュッ" hotkey={false} keybind="Shift">
            <Icon name="bolt" size="1em" />
          </SkillButton>
          <SkillButton label="Ultimate" size="lg" cooldown={12000} sfx="必殺!" readySfx="最大!">
            <Icon name="star" size="1em" />
          </SkillButton>
          <SkillButton label="Spin" shape="round" cooldown={0} sfx="グルッ">
            <Icon name="fire" size="1em" />
          </SkillButton>
          <SkillButton label="Locked" disabled>
            <Icon name="shield" size="1em" />
          </SkillButton>
        </div>
      ),
      code: `<SkillButton label="Dash" size="sm" cooldown={1200} keybind="Shift" hotkey={false}>…</SkillButton>
<SkillButton label="Ultimate" size="lg" cooldown={12000} sfx="必殺!" readySfx="最大!">…</SkillButton>
<SkillButton label="Spin" shape="round" cooldown={0}>…</SkillButton>
<SkillButton label="Locked" disabled>…</SkillButton>`,
    },
  ],
  props: [
    { name: 'label', type: 'string', description: 'Required. Ability name: accessible name and caption.' },
    { name: 'children', type: 'ReactNode', description: 'The icon. SVGs sized to 1em scale with `size`.' },
    { name: 'cooldown', type: 'number', default: '3000', description: 'Cooldown in ms after each cast. 0 = none.' },
    { name: 'onCast', type: '() => void', description: 'Fired when the skill is cast (ready and pressed).' },
    { name: 'onReady', type: '() => void', description: 'Fired when the cooldown ends.' },
    { name: 'keybind', type: 'string', description: 'Key hint in the corner ("Q", "Space"…); set as aria-keyshortcuts.' },
    { name: 'hotkey', type: 'boolean', default: 'true', description: 'Cast with `keybind` from anywhere on the page (ignored while typing in a field).' },
    { name: 'shape', type: "'square' | 'round'", default: "'square'", description: 'Corner radius from the style (round = ui-pill).' },
    { name: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'Button size; also scales the impact.' },
    { name: 'sfx', type: 'string | false', default: "'ドン!'", description: 'Lettering on cast.' },
    { name: 'readySfx', type: 'string | false', default: "'READY'", description: 'Lettering when the cooldown ends.' },
    { name: 'showLabel', type: 'boolean', default: 'true', description: 'Caption under the button.' },
    { name: 'disabled', type: 'boolean', description: 'Locks the skill.' },
  ],
} satisfies DocEntry
