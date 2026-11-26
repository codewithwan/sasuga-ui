import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { GachaCard } from '@/components/ui/gacha-card'
import type { GachaRarity } from '@/components/ui/gacha-card'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import type { DocEntry } from '../types'

const NAMES: Record<GachaRarity, [string, string][]> = {
  N: [
    ['Koma, Day Off', 'Casual'],
    ['Koma, Sketching', 'Casual'],
    ['Koma, Morning', 'Casual'],
  ],
  R: [
    ['Koma, Festival', 'Yukata event'],
    ['Koma, Rooftop', 'After school'],
  ],
  SR: [
    ['Koma, Keyframe', 'Animator · Ink'],
    ['Koma, Overtime', 'Animator · Night'],
  ],
  SSR: [['Koma, Starfall', 'Limited · Starfall']],
}
const LVL: Record<GachaRarity, number> = { N: 0, R: 1, SR: 2, SSR: 3 }

function roll(): GachaRarity {
  const r = Math.random()
  return r < 0.04 ? 'SSR' : r < 0.18 ? 'SR' : r < 0.5 ? 'R' : 'N'
}
const card = (rarity: GachaRarity, k: number) => {
  const pool = NAMES[rarity]
  const [title, subtitle] = pool[k % pool.length]
  return { rarity, title, subtitle }
}

function GachaDemo() {
  const order: GachaRarity[] = ['SSR', 'R', 'SR', 'N']
  const [pull, setPull] = useState(0)
  const c = card(order[pull % order.length], pull)
  return (
    <div className="grid justify-items-center gap-5">
      <GachaCard key={pull} {...c} />
      <Button size="sm" variant="accent" sfx="ガチャ!" icon={<Icon name="sparkle" size={16} />} onClick={() => setPull((p) => p + 1)}>
        Pull again
      </Button>
    </div>
  )
}

/** Ten cards reveal in sequence; the best one comes last, after a slow-motion pause. */
function TenPull() {
  const [batch, setBatch] = useState(() => draw())
  const [open, setOpen] = useState<boolean[]>(() => batch.map(() => false))
  const [hush, setHush] = useState(false)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function draw() {
    const rs = Array.from({ length: 10 }, roll)
    if (!rs.some((r) => LVL[r] >= 2)) rs[0] = 'SR' // one SR or better guaranteed
    return rs.sort((a, b) => LVL[a] - LVL[b]).map((r, k) => card(r, k))
  }
  const flipAt = (i: number) => setOpen((o) => o.map((v, k) => (k === i ? true : v)))
  const revealAll = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    const lastIdx = batch.length - 1
    for (let i = 0; i < lastIdx; i++) timers.current.push(window.setTimeout(() => flipAt(i), i * 320))
    // the slow-mo pause before the best card
    const t = lastIdx * 320 + 700
    timers.current.push(window.setTimeout(() => setHush(true), t - 300))
    timers.current.push(window.setTimeout(() => flipAt(lastIdx), t + 500))
  }
  const reset = () => {
    timers.current.forEach(clearTimeout)
    const next = draw()
    setBatch(next)
    setOpen(next.map(() => false))
    setHush(false)
  }
  const lastIdx = batch.length - 1

  return (
    <div className="grid w-full justify-items-center gap-6">
      {/* each card brings its own padded stage, so the grid needs no gap */}
      <div className="grid grid-cols-2 min-[480px]:grid-cols-3 sm:grid-cols-5">
        {batch.map((c, i) => {
          const final = i === lastIdx
          return (
            <GachaCard
              key={`${c.title}-${i}`}
              {...c}
              size="sm"
              dim={final}
              tempo={final ? 2 : 0.8}
              revealed={open[i]}
              onReveal={() => flipAt(i)}
              onLanded={final ? () => setHush(false) : undefined}
              className={cn('transition-opacity duration-500', hush && !final && 'opacity-40')}
            />
          )
        })}
      </div>
      <div className="flex gap-3">
        <Button size="sm" variant="accent" sfx="10連!" icon={<Icon name="gem" size={16} />} onClick={revealAll}>
          Reveal all
        </Button>
        <Button size="sm" sfx="リセット" onClick={reset}>
          New pull
        </Button>
      </div>
    </div>
  )
}

export default {
  slug: 'gacha-card',
  name: 'Gacha Card',
  jp: 'ガチャ',
  category: 'Game',
  description:
    'A collectible card dealt face-down on its own rounded stage, revealed in stages: it trembles as a rarity-coloured aura and rising particles build (an SSR starts out looking like an SR, then turns), the stage dims, a beam of light and a sunburst break, the card flips with motion blur and lands with a hit sized to its rarity. Then each star stamps in on its own spot with its own burst and sparkle, the name banner slams down, and SR / SSR finish with lettering (SSR: a rainbow sweep and confetti). Every DOM effect is clipped to the stage, so a card inside a layout never paints over its neighbours. Face-up, each card tilts and glints only under its own pointer. The default art is the mascot, dressed up more per rarity.',
  preview: <GachaDemo />,
  usage: `import { GachaCard } from '@/components/ui/gacha-card'

<GachaCard
  rarity="SSR"
  title="Koma, Starfall"
  subtitle="Limited · Starfall"
  onReveal={(rarity) => track(rarity)}
/>`,
  examples: [
    {
      title: '10-pull',
      preview: <TenPull />,
      code: `const [open, setOpen] = useState(cards.map(() => false))
const last = cards.length - 1 // sorted: best card last

{cards.map((c, i) => (
  <GachaCard
    key={c.id}
    {...c}
    size="sm"
    dim={i === last}          // only the finale dims its stage
    tempo={i === last ? 2 : 0.8} // slow motion for the best card
    revealed={open[i]}
    onReveal={() => setOpen((o) => o.map((v, k) => (k === i ? true : v)))}
  />
))}`,
    },
    {
      title: 'Already face-up (hover the foil)',
      preview: (
        <div className="flex flex-wrap justify-center gap-2">
          <GachaCard rarity="SR" title="Koma, Keyframe" subtitle="Animator · Ink" defaultRevealed />
          <GachaCard rarity="SSR" title="Koma, Starfall" subtitle="Limited · Starfall" defaultRevealed />
        </div>
      ),
      code: `<GachaCard rarity="SSR" title="Koma, Starfall" subtitle="Limited · Starfall" defaultRevealed />`,
    },
  ],
  props: [
    { name: 'rarity', type: "'N' | 'R' | 'SR' | 'SSR'", description: 'Required. Sets the frame colour, stars (1/2/3/5), the default art and how big the reveal hits.' },
    { name: 'title', type: 'string', description: 'Required. Card name, on the banner.' },
    { name: 'subtitle', type: 'string', description: 'Second line on the banner.' },
    { name: 'art', type: 'ReactNode', description: 'Illustration for the front. Default: the mascot with a per-rarity expression and outfit.' },
    { name: 'revealed', type: 'boolean', description: 'Controlled face-up state. Setting it to false flips the card back.' },
    { name: 'defaultRevealed', type: 'boolean', default: 'false', description: 'Uncontrolled initial state (no reveal animation).' },
    { name: 'onReveal', type: '(rarity) => void', description: 'Fired when a face-down card is clicked or activated with Enter / Space.' },
    { name: 'onLanded', type: '(rarity) => void', description: 'Fired when the whole reveal sequence has finished.' },
    { name: 'size', type: "'sm' | 'md'", default: "'md'", description: '184px or 128px wide. The stage adds 20px / 12px of padding around the card, which is where its glow plays.' },
    { name: 'tempo', type: 'number', default: '1', description: 'Timing multiplier for the reveal; 2 = slow motion.' },
    { name: 'dim', type: 'boolean', default: 'true', description: "Darken the card's own stage while an SR / SSR charges. Nothing outside the stage is touched." },
    { name: 'sfx', type: 'string | false', description: "Lettering for SR ('SR!') and SSR ('SSR!!') pulls. Hidden in the flat style." },
    { name: '...props', type: 'ButtonHTMLAttributes', description: 'Passed to the card button; `className` goes to the stage wrapper.' },
  ],
} satisfies DocEntry
