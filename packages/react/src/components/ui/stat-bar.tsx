import { useCallback, useEffect, useRef, useState } from 'react'
import { burst, clamp, delayed, prefersReducedMotion, rand, shards, sparkle, spawn, speedLines, uiStyle, useSprings } from '@/fx'
import { C } from '@/fx/palette'
import { cn } from '@/lib/utils'

export type StatBarProps = {
  label: string
  /** Current value, 0–max. Change it after the intro and the bar reacts: chip-away damage or a sparkly heal. */
  value: number
  /** Letter that pops in at the end of the intro (S, A, B…). Without it the badge shows the number. */
  rank?: string
  /** Top of the scale. */
  max?: number
  /** Below this share of max (0–1) the fill turns the hit colour and blinks. */
  critical?: number
  className?: string
}

const POP = 'cubic-bezier(.2,1.6,.4,1)'

/**
 * A game meter. It loads in surges when it scrolls into view, then pops its rank
 * (click to replay). Afterwards every change is a hit: damage snaps the fill down
 * while a pale ghost bar chips away behind it, healing sparkles along the gain,
 * and under the critical line the bar blinks.
 */
export function StatBar({ label, value, rank, max = 100, critical = 0.2, className }: StatBarProps) {
  const pct = clamp((value / max) * 100, 0, 100)
  const root = useRef<HTMLButtonElement>(null)
  const track = useRef<HTMLSpanElement>(null)
  const fill = useRef<HTMLSpanElement>(null)
  const ghost = useRef<HTMLSpanElement>(null)
  const badge = useRef<HTMLSpanElement>(null)
  const floats = useRef<HTMLSpanElement>(null)
  const timers = useRef<number[]>([])
  const pctRef = useRef(pct)
  const shown = useRef(pct)
  const introduced = useRef(false)
  const [done, setDone] = useState(false)
  const low = pct > 0 && pct < critical * 100

  const spring = useSprings(
    fill,
    { p: 0 },
    (v, el) => {
      el.style.transform = `scaleX(${Math.max(v.p, 0) / 100})`
    },
    { stiffness: 170, damping: 15 },
  )
  const trail = useSprings(
    ghost,
    { p: 0 },
    (v, el) => {
      el.style.transform = `scaleX(${Math.max(v.p, 0) / 100})`
    },
    { stiffness: 60, damping: 14 },
  )
  const pop = useSprings(
    badge,
    { s: 0 },
    (v, el) => {
      el.style.transform = `scale(${Math.max(v.s, 0)})`
      el.style.visibility = v.s < 0.02 ? 'hidden' : 'visible'
    },
    { stiffness: 560, damping: 13 },
  )
  const jolt = useSprings(
    track,
    { x: 0, q: 0 },
    (v, el) => {
      el.style.transform = `translateX(${v.x}px) scale(${1 + v.q * 0.03}, ${1 - v.q * 0.1})`
    },
    { stiffness: 900, damping: 12 },
  )

  const run = useCallback(() => {
    const target = pctRef.current
    const headAt = (p: number) => {
      const r = track.current!.getBoundingClientRect()
      return { x: r.left + (r.width * p) / 100, y: r.top + r.height / 2, r }
    }
    timers.current.forEach(clearTimeout)
    timers.current = []
    spring.snap({ p: 0 })
    trail.snap({ p: 0 })
    pop.snap({ s: 0 })
    setDone(false)
    introduced.current = false
    const stops = [0.38, 0.62, 0.86, 1].map((k) => target * k)
    stops.forEach((p, i) => {
      timers.current.push(
        window.setTimeout(() => {
          spring.set({ p })
          trail.snap({ p })
          jolt.kick({ q: 3 })
          if (!track.current) return
          const { x, r } = headAt(p)
          spawn(speedLines({ left: x - 60, top: r.top, width: 60, height: r.height }, 1, { count: 4, length: 60 }))
        }, i * 360),
      )
    })
    timers.current.push(
      window.setTimeout(() => {
        setDone(true)
        introduced.current = true
        shown.current = target
        pop.set({ s: 1 })
        pop.kick({ s: 16 })
        // the value may have moved during the intro
        if (pctRef.current !== target) {
          spring.set({ p: pctRef.current })
          trail.set({ p: pctRef.current })
          shown.current = pctRef.current
        }
        if (!track.current) return
        const { x, y } = headAt(target)
        spawn(burst(x, y, { radius: 20, spikes: 8 }), delayed(0.05, sparkle(x + 10, y - 18, { size: 12, color: C.pop })))
      }, stops.length * 360 + 200),
    )
  }, [spring, trail, pop, jolt])

  useEffect(() => {
    const el = root.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          run()
          io.disconnect()
        }
      },
      { threshold: 0.6 },
    )
    io.observe(el)
    const pending = timers.current
    return () => {
      io.disconnect()
      pending.forEach(clearTimeout)
    }
  }, [run])

  /** A number that pops off the tip and floats away. */
  const floatText = (text: string, at: number, heal: boolean) => {
    const host = floats.current
    if (!host || prefersReducedMotion()) return
    const flat = uiStyle() === 'flat'
    const n = document.createElement('span')
    n.textContent = text
    n.className = cn(
      'pointer-events-none absolute -top-2 z-10 -translate-x-1/2 whitespace-nowrap',
      flat ? 'ui-head text-base' : 'ui-lettering text-xl',
    )
    n.style.left = `${at}%`
    n.style.color = heal ? 'var(--color-accent)' : 'var(--color-pop)'
    host.appendChild(n)
    n.animate(
      [
        { transform: 'translate(-50%, 6px) scale(.3)', opacity: 0 },
        { transform: `translate(-50%, -18px) scale(1.3) rotate(${rand(-10, 10)}deg)`, opacity: 1, offset: 0.25 },
        { transform: 'translate(-50%, -26px) scale(1)', opacity: 1, offset: 0.7 },
        { transform: 'translate(-50%, -40px) scale(.9)', opacity: 0 },
      ],
      { duration: 900, easing: POP },
    ).finished.then(
      () => n.remove(),
      () => n.remove(),
    )
  }

  // after the intro: damage / heal reactions
  useEffect(() => {
    pctRef.current = pct
    if (!introduced.current) return
    const from = shown.current
    shown.current = pct
    if (from === pct) return
    const still = prefersReducedMotion()
    const r = track.current?.getBoundingClientRect()
    const tip = (p: number) => (r ? r.left + (r.width * p) / 100 : 0)
    const cy = r ? r.top + r.height / 2 : 0
    const delta = Math.round(((pct - from) / 100) * max)

    if (pct < from) {
      // damage: the fill snaps down, the ghost holds, then chips away
      spring.snap({ p: pct })
      trail.snap({ p: from })
      timers.current.push(window.setTimeout(() => trail.set({ p: pct }), still ? 0 : 420))
      if (still || !r) return
      const hard = from - pct >= 20
      jolt.kick({ x: (Math.random() < 0.5 ? -1 : 1) * (hard ? 900 : 520), q: hard ? 10 : 5 })
      fill.current?.animate([{ filter: 'brightness(2.2)' }, { filter: 'none' }], { duration: 260, easing: 'ease-out' })
      spawn(burst(tip(pct), cy, { radius: hard ? 30 : 20, spikes: 9, color: C.pop }), shards(tip(pct), cy, { count: hard ? 10 : 6, speed: hard ? 480 : 340, size: 7 }))
      floatText(`${delta}`, pct, false)
    } else {
      // heal: the fill grows, sparkles run along the gained stretch
      trail.snap({ p: pct })
      spring.set({ p: pct })
      if (still || !r) return
      jolt.kick({ q: -4 })
      fill.current?.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.6) saturate(1.2)' }, { filter: 'none' }], { duration: 520, easing: 'ease-out' })
      const n = Math.max(2, Math.min(5, Math.round((pct - from) / 8)))
      for (let i = 0; i < n; i++) {
        const p = from + ((pct - from) * (i + 0.5)) / n
        spawn(delayed(0.05 + i * 0.07, sparkle(tip(p) + rand(-6, 6), cy + rand(-14, 4), { size: rand(8, 13), color: i % 2 ? C.white : C.accent })))
      }
      floatText(`+${delta}`, pct, true)
    }
    pop.kick({ s: pct < from ? -8 : 10 })
  }, [pct, max, spring, trail, jolt, pop])

  return (
    <button
      ref={root}
      type="button"
      onClick={run}
      aria-label={`${label}: ${Math.round(value)} of ${max}${rank ? `, rank ${rank}` : ''}. Replay.`}
      className={cn(
        'grid w-full cursor-pointer grid-cols-[minmax(96px,150px)_1fr_46px] items-center gap-4 border-0 bg-transparent py-1.5 text-left text-inherit focus-visible:outline-offset-4',
        className,
      )}
    >
      <span className="ui-head text-[clamp(16px,2vw,20px)] leading-none">{label}</span>
      <span ref={floats} className="relative block">
        <span ref={track} data-low={low || undefined} className="ui-border ui-pill ui-shadow-sm ui-tone relative block h-6 overflow-hidden bg-canvas data-low:animate-blink">
          {/* the ghost: what you just lost, chipping away */}
          <span ref={ghost} aria-hidden="true" className="absolute inset-0 origin-left bg-pop/45" style={{ transform: 'scaleX(0)' }} />
          <span
            ref={fill}
            data-done={done || undefined}
            data-low={low || undefined}
            className="motion-lines absolute inset-0 origin-left animate-drift bg-accent transition-colors duration-300 data-done:animate-none data-low:bg-pop"
            style={{ transform: 'scaleX(0)' }}
          />
        </span>
      </span>
      <span
        ref={badge}
        className={cn(
          'ui-head ui-border ui-pill ui-shadow-sm grid size-[46px] place-items-center bg-paper leading-none text-ink tabular-nums',
          rank ? 'text-[24px]' : 'text-[16px]',
          low && 'text-pop',
        )}
        style={{ visibility: 'hidden', transform: 'scale(0)' }}
      >
        {rank ?? Math.round(value)}
      </span>
    </button>
  )
}
