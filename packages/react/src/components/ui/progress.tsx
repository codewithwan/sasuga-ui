import { useEffect, useLayoutEffect, useRef } from 'react'
import type { HTMLAttributes } from 'react'
import { burst, clamp, delayed, prefersReducedMotion, rand, shards, sfx, smoke, sparkle, spawn, speedLines, useSprings } from '@/fx'
import { C } from '@/fx/palette'
import { cn } from '@/lib/utils'

export type ProgressProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** 0–100 */
  value: number
  label?: string
  /** Rides a value bubble on the tip of the fill. */
  showValue?: boolean
  /** Lettering when it reaches 100. `false` = none. */
  sfx?: string | false
  /** Text of the sticker that lands at 100. `false` = none. */
  doneLabel?: string | false
}

const MILESTONES = [25, 50, 75]
const EASE_POP = 'cubic-bezier(.2,1.6,.4,1)'
// Constant objects: React never re-applies them, so the spring owns these properties.
const FILL_START = { width: 0 }
const BUBBLE_START = { left: 0, transform: 'translateX(-50%)' }

/**
 * A game-feel progress bar. While it loads, the fill drifts, its tip kicks up dust and
 * speed lines, and every quarter pops a spark. At 100 the bar flashes and squashes,
 * a big check draws itself over the end, and a "Complete" sticker lands.
 */
export function Progress({ value, label, showValue, sfx: sfxText = '完了!', doneLabel = 'Complete', className, ...props }: ProgressProps) {
  const v = clamp(value, 0, 100)
  const done = v >= 100
  const track = useRef<HTMLSpanElement>(null)
  const fill = useRef<HTMLSpanElement>(null)
  const bubble = useRef<HTMLSpanElement>(null)
  const check = useRef<SVGSVGElement>(null)
  const badge = useRef<HTMLSpanElement>(null)
  const prev = useRef(v)
  const mounted = useRef(false)

  // The fill and the riding bubble move on one spring; the bubble leans with the speed.
  const spring = useSprings(
    fill,
    { p: v },
    (s, el, vel) => {
      const p = clamp(s.p, 0, 100)
      el.style.width = `${p}%`
      if (bubble.current) {
        const lean = clamp(vel.p * 0.04, -1, 1)
        bubble.current.style.left = `${p}%`
        bubble.current.style.transform = `translateX(-50%) skewX(${-lean * 14}deg) scale(${1 + Math.abs(lean) * 0.18}, ${1 - Math.abs(lean) * 0.12})`
      }
    },
    { stiffness: 150, damping: 17 },
  )
  // Squash of the whole track: small on each step, big on the finish.
  const squash = useSprings(
    track,
    { s: 0 },
    (s, el) => {
      el.style.transform = `scale(${1 + s.s * 0.05}, ${1 - s.s * 0.12})`
    },
    { stiffness: 520, damping: 11 },
  )

  useEffect(() => {
    spring.set({ p: v })
    const from = prev.current
    prev.current = v
    if (!mounted.current) {
      mounted.current = true
      return
    }
    const el = track.current
    if (!el || v === from || prefersReducedMotion()) return
    const r = el.getBoundingClientRect()
    const cy = r.top + r.height / 2
    const tipAt = (p: number) => r.left + (r.width * p) / 100

    if (v > from) {
      // the tip lunges forward: lines streak behind it, dust kicks up where it lands
      squash.kick({ s: 4 })
      const tx = tipAt(v)
      spawn(
        speedLines({ left: tipAt(from), top: r.top - 6, width: Math.max(40, tx - tipAt(from)), height: r.height + 12 }, 1, { count: 7, length: 70, color: C.ink }),
        delayed(0.18, smoke(tx, cy + 4, { count: 4, spread: 26, size: 9 })),
      )
      for (const m of MILESTONES) {
        if (from < m && v >= m && v < 100) {
          spawn(delayed(0.2, sparkle(tipAt(m), r.top - 10, { size: 14, color: C.pop })))
        }
      }
    }

    if (done && from < 100) {
      const x = r.right - 4
      // 1) flash + big squash once the fill has landed
      window.setTimeout(() => {
        squash.kick({ s: 22 })
        fill.current?.animate([{ backgroundColor: '#fff' }, { backgroundColor: 'var(--color-accent)' }], { duration: 420, easing: 'ease-out' })
        spawn(
          burst(x, cy, { radius: 46, spikes: 12 }),
          shards(x, cy, { count: 12, speed: 520 }),
          smoke(r.left + 10, cy + 6, { count: 5, spread: 40, size: 12 }),
          smoke(x, cy + 6, { count: 6, spread: 50, size: 14 }),
          delayed(0.12, sparkle(x - rand(30, 60), r.top - 22, { size: 16, color: C.pop })),
          delayed(0.2, sparkle(r.left + r.width * 0.4, r.top - 16, { size: 12 })),
        )
        if (sfxText) spawn(delayed(0.06, sfx(x - 40, r.top - 44, sfxText, { size: 38, color: C.accent })))
      }, 380)
    }
  }, [v, done, spring, squash, sfxText])

  // 2) the check draws itself and the sticker lands (on reaching 100, also when it mounts full)
  useLayoutEffect(() => {
    if (!done) return
    const still = prefersReducedMotion()
    const delay = mounted.current ? 420 : 0
    const svg = check.current
    if (svg && !still) {
      svg.animate(
        [
          { transform: 'scale(0) rotate(-30deg)', opacity: 0 },
          { transform: 'scale(1.35) rotate(6deg)', opacity: 1, offset: 0.55 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 520, delay, easing: EASE_POP, fill: 'backwards' },
      )
      svg.querySelectorAll('path').forEach((p) =>
        p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 360, delay: delay + 120, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'backwards' }),
      )
    }
    if (badge.current && !still) {
      badge.current.animate(
        [
          { transform: 'translateY(10px) scale(0) rotate(-20deg)', opacity: 0 },
          { transform: 'translateY(-4px) scale(1.25) rotate(4deg)', opacity: 1, offset: 0.6 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 560, delay: delay + 260, easing: EASE_POP, fill: 'backwards' },
      )
    }
  }, [done])

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('grid w-full gap-2', className)}
      {...props}
    >
      {(label || (done && doneLabel)) && (
        <span className="flex min-h-7 items-center justify-between gap-3">
          {label && <span className="ui-head text-[15px] leading-none">{label}</span>}
          {done && doneLabel && (
            <span ref={badge} className="ui-head ui-border-thin ui-pill ui-shadow-sm ui-fill ml-auto inline-flex items-center gap-1.5 bg-pop px-3 py-1 text-xs leading-none text-white">
              {doneLabel}
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 fill-none stroke-current stroke-[4] [stroke-linecap:round] [stroke-linejoin:round]">
                <path d="M5 12.5 9.5 17 19 7" />
              </svg>
            </span>
          )}
        </span>
      )}

      <span className={cn('relative block', showValue && 'pt-9')}>
        {showValue && (
          <span
            ref={bubble}
            aria-hidden="true"
            className="ui-head ui-border-thin ui-r-sm ui-shadow-sm absolute top-0 z-10 bg-ink px-2 py-1 text-xs leading-none text-paper tabular-nums after:absolute after:top-full after:left-1/2 after:-ml-1 after:border-x-4 after:border-t-[5px] after:border-x-transparent after:border-t-ink"
            style={BUBBLE_START}
          >
            {Math.round(v)}%
          </span>
        )}

        <span ref={track} className="ui-border ui-pill ui-shadow-sm ui-tone relative block h-6 overflow-hidden bg-canvas">
          {/* quarter ticks */}
          {MILESTONES.map((m) => (
            <span key={m} aria-hidden="true" className="absolute inset-y-1.5 w-[2px] rounded-full bg-ink/15" style={{ left: `${m}%` }} />
          ))}
          <span
            ref={fill}
            data-done={done || undefined}
            className="motion-lines absolute inset-y-0 left-0 animate-drift bg-accent data-done:animate-none data-done:bg-none"
            style={FILL_START}
          >
            {/* glint riding the leading edge */}
            <span aria-hidden="true" className="absolute inset-y-1 right-1 w-2 rounded-full bg-white/70 in-data-done:hidden" />
          </span>
        </span>

        {done && (
          <svg
            ref={check}
            viewBox="0 0 48 48"
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute left-[calc(100%-14px)] z-10 size-14 -translate-1/2 overflow-visible fill-none [stroke-linecap:round] [stroke-linejoin:round]',
              showValue ? 'top-12' : 'top-3',
            )}
          >
            <path d="M10 25 20 35 39 13" pathLength={1} strokeDasharray="1" className="stroke-ink" strokeWidth={13} />
            <path d="M10 25 20 35 39 13" pathLength={1} strokeDasharray="1" className="stroke-pop" strokeWidth={6.5} />
          </svg>
        )}
      </span>
    </div>
  )
}
