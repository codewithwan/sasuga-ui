import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RollingNumber } from '@/components/ui/rolling-number'
import type { DocEntry } from '../types'

function RollDemo() {
  const [n, setN] = useState(96)
  return (
    <div className="grid justify-items-center gap-5">
      <RollingNumber value={n} separator className="ui-head text-[56px] leading-none text-ink" />
      <div className="flex flex-wrap justify-center gap-3">
        <Button size="sm" sfx={false} onClick={() => setN((v) => Math.max(0, v - 1))}>
          −1
        </Button>
        <Button size="sm" variant="accent" sfx={false} onClick={() => setN((v) => v + 1)}>
          +1
        </Button>
        <Button size="sm" variant="pop" sfx={false} onClick={() => setN((v) => v + 1234)}>
          +1,234
        </Button>
        <Button size="sm" sfx={false} onClick={() => setN(0)}>
          Reset
        </Button>
      </div>
    </div>
  )
}

function FormatDemo() {
  const [t, setT] = useState(75)
  const [price, setPrice] = useState(9.5)
  const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  return (
    <div className="grid justify-items-center gap-5">
      <div className="flex flex-wrap items-baseline justify-center gap-8">
        <RollingNumber value={t} format={clock} className="ui-head text-[40px] leading-none text-ink" />
        <RollingNumber value={price} decimals={2} prefix="$" className="ui-head text-[40px] leading-none text-accent" />
        <RollingNumber value={price * 1000} separator=" " suffix=" pts" className="ui-head text-[26px] leading-none text-mute" />
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button size="sm" sfx={false} onClick={() => setT((v) => Math.max(0, v - 1))}>
          −1s
        </Button>
        <Button size="sm" variant="accent" sfx={false} onClick={() => setPrice((p) => +(p + Math.random() * 40).toFixed(2))}>
          Roll price
        </Button>
      </div>
    </div>
  )
}

export default {
  slug: 'rolling-number',
  name: 'Rolling Number',
  jp: 'ロール',
  category: 'Motion',
  description:
    'The odometer behind every counter in the kit. Each digit is its own column clipped to exactly one line, so the old number never shows through. Columns roll the way the value went (up when it grows, down when it shrinks), rightmost first, on a spring with motion blur, and land with a small squash. A column that appears or disappears (99 → 100) grows or shrinks its width instead of popping.',
  preview: <RollDemo />,
  usage: `import { RollingNumber } from '@/components/ui/rolling-number'

<RollingNumber value={score} separator className="ui-head text-5xl" />`,
  examples: [
    {
      title: 'Format, decimals, prefix / suffix',
      preview: <FormatDemo />,
      code: `<RollingNumber value={secondsLeft} format={(s) => mm + ':' + ss} />
<RollingNumber value={price} decimals={2} prefix="$" />
<RollingNumber value={points} separator=" " suffix=" pts" />`,
    },
    {
      title: 'Roll in on mount',
      preview: <RollingNumber from={0} value={98765} separator duration={1400} className="ui-head text-[44px] leading-none text-pop" />,
      code: `<RollingNumber from={0} value={98765} separator duration={1400} />`,
    },
  ],
  props: [
    { name: 'value', type: 'number', description: 'Required. Each change rolls the digits that differ.' },
    { name: 'from', type: 'number', description: 'Rolls from this value on mount. Without it, it mounts at `value` without rolling.' },
    { name: 'format', type: '(value: number) => string', description: 'Display text (mm:ss, "1.5x"…). Digits roll, other characters stay where they are.' },
    { name: 'decimals', type: 'number', default: '0', description: 'Digits after the decimal mark (ignored with `format`).' },
    { name: 'separator', type: 'string | boolean', default: 'false', description: 'Thousands separator; `true` = ",".' },
    { name: 'decimalMark', type: 'string', default: "'.'", description: 'Decimal mark.' },
    { name: 'prefix / suffix', type: 'ReactNode', description: 'Static content around the digits.' },
    { name: 'duration', type: 'number', default: '650', description: 'About how long a roll takes to settle, in ms. Big jumps cover more digits in the same time, so they blur.' },
    { name: 'stagger', type: 'number', default: '38', description: 'Delay between columns, rightmost first, in ms.' },
    { name: 'spins', type: 'number', description: 'Extra full turns for the low columns. Default: chosen from the size of the jump (none with `format`).' },
    { name: 'live', type: 'boolean', default: 'true', description: 'Announces the value (aria-live="polite"). The rolling columns are hidden from screen readers.' },
    { name: 'onSettle', type: '(value: number) => void', description: 'Called when every column has come to rest after a change.' },
    { name: 'digitClassName', type: 'string', description: 'Classes for the digit row.' },
  ],
} satisfies DocEntry
