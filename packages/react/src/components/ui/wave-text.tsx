import { useEffect, useRef } from 'react'
import { prefersReducedMotion, uiStyle } from '@/fx'
import { cn } from '@/lib/utils'

type Props = {
  text: string
  className?: string
}

const STEP = 38
const WAVE_MS = 520
/** Controls whose hover / focus should trigger it (not page landmarks with tabindex="-1"). */
const INTERACTIVE = 'a[href],button,summary,label,[role="button"],[role="link"],[role="menuitem"],[role="tab"],[tabindex]:not([tabindex^="-"])'

/**
 * Glyphs ripple in a wave (translateY) when the pointer enters or keyboard focus arrives,
 * once per hover. Inside a link or button it listens to that control, so the whole hit
 * area triggers it. Flat ripples lower; reduced motion keeps it still.
 */
export function WaveText({ text, className }: Props) {
  const root = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return
    const target = el.parentElement?.closest<HTMLElement>(INTERACTIVE) ?? el
    let busyUntil = 0
    const ripple = () => {
      if (prefersReducedMotion() || performance.now() < busyUntil) return
      const flat = uiStyle() === 'flat'
      const a = flat ? 0.14 : 0.3
      const glyphs = el.querySelectorAll<HTMLElement>('[data-g]')
      glyphs.forEach((g, i) =>
        g.animate(
          [
            { transform: 'none' },
            { transform: `translateY(${-a}em)`, offset: 0.38 },
            { transform: `translateY(${a * 0.18}em)`, offset: 0.7 },
            { transform: 'none' },
          ],
          { duration: flat ? WAVE_MS - 60 : WAVE_MS, delay: i * STEP, easing: 'ease-in-out' },
        ),
      )
      busyUntil = performance.now() + WAVE_MS + glyphs.length * STEP
    }
    const onFocus = (e: FocusEvent) => {
      if (e.target instanceof Element && e.target.matches(':focus-visible')) ripple()
    }
    target.addEventListener('pointerenter', ripple)
    target.addEventListener('focusin', onFocus)
    return () => {
      target.removeEventListener('pointerenter', ripple)
      target.removeEventListener('focusin', onFocus)
    }
  }, [])

  const words = text.split(' ')

  return (
    <span ref={root} className={cn('relative inline', className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((w, wi) => (
          <span key={wi}>
            {wi > 0 && ' '}
            <span className="inline-block whitespace-nowrap">
              {[...w].map((ch, ci) => (
                <span key={ci} data-g="" className="inline-block">
                  {ch}
                </span>
              ))}
            </span>
          </span>
        ))}
      </span>
    </span>
  )
}
