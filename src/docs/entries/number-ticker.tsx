import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { NumberTicker } from '@/components/ui/number-ticker'
import type { DocEntry } from '../types'

function ScoreDemo() {
  const [score, setScore] = useState(12480)
  return (
    <div className="grid justify-items-center gap-5">
      <span className="grid justify-items-center gap-1">
        <span className="ui-head text-xs leading-none text-mute">Score</span>
        <NumberTicker value={score} burstOnChange celebrate={50000} celebrateText="すごい!" className="ui-head text-[44px] leading-none text-ink" />
      </span>
      <div className="flex flex-wrap justify-center gap-3">
        <Button size="sm" variant="accent" sfx="ポン" onClick={() => setScore((s) => s + 137)}>
          +137
        </Button>
        <Button size="sm" variant="pop" sfx="ドン!" onClick={() => setScore((s) => s + 25000)}>
          +25,000
        </Button>
        <Button size="sm" sfx={false} onClick={() => setScore((s) => Math.max(0, s - 999))}>
          −999
        </Button>
        <Button size="sm" variant="ink" sfx={false} onClick={() => setScore(0)}>
          Reset
        </Button>
      </div>
    </div>
  )
}

function CoinsDemo() {
  const [coins, setCoins] = useState(9.5)
  return (
    <div className="flex flex-wrap items-center gap-5">
      <NumberTicker value={coins} decimals={2} prefix="$" duration={1200} className="ui-head text-[32px] leading-none" />
      <NumberTicker value={coins * 1000} separator=" " suffix=" pts" className="ui-head text-[24px] leading-none text-accent" />
      <Button size="sm" sfx={false} onClick={() => setCoins((c) => +(c + Math.random() * 40).toFixed(2))}>
        Roll
      </Button>
    </div>
  )
}

function OpenDemo() {
  const [open, setOpen] = useState(true)
  const [gold, setGold] = useState(2450)
  return (
    <div className="grid justify-items-center gap-5">
      <span className="grid h-[52px] place-items-center">
        <NumberTicker open={open} value={gold} prefix="G " className="ui-head text-[40px] leading-none text-accent" />
      </span>
      <div className="flex flex-wrap justify-center gap-3">
        <Button size="sm" variant="accent" sfx={false} onClick={() => setOpen((o) => !o)}>
          {open ? 'Hide' : 'Show'}
        </Button>
        <Button size="sm" sfx={false} onClick={() => setGold((g) => g + 550)}>
          +550
        </Button>
      </div>
    </div>
  )
}

export default {
  slug: 'number-ticker',
  name: 'Number Ticker',
  jp: 'カウンター',
  category: 'Game',
  description:
    'A score / gold counter on top of Rolling Number. Every digit rolls in its own clipped column (big jumps spin the low ones), then the number squashes and flashes the accent as it lands. It opens with a scale-and-blur in while the digits roll up from 0, resets or closes with a fast blurred spin down and a soft puff, and can celebrate milestones with a burst.',
  preview: <ScoreDemo />,
  usage: `import { NumberTicker } from '@/components/ui/number-ticker'

<NumberTicker value={score} burstOnChange className="ui-head text-4xl" />`,
  examples: [
    {
      title: 'Decimals, prefix / suffix, separator',
      preview: <CoinsDemo />,
      code: `<NumberTicker value={coins} decimals={2} prefix="$" duration={1200} />
<NumberTicker value={points} separator=" " suffix=" pts" />`,
    },
    {
      title: 'Show / hide',
      preview: <OpenDemo />,
      code: `<NumberTicker open={open} value={gold} prefix="G " />`,
    },
    {
      title: 'Slow roll in',
      preview: <NumberTicker value={98765} duration={2000} className="ui-head text-[40px] leading-none text-pop" />,
      code: `<NumberTicker value={98765} duration={2000} />`,
    },
  ],
  props: [
    { name: 'value', type: 'number', description: 'Required. The number to land on.' },
    { name: 'from', type: 'number', default: '0', description: 'Rolls up from this value on mount and whenever it opens again. Pass `value` to mount without rolling.' },
    { name: 'duration', type: 'number', default: '900', description: 'About how long a roll takes to settle, in ms (spring).' },
    { name: 'open', type: 'boolean', default: 'true', description: 'Show / hide. Opening scales and un-blurs it in; closing spins the digits down to 0 and puffs it away (it stays mounted, hidden).' },
    { name: 'onClosed', type: '() => void', description: 'Fired after the close puff.' },
    { name: 'celebrate', type: 'number | number[]', description: 'Milestones: a number = every multiple of it, a list = those values. Landing past one throws focus lines, a burst and debris.' },
    { name: 'celebrateText', type: 'string | false', default: 'false', description: 'Lettering for a celebration (cel / manga).' },
    { name: 'decimals', type: 'number', default: '0', description: 'Digits after the decimal mark.' },
    { name: 'separator', type: 'string | false', default: "','", description: 'Thousands separator; false = no grouping.' },
    { name: 'decimalMark', type: 'string', default: "'.'", description: 'Decimal mark.' },
    { name: 'prefix / suffix', type: 'ReactNode', description: 'Static text around the digits ("$", " pts").' },
    { name: 'pop', type: 'boolean', default: 'true', description: 'Squash + accent flash when it lands.' },
    { name: 'burstOnChange', type: 'boolean', default: 'false', description: 'Style-aware burst and sparkle when it lands.' },
    { name: 'live', type: 'boolean', default: 'true', description: 'Announces the final value (aria-live="polite"). Rolling digits are hidden from screen readers.' },
    { name: 'digitClassName', type: 'string', description: 'Classes for the digit row.' },
  ],
} satisfies DocEntry
