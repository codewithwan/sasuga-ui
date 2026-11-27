import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { prefersReducedMotion } from '@/fx'
import { cn } from '@/lib/utils'
import { Icon } from './icon'
import type { IconName } from './icon'
import { TimelineScrubber, useTimeline } from './timeline'

/* ───────────── API ───────────── */

export type BarRaceSeries = {
  name: string
  /** One value per period. Missing values repeat the last one. */
  values: number[]
  /** Any CSS colour. Default: the next colour of a palette made from the theme tokens. */
  color?: string
  /** Shown on the bar tip (wide) or next to the name (narrow). */
  icon?: IconName
}

export type BarRaceProps = {
  data: BarRaceSeries[]
  /** One label per value index ("Week 1"…). Its length sets how many periods the race runs. */
  periods: string[]
  /** How many bars are on screen; the rest wait below and slide in when they climb. Default 8, or 6 in a tall frame. */
  top?: number
  /** Value label. Default: compact numbers (980, 1.2K, 3.4M). */
  format?: (n: number) => string
  /** Heading above the bars (also the figure caption). */
  title?: string
  /** What the values count, shown beside the title and read to screen readers ("picks"). */
  unit?: string
  /** Seconds from one period to the next. */
  stepDuration?: number
  /** Seconds the last period stays on screen before the loop starts over. */
  hold?: number
  /** External clock in seconds (a video, a slider, a Timeline). When set the race follows it. */
  time?: number
  autoplay?: boolean
  loop?: boolean
  /** Show a play / seek bar under the chart. */
  controls?: boolean
  /** The thin progress line under the bars. */
  progress?: boolean
  /** Classes for the outer element. Give it a size (h-…, aspect-[9/16]) and the race fills that frame: rows, bars and type scale with it. */
  className?: string
}

export type BarRaceTiming = {
  /** Seconds per period. */
  step: number
  /** Intro: the bars grow from zero to the first period. */
  lead: number
  /** Second the last period is reached. */
  end: number
  /** Total length, with the hold when looping. */
  duration: number
  /** Second a (fractional) period index is reached. */
  at(period: number): number
}

/**
 * The clock a race runs on, for driving it from your own `time`: period `i` lands at `at(i)`.
 * Same numbers the component uses for the same arguments.
 */
// oxlint-disable-next-line react/only-export-components -- timing helper for the time prop, part of the BarRace API
export function barRaceTiming(periods: number, stepDuration = 1.6, hold = 1.6, loop = true): BarRaceTiming {
  const step = Math.max(0.05, stepDuration)
  const lead = Math.min(0.8, step * 0.5)
  const end = lead + Math.max(0, periods - 1) * step
  return {
    step,
    lead,
    end,
    duration: end + (loop ? Math.max(0, hold) : 0),
    at: (i) => lead + i * step,
  }
}

/* ───────────── Maths ───────────── */

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const smooth = (f: number) => f * f * (3 - 2 * f)
const easeOut = (f: number) => 1 - (1 - f) ** 3
/** Within a step: mostly smoothstep, with a little linear left in so the race never fully stops. */
const ease = (f: number) => f + 0.75 * (smooth(f) - f)
/** Inverse of `ease` (monotone): bisection. */
function unease(e: number) {
  let a = 0
  let b = 1
  for (let k = 0; k < 22; k++) {
    const m = (a + b) / 2
    if (ease(m) < e) a = m
    else b = m
  }
  return (a + b) / 2
}

function valueAt(v: number[], t: number, tm: BarRaceTiming): number {
  const n = v.length
  if (!n) return 0
  if (t <= tm.lead) return v[0] * easeOut(clamp(t / tm.lead))
  if (t >= tm.end || n < 2) return v[n - 1]
  const p = (t - tm.lead) / tm.step
  const i = Math.min(n - 2, Math.floor(p))
  return v[i] + (v[i + 1] - v[i]) * ease(p - i)
}

/** b ranks above a: higher value, ties to the earlier series. */
const above = (d: number, tie: number) => d > 0 || (d === 0 && tie > 0)

/**
 * Seconds within [lo, hi] during which series b ranks above series a. Within a step every
 * series moves on the same eased curve, so the gap is linear in the eased progress and
 * crosses zero at most once: the crossing time is exact, nothing is sampled.
 */
function aboveTime(a: number[], b: number[], tie: number, lo: number, hi: number, tm: BarRaceTiming): number {
  const n = a.length
  let sum = 0
  // the intro scales every bar alike: the order of the first period
  if (lo < tm.lead && above(b[0] - a[0], tie)) sum += Math.min(hi, tm.lead) - lo
  if (hi > tm.end && above(b[n - 1] - a[n - 1], tie)) sum += hi - Math.max(lo, tm.end)
  if (n < 2) return sum
  const from = Math.max(lo, tm.lead)
  const to = Math.min(hi, tm.end)
  if (to <= from) return sum
  for (let i = clamp(Math.floor((from - tm.lead) / tm.step), 0, n - 2); i <= n - 2; i++) {
    const s0 = tm.lead + i * tm.step
    if (s0 >= to) break
    const c0 = Math.max(from, s0)
    const c1 = Math.min(to, s0 + tm.step)
    if (c1 <= c0) continue
    const d0 = b[i] - a[i]
    const d1 = b[i + 1] - a[i + 1]
    const u0 = above(d0, tie)
    const u1 = above(d1, tie)
    if (u0 === u1) {
      if (u0) sum += c1 - c0
      continue
    }
    const tc = s0 + unease(d0 / (d0 - d1)) * tm.step
    sum += u0 ? Math.max(0, Math.min(c1, tc) - c0) : Math.max(0, c1 - Math.max(c0, tc))
  }
  return sum
}

/* ───────────── Look ───────────── */

const mix = (a: string, k: number, b: string) => `color-mix(in oklab, ${a} ${k}%, ${b})`
const A = 'var(--color-accent)'
const P = 'var(--color-pop)'
const INK = 'var(--color-ink)'
const PAPER = 'var(--color-paper)'

/** Made from the theme tokens, so it follows the colour theme and light / dark. */
const PALETTE = [
  A,
  P,
  mix(A, 50, P),
  mix(A, 55, INK),
  mix(P, 50, PAPER),
  mix(P, 60, INK),
  mix(A, 45, PAPER),
  mix(mix(A, 30, P), 60, INK),
  mix(A, 28, INK),
  mix(mix(A, 50, P), 55, PAPER),
  mix(P, 32, INK),
  mix(A, 72, P),
]

const compact = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
})
const compactFormat = (n: number) => compact.format(Math.abs(n) < 1000 ? Math.round(n) : n)

/* ───────────── Component ───────────── */

/**
 * A bar chart race. Every series is interpolated between periods on one clock, sorted by its
 * value of the moment, and each bar glides toward its rank (an overtake is a smooth pass, not
 * a jump). Bars past `top` wait below and slide in when they climb; widths follow the current
 * leader, the value rides the bar end and counts, and a big period label rolls in the corner.
 * Everything on screen is a function of time, so it scrubs both ways, loops, and follows an
 * outside clock through `time`. Reduced motion parks on the last period (still scrubbable).
 */
export function BarRace({
  data,
  periods,
  top,
  format = compactFormat,
  title,
  unit,
  stepDuration = 1.6,
  hold = 1.6,
  time,
  autoplay = true,
  loop = true,
  controls = false,
  progress = true,
  className,
}: BarRaceProps) {
  const [reduced] = useState(() => prefersReducedMotion())
  const n = Math.max(1, periods.length)
  const tm = useMemo(() => barRaceTiming(n, stepDuration, hold, loop), [n, stepDuration, hold, loop])
  // one value per period for every series, gaps filled with the last known value
  const series = useMemo(
    () =>
      data.map((d) => {
        const out: number[] = []
        let last = 0
        for (let i = 0; i < n; i++) {
          const v = d.values[i]
          if (typeof v === 'number' && Number.isFinite(v)) last = v
          out.push(last)
        }
        return out
      }),
    [data, n],
  )

  const tl = useTimeline({
    duration: tm.duration,
    autoplay: autoplay && !reduced,
    loop,
    time,
  })
  const t = tl.time

  // reduced motion: park on the final standings
  useLayoutEffect(() => {
    if (reduced && time === undefined) tl.seek(tm.end)
  }, [reduced, time, tl, tm.end])

  // pause off screen, pick up where it was when it comes back
  const root = useRef<HTMLDivElement>(null)
  const ownClock = time === undefined
  useEffect(() => {
    const el = root.current
    if (!el || !ownClock) return
    let resume = false
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        if (resume) tl.play()
        resume = false
      } else if (tl.playing) {
        tl.pause()
        resume = true
      }
    })
    io.observe(el)
    return () => io.disconnect()
  }, [tl, ownClock])

  /* sizing: fill the frame when the wrapper has a set height, or take a natural height */
  const count = series.length
  // in a set frame the default row count adapts: 6 in a tall frame, fewer when rows would get too thin
  const [fit, setFit] = useState(8)
  // frame shape: only a wide frame keeps the period in the corner; a tall one also stacks names over bars
  const [shape, setShape] = useState<'wide' | 'square' | 'tall'>('wide')
  const tall = shape === 'tall'
  const shown = Math.max(1, Math.min(top ?? fit, count))
  const track = useRef<HTMLDivElement>(null)
  const probe = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = track.current
    const box = root.current
    if (!el || !box) return
    const measure = () => {
      // layout height, not getBoundingClientRect: a scaled parent (FrameStage) must not shrink the rows
      const h = el.offsetHeight
      // written straight to the DOM: rows, bars and type all scale from these two
      el.style.setProperty('--row', `${h / shown}px`)
      el.parentElement?.style.setProperty('--th', `${h}px`)
      // "framed": the height comes from outside (aspect, h-…), not from the rows
      const base = probe.current?.offsetHeight ?? 0
      const isTall = box.clientHeight > box.clientWidth * 1.3
      setShape(isTall ? 'tall' : box.clientWidth > box.clientHeight * 1.3 ? 'wide' : 'square')
      if (Math.abs(h - base * shown) <= 4) return setFit(8)
      const most = isTall ? 6 : 8
      setFit(clamp(Math.floor(h / Math.max(34, base * 0.85)), 3, most))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    ro.observe(box)
    return () => ro.disconnect()
  }, [shown])

  /* the frame */
  const values = series.map((v) => valueAt(v, t, tm))
  // the scale follows the leader; during the intro it holds the first period so the bars grow
  let lead = 0
  for (const v of series) lead = Math.max(lead, valueAt(v, Math.max(t, tm.lead), tm))
  const scale = lead > 0 ? lead * 1.04 : 1
  // a box-filtered rank: each pass glides over `w` seconds after the crossing
  const w = clamp(tm.step * 0.4, 0.2, 0.7)
  const pos = series.map((a, i) => {
    let p = 0
    for (let j = 0; j < count; j++) {
      if (j !== i) p += smooth(clamp(aboveTime(a, series[j], j < i ? 1 : -1, t - w, t, tm) / w))
    }
    return p
  })
  // stacking follows the value of the moment; while two rows pass, the one behind hides its labels
  const order = values.map((_, i) => i).sort((x, y) => values[y] - values[x] || x - y)
  const place: number[] = []
  order.forEach((i, r) => (place[i] = r))
  const veil = pos.map((p, i) => {
    let c = 0
    for (let j = 0; j < count; j++) if (place[j] < place[i]) c = Math.max(c, clamp((0.75 - Math.abs(p - pos[j])) / 0.45))
    return c
  })

  // the period on the label switches halfway through a step, with a short roll
  const k = n < 2 ? 0 : clamp(Math.floor((t - tm.lead) / tm.step + 0.5), 0, n - 1)
  const roll = k > 0 ? easeOut(clamp((t - tm.at(k - 0.5)) / Math.min(0.35, tm.step * 0.4))) : 1
  const race = tm.end > tm.lead ? clamp((t - tm.lead) / (tm.end - tm.lead)) : 1

  // accessible text: the standings of the labelled period (changes per period, not per frame)
  const standings = series.map((v, i) => ({ i, v: v[k] })).sort((x, y) => y.v - x.v || x.i - y.i)
  const suffix = unit ? ` ${unit}` : ''
  const summary = `${title ? `${title}. ` : ''}${periods[k] ?? ''}: ${standings
    .slice(0, 3)
    .map((s, r) => `${r + 1}. ${data[s.i].name}, ${format(s.v)}${suffix}`)
    .join('; ')}`

  return (
    <div ref={root} className={cn('flex w-full min-w-0 flex-col gap-3', tall ? '@container/stack' : '@container/race', className)}>
      <figure className="ui-card relative m-0 flex min-h-0 min-w-0 flex-1 flex-col p-[clamp(12px,3cqw,40px)]">
        {(title || unit) && (
          <figcaption className="mb-[clamp(8px,1.6cqw,24px)] flex min-w-0 shrink-0 items-baseline justify-between gap-3">
            {title && <span className={cn('ui-head min-w-0 leading-tight text-ink', tall ? 'text-[clamp(15px,5.6cqw,5rem)]' : 'text-[clamp(15px,3.2cqw,5rem)]')}>{title}</span>}
            {unit && <span className="shrink-0 text-[clamp(12px,2cqw,3rem)] font-bold text-mute">{unit}</span>}
          </figcaption>
        )}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={track}
            role="img"
            aria-label={summary}
            className={cn(
              'relative min-h-0 flex-1 overflow-hidden',
              // --rb: natural row; --row: measured row (set from JS, --rb until then);
              // --bar: bar thickness; --nf / --vf: name and value type; --room: space kept for the value; --bmin: shortest bar
              '[--bar:calc(var(--row)*0.42)] [--bmin:0.5rem] [--nf:clamp(11px,calc(var(--row)*0.27),84px)] [--rb:2.75rem] [--room:calc(var(--vf)*4.6)] [--row:var(--rb)] [--vf:clamp(11px,calc(var(--row)*0.28),96px)]',
              '@md/race:[--bar:calc(var(--row)*0.66)] @md/race:[--bmin:var(--bar)] @md/race:[--nf:clamp(12px,min(calc(var(--row)*0.3),4.4cqw),84px)] @md/race:[--rb:2.7rem] @md/race:[--room:calc(var(--vf)*4.8)] @md/race:[--vf:clamp(12px,min(calc(var(--row)*0.34),6cqw),96px)]',
            )}
            style={{ flexBasis: `calc(var(--rb) * ${shown})` }}
          >
            <div ref={probe} aria-hidden="true" className="invisible absolute top-0 left-0 h-[var(--rb)] w-0" />
            {data.map((d, i) => {
              const p = pos[i]
              const fade = clamp(shown - p)
              const r = clamp(values[i] / scale)
              const color = d.color ?? PALETTE[i % PALETTE.length]
              const width = `max(var(--bmin), (100% - var(--room)) * ${r.toFixed(5)})`
              const labels = veil[i] > 0 ? { opacity: 1 - veil[i] } : undefined
              const style: CSSProperties = {
                transform: `translateY(calc(var(--row) * ${p.toFixed(4)}))`,
                opacity: fade * (1 - 0.5 * veil[i]),
                visibility: fade <= 0 ? 'hidden' : undefined,
                zIndex: count - place[i] + 1,
              }
              return (
                <div
                  key={i}
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 flex h-[var(--row)] flex-col justify-center gap-[calc(var(--row)*0.07)] will-change-transform @md/race:flex-row @md/race:items-center @md/race:gap-[calc(var(--nf)*0.9)]"
                  style={style}
                >
                  <div
                    className="flex min-w-0 items-center gap-[0.4em] text-[length:var(--nf)] leading-none font-bold text-ink @md/race:w-[clamp(5.5rem,26cqw,calc(var(--nf)*11))] @md/race:shrink-0 @md/race:justify-end"
                    style={labels}
                  >
                    {d.icon && <Icon name={d.icon} tone="line" size="1.05em" className="@md/race:hidden" style={{ color }} />}
                    <span className="truncate">{d.name}</span>
                  </div>
                  <div className="relative h-[var(--bar)] min-w-0 @md/race:flex-1">
                    <div
                      className="ui-border-thin ui-r-sm ui-shadow-sm ui-tone ui-fill absolute inset-y-0 left-0 flex items-center justify-end [[data-style=flat]_&]:shadow-none"
                      style={{ width, backgroundColor: color }}
                    >
                      {d.icon && (
                        <span className="mr-[3px] hidden size-[calc(var(--bar)-9px)] shrink-0 place-items-center rounded-full bg-paper text-ink @md/race:grid">
                          <Icon name={d.icon} tone="line" size="62%" />
                        </span>
                      )}
                    </div>
                    <span
                      className="ui-head absolute top-1/2 -translate-y-1/2 text-[length:var(--vf)] leading-none whitespace-nowrap text-ink tabular-nums"
                      style={{ left: `calc(${width} + 0.45em)`, ...labels }}
                    >
                      {format(values[i])}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          {/* the period, big: its own line under the bars when narrow, in the corner under them when wide */}
          <div
            aria-hidden="true"
            className={cn(
              'ui-head pointer-events-none relative -mt-[0.1em] h-[1.15em] shrink-0 self-end overflow-hidden text-right text-[clamp(1.6rem,14cqw,10rem)] leading-[1.15] whitespace-nowrap',
              shape === 'wide' && '@md/race:absolute @md/race:right-0 @md/race:bottom-0 @md/race:mt-0 @md/race:text-[clamp(1.6rem,min(16cqw,calc(var(--th,20rem)*0.2)),10rem)]',
            )}
            style={{ color: mix(INK, 26, 'transparent') }}
          >
            {roll < 1 && k > 0 && (
              <span
                className="absolute right-0 bottom-0"
                style={{
                  transform: `translateY(${-roll * 100}%)`,
                  opacity: 1 - roll,
                }}
              >
                {periods[k - 1]}
              </span>
            )}
            <span
              className="block"
              style={{
                transform: roll < 1 ? `translateY(${(1 - roll) * 100}%)` : undefined,
                opacity: roll,
              }}
            >
              {periods[k]}
            </span>
          </div>
        </div>

        {progress && (
          <div aria-hidden="true" className="ui-pill mt-[clamp(10px,1.6cqw,24px)] h-[clamp(3px,0.45cqw,6px)] shrink-0 overflow-hidden bg-line">
            <div className="h-full origin-left bg-accent" style={{ transform: `scaleX(${race.toFixed(4)})` }} />
          </div>
        )}

        <table className="sr-only">
          <caption>
            {title ? `${title}, ` : ''}
            {periods[k]}
          </caption>
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Name</th>
              <th scope="col">{unit ?? 'Value'}</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, r) => (
              <tr key={s.i}>
                <td>{r + 1}</td>
                <th scope="row">{data[s.i].name}</th>
                <td>{format(s.v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
      {controls && time === undefined && <TimelineScrubber timeline={tl} label="Bar race" className="shrink-0" />}
    </div>
  )
}
