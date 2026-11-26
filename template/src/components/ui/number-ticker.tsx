import { useLayoutEffect, useRef, useState } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'
import { burst, centerOf, delayed, pop as dotPop, prefersReducedMotion, rand, rays, sfx, shards, smoke, sparkle, spawn, uiStyle, useSprings } from '@/fx'
import { C } from '@/fx/palette'
import { RollingNumber } from './rolling-number'
import { useLatest } from './hud-fx'
import { cn } from '@/lib/utils'

export type NumberTickerProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'prefix'> & {
  /** The number to land on. */
  value: number
  /** Value it rolls up from when it mounts (and when it opens again). */
  from?: number
  /** Roughly how long a roll takes to settle, in ms. */
  duration?: number
  /** Digits after the decimal point. */
  decimals?: number
  /** Thousands separator. `false` = no grouping. */
  separator?: string | false
  /** Decimal mark. */
  decimalMark?: string
  prefix?: ReactNode
  suffix?: ReactNode
  /** Squash-pop and colour flash when the roll lands. */
  pop?: boolean
  /** A small style-aware burst + sparkle when the roll lands. */
  burstOnChange?: boolean
  /** Announce the final value to screen readers (aria-live="polite"). */
  live?: boolean
  /** Class for the digits (size, colour, font). */
  digitClassName?: string
  /**
   * Show / hide. Opening scales and un-blurs it in while the digits roll up from `from`;
   * closing spins the digits down to 0 with blur, then it goes in a soft puff.
   */
  open?: boolean
  /** Fired after the close puff. */
  onClosed?: () => void
  /**
   * A bigger burst with focus lines when a roll lands past a milestone: a number = every
   * multiple of it (1000 → 1k, 2k…), a list = those exact values.
   */
  celebrate?: number | number[]
  /** Lettering for `celebrate` (cel / manga). `false` = none. */
  celebrateText?: string | false
}

function crossed(celebrate: NumberTickerProps['celebrate'], a: number, b: number) {
  if (celebrate === undefined || b <= a) return false
  if (typeof celebrate === 'number') return celebrate > 0 && Math.floor(b / celebrate) > Math.floor(a / celebrate)
  return celebrate.some((m) => a < m && b >= m)
}

/**
 * A score / gold counter built on `RollingNumber`: each digit rolls in its own clipped column
 * (spinning the low ones on big jumps), and the number squashes and flashes the accent when
 * it lands. It opens with a scale-and-blur in, resets with a fast blurred spin down and a
 * puff, and can celebrate milestones.
 */
export function NumberTicker({
  value,
  from = 0,
  duration = 900,
  decimals = 0,
  separator = ',',
  decimalMark = '.',
  prefix,
  suffix,
  pop = true,
  burstOnChange = false,
  live = true,
  open = true,
  onClosed,
  celebrate,
  celebrateText = false,
  className,
  digitClassName,
  ...props
}: NumberTickerProps) {
  const root = useRef<HTMLSpanElement>(null)
  const body = useRef<HTMLSpanElement>(null)
  const landed = useRef(from)
  // the first landing after opening only pops (no celebration for rolling in)
  const opening = useRef(true)
  const openRef = useLatest(open)
  const [closed, setClosed] = useState(!open)
  // every opening remounts the digits so they roll up from `from` again
  const [opens, setOpens] = useState({ open, n: 0 })
  if (opens.open !== open) setOpens({ open, n: opens.n + (open ? 1 : 0) })
  if (open && closed) setClosed(false)

  // what the digits show: 0 while closing / closed
  const shown = open ? value : 0
  // a reset (or a close) spins down fast; everything else uses the normal roll
  const [prevShown, setPrevShown] = useState(shown)
  const [fastDown, setFastDown] = useState(false)
  if (prevShown !== shown) {
    setPrevShown(shown)
    setFastDown(shown === 0 && prevShown !== 0)
  }

  const spring = useSprings(
    body,
    { s: 0 },
    (v, el) => {
      el.style.transform = `scale(${1 + v.s * 0.06}, ${1 - v.s * 0.08})`
    },
    { stiffness: 560, damping: 12 },
  )

  // open: scale + blur in (digits roll up from `from` on their own)
  useLayoutEffect(() => {
    const el = root.current
    if (!el || !open) return
    landed.current = from
    opening.current = value !== from
    el.getAnimations().forEach((a) => a.cancel())
    el.style.opacity = ''
    if (prefersReducedMotion()) return
    const calm = uiStyle() === 'flat'
    el.animate(
      [
        { scale: calm ? '.8' : '.55', filter: 'blur(8px)', opacity: 0 },
        { scale: calm ? '1.03' : '1.1', filter: 'blur(0)', opacity: 1, offset: 0.6 },
        { scale: '1', filter: 'blur(0)', opacity: 1 },
      ],
      { duration: 460, easing: 'cubic-bezier(.2,1.2,.4,1)' },
    )
    // re-run only when it opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const puff = (el: HTMLElement, soft: boolean) => {
    const { x, y, rect } = centerOf(el)
    if (uiStyle() === 'flat') spawn(dotPop(x, y, Math.max(26, rect.height)))
    else
      spawn(
        smoke(x, y + rect.height * 0.15, { count: soft ? 4 : 6, spread: Math.max(24, rect.width * 0.4), size: Math.max(8, rect.height * 0.28) }),
        delayed(0.08, sparkle(rect.right - 2, rect.top + 2, { size: 10 })),
      )
  }

  const settle = (v: number) => {
    const el = root.current
    const prev = landed.current
    landed.current = v
    if (!el) return
    const still = prefersReducedMotion()
    if (!open) {
      // close: the digits are down at 0, now it goes in a puff
      if (still) {
        el.style.opacity = '0'
        setClosed(true)
        onClosed?.()
        return
      }
      puff(el, false)
      el.animate([{ scale: '1', filter: 'blur(0)', opacity: 1 }, { scale: '1.15', filter: 'blur(0)', opacity: 1, offset: 0.25 }, { scale: '.4', filter: 'blur(6px)', opacity: 0 }], {
        duration: 320,
        easing: 'cubic-bezier(.5,0,.8,.4)',
      }).finished.then(
        () => {
          if (openRef.current) return
          el.style.opacity = '0'
          setClosed(true)
          onClosed?.()
        },
        () => {},
      )
      return
    }
    if (still) return
    if (v === 0 && prev !== 0) {
      // reset: a soft puff instead of the landing pop
      puff(el, true)
      spring.kick({ s: -6 })
      return
    }
    if (pop) {
      spring.kick({ s: 9 })
      body.current?.animate([{ color: 'var(--color-accent)', offset: 0 }], { duration: 520, easing: 'ease-out' })
    }
    const first = opening.current
    opening.current = false
    if (first) return
    const { x, y, rect } = centerOf(el)
    if (crossed(celebrate, prev, v)) {
      const r = Math.max(rect.height, 30)
      spawn(
        rays(x, y, { inner: r * 0.7, outer: r * 3, count: 20 }),
        burst(x, y, { radius: r * 0.9, spikes: 14, color: C.pop }),
        shards(x, y, { count: 10, speed: 420, size: 8 }),
        delayed(0.08, sparkle(rect.right + rand(0, 8), rect.top - rand(0, 8), { size: 16, color: C.pop })),
        delayed(0.16, sparkle(rect.left - rand(0, 8), rect.bottom - 4, { size: 12 })),
      )
      if (celebrateText) spawn(delayed(0.05, sfx(x, rect.top - 18, celebrateText, { size: 36, color: C.pop })))
    } else if (burstOnChange) {
      spawn(
        burst(x, y, { radius: Math.min(36, rect.height), spikes: 10 }),
        delayed(0.06, sparkle(rect.right + rand(-4, 6), rect.top + rand(-6, 4), { size: 12, color: C.pop })),
      )
    }
  }

  return (
    <span ref={root} aria-hidden={closed || undefined} data-closed={closed || undefined} className={cn('relative inline-flex items-baseline whitespace-nowrap data-closed:opacity-0', className)} {...props}>
      <span ref={body} className="inline-flex origin-[50%_80%] items-baseline">
        <RollingNumber
          key={opens.n}
          value={shown}
          from={from}
          decimals={decimals}
          separator={separator}
          decimalMark={decimalMark}
          prefix={prefix}
          suffix={suffix}
          duration={fastDown ? 380 : duration}
          stagger={fastDown ? 18 : 38}
          spins={fastDown ? 1 : undefined}
          live={live && open}
          digitClassName={digitClassName}
          onSettle={settle}
        />
      </span>
    </span>
  )
}
