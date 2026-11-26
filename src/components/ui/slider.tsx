import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { centerOf, clamp, impactAt, prefersReducedMotion, smoke, sparkle, spawn, speedLines, uiStyle, useSprings } from '@/fx'
import { C } from '@/fx/palette'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  min?: number
  max?: number
  step?: number
  defaultValue?: number
  onChange?: (value: number) => void
  /** Tick marks along the track (number of segments). Default: one per step up to 20 steps, else 10. `false` = none. */
  ticks?: number | false
  /** Lettering when the knob slams into the top. `false` = none. */
  maxSfx?: string | false
  /** Lettering when the knob slams into the bottom. `false` = none. */
  minSfx?: string | false
  className?: string
}

const THUMB = 28
// Native thumb centre runs from thumb/2 to (width - thumb/2); the visuals follow the same mapping.
const AT = (p: string) => `calc(var(--thumb) / 2 + (100% - var(--thumb)) * ${p})`
const POP = 'cubic-bezier(.2,1.6,.4,1)'
// Constant style objects: React never re-applies them, so the springs own these properties.
const ROOT_STYLE = { '--thumb': `${THUMB}px` } as CSSProperties
const FILL_STYLE = { width: AT('var(--p)') }
const RIDER_STYLE = { left: AT('var(--p)') }
const LAGS = [28, 56, 88]
const GHOST_ALPHA = [0.55, 0.34, 0.18]
const GHOST_STYLES = LAGS.map((_, i) => ({ left: AT(`var(--g${i}, var(--p))`), opacity: 0 }))

type Sample = { v: number; t: number }
/** Where a moving value was `LAGS` ms ago — the afterimages sit there. */
function lagged(h: Sample[], v: number, now: number) {
  if (h.length && now - h[h.length - 1].t > 90) h.length = 0
  h.push({ v, t: now })
  if (h.length > 24) h.shift()
  return LAGS.map((lag) => {
    for (let i = h.length - 1; i >= 0; i--) if (now - h[i].t >= lag) return h[i].v
    return h[0].v
  })
}

function shake(el: HTMLElement | null, amp: number) {
  if (!el || prefersReducedMotion()) return
  const a = uiStyle() === 'flat' ? amp * 0.4 : amp
  el.animate(
    [
      { translate: '0 0' },
      { translate: `${-a}px ${a * 0.4}px` },
      { translate: `${a}px ${-a * 0.3}px` },
      { translate: `${-a * 0.6}px ${a * 0.2}px` },
      { translate: `${a * 0.3}px 0` },
      { translate: '0 0' },
    ],
    { duration: 300, easing: 'linear' },
  )
}

type Mode = 'idle' | 'press' | 'drag' | 'key'

/**
 * Native range input underneath (keyboard + a11y for free) with an animated knob on top.
 * Click the track and the knob winds up, dashes there trailing afterimages and speed lines,
 * and lands in a puff of dust while the bubble counts along. Ticks light up as it passes,
 * the ends hit back with lettering, and a fling overshoots and bounces.
 */
export function Slider({ label, min = 0, max = 100, step = 1, defaultValue = 30, onChange, ticks, maxSfx = 'MAX!', minSfx = 'ゼロ', className }: Props) {
  const span = max - min || 1
  const decimals = (String(step).split('.')[1] ?? '').length
  const snapV = (v: number) => clamp(Number((Math.round((v - min) / step) * step + min).toFixed(decimals)), min, max)
  const toP = (v: number) => (v - min) / span

  const [value, setValue] = useState(() => snapV(defaultValue))
  const valueRef = useRef(value)
  const root = useRef<HTMLDivElement>(null)
  const knobBox = useRef<HTMLSpanElement>(null)
  const knob = useRef<HTMLSpanElement>(null)
  const bubbleBox = useRef<HTMLSpanElement>(null)
  const bubble = useRef<HTMLSpanElement>(null)
  const readout = useRef<HTMLSpanElement>(null)
  const ghosts = useRef<(HTMLSpanElement | null)[]>([])
  const tickEls = useRef<(HTMLSpanElement | null)[]>([])

  const width = useRef(0)
  const trail = useRef<Sample[]>([])
  const lit = useRef<boolean[]>([])
  const edge = useRef<'min' | 'max' | null>(value >= max ? 'max' : value <= min ? 'min' : null)
  const dash = useRef<{ dir: number } | null>(null)
  const mode = useRef<Mode>('idle')
  const soft = useRef(false)
  const pressAt = useRef(0)
  const lastLines = useRef(0)
  const drag = useRef<Sample[]>([])
  const timer = useRef(0)

  const segments = ticks === false ? 0 : (ticks ?? (span / step <= 20 ? Math.round(span / step) : 10))
  const tickPs = Array.from({ length: Math.max(0, segments - 1) }, (_, i) => (i + 1) / segments)

  // knob squash / wind-up (inner element)
  const body = useSprings(
    knob,
    { sx: 1, sy: 1, x: 0 },
    (s, el) => {
      el.style.transform = `translateX(${s.x}px) scale(${s.sx}, ${s.sy})`
    },
    { stiffness: 520, damping: 12 },
  )
  // value bubble pop / shake
  const pop = useSprings(
    bubble,
    { s: 1, r: 0, y: 0 },
    (s, el) => {
      el.style.transform = `translateY(${s.y}px) rotate(${s.r}deg) scale(${s.s})`
    },
    { stiffness: 600, damping: 12 },
  )

  const arrive = () => {
    const kb = knobBox.current
    if (!kb) return
    const r = kb.getBoundingClientRect()
    body.kick({ sx: 7, sy: -8 })
    pop.kick({ s: 6, r: (Math.random() < 0.5 ? -1 : 1) * 260, y: -60 })
    spawn(smoke(r.left + r.width / 2, r.bottom - 2, { count: 4, spread: 26, size: 8 }))
  }

  const slam = (atMax: boolean) => {
    const kb = knobBox.current
    if (!kb) return
    const gentle = soft.current
    const { x, y } = centerOf(kb)
    body.kick({ sx: -6, sy: 8, x: atMax ? 70 : -70 })
    pop.kick({ s: 9, r: atMax ? 300 : -300, y: -90 })
    impactAt(x, y, { text: atMax ? maxSfx : minSfx, size: gentle ? 0.42 : 0.7, color: atMax ? C.accent : C.ink, smoky: !gentle })
    shake(root.current, gentle ? 2 : 4)
  }

  // Position: one spring drives the knob, fill, bubble, ghosts and ticks through --p.
  const pos = useSprings(
    root,
    { p: toP(value) },
    (s, el, vel) => {
      const raw = s.p
      const p = clamp(raw, 0, 1)
      const over = raw - p
      const now = performance.now()
      const w = width.current || el.clientWidth
      const speed = vel.p * (w - THUMB) // px/s, signed
      const abs = Math.abs(speed)
      const flat = uiStyle() === 'flat'
      el.style.setProperty('--p', String(p))

      // the knob stretches along its motion and squashes flat against the wall when it overshoots
      const kb = knobBox.current
      if (kb) {
        const st = Math.min(abs / 2400, flat ? 0.25 : 0.6)
        const wall = Math.min(Math.abs(over) * 7, 0.45)
        kb.style.transformOrigin = over > 0 ? '100% 50%' : over < 0 ? '0% 50%' : '50% 50%'
        kb.style.transform = `scale(${1 + st - wall}, ${1 - st * 0.45 + wall * 0.75})`
      }
      if (bubbleBox.current) bubbleBox.current.style.transform = `rotate(${clamp(-speed / 80, -18, 18)}deg)`
      if (readout.current) readout.current.textContent = snapV(min + p * span).toFixed(decimals)

      // afterimages
      const lag = lagged(trail.current, p, now)
      ghosts.current.forEach((g, i) => {
        if (!g) return
        const gap = Math.abs(lag[i] - p) * w
        const a = gap < 5 ? 0 : clamp((abs - 220) / 1300, 0, 1) * GHOST_ALPHA[i] * (flat ? 0.55 : 1)
        el.style.setProperty(`--g${i}`, String(clamp(lag[i], 0, 1)))
        g.style.opacity = String(a)
      })

      // speed lines while it streaks
      if (abs > 850 && kb && now - lastLines.current > 55) {
        lastLines.current = now
        spawn(speedLines(kb.getBoundingClientRect(), speed > 0 ? 1 : -1, { count: 3, length: clamp(abs / 22, 30, 90) }))
      }

      // ticks light up and pop as the knob passes
      if (lit.current.length !== tickPs.length) lit.current = tickPs.map((tp) => p >= tp - 1e-4)
      tickPs.forEach((tp, i) => {
        const on = p >= tp - 1e-4
        const t = tickEls.current[i]
        if (!t) return
        if (on) t.setAttribute('data-lit', '')
        else t.removeAttribute('data-lit')
        if (lit.current[i] === on) return
        lit.current[i] = on
        if (prefersReducedMotion()) return
        t.animate([{ scale: '1' }, { scale: on ? (flat ? '1.7' : '2.6') : '0.4' }, { scale: '1' }], { duration: on ? 340 : 200, easing: POP })
        if (on && !flat && abs > 150) {
          const r = t.getBoundingClientRect()
          spawn(sparkle(r.left + r.width / 2, r.top - 9, { size: 7, color: C.pop }))
        }
      })

      // landing after a dash or fling
      const d = dash.current
      const target = toP(valueRef.current)
      if (d && (d.dir > 0 ? raw >= target - 0.004 : raw <= target + 0.004)) {
        dash.current = null
        arrive()
      }

      // the ends hit back
      const v = valueRef.current
      if ((edge.current === 'max' && p < 0.97) || (edge.current === 'min' && p > 0.03)) edge.current = null
      if (p >= 0.999 && v >= max && edge.current !== 'max') {
        edge.current = 'max'
        slam(true)
      } else if (p <= 0.001 && v <= min && edge.current !== 'min') {
        edge.current = 'min'
        slam(false)
      }
    },
    { stiffness: 420, damping: 21 },
  )

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    width.current = el.clientWidth
    const ro = new ResizeObserver(() => {
      width.current = el.clientWidth
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const move = (p: number) => (prefersReducedMotion() ? pos.snap({ p }) : pos.set({ p }))

  const commit = (next: number) => {
    valueRef.current = next
    setValue(next)
    onChange?.(next)
  }

  /** Click on the track: wind up against the move, then dash. */
  const dashTo = (prev: number, next: number) => {
    commit(next)
    if (prefersReducedMotion()) return pos.snap({ p: toP(next) })
    const dir = next > prev ? 1 : -1
    dash.current = { dir }
    body.kick({ x: -dir * 110, sx: -3, sy: 3 })
    pos.set({ p: toP(prev) - dir * 0.018 })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      pos.set({ p: toP(valueRef.current) })
      pos.kick({ p: dir * 1.5 })
      body.kick({ x: dir * 180, sx: 4, sy: -3 })
      const el = root.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const xAt = (p: number) => r.left + THUMB / 2 + (r.width - THUMB) * p
      const a = xAt(toP(prev))
      const b = xAt(toP(valueRef.current))
      spawn(speedLines({ left: Math.min(a, b), top: r.top + 30, width: Math.max(30, Math.abs(b - a)), height: 34 }, dir > 0 ? 1 : -1, { count: 7, length: 80 }))
    }, 75)
  }

  const handle = (next: number) => {
    const prev = valueRef.current
    if (next === prev) return
    const now = performance.now()
    const m = mode.current
    soft.current = m === 'key'
    if (m === 'press' && now - pressAt.current < 120 && Math.abs(next - prev) / span > 0.06) {
      mode.current = 'drag'
      return dashTo(prev, next)
    }
    commit(next)
    move(toP(next))
    if (m === 'key') {
      const dir = next > prev ? 1 : -1
      body.kick({ x: dir * 50, sx: 2, sy: -1.5 })
      pop.kick({ s: 3, r: dir * 80 })
      mode.current = 'idle'
      return
    }
    mode.current = 'drag'
    drag.current.push({ v: next, t: now })
    drag.current = drag.current.filter((h) => now - h.t < 120)
  }

  const release = () => {
    body.set({ sx: 1, sy: 1 })
    const h = drag.current
    drag.current = []
    mode.current = 'idle'
    if (h.length < 2 || prefersReducedMotion()) return
    const dt = (h[h.length - 1].t - h[0].t) / 1000
    if (dt <= 0) return
    const vel = (h[h.length - 1].v - h[0].v) / dt
    if (Math.abs(vel) < span * 1.1) return
    // fling: it keeps flying, overshoots where it lands and bounces back
    const next = snapV(valueRef.current + vel * 0.2)
    if (next === valueRef.current) return
    commit(next)
    dash.current = { dir: Math.sign(vel) }
    pos.set({ p: toP(next) })
    pos.kick({ p: (vel / span) * 0.3 })
  }

  return (
    <div ref={root} className={cn('group relative h-16 w-[min(100%,300px)]', className)} style={ROOT_STYLE}>
      <span aria-hidden="true" className="ui-border ui-pill ui-tone absolute inset-x-0 top-10 h-3.5 overflow-hidden bg-canvas">
        <span className="motion-lines absolute inset-y-0 left-0 animate-drift bg-accent" style={FILL_STYLE} />
      </span>
      {tickPs.length > 0 && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[44px] h-1.5">
          {tickPs.map((tp, i) => (
            <span
              key={i}
              ref={(el) => {
                tickEls.current[i] = el
              }}
              className="absolute top-0 -ml-[3px] size-1.5 rounded-full bg-ink/25 transition-colors duration-150 data-lit:bg-white"
              style={{ left: AT(String(tp)) }}
            />
          ))}
        </span>
      )}
      {GHOST_STYLES.map((style, i) => (
        <span
          key={i}
          ref={(el) => {
            ghosts.current[i] = el
          }}
          aria-hidden="true"
          className="ui-border-thin ui-pill pointer-events-none absolute top-[33px] -ml-[14px] size-(--thumb) bg-accent-soft"
          style={style}
        />
      ))}
      <span aria-hidden="true" className="pointer-events-none absolute top-0 h-full w-0" style={RIDER_STYLE}>
        <span ref={bubbleBox} className="absolute bottom-[37px] left-0 flex w-0 origin-bottom justify-center">
          <span
            ref={bubble}
            className="ui-head ui-r-sm relative min-w-9 origin-bottom bg-ink px-2 py-1 text-center text-[13px] leading-none whitespace-nowrap text-paper tabular-nums after:absolute after:top-full after:left-1/2 after:-ml-1 after:border-x-4 after:border-t-[5px] after:border-x-transparent after:border-t-ink"
          >
            <span ref={readout} />
          </span>
        </span>
        <span ref={knobBox} className="absolute top-[33px] left-[calc(var(--thumb)/-2)] size-(--thumb)">
          <span
            ref={knob}
            className="ui-border ui-pill ui-shadow-sm block size-full bg-paper transition-colors group-active:bg-canvas group-has-[input:focus-visible]:outline-[2.5px] group-has-[input:focus-visible]:outline-offset-[3px] group-has-[input:focus-visible]:outline-accent group-has-[input:focus-visible]:outline-solid"
          />
        </span>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        className="absolute inset-0 m-0 size-full cursor-grab appearance-none bg-transparent opacity-0 active:cursor-grabbing [&::-moz-range-thumb]:h-16 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:border-0 [&::-webkit-slider-thumb]:h-16 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:appearance-none"
        onKeyDown={() => {
          mode.current = 'key'
        }}
        onChange={(e) => handle(Number(e.target.value))}
        onPointerDown={() => {
          window.clearTimeout(timer.current)
          mode.current = 'press'
          pressAt.current = performance.now()
          drag.current = []
          body.set({ sx: 1.18, sy: 1.18 })
        }}
        onPointerUp={release}
        onPointerCancel={release}
      />
    </div>
  )
}
