import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ComboCounter } from '@/components/ui/combo-counter'
import { useCombo } from '@/components/ui/use-combo'
import type { DocEntry } from '../types'

function ComboDemo() {
  const combo = useCombo({ timeout: 2400 })
  return (
    <div className="grid w-[min(100%,360px)] justify-items-start gap-5">
      <ComboCounter {...combo.props} />
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="accent" sfx="バシッ" onClick={() => combo.hit()}>
          Hit!
        </Button>
        <Button size="sm" variant="pop" sfx="ドドド" onClick={() => combo.hit(8)}>
          Flurry +8
        </Button>
        <span className="ui-head text-sm leading-none text-mute">Best {combo.best}</span>
      </div>
    </div>
  )
}

function ControlledDemo() {
  const [hits, setHits] = useState(0)
  const [dropped, setDropped] = useState(0)
  return (
    <div className="grid w-[min(100%,360px)] justify-items-start gap-5">
      <ComboCounter
        value={hits}
        timeout={1500}
        label="Chain"
        milestones={[{ at: 5, text: 'Nice!' }, { at: 12, text: 'Unstoppable!' }]}
        onTimeout={() => {
          setHits(0)
          setDropped((d) => d + 1)
        }}
      />
      <div className="flex items-center gap-3">
        <Button size="sm" sfx={false} onClick={() => setHits((h) => h + 1)}>
          Chain +1
        </Button>
        <span className="ui-head text-sm leading-none text-mute">Dropped {dropped}×</span>
      </div>
    </div>
  )
}

export default {
  slug: 'combo-counter',
  name: 'Combo Counter',
  jp: 'コンボ',
  category: 'Game',
  description:
    'A "×12 Combo!" sticker. Every hit punches it (squash, shake, a flash) while the digits roll in clipped columns, so no old number is left behind. Milestones (10 / 25 / 50) stamp big lettering with focus lines and the number grows and changes colour. A timer bar drains smoothly between hits; when it runs out the sticker hops, falls and fades out completely.',
  preview: <ComboDemo />,
  usage: `import { ComboCounter } from '@/components/ui/combo-counter'
import { useCombo } from '@/components/ui/use-combo'

const combo = useCombo({ timeout: 2400 })

<ComboCounter {...combo.props} />
// on every landed hit
combo.hit()`,
  examples: [
    {
      title: 'Controlled, custom milestones',
      preview: <ControlledDemo />,
      code: `const [hits, setHits] = useState(0)

<ComboCounter
  value={hits}
  timeout={1500}
  label="Chain"
  milestones={[{ at: 5, text: 'Nice!' }, { at: 12, text: 'Unstoppable!' }]}
  onTimeout={() => setHits(0)}
/>`,
    },
  ],
  props: [
    { name: 'value', type: 'number', description: 'Required. Chain length. Raise it per hit; 0 resets.' },
    { name: 'timeout', type: 'number', default: '2400', description: 'ms without a hit before the chain decays.' },
    { name: 'onTimeout', type: '() => void', description: 'Called after the fall-away. Reset `value` here.' },
    { name: 'label', type: 'string', default: "'Combo!'", description: 'Word next to the number.' },
    { name: 'milestones', type: '{ at: number; text: string }[]', default: '10 Great! · 25 Amazing! · 50 Legendary!!', description: 'Chain lengths that get the big lettering, focus lines and a bigger number.' },
    { name: 'showFrom', type: 'number', default: '2', description: 'Hidden below this many hits.' },
    { name: 'useCombo({ timeout })', type: '{ count, best, hit(n?), reset, props }', description: "Hook from './use-combo'. Spread `props` onto the counter." },
  ],
} satisfies DocEntry
