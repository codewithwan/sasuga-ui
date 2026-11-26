import { useState } from 'react'
import { Gachapon, GachaSlots, GachaWheel } from '@/components/ui/gacha-spin'
import type { CapsulePrize, GachaSegment } from '@/components/ui/gacha-spin'
import { ToggleGroup } from '@/components/ui/toggle-group'
import type { DocEntry } from '../types'

const SEGMENTS: GachaSegment[] = [
  { label: 'x10', icon: 'coin', rarity: 'N', weight: 5 },
  { label: 'Potion', icon: 'potion', rarity: 'R', weight: 3 },
  { label: 'x50', icon: 'coin', rarity: 'N', weight: 4 },
  { label: 'Gem', icon: 'gem', rarity: 'SR', weight: 1.5 },
  { label: 'Key', icon: 'key', rarity: 'R', weight: 3 },
  { label: 'Crown', icon: 'crown', rarity: 'SSR', weight: 0.5 },
  { label: 'Scroll', icon: 'scroll', rarity: 'R', weight: 3 },
  { label: 'Star', icon: 'star', rarity: 'SR', weight: 1.5 },
]

const PRIZES: CapsulePrize[] = [
  { label: 'Koma, Cheering', rarity: 'SSR', weight: 1 },
  { label: 'Gem', icon: 'gem', rarity: 'SR', weight: 2 },
  { label: 'Potion', icon: 'potion', rarity: 'R', weight: 4 },
  { label: 'Music box', icon: 'music', rarity: 'R', weight: 4 },
  { label: 'Bell', icon: 'bell', rarity: 'N', weight: 6 },
]

function Readout({ children }: { children: string }) {
  return <p className="m-0 min-h-5 text-center text-sm text-mute">{children}</p>
}

function WheelDemo() {
  const [last, setLast] = useState('')
  return (
    <div className="grid justify-items-center gap-2">
      <GachaWheel segments={SEGMENTS} onResult={(_, s) => setLast(`${s.label} · ${s.rarity}`)} />
      <Readout>{last ? `Landed on ${last}` : 'Weighted odds: the Crown is the rarest.'}</Readout>
    </div>
  )
}

function RiggedWheel() {
  const [pick, setPick] = useState('5')
  return (
    <div className="grid justify-items-center gap-4">
      <ToggleGroup
        size="sm"
        sfx={false}
        label="Next result"
        value={pick}
        onValueChange={setPick}
        items={[
          { value: '5', label: 'Crown' },
          { value: '3', label: 'Gem' },
          { value: '0', label: 'x10 coins' },
        ]}
      />
      <GachaWheel segments={SEGMENTS} result={Number(pick)} size={240} />
    </div>
  )
}

function SlotsDemo() {
  const [coins, setCoins] = useState(0)
  return (
    <div className="grid justify-items-center gap-2">
      <GachaSlots onResult={(_, pay) => setCoins((c) => c + pay)} />
      <Readout>{`Won so far: ${coins} coins`}</Readout>
    </div>
  )
}

function CapsuleDemo() {
  const [last, setLast] = useState('')
  return (
    <div className="grid justify-items-center gap-2">
      <Gachapon prizes={PRIZES} onResult={(_, p) => setLast(`${p.label} · ${p.rarity}`)} />
      <Readout>{last ? `Got ${last}` : 'Turn, then tap the capsule to crack it.'}</Readout>
    </div>
  )
}

export default {
  slug: 'gacha-spin',
  name: 'Gacha Spin',
  jp: 'スピン',
  category: 'Game',
  description:
    'Three ways to roll: GachaWheel (a prize roulette with real coasting: one quick push, then friction slows it at a constant rate until it stops at a random spot inside the winning segment, and stays there; the flapper bends on each peg and springs back, ticking slower as the wheel slows, then the winner lights up and bursts at the pointer), GachaSlots (three symbol strips that scroll, brake left to right and land exactly on their symbol with a small bounce of the strip, and a line that flashes and pays out in coins) and Gachapon (a capsule toy machine: turn the crank a full click-by-click turn, the pile jumps in the glass dome, the flap opens and a capsule drops, bounces twice and rolls to rest on the tray; tap it and it wobbles, the top pops off with a spin and the prize rises out in a fan of light). Each takes a controlled `result` or rolls by weight, reports `onResult`, is busy while it spins, keyboard operable, announces the result, and fades straight to the result under reduced motion.',
  preview: <WheelDemo />,
  usage: `import { GachaWheel, GachaSlots, Gachapon } from '@/components/ui/gacha-spin'

<GachaWheel
  segments={[
    { label: '10 Coins', icon: 'coin', rarity: 'N', weight: 5 },
    { label: 'Gem', icon: 'gem', rarity: 'SR', weight: 1 },
    { label: 'Crown', icon: 'crown', rarity: 'SSR', weight: 0.5 },
    // …
  ]}
  onResult={(index, segment) => grant(segment)}
/>`,
  examples: [
    {
      title: 'Slot machine',
      preview: <SlotsDemo />,
      code: `<GachaSlots onResult={(stops, payout) => addCoins(payout)} />

// your own symbols, and a server-decided result
<GachaSlots
  symbols={[{ icon: 'heart', label: 'Heart', payout: 5 }, { icon: 'crown', label: 'Crown', payout: 100, rarity: 'SSR' }]}
  result={[1, 1, 1]}
/>`,
    },
    {
      title: 'Capsule machine',
      preview: <CapsuleDemo />,
      code: `<Gachapon
  prizes={[
    { label: 'Koma, Cheering', rarity: 'SSR', weight: 1 }, // no icon: Koma herself
    { label: 'Gem', icon: 'gem', rarity: 'SR', weight: 2 },
    { label: 'Bell', icon: 'bell', rarity: 'N', weight: 6 },
  ]}
  onResult={(index, prize) => grant(prize)}
/>`,
    },
    {
      title: 'Controlled result (decided by your server)',
      preview: <RiggedWheel />,
      code: `const [next, setNext] = useState(5)

<GachaWheel segments={segments} result={next} onResult={(i) => setNext(await api.roll())} />`,
    },
  ],
  props: [
    { name: 'GachaWheel.segments', type: 'GachaSegment[]', description: 'Required. `{ label, rarity?, icon?, color?, weight? }`. Rarity sets the colour (N paper, R soft, SR accent, SSR pop) and how big the win hits.' },
    { name: 'GachaWheel.result', type: 'number', description: 'Controlled: the segment index the next spin lands on. Undefined = weighted random.' },
    { name: 'GachaWheel.onResult', type: '(index, segment) => void', description: 'Fired once the wheel has come to rest.' },
    { name: 'GachaWheel.size', type: 'number', default: '280', description: 'Diameter in px.' },
    { name: 'GachaWheel.duration', type: 'number', default: '4.2', description: 'Seconds the wheel coasts from the push to a standstill. The stop is decided up front, so friction alone brings it there.' },
    { name: 'GachaSlots.symbols', type: 'SlotSymbol[]', default: 'heart · coin · gem · star · crown', description: '`{ icon, label, payout?, weight?, fill?, rarity? }`. Three of a kind on the line pays `payout` (default 10).' },
    { name: 'GachaSlots.result', type: '[number, number, number]', description: 'Controlled: the symbol index each reel stops on.' },
    { name: 'GachaSlots.winRate', type: 'number', default: '0.3', description: 'Uncontrolled: chance that a spin lines up three of a kind.' },
    { name: 'GachaSlots.onResult', type: '(stops, payout) => void', description: 'Fired once the last reel has landed; payout is 0 without a line.' },
    { name: 'Gachapon.prizes', type: 'CapsulePrize[]', description: 'Required. `{ label, rarity?, icon?, weight? }`. Without an icon the prize is Koma as a cheering chibi.' },
    { name: 'Gachapon.result', type: 'number', description: 'Controlled: the prize index the next capsule holds.' },
    { name: 'Gachapon.onResult', type: '(index, prize) => void', description: 'Fired when the capsule is cracked open.' },
    { name: 'onSpin / onTurn', type: '() => void', description: 'Fired when a spin (wheel, slots) or a turn of the crank (capsule machine) starts.' },
    { name: 'spinLabel / turnLabel', type: 'ReactNode', default: "'Spin' / 'Turn'", description: 'Text of the action button.' },
    { name: 'sfx', type: 'string | false', description: 'Lettering on the win. Default per rarity; hidden in the flat style.' },
    { name: 'disabled', type: 'boolean', description: 'Blocks new spins. Every machine is also busy while it spins.' },
    { name: 'label', type: 'string', description: 'Accessible name of the machine.' },
  ],
} satisfies DocEntry
