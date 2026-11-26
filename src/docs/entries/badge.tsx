import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { DocEntry } from '../types'
import { PlayGate } from '../play-gate'

function StampDemo() {
  return (
    <PlayGate label="Stamp">
      {(n) => (
        <div key={n} className="flex flex-wrap items-center justify-center gap-3">
          <Badge stamp={n > 0} variant="accent">
            Cleared!
          </Badge>
          <Badge stamp={n > 0} variant="pop">
            100%
          </Badge>
          <Badge pulse={n > 0} variant="ink">
            Live
          </Badge>
        </div>
      )}
    </PlayGate>
  )
}

function CountDemo() {
  const [count, setCount] = useState(3)
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <Button size="sm" sfx={false} onClick={() => setCount((c) => Math.max(0, c - 1))}>
        −1
      </Button>
      <Badge variant="pop" count={count} />
      <Button size="sm" variant="accent" sfx={false} onClick={() => setCount((c) => c + 1)}>
        +1
      </Button>
      <Button size="sm" variant="ink" sfx={false} onClick={() => setCount((c) => c + 50)}>
        +50
      </Button>
    </div>
  )
}

export default {
  slug: 'badge',
  name: 'Badge',
  jp: 'バッジ',
  category: 'Display',
  description:
    'A small outlined pill for tags, statuses and counts. `stamp` slams it down like a rubber stamp with a burst and dust, `pulse` pops it in and keeps a ring pinging, and a `count` badge bounces and rolls its digits (a Rolling Number) every time the number changes.',
  preview: (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Badge>New</Badge>
      <Badge variant="accent">Hot</Badge>
      <Badge variant="paper">Draft</Badge>
      <Badge variant="pop" pulse>
        Live
      </Badge>
    </div>
  ),
  usage: `import { Badge } from '@/components/ui/badge'

<Badge variant="accent">Hot</Badge>
<Badge stamp variant="pop">Cleared!</Badge>
<Badge variant="pop" count={unread} />`,
  examples: [
    {
      title: 'Variants',
      preview: (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Badge variant="ink">Ink</Badge>
          <Badge variant="accent">Accent</Badge>
          <Badge variant="paper">Paper</Badge>
          <Badge variant="pop">Pop</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      ),
      code: `<Badge variant="ink">Ink</Badge>
<Badge variant="accent">Accent</Badge>
<Badge variant="paper">Paper</Badge>
<Badge variant="pop">Pop</Badge>
<Badge variant="outline">Outline</Badge>`,
    },
    {
      title: 'Stamp and pulse entrances',
      preview: <StampDemo />,
      code: `<Badge stamp variant="accent">Cleared!</Badge>
<Badge stamp variant="pop">100%</Badge>
<Badge pulse variant="ink">Live</Badge>`,
    },
    {
      title: 'Count',
      preview: <CountDemo />,
      code: `<Badge variant="pop" count={count} />   // 99+ above max`,
    },
  ],
  props: [
    { name: 'variant', type: "'ink' | 'accent' | 'paper' | 'pop' | 'outline'", default: "'ink'", description: 'Fill colour. Line, radius and shadow come from the active style.' },
    { name: 'stamp', type: 'boolean', default: 'false', description: 'On mount it slams down from big and tilted, squashes on contact and kicks up a burst and dust.' },
    { name: 'pulse', type: 'boolean', default: 'false', description: 'Pops in, then keeps a ring pinging around it.' },
    { name: 'count', type: 'number', description: 'Shows the number instead of children. Each change bounces the badge and rolls the digits the way the count went (with a sparkle going up).' },
    { name: 'max', type: 'number', default: '99', description: 'Counts above max show as max+.' },
    { name: '...props', type: 'HTMLAttributes<HTMLSpanElement>', description: 'Passed to the sticker span.' },
  ],
} satisfies DocEntry
