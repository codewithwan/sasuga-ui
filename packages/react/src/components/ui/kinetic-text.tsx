import { useEffect, useRef } from 'react'
import type { CSSProperties, RefObject } from 'react'
import { impactOn, prefersReducedMotion, uiStyle } from '@/fx'
import { cn } from '@/lib/utils'

type Props = {
  text: string
  /** Accessible text if it differs from what is shown. */
  label?: string
  /** Picks the word that gets the accent highlight (`seed % words`). Omit for no highlight. */
  seed?: number
  /** Hold the entrance (e.g. until an intro ends). */
  paused?: boolean
  /** Hit when the last glyph lands: focus lines, burst, debris and the whole line squashes. A string adds lettering. */
  impact?: boolean | string
  /** Glyphs ripple in a wave when the pointer enters. */
  wave?: boolean
  className?: string
  as?: 'span' | 'h1' | 'h2' | 'p'
}

const STEP_MS = 45
const START_MS = 120
/** How far into the rise animation a glyph visually "lands". */
const LAND_MS = 300

/**
 * Kinetic title lettering: one heading face, glyphs rise and pop in one after
 * another with a slight overshoot (animate-rise on --ease-snap). One word can
 * carry an accent highlight. With `impact` the line lands with a hit; with `wave`
 * it ripples on hover. Screen readers get the plain text once.
 */
export function KineticText({ text, label, seed, paused = false, impact, wave, className, as = 'span' }: Props) {
  // one element type for typing; the rendered tag is still `as`
  const Tag = as as 'span'
  const root = useRef<HTMLSpanElement>(null)
  const waving = useRef(0)
  const hitTimer = useRef(0)
  const words = text.split(' ').filter(Boolean)
  const accent = seed === undefined || words.length < 2 ? -1 : Math.abs(Math.trunc(seed)) % words.length
  const play: CSSProperties = { animationPlayState: paused ? 'paused' : 'running' }
  const total = words.reduce((a, w) => a + [...w].length, 0)
  let n = 0

  useEffect(() => () => clearTimeout(hitTimer.current), [])

  /** The last glyph started rising: hit the line when it lands. */
  const onLastStart = () => {
    if (!impact || prefersReducedMotion()) return
    clearTimeout(hitTimer.current)
    hitTimer.current = window.setTimeout(() => {
      const el = root.current
      if (!el) return
      const size = Math.min(1.6, Math.max(0.6, parseFloat(getComputedStyle(el).fontSize) / 56))
      impactOn(el, { text: typeof impact === 'string' ? impact : false, size })
      if (uiStyle() === 'flat') return
      el.animate(
        [{ transform: 'none' }, { transform: 'scale(1.06, .9)', offset: 0.25 }, { transform: 'scale(.98, 1.04)', offset: 0.6 }, { transform: 'none' }],
        { duration: 380, easing: 'cubic-bezier(.2,1.4,.4,1)' },
      )
    }, LAND_MS)
  }

  const ripple = () => {
    const el = root.current
    if (!wave || !el || prefersReducedMotion() || performance.now() < waving.current) return
    const k = uiStyle() === 'flat' ? 0.5 : 1
    const glyphs = el.querySelectorAll<HTMLElement>('[data-glyph]')
    glyphs.forEach((g, i) =>
      g.animate(
        [
          { translate: '0 0', scale: '1' },
          { translate: `0 ${-0.3 * k}em`, scale: `${1 - 0.08 * k} ${1 + 0.14 * k}`, offset: 0.35 },
          { translate: `0 ${0.04 * k}em`, scale: `${1 + 0.12 * k} ${1 - 0.12 * k}`, offset: 0.65 },
          { translate: '0 0', scale: '1' },
        ],
        { duration: 520, delay: i * 38, easing: 'ease-in-out' },
      ),
    )
    waving.current = performance.now() + 520 + glyphs.length * 38
  }

  return (
    <Tag
      ref={root as RefObject<HTMLSpanElement>}
      onPointerEnter={wave ? ripple : undefined}
      className={cn('ui-head inline-flex flex-wrap gap-x-[0.28em] gap-y-[0.05em] leading-[0.95]', className)}
    >
      <span className="sr-only">{label ?? text}</span>
      {words.map((word, w) => {
        const glyphs = [...word].map((ch) => {
          const i = n++
          return (
            <span
              key={i}
              data-glyph=""
              onAnimationStart={i === total - 1 ? onLastStart : undefined}
              style={{ ...play, animationDelay: `${START_MS + i * STEP_MS}ms` }}
              className="inline-block animate-rise transition-[translate] duration-200 ease-snap hover:-translate-y-[0.08em]"
            >
              {ch}
            </span>
          )
        })
        const hot = w === accent
        return (
          <span key={w} aria-hidden="true" className={cn('relative isolate inline-flex whitespace-nowrap', hot && 'text-accent')}>
            {glyphs}
          </span>
        )
      })}
    </Tag>
  )
}
