import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode, RefObject } from 'react'
import { delayed, prefersReducedMotion, sfx as lettering, shards, smoke, spawn, sparkle, uiStyle } from '@/fx'
import { C } from '@/fx/palette'

export type From = 'left' | 'right' | 'up' | 'down' | 'zoom'

/** Where an element waits before it slides in. Translate (and scale for zoom) only: no skew or tilt. */
const HIDDEN: Record<From, string> = {
  left: '-translate-x-16 opacity-0',
  right: 'translate-x-16 opacity-0',
  up: 'translate-y-12 opacity-0',
  down: '-translate-y-12 opacity-0',
  zoom: 'scale-90 opacity-0',
}

/** Start offsets for the impact entrance (px). */
const LAUNCH: Record<From, [number, number, number]> = {
  left: [-140, 0, 1],
  right: [140, 0, 1],
  up: [0, 90, 1],
  down: [0, -110, 1],
  zoom: [0, 0, 1.9],
}

type Props = {
  children: ReactNode
  from?: From
  /** ms */
  delay?: number
  /** Extra gate, e.g. wait for the intro to finish. */
  show?: boolean
  as?: 'div' | 'li' | 'span' | 'p' | 'header'
  /**
   * slide  — eases in with a slight overshoot (default)
   * impact — flies in fast, squashes on contact, kicks up dust and debris, then wobbles to rest
   */
  variant?: 'slide' | 'impact'
  /** Lettering on contact for the impact variant (cel/manga). */
  sfx?: string
  className?: string
  style?: CSSProperties
}

const IMPACT_MS = 620
const CONTACT = 0.42

/** Brings its content in the first time it scrolls into view. */
export function Reveal({ children, from = 'left', delay = 0, show = true, as = 'div', variant = 'slide', sfx, className = '', style }: Props) {
  const ref = useRef<HTMLElement>(null)
  const [seen, setSeen] = useState(false)
  const impact = variant === 'impact'

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const visible = show && seen

  // impact entrance: whip in, squash on contact (dust + debris + lettering), wobble out
  useLayoutEffect(() => {
    const el = ref.current
    if (!impact || !visible || !el || prefersReducedMotion()) return
    const flat = uiStyle() === 'flat'
    const [x, y, s] = LAUNCH[from]
    const k = flat ? 0.35 : 1
    const horiz = from === 'left' || from === 'right'
    // squash across the direction of travel
    const squash = horiz ? 'scale(.88, 1.1)' : from === 'zoom' ? 'scale(1.08, .9)' : 'scale(1.12, .86)'
    el.animate(
      [
        { transform: `translate(${x * k}px, ${y * k}px) scale(${1 + (s - 1) * k})`, opacity: 0 },
        { transform: `translate(${x * k * 0.15}px, ${y * k * 0.15}px) scale(${1 + (s - 1) * k * 0.2})`, opacity: 1, offset: CONTACT * 0.7 },
        { transform: flat ? 'none' : squash, opacity: 1, offset: CONTACT },
        { transform: flat ? 'none' : `translate(${-x * 0.06}px, ${-y * 0.06}px) scale(.97, 1.04)`, offset: 0.66 },
        { transform: flat ? 'none' : 'scale(1.01, .99)', offset: 0.84 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: flat ? 420 : IMPACT_MS, delay, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'backwards' },
    )
    const t = window.setTimeout(
      () => {
        const r = el.getBoundingClientRect()
        const cx = r.left + r.width / 2
        // dust at the leading edge, debris where it hit
        const ex = from === 'left' ? r.right : from === 'right' ? r.left : cx
        spawn(
          smoke(cx, r.bottom - 4, { count: 6, spread: Math.min(120, r.width * 0.6), size: 12 }),
          shards(ex, r.top + r.height / 2, { count: 8, speed: 360, size: 7 }),
          delayed(0.12, sparkle(r.right - 8, r.top + 4, { size: 13, color: C.pop })),
        )
        if (sfx) spawn(delayed(0.03, lettering(r.left + Math.min(60, r.width / 2), r.top - 10, sfx, { size: 34, color: C.accent })))
      },
      delay + (flat ? 420 : IMPACT_MS) * CONTACT,
    )
    return () => clearTimeout(t)
    // runs once, when it becomes visible
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const Tag = as as 'div'
  const cls = impact
    ? `${visible ? '' : 'opacity-0'} ${className}`
    : `transition-[translate,scale,opacity] duration-700 ease-snap ${visible ? '' : HIDDEN[from]} ${className}`
  return (
    <Tag
      ref={ref as RefObject<HTMLDivElement>}
      data-in={visible || undefined}
      style={impact ? style : { transitionDelay: visible ? `${delay}ms` : '0ms', ...style }}
      className={cls}
    >
      {children}
    </Tag>
  )
}
