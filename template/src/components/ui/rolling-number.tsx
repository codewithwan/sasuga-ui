import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'
import { KICK, prefersReducedMotion, uiStyle } from '@/fx'
import { cn } from '@/lib/utils'

export type RollingNumberProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'prefix'> & {
  /** The number to show. Every change rolls the digits that differ. */
  value: number
  /** Rolls from this value on mount (otherwise it mounts at `value`, no roll). */
  from?: number
  /** Turns the number into display text (`(n) => n + 'x'`, mm:ss…). Digits roll, every other glyph stays put. */
  format?: (value: number) => string
  /** Digits after the decimal mark (ignored with `format`). */
  decimals?: number
  /** Thousands separator. `true` = ','. Ignored with `format`. */
  separator?: string | boolean
  /** Decimal mark (ignored with `format`). */
  decimalMark?: string
  prefix?: ReactNode
  suffix?: ReactNode
  /** About how long a roll takes to settle, in ms. */
  duration?: number
  /** Delay between columns, rightmost first, in ms. */
  stagger?: number
  /**
   * Extra full turns the lower columns spin on a change. Default: picked from the size of
   * the jump (bigger jumps spin the low digits like a real odometer); `0` without `format`.
   */
  spins?: number
  /** Announce the value to screen readers (aria-live="polite"). */
  live?: boolean
  /** Classes for the digit row (size, colour, font). */
  digitClassName?: string
  /** Fired once every column has come to rest after a change. */
  onSettle?: (value: number) => void
}

/* One cell = the glyph's 1em line plus a safe pad above and below, so strokes and drops
   never get cut and the neighbour digit never peeks into the window. */
const PAD = 0.2
const CELL = 1 + PAD * 2
const STRIP = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]
const SLOT = 'inline-block h-[1.4em] -my-[0.2em] py-[0.2em] leading-none'

const isDigit = (c: string | undefined) => c !== undefined && c >= '0' && c <= '9'
const clampN = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

function formatRolling(n: number, decimals = 0, separator: string | boolean = false, mark = '.') {
  const sep = separator === true ? ',' : separator || ''
  const fixed = Math.abs(n).toFixed(decimals)
  const [int, frac] = fixed.split('.')
  const grouped = sep ? int.replace(/\B(?=(\d{3})+(?!\d))/g, sep) : int
  return `${n < 0 && Number(fixed) !== 0 ? '−' : ''}${grouped}${frac ? mark + frac : ''}`
}

type Slot = {
  /** i<k> = k-th char left of the integer anchor, f<k> = k-th char after it; d/g = digit/glyph. */
  key: string
  ch: string
  digit: boolean
  /** Decimal place of a digit (0 = ones, -1 = tenths) for odometer spins. */
  place: number | null
  leaving: boolean
  born: number
}

type Model = { text: string; value: number; slots: Slot[]; gen: number; dir: 1 | -1; delta: number }

/** Split the text into slots keyed around the end of the integer part, so columns stay put. */
function parse(text: string, sep: string, gen: number): Slot[] {
  const chars = [...text]
  const first = chars.findIndex((c) => isDigit(c))
  let end = chars.length
  if (first >= 0) {
    end = first
    while (end < chars.length && (isDigit(chars[end]) || (sep !== '' && chars[end] === sep && isDigit(chars[end + 1])))) end++
  }
  const out: Slot[] = []
  let place = 0
  for (let i = end - 1, k = 0; i >= 0; i--, k++) {
    const d = isDigit(chars[i])
    out.unshift({ key: `i${k}${d ? 'd' : 'g'}`, ch: chars[i], digit: d, place: d ? place++ : null, leaving: false, born: gen })
  }
  let frac = -1
  for (let i = end, k = 0; i < chars.length; i++, k++) {
    const d = isDigit(chars[i])
    out.push({ key: `f${k}${d ? 'd' : 'g'}`, ch: chars[i], digit: d, place: d ? frac-- : null, leaving: false, born: gen })
  }
  return out
}

const rank = (key: string) => {
  const k = Number(key.slice(1, -1))
  return (key[0] === 'i' ? -(k + 1) : k) * 2 + (key.endsWith('d') ? 1 : 0)
}

function merge(prev: Model, text: string, value: number, sep: string, keepLeaving: boolean): Model {
  const gen = prev.gen + 1
  const next = parse(text, sep, gen)
  const keys = new Set(next.map((s) => s.key))
  for (const s of next) {
    const old = prev.slots.find((o) => o.key === s.key)
    if (old && !old.leaving) s.born = old.born
  }
  if (keepLeaving) for (const s of prev.slots) if (!keys.has(s.key)) next.push({ ...s, leaving: true })
  next.sort((a, b) => rank(a.key) - rank(b.key))
  return { text, value, slots: next, gen, dir: value < prev.value ? -1 : 1, delta: Math.abs(value - prev.value) }
}

type Col = {
  pos: number
  vel: number
  /** where the spring is pulling now */
  target: number
  /** where it will pull once its stagger delay is over */
  goal: number
  startAt: number
  digit: number
  /** landing squash spring */
  q: number
  qv: number
  armed: boolean
  leaving: boolean
  strip: HTMLElement | null
  stretch: HTMLElement | null
}

function paint(c: Col) {
  if (!c.strip || !c.stretch) return
  const p = c.pos + c.q * 0.06
  const m = ((p % 10) + 10) % 10
  c.strip.style.transform = `translateY(${(-m * CELL).toFixed(4)}em)`
  // motion blur: stretch along the travel and soften while it is really going
  const speed = Math.abs(c.vel)
  const stretch = 1 + Math.min(0.32, Math.max(0, speed - 5) * 0.007)
  const blur = Math.min(0.075, Math.max(0, speed - 6) * 0.0028)
  const sq = Math.min(1, Math.abs(c.q))
  c.stretch.style.transform = stretch > 1.001 || sq > 0.002 ? `scale(${(1 + sq * 0.08).toFixed(4)}, ${(stretch * (1 - sq * 0.14)).toFixed(4)})` : ''
  c.stretch.style.filter = blur > 0.004 ? `blur(${blur.toFixed(4)}em)` : ''
}

/**
 * An odometer number. Each digit is its own column clipped to exactly one line; on a change
 * the columns roll the way the value went (up when it grows, down when it shrinks), rightmost
 * first, on a critically damped spring with motion blur, and land with a tiny squash.
 * Columns that appear or vanish (99 → 100) grow / collapse their width instead of popping.
 */
export function RollingNumber({
  value,
  from,
  format,
  decimals = 0,
  separator = false,
  decimalMark = '.',
  prefix,
  suffix,
  duration = 650,
  stagger = 38,
  spins,
  live = true,
  digitClassName,
  onSettle,
  className,
  ...props
}: RollingNumberProps) {
  const sep = format ? ',' : separator === true ? ',' : separator || ''
  const toText = (n: number) => (format ? format(n) : formatRolling(n, decimals, separator, decimalMark))

  // the shown value: `from` on the first frame, then `value`
  const [shown, setShown] = useState(from ?? value)
  const [prop, setProp] = useState(value)
  if (prop !== value) {
    setProp(value)
    setShown(value)
  }
  const latest = useRef(value)
  useLayoutEffect(() => {
    latest.current = value
  })
  useEffect(() => {
    if (from === undefined) return
    const id = requestAnimationFrame(() => setShown(latest.current))
    return () => cancelAnimationFrame(id)
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const text = toText(shown)
  const [model, setModel] = useState<Model>(() => ({ text, value: shown, slots: parse(text, sep, 0), gen: 0, dir: 1, delta: 0 }))
  if (model.text !== text) setModel(merge(model, text, shown, sep, !prefersReducedMotion()))

  const run = useRef<HTMLSpanElement>(null)
  const cols = useRef(new Map<string, Col>())
  const glyphs = useRef(new Map<string, string>())
  const raf = useRef(0)
  const last = useRef(0)
  const lastChange = useRef(0)
  const pending = useRef(false)
  const cfg = useRef({ duration, onSettle, value: shown })
  useLayoutEffect(() => {
    cfg.current = { duration, onSettle, value: model.value }
  })

  const loop = useRef<(t: number) => void>(() => {})
  useLayoutEffect(() => {
    loop.current = (t: number) => {
      const dt = Math.min((t - last.current) / 1000, 1 / 30)
      last.current = t
      // critically damped: no overshoot from the spring itself, the squash adds the bounce
      const w = 6.6 / Math.max(0.12, cfg.current.duration / 1000)
      const steps = Math.max(1, Math.ceil(dt * 240))
      const h = dt / steps
      let moving = false
      for (const c of cols.current.values()) {
        if (c.target !== c.goal && t >= c.startAt) {
          c.target = c.goal
          c.armed = true
        }
        for (let i = 0; i < steps; i++) {
          c.vel += (-w * w * (c.pos - c.target) - 2 * w * c.vel) * h
          c.pos += c.vel * h
          c.qv += (-900 * c.q - 17 * c.qv) * h
          c.q += c.qv * h
        }
        if (c.armed && Math.abs(c.pos - c.target) < 0.1) {
          c.armed = false
          c.qv += Math.sign(c.vel || 1) * 24 * KICK[uiStyle()]
        }
        const rest = c.target === c.goal && Math.abs(c.pos - c.target) < 0.001 && Math.abs(c.vel) < 0.02 && Math.abs(c.q) < 0.002 && Math.abs(c.qv) < 0.05
        if (rest) {
          c.pos = c.target
          c.vel = c.q = c.qv = 0
        } else moving = true
        paint(c)
      }
      if (moving) raf.current = requestAnimationFrame((n) => loop.current(n))
      else {
        raf.current = 0
        if (pending.current) {
          pending.current = false
          cfg.current.onSettle?.(cfg.current.value)
        }
      }
    }
  })
  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current)
      raf.current = 0
    },
    [],
  )

  const removeSlot = (key: string) => {
    cols.current.delete(key)
    glyphs.current.delete(key)
    setModel((m) => ({ ...m, slots: m.slots.filter((s) => !(s.key === key && s.leaving)) }))
  }
  const removeRef = useRef(removeSlot)
  useLayoutEffect(() => {
    removeRef.current = removeSlot
  })

  useLayoutEffect(() => {
    const host = run.current
    if (!host) return
    const still = prefersReducedMotion()
    const first = model.gen === 0
    const now = performance.now()
    const fast = now - lastChange.current < 170
    if (!first) lastChange.current = now
    const dir = model.dir
    const big = model.delta > 0 ? Math.floor(Math.log10(model.delta) + 1e-9) : 0
    const spinFor = (place: number | null) => {
      if (place === null) return 0
      if (spins !== undefined) return place <= 0 ? spins : 0
      return format ? 0 : clampN(big - place, 0, 2)
    }
    let order = 0
    let moved = false
    for (let i = model.slots.length - 1; i >= 0; i--) {
      const s = model.slots[i]
      const el = host.querySelector<HTMLElement>(`[data-k="${s.key}"]`)
      if (!el) continue
      const entering = !first && s.born === model.gen && !s.leaving
      if (!still && !first) {
        if (entering) {
          el.getAnimations().forEach((a) => a.cancel())
          delete el.dataset.leaving
          const wpx = el.getBoundingClientRect().width
          el.style.overflow = 'clip'
          el.animate([{ width: '0px', opacity: 0 }, { width: `${wpx}px`, opacity: 1 }], {
            duration: 320,
            easing: 'cubic-bezier(.2,1.25,.4,1)',
          }).finished.then(
            () => (el.style.overflow = ''),
            () => {},
          )
        } else if (s.leaving && el.dataset.leaving === undefined) {
          el.dataset.leaving = ''
          const wpx = el.getBoundingClientRect().width
          el.style.overflow = 'clip'
          el.animate([{ width: `${wpx}px`, opacity: 1 }, { width: '0px', opacity: 0 }], {
            duration: 340,
            delay: 60,
            easing: 'cubic-bezier(.5,0,.2,1)',
            fill: 'forwards',
          }).finished.then(
            () => removeRef.current(s.key),
            () => {},
          )
        }
      }
      if (!s.digit) {
        const before = glyphs.current.get(s.key)
        glyphs.current.set(s.key, s.ch)
        if (before !== undefined && before !== s.ch && !still) {
          el.animate([{ scale: '.4', opacity: 0 }, { scale: '1.15', opacity: 1, offset: 0.6 }, { scale: '1' }], { duration: 260, easing: 'ease-out' })
        }
        continue
      }
      const d = Number(s.ch)
      let c = cols.current.get(s.key)
      if (!c) {
        // a new column rolls in from 0, an existing one from where it is
        const start = entering && !still ? 0 : d
        c = { pos: start, vel: 0, target: start, goal: start, startAt: 0, digit: start, q: 0, qv: 0, armed: false, leaving: false, strip: null, stretch: null }
        cols.current.set(s.key, c)
      }
      c.strip = el.querySelector<HTMLElement>('[data-strip]')
      c.stretch = el.querySelector<HTMLElement>('[data-stretch]')
      if (s.leaving) {
        if (c.leaving) continue
        c.leaving = true
      } else c.leaving = false
      const to = s.leaving ? 0 : d
      let travel = dir > 0 ? (to - c.digit + 10) % 10 : -((c.digit - to + 10) % 10)
      const extra = s.leaving ? 0 : spinFor(s.place)
      if (travel !== 0 || (extra > 0 && model.delta > 0)) travel += dir * 10 * extra
      if (travel === 0) {
        paint(c)
        continue
      }
      const waiting = c.startAt > now && c.target !== c.goal
      c.digit = to
      c.goal += travel
      if (still || first) {
        c.pos = c.target = c.goal
        c.vel = 0
        paint(c)
        continue
      }
      // rightmost first; a column still waiting keeps its slot so held repeats don't starve it
      if (!waiting) c.startAt = now + order * (fast ? 10 : stagger)
      order++
      moved = true
    }
    if (moved) {
      pending.current = true
      if (!raf.current) {
        last.current = performance.now()
        raf.current = requestAnimationFrame((n) => loop.current(n))
      }
    } else if (!first && !raf.current) {
      cfg.current.onSettle?.(model.value)
    }
    // the model generation is the only trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.gen])

  const strPrefix = typeof prefix === 'string' || typeof prefix === 'number' ? prefix : ''
  const strSuffix = typeof suffix === 'string' || typeof suffix === 'number' ? suffix : ''

  return (
    <span className={cn('relative inline-flex items-baseline whitespace-nowrap', className)} {...props}>
      <span aria-hidden="true" className={cn('inline-flex items-baseline tabular-nums', digitClassName)}>
        {prefix}
        <span ref={run} className="inline-flex items-start">
          {/* zero-width baseline anchor: gives the row the glyphs' baseline */}
          <span className={cn(SLOT, 'w-0')}>{'​'}</span>
          {model.slots.map((s) =>
            s.digit ? (
              <span key={s.key} data-k={s.key} className={cn(SLOT, 'relative overflow-x-visible overflow-y-clip p-0')}>
                <span data-stretch="" className="block h-[1.4em] origin-center will-change-transform">
                  <span data-strip="" className="block will-change-transform">
                    {STRIP.map((n, i) => (
                      <span key={i} className="block h-[1.4em] py-[0.2em] text-center leading-none">
                        {n}
                      </span>
                    ))}
                  </span>
                </span>
              </span>
            ) : (
              <span key={s.key} data-k={s.key} className={cn(SLOT, 'whitespace-pre')}>
                {s.ch}
              </span>
            ),
          )}
        </span>
        {suffix}
      </span>
      <span className="sr-only" aria-live={live ? 'polite' : undefined} aria-atomic="true">
        {strPrefix}
        {toText(value)}
        {strSuffix}
      </span>
    </span>
  )
}
