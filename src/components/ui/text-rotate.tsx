import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { prefersReducedMotion, uiStyle } from '@/fx'
import { cn } from '@/lib/utils'

type Props = {
  /** Words to cycle through, in order. The first one shows on mount. */
  words: string[]
  /** Time each word stays, in ms. */
  interval?: number
  className?: string
}

/** Delay between letters, ms. */
const STEP = 32
const IN_MS = 540
const OUT_MS = 300

const lettersOf = (w: string) => [...w].map((c) => (c === ' ' ? '\u00a0' : c))

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

/**
 * Cycles words in place. The old word's letters roll up and out one by one, the new
 * word's letters roll in from below on the style's overshoot curve, and the slot's width
 * eases between the two words. Pauses off-screen and in hidden tabs; static with reduced motion.
 * Screen readers get the full list once.
 */
export function TextRotate({ words, interval = 2200, className }: Props) {
  const list = words.length ? words : ['']
  const [s, setS] = useState({ i: 0, prev: -1, gen: 0 })
  const i = s.i % list.length
  const prev = s.prev >= 0 ? list[s.prev % list.length] : null

  const host = useRef<HTMLSpanElement>(null)
  const slot = useRef<HTMLSpanElement>(null)
  const cur = useRef<HTMLSpanElement>(null)
  const old = useRef<HTMLSpanElement>(null)
  /** Slot width at rest, px: where the next width tween starts. */
  const rest = useRef(0)
  const widthAnim = useRef<Animation | null>(null)
  const active = useActive(host)
  const count = list.length

  // next word
  useEffect(() => {
    if (!active || count < 2 || prefersReducedMotion()) return
    const t = window.setTimeout(
      () => setS((p) => ({ i: (p.i + 1) % count, prev: p.i % count, gen: p.gen + 1 })),
      Math.max(600, interval),
    )
    return () => clearTimeout(t)
  }, [active, s.gen, interval, count])

  // keep the resting width fresh (fonts loading, resizes)
  useEffect(() => {
    const el = slot.current
    if (!el) return
    rest.current = el.getBoundingClientRect().width
    const ro = new ResizeObserver(() => {
      if (!widthAnim.current) rest.current = el.getBoundingClientRect().width
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useLayoutEffect(() => {
    const el = slot.current
    const now = cur.current
    if (!el || !now || s.gen === 0) return
    const flat = uiStyle() === 'flat'

    // width: from wherever it is (mid-tween or at rest) to the new word's width
    const from = widthAnim.current ? el.getBoundingClientRect().width : rest.current
    widthAnim.current?.cancel()
    widthAnim.current = null
    const to = el.getBoundingClientRect().width
    rest.current = to
    if (from > 0 && Math.abs(from - to) > 0.5) {
      const a = el.animate([{ width: `${from}px` }, { width: `${to}px` }], {
        duration: flat ? 380 : 440,
        easing: 'cubic-bezier(.45,0,.2,1)',
      })
      widthAnim.current = a
      const clear = () => {
        if (widthAnim.current === a) widthAnim.current = null
      }
      a.onfinish = clear
      a.oncancel = clear
    }

    // rise past the line a little, then settle (manga a bit more, flat barely)
    const over = flat ? 4 : uiStyle() === 'manga' ? 13 : 10
    now.querySelectorAll<HTMLElement>('[data-l]').forEach((g, n) =>
      g.animate(
        [
          { transform: 'translateY(105%)', opacity: 0, easing: 'cubic-bezier(.2,.7,.35,1)' },
          { transform: `translateY(-${over}%)`, opacity: 1, offset: 0.55, easing: 'cubic-bezier(.4,0,.3,1)' },
          { transform: 'none', opacity: 1 },
        ],
        { duration: flat ? IN_MS - 80 : IN_MS, delay: 70 + n * STEP, fill: 'backwards' },
      ),
    )

    const outs = [...(old.current?.querySelectorAll<HTMLElement>('[data-l]') ?? [])].map((g, n) =>
      g.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-105%)', opacity: 0 }], {
        duration: OUT_MS,
        delay: n * STEP * 0.8,
        easing: flat ? 'cubic-bezier(.4,0,.6,1)' : 'cubic-bezier(.55,0,.75,.2)',
        fill: 'forwards',
      }),
    )
    const gen = s.gen
    Promise.all(outs.map((a) => a.finished)).then(
      () => setS((p) => (p.gen === gen ? { ...p, prev: -1 } : p)),
      () => {},
    )
  }, [s.gen])

  return (
    <span ref={host} className={cn('relative inline-block whitespace-nowrap', className)}>
      <span className="sr-only">{list.join(', ')}</span>
      {/* the slot clips the rolling letters; padding keeps drops and accents uncut */}
      <span
        ref={slot}
        aria-hidden="true"
        className="relative inline-block overflow-clip whitespace-nowrap -mx-[0.08em] -my-[0.2em] px-[0.08em] py-[0.2em] align-bottom"
      >
        <span ref={cur} key={s.gen} className="inline-block">
          {lettersOf(list[i]).map((c, n) => (
            <span key={n} data-l="" className="inline-block will-change-transform">
              {c}
            </span>
          ))}
        </span>
        {prev !== null && (
          <span ref={old} key={`o${s.gen}`} className="absolute top-[0.2em] left-[0.08em] inline-block">
            {lettersOf(prev).map((c, n) => (
              <span key={n} data-l="" className="inline-block will-change-transform">
                {c}
              </span>
            ))}
          </span>
        )}
      </span>
    </span>
  )
}
