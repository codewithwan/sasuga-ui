import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { StatBar } from '@/components/ui/stat-bar'
import type { DocEntry } from '../types'
import { PlayGate } from '../play-gate'

/** Calm stand-in for a bar that has not loaded yet: label and an empty track, no effects. */
function IdleBar({ label }: { label: string }) {
  return (
    <div className="grid gap-1.5 py-1.5" aria-hidden="true">
      <span className="ui-head text-[15px] leading-none text-ink">{label}</span>
      <span className="ui-border-thin ui-pill block h-4 bg-canvas" />
    </div>
  )
}

/** The bars load in surges (with effects) when they mount, so they mount on demand. */
function Sheet({ bars, className }: { bars: { label: string; value: number; rank?: string }[]; className?: string }) {
  return (
    <PlayGate label="Load stats" replay="Reload">
      {(run) => (
        <div key={run} className={className}>
          {bars.map((b) => (run ? <StatBar key={b.label} label={b.label} value={b.value} rank={b.rank} /> : <IdleBar key={b.label} label={b.label} />))}
        </div>
      )}
    </PlayGate>
  )
}

function HpDemo() {
  const [run, setRun] = useState(false)
  const [hp, setHp] = useState(80)
  if (!run)
    return (
      <div className="ui-card grid w-[min(100%,440px)] gap-4 p-5">
        <IdleBar label="HP" />
        <Button size="sm" variant="accent" sfx={false} className="justify-self-center" onClick={() => setRun(true)}>
          Load HP
        </Button>
      </div>
    )
  return (
    <div className="ui-card grid w-[min(100%,440px)] gap-4 p-5">
      <StatBar label="HP" value={hp} max={120} />
      <div className="flex flex-wrap justify-center gap-3">
        <Button size="sm" variant="pop" sfx="ドカッ" onClick={() => setHp((v) => Math.max(0, v - 12))}>
          Hit −12
        </Button>
        <Button size="sm" variant="ink" sfx="バキッ" onClick={() => setHp((v) => Math.max(0, v - 40))}>
          Crit −40
        </Button>
        <Button size="sm" variant="accent" sfx="キラッ" onClick={() => setHp((v) => Math.min(120, v + 30))}>
          Heal +30
        </Button>
      </div>
    </div>
  )
}

export default {
  slug: 'stat-bar',
  name: 'Stat Bar',
  jp: '能力値',
  category: 'Display',
  description:
    'A game meter. It loads in surges when it scrolls into view, then pops its rank (click to replay). After that every change hits: damage snaps the fill down with a flash, shards and a floating number while a pale ghost bar chips away behind it; healing sparkles along the gain; under the critical line the bar turns the hit colour and blinks.',
  preview: <Sheet className="ui-card w-[min(100%,420px)] p-5" bars={[{ label: 'TypeScript', value: 92, rank: 'S' }]} />,
  usage: `import { StatBar } from '@/components/ui/stat-bar'

<StatBar label="TypeScript" value={92} rank="S" />
<StatBar label="HP" value={hp} max={120} />`,
  examples: [
    {
      title: 'Damage and heal',
      preview: <HpDemo />,
      code: `const [hp, setHp] = useState(80)

<StatBar label="HP" value={hp} max={120} />
<Button onClick={() => setHp((v) => v - 12)}>Hit</Button>
<Button onClick={() => setHp((v) => v + 30)}>Heal</Button>`,
    },
    {
      title: 'A skill sheet',
      preview: (
        <Sheet
          className="ui-card grid w-[min(100%,420px)] gap-2 p-5"
          bars={[
            { label: 'Layout', value: 88, rank: 'A' },
            { label: 'Timing', value: 64, rank: 'B' },
            { label: 'Effects', value: 97, rank: 'S' },
          ]}
        />
      ),
      code: `<StatBar label="Layout" value={88} rank="A" />
<StatBar label="Timing" value={64} rank="B" />
<StatBar label="Effects" value={97} rank="S" />`,
    },
  ],
  props: [
    { name: 'label', type: 'string', description: 'Stat name.' },
    { name: 'value', type: 'number', description: '0–max. Changes after the intro animate as damage or heal.' },
    { name: 'rank', type: 'string', description: 'Letter that pops in at the end (S, A, B…). Without it the badge shows the value.' },
    { name: 'max', type: 'number', default: '100', description: 'Top of the scale.' },
    { name: 'critical', type: 'number', default: '0.2', description: 'Share of max under which the bar turns the hit colour and blinks.' },
    { name: 'className', type: 'string', description: 'Extra classes for the row.' },
  ],
} satisfies DocEntry
