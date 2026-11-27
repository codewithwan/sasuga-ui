import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { HTMLAttributes } from 'react'
import { burst, clamp, delayed, prefersReducedMotion, rand, rays, shards, smoke, sparkle, spawn, useSprings } from '@/fx'
import { C } from '@/fx/palette'
import { POP_EASE, flashEl, hudKick, shakeEl } from './hud-fx'
import { cn } from '@/lib/utils'

export type HealthBarVariant = 'hp' | 'mp' | 'xp'

export type HealthBarProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** Current amount, 0‥max (clamped). */
  value: number
  max?: number
  /** Shown above the bar and used as the accessible name. Defaults to the variant name. */
  label?: string
  /** Colour from the theme: hp = pop, mp = accent, xp = soft accent with drifting lines. */
  variant?: HealthBarVariant
  /** Split the bar into this many cells. Omit for a smooth bar. */
  segments?: number
  /** Show "72 / 100" next to the label. */
  showNumbers?: boolean
  /** Fraction of max at or under which the bar blinks and pulses. `0` = never. Defaults to 0.2 for hp, 0 otherwise. */
  critical?: number
  /** Stamp shown when it hits 0. `false` = none. */
  koText?: string | false
}

const FILL: Record<HealthBarVariant, string> = {
  hp: 'bg-pop',
  mp: 'bg-accent',
  xp: 'bg-accent-soft motion-lines animate-drift',
}
const NAME: Record<HealthBarVariant, string> = { hp: 'HP', mp: 'MP', xp: 'XP' }
const tint = (v: HealthBarVariant) => (v === 'hp' ? C.pop : v === 'mp' ? C.accent : C.soft)

const STAMP_REST = { transform: 'translate(-50%, -50%)' }

type Float = { id: number; text: string; heal: boolean; left: number }

/** A damage/heal number that pops off the tip of the bar and floats away. */
function FloatNumber({ item, onDone }: { item: Float; onDone: (id: number) => void }) {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const done = () => onDone(item.id)
    if (prefersReducedMotion()) {
      const t = window.setTimeout(done, 700)
      return () => clearTimeout(t)
    }
    const dx = rand(-14, 14)
    const a = el.animate(
      [
        { transform: 'translateY(6px) scale(.3)', opacity: 0 },
        { transform: `translate(${dx * 0.3}px, -14px) scale(1.35)`, opacity: 1, offset: 0.18 },
        { transform: `translate(${dx * 0.5}px, -18px) scale(1)`, opacity: 1, offset: 0.4 },
        { transform: `translate(${dx}px, -34px) scale(.9)`, opacity: 0 },
      ],
      { duration: item.heal ? 1100 : 900, easing: 'cubic-bezier(.2,.7,.3,1)' },
    )
    a.finished.then(done, () => {})
    return () => a.cancel()
  }, [item, onDone])
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={cn(
        'ui-head pointer-events-none absolute bottom-full z-20 mb-1 -translate-x-1/2 text-[18px] leading-none tabular-nums',
        item.heal ? 'text-accent' : 'text-pop',
      )}
      style={{ left: `${item.left}%` }}
    >
      {item.text}
    </span>
  )
}

/**
 * A game HP/MP/XP bar. Damage snaps the fill down, flashes, shakes and leaves a light
 * "ghost" chunk that lingers and then drains; the lost amount pops off the tip. Heals
 * lead with a soft ghost the fill catches up to, with sparkles rising off it. Under
 * the critical line it blinks with a heartbeat; at 0 it shatters and a K.O. stamp lands.
 */
export function HealthBar({
  value,
  max = 100,
  label,
  variant = 'hp',
  segments,
  showNumbers = false,
  critical,
  koText = 'K.O.',
  className,
  ...props
}: HealthBarProps) {
  const safeMax = Math.max(1, max)
  const v = clamp(value, 0, safeMax)
  const pct = (v / safeMax) * 100
  const critLine = critical ?? (variant === 'hp' ? 0.2 : 0)
  const crit = v > 0 && v / safeMax <= critLine
  const ko = v <= 0
  const name = label ?? NAME[variant]

  const root = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLSpanElement>(null)
  const track = useRef<HTMLSpanElement>(null)
  const fill = useRef<HTMLSpanElement>(null)
  const ghost = useRef<HTMLSpanElement>(null)
  const flash = useRef<HTMLSpanElement>(null)
  const num = useRef<HTMLSpanElement>(null)
  const stamp = useRef<HTMLSpanElement>(null)
  const prev = useRef(v)
  const mounted = useRef(false)
  const drain = useRef(0)
  const nextId = useRef(1)
  const [floats, setFloats] = useState<Float[]>([])
  const [announce, setAnnounce] = useState('')

  const fillSpring = useSprings(
    fill,
    { p: pct },
    (s, el) => {
      el.style.width = `${clamp(s.p, 0, 100)}%`
    },
    { stiffness: 420, damping: 30 },
  )
  // the ghost drains slowly after a beat
  const ghostSpring = useSprings(
    ghost,
    { p: pct },
    (s, el) => {
      el.style.width = `${clamp(s.p, 0, 100)}%`
    },
    { stiffness: 70, damping: 16 },
  )
  // squash of the whole bar on a hit
  const squash = useSprings(
    body,
    { s: 0 },
    (s, el) => {
      el.style.transform = `scale(${1 + s.s * 0.03}, ${1 - s.s * 0.1})`
    },
    { stiffness: 560, damping: 12 },
  )

  const removeFloat = useCallback((id: number) => setFloats((list) => list.filter((f) => f.id !== id)), [])

  useEffect(() => {
    const from = prev.current
    prev.current = v
    if (!mounted.current) {
      mounted.current = true
      return
    }
    if (v === from) {
      // only max changed: just re-fit
      fillSpring.set({ p: pct })
      ghostSpring.set({ p: pct })
      return
    }
    const still = prefersReducedMotion()
    const fromPct = (from / safeMax) * 100
    const diff = Math.abs(v - from)
    const amount = Number.isInteger(diff) ? String(diff) : diff.toFixed(1)
    const heal = v > from
    window.clearTimeout(drain.current)

    if (heal) {
      // the soft ghost leads, the fill catches up
      if (ghost.current) ghost.current.dataset.heal = ''
      ghostSpring.snap({ p: pct })
      drain.current = window.setTimeout(() => fillSpring.set({ p: pct }), still ? 0 : 220)
    } else {
      // the fill drops at once; the light chunk lingers, then chips away
      if (ghost.current) delete ghost.current.dataset.heal
      fillSpring.set({ p: pct })
      drain.current = window.setTimeout(() => ghostSpring.set({ p: pct }), still ? 0 : 560)
    }

    setFloats((list) => [...list.slice(-5), { id: nextId.current++, text: `${heal ? '+' : '−'}${amount}`, heal, left: clamp(heal ? pct : fromPct, 4, 96) }])
    num.current?.animate([{ transform: 'scale(1.4)', color: heal ? 'var(--color-accent)' : 'var(--color-pop)' }, { transform: 'none' }], {
      duration: still ? 1 : 420,
      easing: POP_EASE,
    })

    const wasCrit = from > 0 && from / safeMax <= critLine
    if (v <= 0 && from > 0) setAnnounce(`${name} K.O.`)
    else if (from <= 0 && v > 0) setAnnounce(`${name} revived`)
    else if (crit && !wasCrit) setAnnounce(`${name} critical`)

    const el = track.current
    if (!el || still) return
    const r = el.getBoundingClientRect()
    const cy = r.top + r.height / 2
    const tipAt = (p: number) => r.left + (r.width * p) / 100
    const share = diff / safeMax

    if (heal) {
      // sparkles rise off the healed span
      const n = Math.max(2, Math.min(6, Math.round(share * 14)))
      for (let i = 0; i < n; i++) {
        const x = tipAt(fromPct + (pct - fromPct) * rand(0.1, 1))
        spawn(delayed(0.08 + i * 0.07, sparkle(x, r.top - 6 - i * 9, { size: rand(8, 13), color: i % 2 ? C.accent : C.soft })))
      }
      return
    }

    // damage
    flashEl(flash.current, 0.95, 240)
    squash.kick({ s: 4 + share * 30 })
    shakeEl(root.current, 0.5 + share * 3)
    const tx = tipAt(pct)
    spawn(shards(tx, cy, { count: 4 + Math.round(share * 12), speed: 260 + share * 500, size: 7, colors: [tint(variant), C.ink, C.white] }))
    if (share >= 0.25 && v > 0) {
      spawn(burst(tx, cy, { radius: 26 + share * 30, spikes: 10, color: tint(variant) }), rays(tx, cy, { inner: 20, outer: 90, count: 12 }))
    }

    if (v <= 0 && from > 0) {
      // K.O.: the whole bar shatters
      shakeEl(root.current, 3, 520)
      squash.kick({ s: 30 })
      const cx = r.left + r.width / 2
      for (let i = 0; i < 6; i++) {
        spawn(delayed(i * 0.03, shards(r.left + (r.width * (i + 0.5)) / 6, cy, { count: 6, speed: 520, size: 10, colors: [tint(variant), C.ink, C.white, C.pop] })))
      }
      spawn(
        burst(cx, cy, { radius: 60, spikes: 14, color: C.pop }),
        rays(cx, cy, { inner: 40, outer: 220, count: 22 }),
        delayed(0.08, smoke(cx, cy + 6, { count: 7, spread: r.width * 0.35, size: 14 })),
      )
    }
  }, [v, pct, safeMax, crit, critLine, name, variant, fillSpring, ghostSpring, squash])

  useEffect(() => () => window.clearTimeout(drain.current), [])

  // critical: a heartbeat pulse while it lasts
  useEffect(() => {
    const el = body.current?.parentElement
    if (!crit || !el || prefersReducedMotion()) return
    const k = hudKick()
    const a = el.animate(
      [
        { scale: '1', offset: 0 },
        { scale: `${1 + 0.035 * k} ${1 + 0.12 * k}`, offset: 0.12 },
        { scale: '1', offset: 0.24 },
        { scale: `${1 + 0.05 * k} ${1 + 0.18 * k}`, offset: 0.36 },
        { scale: '1', offset: 0.55 },
      ],
      { duration: 1000, iterations: Infinity, easing: 'ease-out' },
    )
    return () => a.cancel()
  }, [crit])

  // K.O. stamp lands
  useLayoutEffect(() => {
    const el = stamp.current
    if (!ko || !el || prefersReducedMotion()) return
    el.animate(
      [
        { transform: 'translate(-50%, -50%) scale(3.2) rotate(-14deg)', opacity: 0 },
        { transform: 'translate(-50%, -50%) scale(.86) rotate(4deg)', opacity: 1, offset: 0.55 },
        { transform: 'translate(-50%, -50%) scale(1.06) rotate(-2deg)', offset: 0.8 },
        { transform: 'translate(-50%, -50%)' },
      ],
      { duration: mounted.current ? 520 : 1, delay: mounted.current ? 140 : 0, easing: POP_EASE, fill: 'backwards' },
    )
  }, [ko])

  const cells = segments && segments > 1 ? Math.min(Math.round(segments), 60) : 0

  return (
    <div
      ref={root}
      role="meter"
      aria-label={name}
      aria-valuenow={Math.round(v * 10) / 10}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuetext={`${Math.round(v * 10) / 10} of ${safeMax}${ko ? ', K.O.' : crit ? ', critical' : ''}`}
      data-critical={crit || undefined}
      data-ko={ko || undefined}
      className={cn('group/hp relative grid w-full gap-1.5', className)}
      {...props}
    >
      <span className="flex min-h-6 items-end justify-between gap-3">
        <span className="ui-head flex items-center gap-2 text-[15px] leading-none group-data-critical/hp:text-pop">
          {name}
          <span aria-hidden="true" className="ui-head ui-pill ui-fill hidden animate-blink bg-pop px-1.5 py-0.5 text-[10px] leading-none text-white group-data-critical/hp:inline-block">
            !
          </span>
        </span>
        {showNumbers && (
          <span aria-hidden="true" className="ui-head text-[15px] leading-none tabular-nums">
            <span ref={num} className="inline-block origin-[50%_80%]">
              {Math.ceil(v)}
            </span>
            <span className="text-mute"> / {safeMax}</span>
          </span>
        )}
      </span>

      <span className="relative block">
        {floats.map((f) => (
          <FloatNumber key={f.id} item={f} onDone={removeFloat} />
        ))}
        <span ref={body} className="block origin-left">
          <span
            ref={track}
            className="ui-border ui-pill ui-shadow-sm ui-tone relative block h-6 overflow-hidden bg-canvas transition-[filter] duration-300 group-data-ko/hp:grayscale"
          >
            {/* ghost chunk: light on damage, soft accent on heal */}
            <span ref={ghost} className="absolute inset-y-0 left-0 bg-paper data-heal:bg-accent-soft" />
            <span ref={fill} className={cn('absolute inset-y-0 left-0 group-data-critical/hp:animate-blink', FILL[variant])}>
              <span aria-hidden="true" className="absolute inset-x-2 top-1 h-1 rounded-full bg-white/45" />
            </span>
            {cells > 0 &&
              Array.from({ length: cells - 1 }, (_, i) => (
                <span key={i} aria-hidden="true" className="absolute inset-y-0 w-[var(--ui-bw-thin)] -translate-x-1/2 bg-[var(--ui-line)]" style={{ left: `${((i + 1) / cells) * 100}%` }} />
              ))}
            <span ref={flash} aria-hidden="true" className="pointer-events-none absolute inset-0 bg-paper opacity-0" />
          </span>
        </span>

        {ko && koText && (
          <>
            {/* crack drawn across the bar */}
            <svg aria-hidden="true" viewBox="0 0 100 24" preserveAspectRatio="none" className="fx-only pointer-events-none absolute inset-0 size-full overflow-visible">
              <polyline points="8,4 22,16 34,7 47,19 58,6 71,17 83,5 94,15" className="fill-none stroke-ink [stroke-linejoin:bevel]" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
            </svg>
            <span ref={stamp} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2 z-30" style={STAMP_REST}>
              <span className="fx-only ui-lettering block text-[40px] whitespace-nowrap text-pop!">{koText}</span>
              <span className="ui-head ui-pill ui-shadow-sm hidden bg-ink px-3 py-1 text-sm leading-none whitespace-nowrap text-paper in-data-[style=flat]:block">
                {koText}
              </span>
            </span>
          </>
        )}
      </span>

      <span className="sr-only" aria-live="polite">
        {announce}
      </span>
    </div>
  )
}
