import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { prefersReducedMotion, uiStyle } from '@/fx'
import { cn } from '@/lib/utils'

type Props = {
  text: string
  /** mount — on mount and on every text change · hover — on pointer enter / keyboard focus · view — once, when scrolled into view */
  trigger?: 'mount' | 'hover' | 'view'
  /** Time until the last glyph resolves, ms. */
  duration?: number
  className?: string
}

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789アカサタナハマヤラワンキシテ'
const pick = () => GLYPHS[(Math.random() * GLYPHS.length) | 0]
/** Controls whose hover / focus should trigger it (not page landmarks with tabindex="-1"). */
const INTERACTIVE = 'a[href],button,summary,label,[role="button"],[role="link"],[role="menuitem"],[role="tab"],[tabindex]:not([tabindex^="-"])'

/**
 * Letters cycle through random glyphs (A–Z, 0–9, a few katakana) and resolve left to
 * right, each landing with a small pop. Every character keeps its real glyph in place
 * (just hidden) and the noise is drawn on top, so the line never changes width.
 * Static with reduced motion; screen readers get the plain text.
 */
export function TextScramble({ text, trigger = 'mount', duration = 700, className }: Props) {
  const root = useRef<HTMLSpanElement>(null)
  const raf = useRef(0)
  const stop = useRef<() => void>(() => {})

  const run = useCallback(() => {
    const el = root.current
    if (!el || raf.current || prefersReducedMotion()) return
    const cells = [...el.querySelectorAll<HTMLElement>('[data-c]')].map((c) => ({
      real: c.firstElementChild as HTMLElement,
      noise: c.lastElementChild as HTMLElement,
      on: true,
    }))
    if (!cells.length) return
    const flat = uiStyle() === 'flat'
    const tick = flat ? 75 : 48
    const n = cells.length
    const start = performance.now()
    const total = Math.max(150, duration)
    // left → right: the first glyph settles after a quarter, the last at `duration`
    const ends = cells.map((_, i) => start + total * (0.25 + 0.75 * (n === 1 ? 1 : i / (n - 1))) + (Math.random() - 0.5) * 40)
    for (const c of cells) {
      c.real.style.opacity = '0'
      c.noise.textContent = pick()
    }
    let lastSwap = start
    const land = (c: (typeof cells)[number]) => {
      c.on = false
      c.noise.textContent = ''
      c.real.style.opacity = ''
      c.real.animate(
        flat
          ? [{ opacity: 0.2 }, { opacity: 1 }]
          : [
              { transform: 'translateY(-0.14em) scale(1.18)', opacity: 0.4 },
              { transform: 'none', opacity: 1 },
            ],
        { duration: flat ? 180 : 240, easing: 'cubic-bezier(.2,1.3,.4,1)' },
      )
    }
    const frame = (t: number) => {
      const swap = t - lastSwap >= tick
      if (swap) lastSwap = t
      let left = 0
      cells.forEach((c, i) => {
        if (!c.on) return
        if (t >= ends[i]) return land(c)
        left++
        if (swap) c.noise.textContent = pick()
      })
      raf.current = left ? requestAnimationFrame(frame) : 0
    }
    stop.current = () => {
      cancelAnimationFrame(raf.current)
      raf.current = 0
      for (const c of cells) {
        c.noise.textContent = ''
        c.real.style.opacity = ''
      }
    }
    raf.current = requestAnimationFrame(frame)
  }, [duration])

  // a new text (or unmount) drops any run in flight
  useLayoutEffect(() => () => stop.current(), [text])

  // mount: start before the first paint so the real text never flashes
  useLayoutEffect(() => {
    if (trigger === 'mount') run()
  }, [trigger, text, run])

  useEffect(() => {
    const el = root.current
    if (!el || trigger !== 'view') return
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        run()
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [trigger, run])

  // hover: on the closest interactive parent if there is one (a link, a button), else itself
  useEffect(() => {
    const el = root.current
    if (!el || trigger !== 'hover') return
    const target = el.parentElement?.closest<HTMLElement>(INTERACTIVE) ?? el
    const onFocus = (e: FocusEvent) => {
      if (e.target instanceof Element && e.target.matches(':focus-visible')) run()
    }
    target.addEventListener('pointerenter', run)
    target.addEventListener('focusin', onFocus)
    return () => {
      target.removeEventListener('pointerenter', run)
      target.removeEventListener('focusin', onFocus)
    }
  }, [trigger, run])

  const words = text.split(' ')

  return (
    <span ref={root} className={cn('relative inline', className)}>
      <span className="sr-only">{text}</span>
      <span key={text} aria-hidden="true">
        {words.map((w, wi) => (
          <span key={wi}>
            {wi > 0 && ' '}
            <span className="inline-block whitespace-nowrap">
              {[...w].map((ch, ci) => (
                <span key={ci} data-c="" className="relative inline-block">
                  <span className="inline-block">{ch}</span>
                  <span className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 whitespace-nowrap text-accent sm:blur-[0.3px]" />
                </span>
              ))}
            </span>
          </span>
        ))}
      </span>
    </span>
  )
}
