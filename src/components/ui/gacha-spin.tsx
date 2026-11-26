import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Chibi } from '@/components/art/mascot'
import { Button } from '@/components/ui/button'
import type { GachaRarity } from '@/components/ui/gacha-card'
import { Icon } from '@/components/ui/icon'
import type { IconName } from '@/components/ui/icon'
import { KICK, TAU, burst, clamp, delayed, easeOutCubic, prefersReducedMotion, rand, rays, sfx, shards, sparkle, spawn, uiStyle } from '@/fx'
import { C } from '@/fx/palette'
import { cn } from '@/lib/utils'

export type { GachaRarity }

/* ─────────────── shared ─────────────── */

const LVL: Record<GachaRarity, 0 | 1 | 2 | 3> = { N: 0, R: 1, SR: 2, SSR: 3 }
const RARITY_NAME: Record<GachaRarity, string> = { N: 'Normal', R: 'Rare', SR: 'Super Rare', SSR: 'Super Special Rare' }
/** Surface colour per rarity: theme tokens only, so every theme and mode follows. */
const FILL: Record<GachaRarity, string> = { N: 'var(--color-paper)', R: 'var(--color-accent-soft)', SR: 'var(--color-accent)', SSR: 'var(--color-pop)' }
const SFX: Record<GachaRarity, string> = { N: 'ポン', R: 'やった!', SR: '当たり!', SSR: '大当たり!!' }
const POP = 'cubic-bezier(.2,1.6,.4,1)'
/** Canvas colour per rarity, read live from the palette. */
const fxColor = (r: GachaRarity) => (r === 'SSR' ? C.pop : r === 'SR' ? C.accent : C.soft)
const mod = (a: number, m: number) => ((a % m) + m) % m
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2
/** Specular highlight: the only literal colour in the kit's art, white at some alpha. */
const glint = (a: number) => `rgb(255 255 255 / ${a})`
/** Ink outlines in the active style's weight. */
const LINE: CSSProperties = { stroke: 'var(--ui-line)', strokeWidth: 'var(--ui-bw)', strokeLinejoin: 'round' }
const THIN: CSSProperties = { stroke: 'var(--ui-line)', strokeWidth: 'var(--ui-bw-thin)', strokeLinejoin: 'round' }

/** Index of a random item, each picked in proportion to its `weight` (default 1). */
function pickWeighted(items: readonly { weight?: number }[]) {
  const total = items.reduce((s, it) => s + Math.max(0, it.weight ?? 1), 0)
  let r = Math.random() * total
  for (let i = 0; i < items.length; i++) {
    r -= Math.max(0, items[i].weight ?? 1)
    if (r < 0) return i
  }
  return items.length - 1
}

/** The win: a burst sized to the rarity, debris, sparkles and lettering, all at one point. */
function celebrate(x: number, y: number, rarity: GachaRarity, text: string | false | undefined, scale = 1) {
  const lvl = LVL[rarity]
  const color = fxColor(rarity)
  spawn(burst(x, y, { radius: (30 + lvl * 12) * scale, spikes: 10 + lvl * 2, color }))
  if (lvl >= 1) spawn(shards(x, y, { count: 5 + lvl * 3, speed: (220 + lvl * 50) * scale, size: 7 * scale }))
  if (lvl >= 2) spawn(rays(x, y, { inner: 22 * scale, outer: (64 + lvl * 16) * scale, count: 12 + lvl * 3, width: 6 * scale }))
  for (let k = 0; k <= lvl; k++) {
    const a = (k / (lvl + 1)) * TAU + rand(-0.4, 0.4)
    const d = (34 + lvl * 8) * scale
    spawn(delayed(0.08 + k * 0.07, sparkle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, { size: rand(9, 14) * scale, color: k % 2 ? C.pop : C.white })))
  }
  if (lvl === 3) {
    for (let k = 0; k < 3; k++) spawn(delayed(0.1 + k * 0.1, shards(x + rand(-30, 30) * scale, y - 20 * scale, { count: 7, speed: 240 * scale, size: 6 * scale, colors: [C.accent, C.pop, C.soft, C.white] })))
  }
  if (text !== false) spawn(delayed(0.04, sfx(x, y - (34 + lvl * 6) * scale, text ?? SFX[rarity], { size: (28 + lvl * 5) * scale, color })))
}

/** A rAF loop: `step` gets seconds since start and returns false to stop. Returns a cancel. */
function loop(step: (t: number) => boolean) {
  let raf = 0
  const t0 = performance.now()
  const tick = (now: number) => {
    if (step((now - t0) / 1000)) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}

/** Keyboard users keep their place: the kit Button disables itself while busy, so focus is handed back after. */
function useRefocus() {
  const wrap = useRef<HTMLSpanElement>(null)
  return {
    wrap,
    had: () => !!wrap.current?.contains(document.activeElement),
    give: (had: boolean) => {
      if (had) requestAnimationFrame(() => wrap.current?.querySelector('button')?.focus())
    },
  }
}

/* ─────────────── GachaWheel ─────────────── */

export type GachaSegment = {
  label: string
  /** Sets the segment colour (N paper, R soft, SR accent, SSR pop) and how big the win hits. */
  rarity?: GachaRarity
  icon?: IconName
  /** Any CSS colour for the segment; use theme variables (`var(--color-…)`) so modes follow. */
  color?: string
  /** Relative odds when the result is random. Default 1. */
  weight?: number
}

export type GachaWheelProps = {
  segments: GachaSegment[]
  /** Controlled: the segment index the next spin lands on. Leave undefined for a weighted random pick. */
  result?: number
  /** Fired once the wheel has come to rest. */
  onResult?: (index: number, segment: GachaSegment) => void
  /** Fired when a spin starts. */
  onSpin?: () => void
  /** Diameter in px. */
  size?: number
  /** Seconds the wheel coasts from the push to a standstill. */
  duration?: number
  spinLabel?: ReactNode
  /** Lettering at the pointer when it lands. Default per rarity; `false` = none. */
  sfx?: string | false
  disabled?: boolean
  /** Accessible name of the wheel. */
  label?: string
  className?: string
}

const R = 96
/** Length of the hand push, in seconds. After it, only friction acts. */
const PUSH = 0.12
/** How far (in wheel degrees) before the pointer a peg starts bending the flapper, and how far it bends it. */
const REACH = 7
const BEND = 24

function wedge(i: number, seg: number, r = R) {
  const a0 = ((i * seg - 90) * Math.PI) / 180
  const a1 = (((i + 1) * seg - 90) * Math.PI) / 180
  const large = seg > 180 ? 1 : 0
  return `M0 0L${(Math.cos(a0) * r).toFixed(3)} ${(Math.sin(a0) * r).toFixed(3)}A${r} ${r} 0 ${large} 1 ${(Math.cos(a1) * r).toFixed(3)} ${(Math.sin(a1) * r).toFixed(3)}Z`
}

/**
 * Angle of a wheel pushed for `PUSH` seconds and then left to friction: a constant
 * deceleration that brings it to rest exactly `dist` degrees later at `push + brake` seconds.
 * Returns the angle travelled and the angular speed at time t.
 */
function coast(t: number, dist: number, brake: number) {
  const v0 = (2 * dist) / (PUSH + brake)
  const a = v0 / brake
  if (t <= 0) return [0, 0]
  if (t < PUSH) return [(v0 * t * t) / (2 * PUSH), (v0 * t) / PUSH]
  const u = Math.min(t - PUSH, brake)
  return [(v0 * PUSH) / 2 + v0 * u - (a * u * u) / 2, v0 - a * u]
}

/**
 * A prize roulette. A quick push, then friction slows it at a constant rate until it
 * stops at a random spot inside the winning segment: where it stops is where it stays.
 * The flapper bends on every peg and springs back, ticking slower as the wheel slows;
 * then the winner lights up and a burst fires at the pointer.
 */
export function GachaWheel({
  segments,
  result,
  onResult,
  onSpin,
  size = 280,
  duration = 4.2,
  spinLabel = 'Spin',
  sfx: sfxText,
  disabled,
  label = 'Prize wheel',
  className,
}: GachaWheelProps) {
  const disc = useRef<HTMLDivElement>(null)
  const flapper = useRef<HTMLSpanElement>(null)
  const dim = useRef<SVGGElement>(null)
  const ring = useRef<SVGPathElement>(null)
  const angle = useRef(0)
  const flap = useRef({ r: 0, v: 0 })
  const stop = useRef<() => void>(() => {})
  const focus = useRefocus()
  const [spinning, setSpinning] = useState(false)
  const [won, setWon] = useState<number | null>(null)
  const [said, setSaid] = useState('')
  useEffect(() => () => stop.current(), [])

  const n = segments.length
  const seg = 360 / Math.max(1, n)
  const reach = Math.min(seg * 0.4, REACH)

  // the winner lights up once the wheel is at rest: the rest dims, an outline pulses
  useEffect(() => {
    if (won === null || prefersReducedMotion()) return
    const a = dim.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, easing: 'ease-out', fill: 'forwards' })
    const b = ring.current?.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0.45 }, { opacity: 1 }], { duration: 900, easing: 'ease-out', fill: 'forwards' })
    return () => {
      a?.cancel()
      b?.cancel()
    }
  }, [won])

  const write = (deg: number) => {
    if (disc.current) disc.current.style.transform = `rotate(${deg}deg)`
  }
  const writeFlap = (r: number) => {
    if (flapper.current) flapper.current.style.transform = `rotate(${r}deg)`
  }

  const land = (target: number, had: boolean) => {
    const s = segments[target]
    setSpinning(false)
    setWon(target)
    setSaid(`Result: ${s.label}${s.rarity ? `, ${RARITY_NAME[s.rarity]}` : ''}`)
    onResult?.(target, s)
    focus.give(had)
    const f = flapper.current
    if (!f || prefersReducedMotion()) return
    const r = f.getBoundingClientRect()
    celebrate(r.left + r.width / 2, r.bottom + 4, s.rarity ?? 'R', sfxText, clamp(size / 280, 0.7, 1.3))
  }

  const spin = () => {
    if (spinning || disabled || !n) return
    const target = result !== undefined ? clamp(Math.round(result), 0, n - 1) : pickWeighted(segments)
    const had = focus.had()
    onSpin?.()
    setWon(null)
    setSaid('Spinning')
    stop.current()
    // same orientation, smaller number
    const from = mod(angle.current, 360)
    // decided up front: the pointer comes to rest 10–40% or 60–90% of the way across the winner
    const across = Math.random() < 0.5 ? rand(0.1, 0.4) : rand(0.6, 0.9)
    const want = mod(-(target + across) * seg, 360)
    const turns = Math.max(3, Math.round(duration * 1.5))
    const dist = mod(want - from, 360) + 360 * turns
    const to = from + dist
    if (prefersReducedMotion()) {
      angle.current = to
      write(to)
      disc.current?.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' })
      land(target, had)
      return
    }
    setSpinning(true)
    const brake = Math.max(0.6, duration)
    const end = PUSH + brake
    const f = flap.current
    let prevT = 0
    let landed = false
    stop.current = loop((t) => {
      const [moved, speed] = t >= end ? [dist, 0] : coast(t, dist, brake)
      const deg = from + moved
      angle.current = deg
      write(deg)
      // the flapper: a damped spring, held bent while a peg pushes on its tip
      const dt = Math.min(t - prevT, 1 / 30)
      prevT = t
      const steps = Math.max(1, Math.ceil(dt * 480))
      for (let i = 0; i < steps; i++) {
        f.v += (-1600 * f.r - 26 * f.v) * (dt / steps)
        f.r += f.v * (dt / steps)
      }
      const ahead = mod(mod(-deg, 360), seg) // wheel degrees until the next peg reaches the pointer
      const touching = ahead < reach
      if (touching) {
        const bent = -BEND * (1 - ahead / reach)
        if (f.r > bent) {
          f.r = bent
          f.v = Math.max(-700, Math.min(f.v, (-BEND * speed) / reach))
        }
      }
      writeFlap(f.r)
      if (t >= end && !landed) {
        landed = true
        land(target, had)
      }
      if (landed && Math.abs(f.v) < 0.5 && (touching || Math.abs(f.r) < 0.05)) {
        if (!touching) f.r = 0
        f.v = 0
        writeFlap(f.r)
        return false
      }
      return true
    })
  }

  return (
    <div className={cn('inline-grid justify-items-center gap-5', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <div aria-hidden="true" className="ui-shadow absolute inset-0 rounded-full" />
        <div ref={disc} className="absolute inset-0 rounded-full will-change-transform">
          <svg viewBox="-100 -100 200 200" className="block size-full overflow-visible" role="img" aria-label={`${label}: ${segments.map((s) => s.label).join(', ')}`}>
            {segments.map((s, i) => {
              const fill = s.color ?? (s.rarity ? FILL[s.rarity] : i % 2 ? 'var(--color-accent-soft)' : 'var(--color-paper)')
              const light = s.rarity === 'SR' || s.rarity === 'SSR'
              const chord = 2 * R * 0.56 * Math.sin(Math.min(Math.PI / 2, (seg * Math.PI) / 360))
              const fs = clamp((chord * 0.9) / (s.label.length * 0.72), 6, 13)
              const iconSize = clamp(chord * 0.5, 12, 26)
              return (
                <g key={i}>
                  <path d={wedge(i, seg)} style={{ fill, ...THIN }} vectorEffect="non-scaling-stroke" />
                  <g transform={`rotate(${(i + 0.5) * seg})`}>
                    {s.icon && (
                      <Icon
                        name={s.icon}
                        size={iconSize}
                        x={-iconSize / 2}
                        y={-R * 0.78 - iconSize / 2}
                        style={{ '--icon-fill': light ? 'var(--color-paper)' : 'var(--color-accent-soft)' } as CSSProperties}
                      />
                    )}
                    <text
                      y={s.icon ? -R * 0.53 : -R * 0.62}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className={cn('ui-head', light ? 'fill-white' : 'fill-ink')}
                      style={{ fontSize: fs }}
                    >
                      {s.label}
                    </text>
                  </g>
                </g>
              )
            })}
            {won !== null && (
              <g>
                <g ref={dim} style={{ opacity: prefersReducedMotion() ? 1 : 0 }}>
                  {segments.map((_, i) => (i === won ? null : <path key={i} d={wedge(i, seg)} style={{ fill: 'var(--color-canvas)', fillOpacity: 0.6 }} />))}
                </g>
                <path
                  ref={ring}
                  d={wedge(won, seg, R - 2)}
                  style={{ fill: 'none', stroke: 'var(--color-pop)', strokeWidth: 5, strokeLinejoin: 'round', opacity: prefersReducedMotion() ? 1 : 0 }}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            )}
            {segments.map((_, i) => {
              const a = ((i * seg - 90) * Math.PI) / 180
              return (
                <circle
                  key={i}
                  cx={Math.cos(a) * (R - 6)}
                  cy={Math.sin(a) * (R - 6)}
                  r={3.4}
                  style={{ fill: 'var(--color-paper)', ...THIN }}
                  vectorEffect="non-scaling-stroke"
                />
              )
            })}
            <circle r={R} style={{ fill: 'none', ...LINE }} vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
        {/* a fixed gloss on the face: it stays put while the wheel turns under it */}
        <svg aria-hidden="true" viewBox="-100 -100 200 200" className="pointer-events-none absolute inset-0 size-full">
          <path d="M-70 -42A82 82 0 0 1 -30 -78" style={{ fill: 'none', stroke: glint(0.45), strokeWidth: 6, strokeLinecap: 'round' }} />
          <path d="M-80 -14A82 82 0 0 1 -77 -28" style={{ fill: 'none', stroke: glint(0.35), strokeWidth: 6, strokeLinecap: 'round' }} />
        </svg>
        {/* the axle stays still */}
        <span
          aria-hidden="true"
          className="ui-border ui-shadow-sm absolute top-1/2 left-1/2 grid size-[22%] -translate-1/2 place-items-center rounded-full bg-paper"
          style={{ '--icon-fill': 'var(--color-pop)' } as CSSProperties}
        >
          <Icon name="star" size="55%" />
        </span>
        {/* the flapper: pivots at its round head, bent aside by each peg */}
        <span aria-hidden="true" className="absolute top-0 left-1/2 z-10 -translate-x-1/2 -translate-y-[45%]">
          <span ref={flapper} className="block origin-[50%_30%]">
            <svg width={30} height={40} viewBox="0 0 30 40" className="block overflow-visible">
              <path d="M15 38L4.5 15A12 12 0 1 1 25.5 15Z" style={{ fill: 'var(--color-pop)', ...LINE }} />
              <circle cx={15} cy={12} r={4} style={{ fill: 'var(--color-paper)' }} />
              <ellipse cx={10} cy={7} rx={3} ry={1.6} transform="rotate(-35 10 7)" style={{ fill: glint(0.55) }} />
            </svg>
          </span>
        </span>
      </div>
      <span ref={focus.wrap}>
        <Button variant="accent" sfx={false} loading={spinning} disabled={disabled || !n} icon={<Icon name="sparkle" size={16} />} onClick={spin}>
          {spinLabel}
        </Button>
      </span>
      <span className="sr-only" aria-live="polite">
        {said}
      </span>
    </div>
  )
}

/* ─────────────── GachaSlots ─────────────── */

export type SlotSymbol = {
  icon: IconName
  label: string
  /** Coins paid for three in a row. Default 10. */
  payout?: number
  /** Relative odds per reel when the result is random. Default 1. */
  weight?: number
  /** Icon tint; use theme variables. */
  fill?: string
  /** How big the win hits. Default from the payout. */
  rarity?: GachaRarity
}

export type GachaSlotsProps = {
  /** Default: heart, coin, gem, star, crown. */
  symbols?: SlotSymbol[]
  /** Controlled: the symbol index each reel stops on, for the next spin. */
  result?: readonly [number, number, number]
  /** Uncontrolled: chance that a spin lines up three of a kind. Default 0.3. */
  winRate?: number
  /** Fired once the last reel has settled. `payout` is 0 when nothing lined up. */
  onResult?: (stops: [number, number, number], payout: number) => void
  onSpin?: () => void
  spinLabel?: ReactNode
  /** Lettering on a win. Default per rarity; `false` = none. */
  sfx?: string | false
  disabled?: boolean
  label?: string
  className?: string
}

const SYMBOLS: SlotSymbol[] = [
  { icon: 'heart', label: 'Heart', payout: 5, weight: 5, fill: 'var(--color-pop)' },
  { icon: 'coin', label: 'Coin', payout: 10, weight: 4, fill: 'var(--color-accent-soft)' },
  { icon: 'gem', label: 'Gem', payout: 25, weight: 3, fill: 'var(--color-accent)' },
  { icon: 'star', label: 'Star', payout: 50, weight: 2, fill: 'var(--color-pop)' },
  { icon: 'crown', label: 'Crown', payout: 100, weight: 1, fill: 'var(--color-accent)' },
]
const ROW = 56
const COINS = Array.from({ length: 10 }, (_, k) => k)
const rarityOf = (s: SlotSymbol): GachaRarity => s.rarity ?? ((s.payout ?? 10) >= 100 ? 'SSR' : (s.payout ?? 10) >= 25 ? 'SR' : 'R')

/** Each reel lists every symbol once, in its own order. */
const reelOrder = (n: number, r: number) => {
  const o = Array.from({ length: n }, (_, i) => (i + r * 2) % n)
  return r % 2 ? o.reverse() : o
}

/**
 * A three-reel slot machine. The symbol strips scroll down, then brake one by one, left
 * to right, landing exactly on their symbol with a small bounce of the strip. Three of
 * a kind on the line flashes the line and pays out in popping coins.
 */
export function GachaSlots({
  symbols = SYMBOLS,
  result,
  winRate = 0.3,
  onResult,
  onSpin,
  spinLabel = 'Spin',
  sfx: sfxText,
  disabled,
  label = 'Slot machine',
  className,
}: GachaSlotsProps) {
  const n = symbols.length
  const strips = useRef<(HTMLDivElement | null)[]>([])
  const reels = useRef<(HTMLDivElement | null)[]>([])
  const line = useRef<HTMLSpanElement>(null)
  const coins = useRef<HTMLSpanElement>(null)
  /** Reel travel in rows; it only ever grows, so the symbols always move down. */
  const pos = useRef([0, 0, 0])
  const stop = useRef<() => void>(() => {})
  const focus = useRefocus()
  const [spinning, setSpinning] = useState(false)
  const [pay, setPay] = useState(0)
  const [said, setSaid] = useState('')
  useEffect(() => () => stop.current(), [])

  const orders = [0, 1, 2].map((r) => reelOrder(n, r))
  /** Row of the strip at the top of the window (the middle row is the pay line). */
  const topRow = (p: number) => mod(-p, n)

  const draw = (r: number, p: number) => {
    const el = strips.current[r]
    if (el) el.style.transform = `translateY(${-topRow(p) * ROW}px)`
  }

  const finish = (stops: [number, number, number], had: boolean) => {
    setSpinning(false)
    const names = stops.map((i) => symbols[i].label).join(', ')
    const win = stops[0] === stops[1] && stops[1] === stops[2]
    const sym = symbols[stops[0]]
    const amount = win ? (sym.payout ?? 10) : 0
    setPay(amount)
    setSaid(win ? `${names}. Three in a row, plus ${amount} coins.` : `${names}. No line.`)
    onResult?.(stops, amount)
    focus.give(had)
    if (!win || prefersReducedMotion()) return
    const rare = rarityOf(sym)
    line.current?.animate([{ opacity: 0.35 }, { opacity: 1, scale: '1.04 1.12' }, { opacity: 0.35, scale: '1' }], { duration: 260, iterations: 4 })
    strips.current.forEach((strip, r) => {
      const cell = strip?.children[Math.round(topRow(pos.current[r])) + 1]
      cell?.animate([{ scale: '1' }, { scale: '1.35' }, { scale: '1' }], { duration: 420, delay: r * 90, easing: POP })
    })
    // coins pop out of the line and fall, inside the machine
    const cs = coins.current ? Array.from(coins.current.children) : []
    const count = clamp(Math.round(3 + Math.log2(amount + 1) * 1.2), 4, cs.length)
    cs.slice(0, count).forEach((c, k) => {
      const dx = rand(-110, 110)
      const up = rand(60, 120)
      c.animate(
        [
          { opacity: 0, transform: 'translate(-50%, -50%) scale(.3)' },
          { opacity: 1, transform: `translate(calc(-50% + ${dx * 0.55}px), calc(-50% - ${up}px)) scale(1) rotate(${rand(-90, 90)}deg)`, offset: 0.4 },
          { opacity: 0, transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${rand(30, 80)}px)) scale(.9) rotate(${rand(-200, 200)}deg)` },
        ],
        { duration: rand(800, 1100), delay: k * 45, easing: 'cubic-bezier(.25,.6,.5,1)' },
      )
    })
    const m = line.current?.getBoundingClientRect()
    if (m) celebrate(m.left + m.width / 2, m.top + m.height / 2, rare, sfxText, 0.9)
  }

  const spin = () => {
    if (spinning || disabled || n < 2) return
    const had = focus.had()
    let stops: [number, number, number]
    if (result) stops = [0, 1, 2].map((r) => clamp(Math.round(result[r]), 0, n - 1)) as [number, number, number]
    else if (rand(0, 1) < winRate) {
      const s = pickWeighted(symbols)
      stops = [s, s, s]
    } else {
      stops = [pickWeighted(symbols), pickWeighted(symbols), pickWeighted(symbols)]
      if (stops[0] === stops[1] && stops[1] === stops[2]) stops[2] = (stops[2] + 1) % n
    }
    onSpin?.()
    setPay(0)
    setSaid('Spinning')
    stop.current()
    // the reel travel (mod n) that puts the wanted symbol on the middle row
    const wantPos = (r: number) => mod(1 - orders[r].indexOf(stops[r]), n)

    if (prefersReducedMotion()) {
      stops.forEach((_, r) => {
        pos.current[r] = wantPos(r)
        draw(r, pos.current[r])
        strips.current[r]?.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' })
      })
      finish(stops, had)
      return
    }
    setSpinning(true)
    const vNom = 16 // rows per second at full speed
    const ra = 0.22 // spin up
    const de = 0.42 // constant brake
    // the landing: the strip carries on a hair past the symbol and settles back (≈3px)
    const amp = 0.055
    const w = TAU * 3.2
    const k = 10
    const vEnd = amp * w // brake ends at exactly the bounce's starting speed, so motion stays smooth
    const plans = [0, 1, 2].map((r) => {
      const T = 1.05 + r * 0.5
      const p0 = pos.current[r]
      const unit = ra / 2 + (T - ra - de) + de / 2
      const dNom = vNom * unit + (vEnd * de) / 2
      const d = dNom + mod(wantPos(r) - (p0 + dNom), n)
      const vmax = (d - (vEnd * de) / 2) / unit
      const x0 = (vmax * ra) / 2 + vmax * (T - ra - de)
      const at = (t: number) => {
        if (t < ra) return (vmax * t * t) / (2 * ra)
        if (t < T - de) return (vmax * ra) / 2 + vmax * (t - ra)
        if (t < T) {
          const u = t - (T - de)
          return x0 + vmax * u - ((vmax - vEnd) * u * u) / (2 * de)
        }
        const u = t - T
        return d + amp * Math.exp(-k * u) * Math.sin(w * u)
      }
      return { T, p0, d, at, stopped: false }
    })
    stop.current = loop((t) => {
      let moving = false
      plans.forEach((pl, r) => {
        const settled = t >= pl.T + 0.55
        const p = settled ? pl.p0 + pl.d : pl.p0 + pl.at(t)
        pos.current[r] = p
        draw(r, p)
        if (!pl.stopped && t >= pl.T) {
          pl.stopped = true
          // the clunk: a small hit on the stopped symbol (the reel itself does not move)
          const el = reels.current[r]
          if (el) {
            const b = el.getBoundingClientRect()
            spawn(burst(b.left + b.width / 2, b.top + b.height / 2, { radius: 22, spikes: 8, color: C.soft }))
          }
        }
        if (!settled) moving = true
      })
      if (!moving) {
        plans.forEach((pl, r) => (pos.current[r] = mod(pl.p0 + pl.d, n)))
        finish(stops, had)
        return false
      }
      return true
    })
  }

  return (
    <div className={cn('ui-card ui-tone relative inline-grid justify-items-center gap-4 overflow-clip p-4', className)}>
      <div role="img" aria-label={`${label}, three reels`} className="ui-r ui-border-thin relative grid grid-cols-3 gap-2 bg-canvas p-2">
        {[0, 1, 2].map((r) => (
          <div
            key={r}
            ref={(el) => {
              reels.current[r] = el
            }}
            className="ui-r-sm ui-border-thin relative w-[68px] overflow-hidden bg-paper"
            style={{ height: ROW * 3 }}
          >
            <div
              ref={(el) => {
                strips.current[r] = el
              }}
              className="grid will-change-transform"
            >
              {[0, 1, 2].flatMap((copy) =>
                orders[r].map((si, i) => (
                  <span key={`${copy}-${i}`} className="grid place-items-center" style={{ height: ROW }}>
                    <Icon name={symbols[si].icon} size={36} style={{ '--icon-fill': symbols[si].fill ?? 'var(--color-accent-soft)' } as CSSProperties} />
                  </span>
                )),
              )}
            </div>
            {/* the reel curves away top and bottom */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(var(--color-paper),transparent_30%,transparent_70%,var(--color-paper))]" />
          </div>
        ))}
        {/* the pay line */}
        <span
          ref={line}
          aria-hidden="true"
          className="ui-r-sm pointer-events-none absolute inset-x-1 top-1/2 -translate-y-1/2 opacity-35"
          style={{ height: ROW, border: 'var(--ui-bw) solid var(--color-pop)', background: 'color-mix(in srgb, var(--color-pop) 10%, transparent)' }}
        />
        <span ref={coins} aria-hidden="true" className="pointer-events-none absolute inset-0">
          {COINS.map((k) => (
            <Icon key={k} name="coin" size={24} className="absolute top-1/2 left-1/2 opacity-0" style={{ '--icon-fill': 'var(--color-pop)' } as CSSProperties} />
          ))}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span ref={focus.wrap}>
          <Button variant="accent" size="sm" sfx={false} loading={spinning} disabled={disabled || n < 2} icon={<Icon name="bolt" size={16} />} onClick={spin}>
            {spinLabel}
          </Button>
        </span>
        <span
          key={pay}
          className={cn('ui-pill ui-border-thin inline-flex items-center gap-1.5 bg-paper py-1 pr-3 pl-1.5 font-mono text-sm font-bold text-ink', pay > 0 && 'animate-pop')}
          aria-hidden="true"
        >
          <Icon name="coin" size={18} style={{ '--icon-fill': 'var(--color-pop)' } as CSSProperties} />
          {pay > 0 ? `+${pay}` : '0'}
        </span>
      </div>
      <span className="sr-only" aria-live="polite">
        {said}
      </span>
    </div>
  )
}

/* ─────────────── Gachapon ─────────────── */

export type CapsulePrize = {
  label: string
  rarity?: GachaRarity
  /** Prize art. Without one the prize is Koma herself, as a cheering chibi. */
  icon?: IconName
  /** Relative odds when the result is random. Default 1. */
  weight?: number
}

export type GachaponProps = {
  prizes: CapsulePrize[]
  /** Controlled: the prize index the next capsule holds. */
  result?: number
  /** Fired when the capsule is cracked open and the prize shows. */
  onResult?: (index: number, prize: CapsulePrize) => void
  /** Fired when the crank is turned. */
  onTurn?: () => void
  turnLabel?: ReactNode
  /** Lettering when the capsule opens. Default per rarity; `false` = none. */
  sfx?: string | false
  disabled?: boolean
  label?: string
  className?: string
}

type Phase = 'idle' | 'turning' | 'ready' | 'open'

/** Holes read as dark in both modes. */
const HOLE = 'light-dark(color-mix(in srgb, var(--color-ink) 82%, var(--color-accent)), var(--color-canvas))'
/** The shadow side of the accent plastic, darker in both modes. */
const SHADE = 'light-dark(color-mix(in srgb, var(--color-accent) 74%, var(--color-ink)), color-mix(in srgb, var(--color-accent) 60%, var(--color-canvas)))'
const POP_SHADE = 'light-dark(color-mix(in srgb, var(--color-pop) 76%, var(--color-ink)), color-mix(in srgb, var(--color-pop) 62%, var(--color-canvas)))'
/** Brushed metal: paper pulled toward the muted grey. */
const METAL = 'color-mix(in srgb, var(--color-paper) 70%, var(--color-mute))'
const GLASS = 'color-mix(in srgb, var(--color-accent-soft) 26%, var(--color-paper))'
/** Capsule top halves: the theme's colours and their mixes. */
const TOPS = [
  'var(--color-pop)',
  'var(--color-accent)',
  'var(--color-accent-soft)',
  'color-mix(in srgb, var(--color-accent) 50%, var(--color-pop))',
  'color-mix(in srgb, var(--color-ink) 68%, var(--color-accent))',
  'color-mix(in srgb, var(--color-pop) 50%, var(--color-paper))',
]
/** Light rays per rarity. */
const RAY: Record<GachaRarity, string> = {
  N: 'var(--color-accent-soft)',
  R: 'var(--color-accent-soft)',
  SR: 'color-mix(in srgb, var(--color-accent-soft) 55%, var(--color-pop))',
  SSR: 'var(--color-pop)',
}

/* machine geometry, in px of the 220 × 352 drawing */
const W = 220
const H = 352
const DOME = { x: 110, y: 94, r: 84 }
const KNOB = { x: 154, y: 236 }
const CHUTE = { x: 26, y: 258, w: 66, h: 34 }
/** Dropped capsule radius, the tray floor (capsule centre at rest) and the tray's ends. */
const CR = 16
const FLOOR = 324
const TRAY = [36, 184] as const
/** Ratchet: clicks per full turn of the crank, seconds per click. */
const CLICKS = 8
const CLICK_T = 0.15
/** The prize floats this far above the capsule. */
const LIFT = 78

/** The pile in the dome: rest x, rest y, tilt, colour. Bottom row first. */
const PILE = [
  [68, 150, -18, 0],
  [96, 152, 24, 2],
  [124, 151, -40, 1],
  [152, 149, 12, 3],
  [54, 127, 35, 4],
  [82, 125, -8, 5],
  [110, 128, 50, 0],
  [138, 124, -25, 2],
  [166, 128, 18, 1],
  [68, 101, -30, 3],
  [96, 103, 10, 1],
  [124, 100, -55, 5],
  [152, 102, 30, 4],
  [95, 79, 15, 2],
  [125, 77, -20, 0],
] as const
const BOTTOM_ROW = 4

/** One half of a capsule, centred on the seam: a tinted dome on top, a pale clear half below. */
function CapsuleHalf({ r, top, part }: { r: number; top: string; part: 'top' | 'bottom' }) {
  if (part === 'top')
    return (
      <>
        <path d={`M${-r} 0A${r} ${r} 0 0 1 ${r} 0Z`} style={{ fill: top, ...THIN }} />
        <path d={`M${-r} 0H${r}`} style={{ ...THIN, strokeWidth: 'calc(var(--ui-bw-thin) * 1.6)' }} />
        <ellipse cx={-r * 0.4} cy={-r * 0.5} rx={r * 0.3} ry={r * 0.15} transform={`rotate(-34 ${-r * 0.4} ${-r * 0.5})`} style={{ fill: glint(0.7) }} />
        <circle cx={r * 0.08} cy={-r * 0.74} r={r * 0.08} style={{ fill: glint(0.6) }} />
      </>
    )
  return (
    <>
      <path d={`M${-r} 0A${r} ${r} 0 0 0 ${r} 0Z`} style={{ fill: `light-dark(color-mix(in srgb, ${top} 22%, var(--color-paper)), color-mix(in srgb, ${top} 30%, var(--color-ink)))`, ...THIN }} />
      <path d={`M${-r * 0.7} ${r * 0.38}A${r * 0.78} ${r * 0.78} 0 0 0 ${r * 0.1} ${r * 0.77}`} style={{ fill: 'none', stroke: glint(0.55), strokeWidth: r * 0.13, strokeLinecap: 'round' }} />
    </>
  )
}

/** The crank's grip: a scalloped ring, so the turn reads. */
function scallops(cx: number, cy: number, r: number, bumps: number, depth: number) {
  const pts: string[] = []
  const N = bumps * 8
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * TAU
    const rr = r - depth * (0.5 - 0.5 * Math.cos(a * bumps))
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)} ${(cy + Math.sin(a) * rr).toFixed(2)}`)
  }
  return `M${pts.join('L')}Z`
}

type PileCap = { dx: number; dy: number; dr: number; vx: number; vy: number; vr: number; k: number; kr: number; sink: boolean; gone: boolean }
type Drop = { on: boolean; x: number; y: number; vx: number; vy: number; rot: number; sq: number; sqV: number; grounded: boolean; age: number; done: boolean }
type Sim = {
  raf: number
  last: number
  pile: PileCap[]
  crank0: number
  crank: number
  jolt: number
  joltV: number
  pawl: number
  pawlV: number
  flap: number
  flapTo: number
  /** Seconds into the current turn; -1 = no turn running. */
  turnT: number
  clicks: number
  sinkIdx: number
  sunk: boolean
  emerged: boolean
  cap: Drop
  onReady: () => void
}

const restDrop = (): Drop => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, rot: 0, sq: 0, sqV: 0, grounded: false, age: 0, done: false })

function makeSim(): Sim {
  return {
    raf: 0,
    last: 0,
    pile: PILE.map(() => ({ dx: 0, dy: 0, dr: 0, vx: 0, vy: 0, vr: 0, k: rand(110, 200), kr: rand(140, 260), sink: false, gone: false })),
    crank0: 0,
    crank: 0,
    jolt: 0,
    joltV: 0,
    pawl: 0,
    pawlV: 0,
    flap: 0,
    flapTo: 0,
    turnT: -1,
    clicks: 0,
    sinkIdx: 0,
    sunk: false,
    emerged: false,
    cap: restDrop(),
    onReady: () => {},
  }
}

const G_PILE = 1300
const G_DROP = 1500

/** One ratchet click: the pawl flicks, the crank jolts, the pile jumps. */
function click(s: Sim, kick: number, last: boolean) {
  s.joltV += 90
  s.pawlV -= 700
  s.pile.forEach((c, i) => {
    if (c.gone || c.sink) return
    const height = (158 - PILE[i][1]) / 90 // upper capsules carry less weight, so they jump more
    const f = kick * (last ? 1.3 : 1) * (0.45 + height)
    c.vy -= rand(50, 150) * f
    c.vx += rand(-50, 50) * f
    c.vr += rand(-260, 260) * f
  })
}

/** Advance the whole machine by dt seconds. Returns whether anything still moves. */
function stepSim(s: Sim, dt: number): boolean {
  let moving = false
  if (s.turnT >= 0) {
    moving = true
    s.turnT += dt
    const t = s.turnT
    const k = Math.floor(t / CLICK_T)
    if (k < CLICKS) {
      const u = (t - k * CLICK_T) / CLICK_T
      s.crank = s.crank0 + k * (360 / CLICKS) + (360 / CLICKS) * easeInOutSine(Math.min(u / 0.7, 1))
      if (u >= 0.7 && s.clicks <= k) {
        s.clicks = k + 1
        click(s, KICK[uiStyle()], k === CLICKS - 1)
      }
    } else {
      s.crank = s.crank0 + 360
      if (s.clicks < CLICKS) {
        s.clicks = CLICKS
        click(s, KICK[uiStyle()], true)
      }
    }
    if (!s.sunk && t >= 0.95) {
      s.sunk = true
      s.pile[s.sinkIdx].sink = true
    }
    if (!s.emerged && t >= 1.2) s.flapTo = 1
    if (!s.emerged && t >= 1.3) {
      s.emerged = true
      s.cap = { ...restDrop(), on: true, x: CHUTE.x + CHUTE.w / 2, y: CHUTE.y + CHUTE.h / 2, vx: rand(60, 85), vy: 20, rot: rand(-40, 40) }
    }
    if (s.emerged && s.cap.age > 0.32) s.flapTo = 0
    if (s.emerged && s.cap.done && s.clicks >= CLICKS) {
      s.turnT = -1
      s.crank = mod(s.crank, 360)
      s.crank0 = s.crank
      s.onReady()
    }
  }

  const steps = Math.max(1, Math.ceil(dt * 240))
  const h = dt / steps

  // the crank's ratchet jolt and the pawl: two stiff little springs
  for (let i = 0; i < steps; i++) {
    s.joltV += (-2200 * s.jolt - 40 * s.joltV) * h
    s.jolt += s.joltV * h
    s.pawlV += (-1800 * s.pawl - 30 * s.pawlV) * h
    s.pawl += s.pawlV * h
  }
  if (Math.abs(s.jolt) + Math.abs(s.joltV) * 0.01 + Math.abs(s.pawl) + Math.abs(s.pawlV) * 0.01 > 0.02) moving = true
  else s.jolt = s.joltV = s.pawl = s.pawlV = 0

  if (s.flap !== s.flapTo) {
    const rate = dt / (s.flapTo ? 0.16 : 0.24)
    s.flap = s.flapTo > s.flap ? Math.min(s.flapTo, s.flap + rate) : Math.max(s.flapTo, s.flap - rate)
    moving = true
  }

  // the pile: each capsule sits on its own spring; above its rest spot only gravity pulls it back
  for (const c of s.pile) {
    if (c.gone) continue
    for (let i = 0; i < steps; i++) {
      const ax = -c.k * c.dx - 8 * c.vx
      const ay = c.sink ? G_PILE : c.dy < 0 ? G_PILE - 1.2 * c.vy : -1500 * c.dy - 34 * c.vy
      const ar = -c.kr * c.dr - 9 * c.vr
      c.vx += ax * h
      c.vy += ay * h
      c.vr += ar * h
      c.dx += c.vx * h
      c.dy += c.vy * h
      c.dr += c.vr * h
    }
    if (c.sink) {
      if (c.dy > 48) c.gone = true
      moving = true
    } else if (Math.abs(c.dx) + Math.abs(c.dy) + Math.abs(c.dr) * 0.2 + (Math.abs(c.vx) + Math.abs(c.vy) + Math.abs(c.vr) * 0.2) * 0.05 > 0.04) moving = true
    else c.dx = c.dy = c.dr = c.vx = c.vy = c.vr = 0
  }

  // the dropped capsule: falls, bounces with a squash, rolls without slipping, stops on friction
  const d = s.cap
  if (d.on && !d.done) {
    moving = true
    for (let i = 0; i < steps; i++) {
      d.age += h
      if (!d.grounded) {
        d.vy += G_DROP * h
        d.y += d.vy * h
        if (d.y >= FLOOR) {
          d.y = FLOOR
          if (d.vy > 80) {
            d.sqV += d.vy * 0.02
            d.vy = -d.vy * 0.55
            d.vx *= 0.9
          } else {
            d.vy = 0
            d.grounded = true
          }
        }
      } else d.vx = Math.sign(d.vx) * Math.max(0, Math.abs(d.vx) - 120 * h)
      d.x += d.vx * h
      if (d.x > TRAY[1] || d.x < TRAY[0]) {
        d.x = clamp(d.x, TRAY[0], TRAY[1])
        d.vx = -d.vx * 0.4
      }
      d.rot += ((d.vx * h) / CR) * (180 / Math.PI)
      d.sqV += (-900 * d.sq - 20 * d.sqV) * h
      d.sq += d.sqV * h
    }
    if (d.grounded && d.vx === 0 && Math.abs(d.sq) < 0.003 && Math.abs(d.sqV) < 0.05) {
      d.sq = d.sqV = 0
      d.done = true
    }
  }
  return moving
}

type Els = {
  crank: SVGGElement | null
  pawl: SVGGElement | null
  flap: SVGGElement | null
  pile: (SVGGElement | null)[]
  cap: HTMLButtonElement | null
}

function writeDrop(el: HTMLButtonElement | null, d: Drop) {
  if (!el) return
  const grow = d.age < 0.12 ? 0.62 + 0.38 * easeOutCubic(d.age / 0.12) : 1 // comes forward out of the chute
  // squash about the contact point, along the floor's normal whatever the roll angle
  el.style.transform = `translate(${d.x - CR}px, ${d.y - CR + CR * d.sq}px) scale(${grow * (1 + d.sq * 0.7)}, ${grow * (1 - d.sq)}) rotate(${d.rot}deg)`
  el.style.opacity = d.on ? String(Math.min(1, grow * 1.6 - 0.6)) : '0'
}

function renderSim(s: Sim, els: Els) {
  els.crank?.setAttribute('transform', `rotate(${(s.crank + s.jolt).toFixed(2)} ${KNOB.x} ${KNOB.y})`)
  els.pawl?.setAttribute('transform', `rotate(${s.pawl.toFixed(2)} ${KNOB.x - 4} ${KNOB.y - 40})`)
  const open = easeInOutSine(s.flap)
  els.flap?.setAttribute('transform', `translate(0 ${CHUTE.y}) scale(1 ${(1 - 0.84 * open).toFixed(3)}) translate(0 ${-CHUTE.y})`)
  s.pile.forEach((c, i) => {
    const el = els.pile[i]
    if (!el) return
    const [x, y, r] = PILE[i]
    el.setAttribute('transform', `translate(${(x + c.dx).toFixed(2)} ${(y + c.dy).toFixed(2)}) rotate(${(r + c.dr).toFixed(2)})`)
    el.style.opacity = c.gone ? '0' : ''
  })
  if (s.cap.on) writeDrop(els.cap, s.cap)
}

/**
 * A capsule toy machine. Turning the crank clicks it round a full turn on its ratchet,
 * the pile jumps in the dome, the flap opens and a capsule drops onto the tray, bounces
 * twice and rolls to rest. Open it: it wobbles, the top pops off with a spin and the
 * prize rises out in a fan of light, with a burst sized to its rarity.
 */
export function Gachapon({ prizes, result, onResult, onTurn, turnLabel = 'Turn', sfx: sfxText, disabled, label = 'Capsule machine', className }: GachaponProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const box = useRef<HTMLDivElement>(null)
  const crankEl = useRef<SVGGElement>(null)
  const pawlEl = useRef<SVGGElement>(null)
  const flapEl = useRef<SVGGElement>(null)
  const pileEls = useRef<(SVGGElement | null)[]>([])
  const capsule = useRef<HTMLButtonElement>(null)
  const topHalf = useRef<SVGGElement>(null)
  const bottomHalf = useRef<SVGGElement>(null)
  const raysEl = useRef<HTMLSpanElement>(null)
  const raysSpin = useRef<SVGSVGElement>(null)
  const prizeEl = useRef<HTMLSpanElement>(null)
  const sim = useRef<Sim | null>(null)
  const stopCrack = useRef<() => void>(() => {})
  const timers = useRef<number[]>([])
  const focus = useRefocus()
  const [phase, setPhase] = useState<Phase>('idle')
  const [pick, setPick] = useState(0)
  const [top, setTop] = useState(TOPS[0])
  const [said, setSaid] = useState('')
  useEffect(
    () => () => {
      if (sim.current) cancelAnimationFrame(sim.current.raf)
      stopCrack.current()
      timers.current.forEach(clearTimeout)
    },
    [],
  )
  const after = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms))

  const prize = prizes[pick] as CapsulePrize | undefined
  const rarity = prize?.rarity ?? 'R'

  const getSim = () => (sim.current ??= makeSim())
  const els = (): Els => ({ crank: crankEl.current, pawl: pawlEl.current, flap: flapEl.current, pile: pileEls.current, cap: capsule.current })

  const run = () => {
    const s = getSim()
    if (s.raf) return
    s.last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min((now - s.last) / 1000, 1 / 30)
      s.last = now
      const moving = stepSim(s, dt)
      renderSim(s, els())
      s.raf = moving ? requestAnimationFrame(frame) : 0
    }
    s.raf = requestAnimationFrame(frame)
  }

  /** Put the capsule that left back in the pile, settling in from just above. */
  const refill = (i: number) => {
    const c = getSim().pile[i]
    if (!c.gone && !c.sink) return
    Object.assign(c, { gone: false, sink: false, dx: 0, dy: prefersReducedMotion() ? 0 : -22, dr: 0, vx: 0, vy: 0, vr: 0 })
    renderSim(getSim(), els())
    pileEls.current[i]?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, easing: 'ease-out' })
    if (!prefersReducedMotion()) run()
  }

  /** Put the last capsule back together and hide the prize. */
  const reset = () => {
    stopCrack.current()
    for (const el of [topHalf.current, bottomHalf.current, prizeEl.current, raysEl.current, raysSpin.current]) el?.getAnimations().forEach((a) => a.cancel())
    const s = getSim()
    s.cap = restDrop()
    writeDrop(capsule.current, s.cap)
  }

  const turn = () => {
    if (disabled || !prizes.length || phase === 'turning' || phase === 'ready') return
    const target = result !== undefined ? clamp(Math.round(result), 0, prizes.length - 1) : pickWeighted(prizes)
    const had = focus.had()
    timers.current.forEach(clearTimeout)
    timers.current = []
    reset()
    const s = getSim()
    // a capsule from the bottom row is the one that leaves
    const free = Array.from({ length: BOTTOM_ROW }, (_, i) => i).filter((i) => !s.pile[i].gone && !s.pile[i].sink)
    const idx = free.length ? free[Math.floor(Math.random() * free.length)] : 0
    onTurn?.()
    setPick(target)
    setTop(TOPS[PILE[idx][3]])
    setPhase('turning')
    setSaid('Turning the crank')
    s.sinkIdx = idx
    s.onReady = () => {
      setPhase('ready')
      setSaid('A capsule dropped onto the tray. Open it.')
      if (had) requestAnimationFrame(() => capsule.current?.focus())
      refill(idx)
    }
    if (prefersReducedMotion()) {
      s.cap = { ...restDrop(), on: true, done: true, x: 118, y: FLOOR, age: 1 }
      writeDrop(capsule.current, s.cap)
      capsule.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' })
      after(0, s.onReady)
      return
    }
    s.turnT = 0
    s.clicks = 0
    s.sunk = false
    s.emerged = false
    s.crank0 = s.crank
    run()
  }

  const crack = () => {
    if (phase !== 'ready' || !prize) return
    setPhase('open')
    setSaid(`Capsule opened: ${prize.label}${prize.rarity ? `, ${RARITY_NAME[prize.rarity]}` : ''}`)
    onResult?.(pick, prize)
    const d = getSim().cap
    // the prize and its light sit right above wherever the capsule came to rest
    for (const el of [prizeEl.current, raysEl.current]) {
      if (!el) continue
      el.style.left = `${d.x}px`
      el.style.top = `${d.y - LIFT}px`
    }
    const still = { duration: 1, fill: 'forwards' as const }
    if (prefersReducedMotion()) {
      topHalf.current?.animate([{ opacity: 0 }], still)
      prizeEl.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, fill: 'forwards' })
      return
    }
    const lvl = LVL[rarity]
    // 1. it wobbles, rocking itself upright, harder for rarer prizes
    const rot0 = d.rot
    const upright = Math.round(rot0 / 360) * 360
    const wob = 0.5 + lvl * 0.08
    stopCrack.current = loop((t) => {
      const u = Math.min(t / wob, 1)
      d.rot = upright + (rot0 - upright) * (1 - easeOutCubic(u)) + Math.sin(u * TAU * 3) * (6 + lvl * 3) * (1 - u)
      d.sq = Math.sin(u * TAU * 3) * 0.03 * (1 - u)
      writeDrop(capsule.current, d)
      return u < 1
    })
    after(wob * 1000, () => {
      d.rot = upright
      d.sq = 0
      writeDrop(capsule.current, d)
      // 2. the top half pops off: thrown up and back with a spin, then falls away
      const vx = -rand(60, 95)
      const vy = -420
      const spinV = -rand(420, 620)
      const dur = 0.72
      topHalf.current?.animate(
        Array.from({ length: 13 }, (_, i) => {
          const t = (dur * i) / 12
          return { transform: `translate(${vx * t}px, ${vy * t + 0.5 * G_DROP * t * t}px) rotate(${spinV * t}deg)`, opacity: i / 12 > 0.7 ? 1 - (i / 12 - 0.7) / 0.3 : 1 }
        }),
        { duration: dur * 1000, easing: 'linear', fill: 'forwards' },
      )
      bottomHalf.current?.animate(
        [{ transform: 'none' }, { transform: 'translateY(2px) rotate(7deg)', offset: 0.3 }, { transform: 'rotate(-3deg)', offset: 0.65 }, { transform: 'none' }],
        { duration: 520, easing: 'ease-out' },
      )
      // 3. light fans out and the prize rises out of the shell
      raysEl.current?.animate([{ opacity: 0, scale: '0.2' }, { opacity: 1, scale: '1.08', offset: 0.6 }, { opacity: 0.85, scale: '1' }], { duration: 560, easing: 'ease-out', fill: 'forwards' })
      raysSpin.current?.animate([{ rotate: '0deg' }, { rotate: '360deg' }], { duration: 14000 - lvl * 2500, iterations: Infinity })
      prizeEl.current?.animate(
        [
          { opacity: 0, translate: `0 ${LIFT}px`, scale: '0.25' },
          { opacity: 1, translate: `0 ${LIFT * 0.6}px`, scale: '0.7', offset: 0.25 },
          { opacity: 1, translate: '0 -8px', scale: '1.12', offset: 0.7 },
          { opacity: 1, translate: '0 0', scale: '1' },
        ],
        { duration: 720, easing: 'cubic-bezier(.2,.75,.35,1)', fill: 'forwards' },
      )
      after(380, () => {
        const b = box.current?.getBoundingClientRect()
        if (b) celebrate(b.left + d.x, b.top + d.y - LIFT, rarity, sfxText, 0.85)
      })
    })
  }

  const showCapsule = phase === 'ready' || phase === 'open'
  const sticker = { x: 26, y: 194, w: 64, h: 26 }

  return (
    <div className={cn('inline-grid justify-items-center gap-4', className)}>
      <div ref={box} className="relative" style={{ width: W, height: H }}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="absolute inset-0 block overflow-visible" role="img" aria-label={label}>
          <defs>
            <clipPath id={`${uid}-dome`}>
              <circle cx={DOME.x} cy={DOME.y} r={DOME.r} />
            </clipPath>
            <clipPath id={`${uid}-body`}>
              <rect x={12} y={180} width={196} height={126} rx={16} />
            </clipPath>
            <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: glint(0.6) }} />
              <stop offset="0.55" style={{ stopColor: glint(0) }} />
            </linearGradient>
          </defs>

          {/* the tray, sunk into the base */}
          <rect x={20} y={290} width={180} height={56} rx={14} style={{ fill: HOLE, ...LINE }} />

          {/* the body */}
          <rect x={12} y={180} width={196} height={126} rx={16} style={{ fill: 'var(--color-accent)' }} />
          <g clipPath={`url(#${uid}-body)`}>
            <rect x={178} y={176} width={34} height={134} style={{ fill: SHADE }} />
            <rect x={8} y={292} width={204} height={18} style={{ fill: SHADE }} />
            <rect x={22} y={190} width={8} height={94} rx={4} style={{ fill: glint(0.32) }} />
          </g>
          <rect x={12} y={180} width={196} height={126} rx={16} style={{ fill: 'none', ...LINE }} />

          {/* price sticker */}
          <rect x={sticker.x} y={sticker.y} width={sticker.w} height={sticker.h} rx={7} style={{ fill: 'var(--color-paper)', ...THIN }} />
          <Icon name="coin" size={18} x={sticker.x + 5} y={sticker.y + 4} style={{ '--icon-fill': 'var(--color-pop)' } as CSSProperties} />
          <text x={sticker.x + 44} y={sticker.y + 14} textAnchor="middle" dominantBaseline="middle" className="ui-head fill-ink" style={{ fontSize: 13 }}>
            100
          </text>

          {/* coin slot */}
          <rect x={36} y={226} width={46} height={26} rx={8} style={{ fill: METAL, ...THIN }} />
          <rect x={36} y={226} width={46} height={26} rx={8} style={{ fill: `url(#${uid}-sheen)` }} />
          <rect x={56} y={231} width={6} height={16} rx={3} style={{ fill: HOLE }} />

          {/* the chute, with its hinged plastic flap */}
          <rect x={CHUTE.x} y={CHUTE.y} width={CHUTE.w} height={CHUTE.h} rx={12} style={{ fill: HOLE, ...LINE }} />
          <g ref={flapEl}>
            <rect x={CHUTE.x + 3} y={CHUTE.y + 2} width={CHUTE.w - 6} height={CHUTE.h - 4} rx={10} style={{ fill: 'color-mix(in srgb, var(--color-accent-soft) 72%, transparent)', ...THIN }} />
            <rect x={CHUTE.x + 9} y={CHUTE.y + 7} width={28} height={4} rx={2} style={{ fill: glint(0.55) }} />
          </g>
          <rect x={CHUTE.x + 4} y={CHUTE.y - 2} width={CHUTE.w - 8} height={6} rx={3} style={{ fill: METAL, ...THIN }} />

          {/* the crank: metal plate, pawl, and the knob that turns */}
          <circle cx={KNOB.x} cy={KNOB.y} r={38} style={{ fill: METAL, ...LINE }} />
          <circle cx={KNOB.x} cy={KNOB.y} r={38} style={{ fill: `url(#${uid}-sheen)` }} />
          {[45, 135, 225, 315].map((a) => (
            <circle
              key={a}
              cx={KNOB.x + Math.cos((a * Math.PI) / 180) * 32}
              cy={KNOB.y + Math.sin((a * Math.PI) / 180) * 32}
              r={2.2}
              style={{ fill: 'color-mix(in srgb, var(--color-mute) 70%, var(--color-paper))', ...THIN, strokeWidth: 1 }}
            />
          ))}
          <g ref={pawlEl}>
            <path d={`M${KNOB.x - 8} ${KNOB.y - 41}L${KNOB.x + 2} ${KNOB.y - 41}L${KNOB.x - 3} ${KNOB.y - 30}Z`} style={{ fill: 'var(--color-pop)', ...THIN }} />
          </g>
          <g ref={crankEl} style={{ cursor: phase === 'turning' || phase === 'ready' ? 'default' : 'pointer' }} onClick={turn}>
            <path d={scallops(KNOB.x, KNOB.y, 28, 12, 3.2)} style={{ fill: 'var(--color-pop)', ...LINE }} />
            <circle cx={KNOB.x} cy={KNOB.y} r={19} style={{ fill: POP_SHADE }} />
            <rect x={KNOB.x - 25} y={KNOB.y - 7.5} width={50} height={15} rx={7.5} style={{ fill: 'var(--color-paper)', ...LINE }} />
            {[-17, -12, 12, 17].map((dx) => (
              <path key={dx} d={`M${KNOB.x + dx} ${KNOB.y - 4}V${KNOB.y + 4}`} style={{ ...THIN, strokeWidth: 1.5, strokeLinecap: 'round', stroke: 'color-mix(in srgb, var(--ui-line) 60%, transparent)' }} />
            ))}
            <circle cx={KNOB.x} cy={KNOB.y} r={4.5} style={{ fill: METAL, ...THIN }} />
          </g>
          {/* fixed gloss on the knob */}
          <path d={`M${KNOB.x - 21} ${KNOB.y - 12}A24 24 0 0 1 ${KNOB.x - 8} ${KNOB.y - 23}`} style={{ fill: 'none', stroke: glint(0.55), strokeWidth: 3.5, strokeLinecap: 'round', pointerEvents: 'none' }} />

          {/* the dome: glass, the pile inside it, then the glass's front face */}
          <circle cx={DOME.x} cy={DOME.y} r={DOME.r} style={{ fill: GLASS }} />
          <g clipPath={`url(#${uid}-dome)`}>
            <ellipse cx={DOME.x} cy={DOME.y + 74} rx={74} ry={18} style={{ fill: 'color-mix(in srgb, var(--color-ink) 10%, transparent)' }} />
            {PILE.map((_, j) => {
              const i = PILE.length - 1 - j // upper rows behind, bottom row in front
              const [x, y, r, c] = PILE[i]
              return (
                <g
                  key={i}
                  ref={(el) => {
                    pileEls.current[i] = el
                  }}
                  transform={`translate(${x} ${y}) rotate(${r})`}
                >
                  <CapsuleHalf r={14} top={TOPS[c]} part="bottom" />
                  <CapsuleHalf r={14} top={TOPS[c]} part="top" />
                </g>
              )
            })}
          </g>
          <circle cx={DOME.x} cy={DOME.y} r={DOME.r - 7} style={{ fill: 'none', stroke: glint(0.22), strokeWidth: 3 }} />
          <path d="M44 74A70 70 0 0 1 90 28" style={{ fill: 'none', stroke: glint(0.7), strokeWidth: 9, strokeLinecap: 'round' }} />
          <path d="M38 98A72 72 0 0 1 40 86" style={{ fill: 'none', stroke: glint(0.6), strokeWidth: 7, strokeLinecap: 'round' }} />
          <path d="M178 118A72 72 0 0 1 152 156" style={{ fill: 'none', stroke: glint(0.35), strokeWidth: 4, strokeLinecap: 'round' }} />
          <ellipse cx={138} cy={36} rx={9} ry={4} transform="rotate(25 138 36)" style={{ fill: glint(0.4) }} />
          <circle cx={DOME.x} cy={DOME.y} r={DOME.r} style={{ fill: 'none', ...LINE }} />
          {/* lid and collar */}
          <rect x={90} y={2} width={40} height={16} rx={7} style={{ fill: 'var(--color-accent)', ...LINE }} />
          <rect x={96} y={6} width={16} height={3} rx={1.5} style={{ fill: glint(0.5) }} />
          <rect x={26} y={164} width={168} height={22} rx={9} style={{ fill: SHADE, ...LINE }} />
          <rect x={36} y={168} width={118} height={3.5} rx={1.75} style={{ fill: glint(0.4) }} />
        </svg>

        {/* light rays behind the prize */}
        <span ref={raysEl} aria-hidden="true" className="pointer-events-none absolute size-0 opacity-0">
          <svg ref={raysSpin} viewBox="-90 -90 180 180" width={180} height={180} className="absolute -translate-1/2 overflow-visible">
            <defs>
              <radialGradient id={`${uid}-ray`} cx="0" cy="0" r="88" gradientUnits="userSpaceOnUse">
                <stop offset="0.15" style={{ stopColor: RAY[rarity], stopOpacity: 0.95 }} />
                <stop offset="1" style={{ stopColor: RAY[rarity], stopOpacity: 0 }} />
              </radialGradient>
            </defs>
            {Array.from({ length: 12 }, (_, k) => {
              const a = (k / 12) * TAU
              const w = k % 2 ? 0.1 : 0.17
              return (
                <path
                  key={k}
                  d={`M0 0L${(Math.cos(a - w) * 88).toFixed(2)} ${(Math.sin(a - w) * 88).toFixed(2)}L${(Math.cos(a + w) * 88).toFixed(2)} ${(Math.sin(a + w) * 88).toFixed(2)}Z`}
                  style={{ fill: `url(#${uid}-ray)` }}
                />
              )
            })}
            <circle r={34} style={{ fill: glint(0.22) }} />
            <circle r={24} style={{ fill: glint(0.5) }} />
          </svg>
        </span>

        {/* the dropped capsule */}
        <button
          ref={capsule}
          type="button"
          aria-label={phase === 'open' ? `Opened capsule: ${prize?.label}` : 'Capsule. Press to open.'}
          aria-disabled={phase !== 'ready' || undefined}
          tabIndex={showCapsule ? 0 : -1}
          onClick={crack}
          className={cn(
            'absolute top-0 left-0 block size-8 cursor-pointer touch-manipulation overflow-visible rounded-full border-0 bg-transparent p-0 opacity-0 will-change-transform focus-visible:ui-focus focus-visible:outline-none aria-disabled:cursor-default',
            !showCapsule && 'pointer-events-none',
          )}
        >
          <svg viewBox={`${-CR} ${-CR} ${CR * 2} ${CR * 2}`} className="block size-full overflow-visible" aria-hidden="true">
            <g ref={bottomHalf} style={{ transformBox: 'fill-box', transformOrigin: '50% 0%' }}>
              <CapsuleHalf r={CR - 1} top={top} part="bottom" />
            </g>
            <g ref={topHalf} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
              <CapsuleHalf r={CR - 1} top={top} part="top" />
            </g>
          </svg>
        </button>

        {/* the tray's front lip, in front of the capsule */}
        <svg aria-hidden="true" viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="pointer-events-none absolute inset-0 block overflow-visible">
          <path d="M20 336H200V338Q200 350 186 350H34Q20 350 20 338Z" style={{ fill: 'var(--color-accent)', ...LINE }} />
          <rect x={30} y={340} width={96} height={2.5} rx={1.25} style={{ fill: glint(0.4) }} />
        </svg>

        {/* the prize */}
        <span ref={prizeEl} aria-hidden="true" className="pointer-events-none absolute z-10 size-0 opacity-0">
          <span className="absolute grid -translate-1/2 place-items-center">
            {prize?.icon ? <Icon name={prize.icon} size={56} style={{ '--icon-fill': FILL[rarity] } as CSSProperties} /> : <Chibi pose="cheer" className="w-[66px]" />}
          </span>
        </span>

        {phase === 'open' && prize && (
          <span className="ui-head ui-pill ui-border-thin absolute top-[166px] left-1/2 z-20 -translate-x-1/2 animate-pop bg-paper px-2.5 py-1 text-[11px] leading-none whitespace-nowrap text-ink">
            {prize.rarity ? `${prize.rarity} · ` : ''}
            {prize.label}
          </span>
        )}
      </div>
      <span ref={focus.wrap}>
        <Button
          variant="accent"
          sfx={false}
          loading={phase === 'turning'}
          disabled={disabled || !prizes.length}
          icon={<Icon name="magic" size={16} />}
          onClick={phase === 'ready' ? crack : turn}
        >
          {phase === 'ready' ? 'Open the capsule' : phase === 'open' ? 'Turn again' : turnLabel}
        </Button>
      </span>
      <span className="sr-only" aria-live="polite">
        {said}
      </span>
    </div>
  )
}
