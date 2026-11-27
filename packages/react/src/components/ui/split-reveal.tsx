import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'
import { prefersReducedMotion, uiStyle } from '@/fx'

type Props = {
  text: string
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span'
  /** Split into words (default) or single characters. */
  by?: 'word' | 'char'
  /** Delay between pieces, ms. Default 70 for words, 24 for chars. */
  stagger?: number
  className?: string
}

const HIDDEN: CSSProperties = { opacity: 0, transform: 'translateY(110%)' }

const snapEase = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--ease-snap').trim() || 'cubic-bezier(.2,1.4,.4,1)'

/**
 * Text that rises into place the first time it scrolls into view: each word (or char)
 * comes up out of its own clipped line on the style's overshoot curve, one after another.
 * Translate and opacity only. The real text stays in the element for SEO and screen readers.
 */
export function SplitReveal({ text, as = 'span', by = 'word', stagger, className }: Props) {
  const Tag = as as 'span'
  const root = useRef<HTMLSpanElement>(null)
  // reduced motion: shown from the start, never hidden
  const [seen, setSeen] = useState(prefersReducedMotion)
  const animate = useRef(false)

  useEffect(() => {
    const el = root.current
    if (!el || seen) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        animate.current = true
        setSeen(true)
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [seen])

  useLayoutEffect(() => {
    const el = root.current
    if (!seen || !animate.current || !el) return
    animate.current = false
    const flat = uiStyle() === 'flat'
    const step = stagger ?? (by === 'char' ? 24 : 70)
    const ease = snapEase()
    el.querySelectorAll<HTMLElement>('[data-p]').forEach((p, i) =>
      p.animate([HIDDEN as Keyframe, { opacity: 1, transform: 'none' }], {
        duration: flat ? 560 : 680,
        delay: i * step,
        easing: ease,
        fill: 'backwards',
      }),
    )
  }, [seen, by, stagger])

  const heading = as === 'h1' || as === 'h2' || as === 'h3'
  const piece = seen ? undefined : HIDDEN
  const words = text.split(' ').filter(Boolean)

  return (
    <Tag ref={root as RefObject<HTMLSpanElement>} aria-label={heading ? text : undefined} className={className}>
      {!heading && <span className="sr-only">{text}</span>}
      {words.map((w, wi) => (
        <Fragment key={wi}>
          {wi > 0 && ' '}
          {/* one clipped line per word; padding keeps accents and heading drops uncut */}
          <span aria-hidden="true" className="inline-block overflow-clip whitespace-nowrap -mx-[0.06em] -my-[0.18em] px-[0.06em] py-[0.18em] align-bottom">
            {by === 'word' ? (
              <span data-p="" style={piece} className="inline-block">
                {w}
              </span>
            ) : (
              [...w].map((c, ci) => (
                <span key={ci} data-p="" style={piece} className="inline-block">
                  {c}
                </span>
              ))
            )}
          </span>
        </Fragment>
      ))}
    </Tag>
  )
}
