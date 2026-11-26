import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { prefersReducedMotion, uiStyle } from '@/fx'
import { cn } from '@/lib/utils'

type Props = {
  /** Lines to type, in order. */
  texts: string[]
  /** Time per typed character, ms (deleting runs about twice as fast). */
  speed?: number
  /** How long a finished line holds before it is deleted, ms. */
  pause?: number
  /** Start over after the last line. Without it the last line stays. */
  loop?: boolean
  /** Block cursor in the accent colour. */
  cursor?: boolean
  className?: string
}

/** True while the element is on screen and the tab is visible. */
function useActive(ref: RefObject<HTMLElement | null>) {
  const [inView, setInView] = useState(true)
  const [shown, setShown] = useState(() => typeof document === 'undefined' || document.visibilityState === 'visible')
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting))
    io.observe(el)
    const vis = () => setShown(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', vis)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', vis)
    }
  }, [ref])
  return inView && shown
}

/** A hand on the keys: uneven gaps, a beat after punctuation. Flat types more evenly. */
function gap(speed: number, ch: string | undefined) {
  const spread = uiStyle() === 'flat' ? 0.3 : 0.8
  const base = speed * (1 - spread / 2 + Math.random() * spread)
  return ch && ',.!?;:…、。！？'.includes(ch) ? base + speed * 3 : base
}

/**
 * Types a line, holds it, deletes it and types the next, with a blinking block cursor
 * (solid while typing). Pauses off-screen and in hidden tabs. Each full line is announced
 * to screen readers once (aria-live="polite"); with reduced motion the first line is static.
 */
export function Typewriter({ texts, speed = 55, pause = 1600, loop = true, cursor = true, className }: Props) {
  const list = texts.length ? texts : ['']
  const count = list.length
  const [st, setSt] = useState({ i: 0, n: 0, del: false })
  const [said, setSaid] = useState(list[0])
  const announced = useRef(new Set<number>([0]))
  const root = useRef<HTMLSpanElement>(null)
  const active = useActive(root)
  const still = prefersReducedMotion()

  const i = st.i % count
  const chars = [...list[i]]
  const full = st.n >= chars.length
  const done = !loop && i === count - 1 && full && !st.del

  useEffect(() => {
    if (!active || still || done) return
    const line = [...list[i]]
    let wait: number
    let next: () => void
    if (!st.del) {
      if (st.n < line.length) {
        wait = gap(speed, line[st.n - 1])
        next = () => {
          setSt((p) => ({ ...p, n: p.n + 1 }))
          if (st.n + 1 >= line.length && !announced.current.has(i)) {
            announced.current.add(i)
            setSaid(list[i])
          }
        }
      } else {
        wait = pause
        next = () => setSt((p) => ({ ...p, del: true }))
      }
    } else if (st.n > 0) {
      wait = speed * 0.45
      next = () => setSt((p) => ({ ...p, n: p.n - 1 }))
    } else {
      wait = 320
      next = () => setSt((p) => ({ i: (p.i + 1) % count, n: 0, del: false }))
    }
    const t = window.setTimeout(next, wait)
    return () => clearTimeout(t)
    // `list` is a fresh array each render; the text of the current line is what matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, still, done, st, speed, pause, count, list[i]])

  const shown = still ? list[0] : chars.slice(0, st.n).join('')
  const holding = still || done || (full && !st.del)

  return (
    <span ref={root} className={cn('relative', className)}>
      <span aria-hidden="true" className="whitespace-pre-wrap">
        {shown || (cursor ? '' : '\u200b')}
        {cursor && (
          <span
            className={cn(
              'ml-[0.06em] inline-block h-[0.95em] w-[0.5em] rounded-[0.08em] bg-accent align-[-0.14em]',
              holding && 'animate-blink',
            )}
          />
        )}
      </span>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {still ? list[0] : said}
      </span>
    </span>
  )
}
