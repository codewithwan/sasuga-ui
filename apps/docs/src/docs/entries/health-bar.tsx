import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { HealthBar } from '@/components/ui/health-bar'
import type { HealthBarProps } from '@/components/ui/health-bar'
import type { DocEntry } from '../types'

function HealthBarDemo({ variant = 'hp', segments, start = 100, label }: Pick<HealthBarProps, 'variant' | 'segments' | 'label'> & { start?: number }) {
  const [hp, setHp] = useState(start)
  const max = 100
  const ko = hp <= 0
  return (
    <div className="grid w-[min(100%,380px)] gap-5">
      <HealthBar value={hp} max={max} label={label} variant={variant} segments={segments} showNumbers />
      <div className="flex flex-wrap gap-3">
        {ko ? (
          <Button size="sm" variant="accent" sfx="復活!" onClick={() => setHp(max)}>
            Revive
          </Button>
        ) : (
          <>
            <Button size="sm" variant="pop" sfx="バシッ" onClick={() => setHp((v) => Math.max(0, v - 14))}>
              Hit −14
            </Button>
            <Button size="sm" variant="ink" sfx="ドゴォ!" power={1.3} onClick={() => setHp((v) => Math.max(0, v - 38))}>
              Big hit
            </Button>
            <Button size="sm" variant="paper" sfx={false} onClick={() => setHp((v) => Math.min(max, v + 25))}>
              Heal +25
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export default {
  slug: 'health-bar',
  name: 'Health Bar',
  jp: '体力ゲージ',
  category: 'Game',
  description:
    'An HP/MP/XP bar that takes hits like a fighting game. Damage flashes, shakes and leaves a light chunk that lingers and chips away while the number pops off; heals rise with sparkles; under 20% it blinks with a heartbeat; at zero the bar shatters and a K.O. stamp lands.',
  preview: <HealthBarDemo label="Hero" />,
  usage: `import { HealthBar } from '@/components/ui/health-bar'

<HealthBar label="Hero" value={hp} max={100} showNumbers />`,
  examples: [
    {
      title: 'Segmented MP',
      preview: <HealthBarDemo variant="mp" segments={10} label="Mana" start={70} />,
      code: `<HealthBar variant="mp" label="Mana" value={mp} segments={10} showNumbers />`,
    },
    {
      title: 'Critical, XP and K.O.',
      preview: (
        <div className="grid w-[min(100%,380px)] gap-6">
          <HealthBar label="Boss" value={14} showNumbers />
          <HealthBar variant="xp" label="Level 7" value={620} max={1000} showNumbers />
          <HealthBar label="Rival" value={0} showNumbers />
        </div>
      ),
      code: `<HealthBar label="Boss" value={14} showNumbers />           {/* ≤ 20%: blinks + heartbeat */}
<HealthBar variant="xp" label="Level 7" value={620} max={1000} showNumbers />
<HealthBar label="Rival" value={0} />                        {/* K.O. stamp */}`,
    },
  ],
  props: [
    { name: 'value', type: 'number', description: 'Required. Current amount; clamped to 0‥max. Changes drive the hit / heal effects.' },
    { name: 'max', type: 'number', default: '100', description: 'Full bar.' },
    { name: 'label', type: 'string', default: 'variant name', description: 'Shown above the bar and used as the accessible name.' },
    { name: 'variant', type: "'hp' | 'mp' | 'xp'", default: "'hp'", description: 'Theme colour: hp = pop, mp = accent, xp = soft accent with drifting lines.' },
    { name: 'segments', type: 'number', description: 'Splits the bar into cells. Omit for a smooth bar.' },
    { name: 'showNumbers', type: 'boolean', default: 'false', description: 'Shows "value / max"; the value pops on change.' },
    { name: 'critical', type: 'number', default: '0.2 (hp) / 0', description: 'Fraction of max at or under which it blinks and pulses. 0 disables.' },
    { name: 'koText', type: 'string | false', default: "'K.O.'", description: 'Stamp at zero (lettering in cel/manga, a calm badge in flat).' },
    { name: '...props', type: 'HTMLAttributes<HTMLDivElement>', description: 'Passed to the role="meter" wrapper (aria-valuenow/min/max/text are set for you).' },
  ],
} satisfies DocEntry
