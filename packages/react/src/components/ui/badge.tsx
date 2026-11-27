import { useEffect, useLayoutEffect, useRef } from 'react'
import type { HTMLAttributes } from 'react'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { burst, delayed, prefersReducedMotion, rand, shards, smoke, sparkle, spawn, uiStyle, useSprings } from '@/fx'
import { C } from '@/fx/palette'
import { RollingNumber } from './rolling-number'
import { cn } from '@/lib/utils'

const badge = cva('ui-head ui-border-thin ui-pill relative inline-flex items-center gap-1 px-2.5 py-1 text-[13px] leading-none whitespace-nowrap', {
  variants: {
    variant: {
      ink: 'ui-fill ui-shadow-sm bg-ink text-paper',
      accent: 'ui-fill ui-shadow-sm bg-accent text-white',
      paper: 'ui-shadow-sm bg-paper text-ink',
      pop: 'ui-fill ui-shadow-sm bg-pop text-white',
      outline: 'bg-transparent text-current',
    },
  },
  defaultVariants: { variant: 'ink' },
})

const RING: Record<string, string> = {
  ink: 'border-ink',
  accent: 'border-accent',
  paper: 'border-accent',
  pop: 'border-pop',
  outline: 'border-current',
}

export type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badge> & {
    /** Slam the badge down like a rubber stamp when it mounts: it lands with a burst and dust. */
    stamp?: boolean
    /** Pop in, then keep pinging a ring around it (for "new" / "live"). */
    pulse?: boolean
    /** A number to show instead of children. Every change bounces the badge and rolls the digits. */
    count?: number
    /** Counts above this show as `max+`. */
    max?: number
  }

const POP = 'cubic-bezier(.2,1.6,.4,1)'

/** Small outlined pill for tags, statuses and counts. */
export function Badge({ variant, stamp, pulse, count, max = 99, className, children, ...props }: BadgeProps) {
  const wrap = useRef<HTMLSpanElement>(null)
  const pill = useRef<HTMLSpanElement>(null)
  const prevCount = useRef(count)
  const spring = useSprings(
    wrap,
    { s: 1, sy: 0 },
    (v, el) => {
      const s = Math.max(v.s, 0)
      el.style.transform = `scale(${s * (1 - v.sy * 0.25)}, ${s * (1 + v.sy * 0.35)})`
    },
    { stiffness: 560, damping: 14 },
  )

  // entrances
  useLayoutEffect(() => {
    const el = pill.current
    if (!el || (!stamp && !pulse) || prefersReducedMotion()) return
    const flat = uiStyle() === 'flat'
    if (stamp) {
      const kf = flat
        ? [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1.12)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }]
        : [
            { transform: `translateY(-26px) scale(2.6) rotate(${rand(-16, -8)}deg)`, opacity: 0 },
            { transform: 'translateY(0) scale(1.5) rotate(-6deg)', opacity: 1, offset: 0.4 },
            { transform: 'scale(.82, 1.12) rotate(2deg)', opacity: 1, offset: 0.58 },
            { transform: 'scale(1.08, .94)', offset: 0.78 },
            { transform: 'none', opacity: 1 },
          ]
      const dur = flat ? 360 : 520
      el.animate(kf, { duration: dur, easing: flat ? POP : 'cubic-bezier(.6,0,.3,1)', fill: 'backwards' })
      // the contact frame
      const t = window.setTimeout(() => {
        const r = el.getBoundingClientRect()
        const x = r.left + r.width / 2
        const y = r.top + r.height / 2
        spawn(
          burst(x, y, { radius: Math.max(22, r.width * 0.55), spikes: 10, color: C.pop }),
          shards(x, y, { count: 6, speed: 300, size: 6 }),
          delayed(0.04, smoke(x, r.bottom, { count: 4, spread: r.width * 0.6, size: 7 })),
        )
      }, dur * 0.5)
      return () => clearTimeout(t)
    }
    el.animate(
      [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.3)', opacity: 1, offset: 0.55 }, { transform: 'scale(.92)', offset: 0.8 }, { transform: 'none', opacity: 1 }],
      { duration: 480, easing: POP, fill: 'backwards' },
    )
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // count changes: bounce (the digits roll on their own, the way the count went)
  useEffect(() => {
    const prev = prevCount.current
    prevCount.current = count
    if (count === undefined || prev === undefined || prev === count) return
    const up = count > prev
    spring.kick({ s: up ? 9 : -5, sy: up ? 10 : -6 })
    if (prefersReducedMotion()) return
    if (up && pill.current) {
      const r = pill.current.getBoundingClientRect()
      spawn(sparkle(r.right - 2, r.top + 2, { size: 9, color: C.pop }), delayed(0.08, sparkle(r.left + 2, r.top - 4, { size: 6 })))
    }
  }, [count, spring])


  return (
    // The spring owns `transform` on the wrapper, so className styles stay on the inner pill.
    <span ref={wrap} className="relative inline-flex origin-bottom">
      <span ref={pill} className={cn(badge({ variant }), count !== undefined && 'min-w-[2.1em] justify-center tabular-nums', className)} {...props}>
        {count === undefined ? children : <RollingNumber value={count} format={(n) => (n > max ? `${max}+` : String(n))} duration={420} live={false} />}
      </span>
      {pulse && (
        <span
          aria-hidden="true"
          className={cn('ui-pill pointer-events-none absolute inset-0 animate-[ping_1.4s_cubic-bezier(0,0,.2,1)_infinite] border-[length:var(--ui-bw-thin)]', RING[variant ?? 'ink'])}
        />
      )}
    </span>
  )
}
