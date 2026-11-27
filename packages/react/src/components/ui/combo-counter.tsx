import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { HTMLAttributes } from 'react'
import { burst, centerOf, delayed, prefersReducedMotion, rand, rays, shards, sparkle, spawn, useSprings } from '@/fx'
import { C } from '@/fx/palette'
import { useTheme } from '@/lib/theme'
import { RollingNumber } from './rolling-number'
import { POP_EASE, flashEl, hudKick, shakeEl, useLatest } from './hud-fx'
import { cn } from '@/lib/utils'

export type ComboMilestone = { at: number; text: string }

export type ComboCounterProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** Current chain length (controlled). Raise it on every hit; set it back to 0 to reset. */
  value: number
  /** How long the chain survives without a hit, in ms. */
  timeout?: number
  /** Called when the chain decays (after the fall-away). Reset `value` here. */
  onTimeout?: () => void
  /** Word next to the number. */
  label?: string
  /** Chain lengths that get the big lettering + focus lines. */
  milestones?: ComboMilestone[]
  /** Hidden below this many hits. */
  showFrom?: number
}

const DEFAULT_MILESTONES: ComboMilestone[] = [
  { at: 10, text: 'Great!' },
  { at: 25, text: 'Amazing!' },
  { at: 50, text: 'Legendary!!' },
]

// size and colour climb with each milestone reached
const TIER_SIZE = ['text-[40px]', 'text-[46px]', 'text-[54px]', 'text-[62px]']
const TIER_COLOR = ['text-accent!', 'text-accent!', 'text-pop!', 'text-pop!']
const TIER_FLAT = ['text-ink', 'text-accent', 'text-pop', 'text-pop']

function slamIn(el: HTMLElement | null) {
  if (!el || prefersReducedMotion()) return
  const k = hudKick()
  el.animate(
    [
      { translate: `${-34 * k}px 0`, scale: `${1 + 0.5 * k}`, opacity: 0, filter: 'blur(4px)' },
      { translate: `${4 * k}px 0`, scale: '.96', opacity: 1, filter: 'blur(0)', offset: 0.6 },
      { translate: '0 0', scale: '1', opacity: 1, filter: 'blur(0)' },
    ],
    { duration: 380, easing: POP_EASE },
  )
}

type Banner = { id: number; text: string; at: number }

function MilestoneBanner({ banner, flat }: { banner: Banner; flat: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const still = prefersReducedMotion()
    el.animate(
      still
        ? [{ opacity: 1 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }]
        : [
            { translate: '0 18px', scale: '2.8', opacity: 0, filter: 'blur(6px)' },
            { translate: '0 0', scale: '.9', opacity: 1, filter: 'blur(0)', offset: 0.14 },
            { translate: '0 0', scale: '1.06', offset: 0.22 },
            { translate: '0 -4px', scale: '1', opacity: 1, offset: 0.78 },
            { translate: '0 -24px', scale: '1', opacity: 0 },
          ],
      { duration: 1500, easing: 'ease-out', fill: 'forwards' },
    )
  }, [banner])
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute bottom-full left-1 z-10 mb-2 origin-[20%_100%] whitespace-nowrap',
        flat ? 'ui-head ui-pill ui-shadow-sm ui-fill bg-pop px-3 py-1.5 text-[16px] leading-none text-white' : 'ui-lettering text-[36px] text-pop!',
      )}
    >
      {banner.text}
    </span>
  )
}

/**
 * "×12 Combo!" for a game HUD, on a sticker. Every hit punches the sticker (squash, shake,
 * a flash) while the digits roll in clipped columns, so no old number is ever left behind.
 * Milestones stamp big lettering with focus lines. A timer bar drains between hits; when it
 * empties the sticker hops, falls and fades out completely, then `onTimeout` fires.
 * Pair it with `useCombo()` from './use-combo' or drive `value` yourself.
 */
export function ComboCounter({
  value,
  timeout = 2400,
  onTimeout,
  label = 'Combo!',
  milestones = DEFAULT_MILESTONES,
  showFrom = 2,
  className,
  ...props
}: ComboCounterProps) {
  const { style } = useTheme()
  const flat = style === 'flat'
  const punch = useRef<HTMLDivElement>(null)
  const dropEl = useRef<HTMLDivElement>(null)
  const flash = useRef<HTMLSpanElement>(null)
  const bar = useRef<HTMLSpanElement>(null)
  const prev = useRef(value)
  const timer = useRef(0)
  const barAnim = useRef<Animation | null>(null)
  const bannerId = useRef(1)
  const [banner, setBanner] = useState<Banner | null>(null)
  const onTimeoutRef = useLatest(onTimeout)

  // after the fall-away the sticker is gone until the next hit
  const [dropped, setDropped] = useState(false)
  const [seen, setSeen] = useState(value)
  if (seen !== value) {
    setSeen(value)
    if (value > seen || value < showFrom) setDropped(false)
  }

  const tier = milestones.filter((m) => value >= m.at).length
  const visible = value >= showFrom && !dropped

  const spring = useSprings(
    punch,
    { s: 0, y: 0 },
    (v, el) => {
      el.style.transform = `translateY(${v.y}px) scale(${1 + v.s * 0.07}, ${1 - v.s * 0.045})`
    },
    { stiffness: 640, damping: 13 },
  )

  // every change: punch, restart the decay, maybe a milestone
  useEffect(() => {
    const from = prev.current
    prev.current = value
    if (value <= from) {
      if (value < showFrom) {
        window.clearTimeout(timer.current)
        barAnim.current?.cancel()
      }
      return
    }
    window.clearTimeout(timer.current)
    if (value < showFrom) return
    timer.current = window.setTimeout(() => {
      const finish = () => {
        setDropped(true)
        onTimeoutRef.current?.()
      }
      const el = dropEl.current
      if (!el || prefersReducedMotion()) return finish()
      // the drop: a little hop, then it falls off the HUD and is gone
      el.animate(
        [
          { translate: '0 0', scale: '1', opacity: 1, filter: 'blur(0)' },
          { translate: '0 -12px', scale: '1.04 .96', opacity: 1, filter: 'blur(0)', offset: 0.2 },
          { translate: `${rand(-6, 6)}px 80px`, scale: '.9 1.08', opacity: 0, filter: 'blur(3px)' },
        ],
        { duration: 540, easing: 'cubic-bezier(.45,0,.85,.45)', fill: 'forwards' },
      ).finished.then(finish, () => {})
    }, timeout)

    const still = prefersReducedMotion()
    const crossed = milestones.filter((m) => from < m.at && value >= m.at).pop()
    const host = punch.current

    // a hit during the fall cancels it
    dropEl.current?.getAnimations().forEach((a) => a.cancel())
    barAnim.current?.cancel()
    barAnim.current =
      bar.current?.animate(
        [
          { transform: 'scaleX(1)', backgroundColor: 'var(--color-accent)' },
          { transform: 'scaleX(.35)', backgroundColor: 'var(--color-accent)', offset: 0.65 },
          { transform: 'scaleX(0)', backgroundColor: 'var(--color-pop)' },
        ],
        { duration: timeout, easing: 'linear', fill: 'forwards' },
      ) ?? null

    if (crossed) setBanner({ id: bannerId.current++, text: crossed.text, at: crossed.at })
    if (!host || still) return
    const t = tier + (crossed ? 2 : 0)
    spring.kick({ s: 10 + t * 4, y: -55 - t * 18 })
    flashEl(flash.current, crossed ? 0.9 : 0.55, crossed ? 380 : 220)
    shakeEl(host.parentElement, crossed ? 2.2 : 0.5 + tier * 0.25, crossed ? 460 : 240)
    const { x, y, rect } = centerOf(host)
    spawn(shards(rect.left + rect.width * 0.25, y, { count: 3 + tier, speed: 300, size: 7 }))
    if (crossed) {
      spawn(
        rays(x, y, { inner: rect.height * 0.7, outer: 230 + tier * 30, count: 24 }),
        burst(rect.left + rect.width * 0.25, y, { radius: 48 + tier * 8, spikes: 14, color: C.pop }),
        delayed(0.1, sparkle(rect.right + 6, rect.top, { size: 16, color: C.pop })),
        delayed(0.18, sparkle(rect.left - 4, rect.bottom - 6, { size: 12 })),
      )
    }
    // milestones only matter when they change; the rest is read at hit time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
    },
    [],
  )

  // slam in whenever the sticker (re)appears
  useLayoutEffect(() => {
    if (visible) slamIn(dropEl.current)
  }, [visible])

  const letter = flat ? cn('ui-head', TIER_FLAT[Math.min(tier, 3)]) : cn('ui-lettering', TIER_COLOR[Math.min(tier, 3)], style === 'cel' && 'font-display')

  return (
    <div className={cn('relative inline-grid min-h-[92px] items-end justify-items-start', className)} {...props}>
      {visible && (
        <div ref={dropEl} className="relative grid justify-items-start">
          {banner && value >= banner.at && <MilestoneBanner key={banner.id} banner={banner} flat={flat} />}
          <div ref={punch} aria-hidden="true" className="ui-card ui-tone relative origin-[20%_100%] overflow-hidden px-3.5 pt-2.5 pb-3.5">
            <span ref={flash} className="pointer-events-none absolute inset-0 bg-accent-soft opacity-0" />
            <span className="relative flex items-end gap-2 leading-none">
              <span className={cn(letter, TIER_SIZE[Math.min(tier, 3)], 'inline-flex items-baseline transition-[font-size] duration-300 ease-snap')}>
                <span className="mr-0.5 text-[0.55em]">×</span>
                <RollingNumber value={value} from={Math.max(0, value - 1)} duration={360} stagger={30} live={false} />
              </span>
              <span className="ui-head pb-1 text-[19px] leading-none text-ink">{label}</span>
            </span>
            <span className="absolute inset-x-0 bottom-0 h-1.5 bg-canvas">
              <span ref={bar} className="absolute inset-0 origin-left bg-accent" />
            </span>
          </div>
        </div>
      )}
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {visible ? `${value} hit ${label.replace(/!+$/, '').toLowerCase()}${banner && value >= banner.at ? `, ${banner.text}` : ''}` : ''}
      </span>
    </div>
  )
}
