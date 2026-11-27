import { Fragment, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { clamp, prefersReducedMotion } from '@/fx'
import { cn } from '@/lib/utils'

type Props = {
  /** The paragraph. Wrap words in `*stars*` to turn them accent when they light up. */
  text: string
  as?: 'p' | 'h2' | 'h3' | 'div'
  /** Where the paragraph's top starts lighting, as a fraction of the viewport height from the top. */
  from?: number
  /** Where the paragraph's bottom is fully lit, as a fraction of the viewport height. */
  to?: number
  /** Light up word by word (default) or a whole line at a time. */
  mode?: 'word' | 'line'
  /** A scrolling element to measure against instead of the window (a scroll box, a panel). */
  scroller?: RefObject<HTMLElement | null>
  className?: string
}

/** A word, whether it is accent, and whether a space comes before it ("*hit*." has none before the dot). */
type Token = { w: string; accent: boolean; gap: boolean }

/** Words, with `*marked*` runs flagged as accent. */
function tokenize(text: string): Token[] {
  const out: Token[] = []
  let gap = false
  for (const part of text.split(/(\*[^*]+\*)/)) {
    const accent = part.length > 2 && part.startsWith('*') && part.endsWith('*')
    for (const bit of (accent ? part.slice(1, -1) : part).split(/(\s+)/)) {
      if (!bit) continue
      if (/^\s+$/.test(bit)) gap = true
      else {
        out.push({ w: bit, accent, gap: gap && out.length > 0 })
        gap = false
      }
    }
  }
  return out
}

/** Opacity of a word that has not been reached yet. */
const DIM = 0.3
/** How many words (or lines) the lit edge is soft over. */
const SOFT = { word: 1.6, line: 0.8 }

/**
 * Apple-style scroll-scrubbed text: as the paragraph travels up through the viewport its
 * words go from dim to full ink one after another (or a line at a time), and back again
 * when you scroll up. `*Marked*` words turn accent when they are reached. It only listens
 * while on screen (IntersectionObserver, one rAF per scroll frame) and never takes over
 * the scroll. With reduced motion the text is simply shown in full.
 */
export function ScrollCaption({ text, as = 'p', from = 0.85, to = 0.45, mode = 'word', scroller, className }: Props) {
  const Tag = as as 'p'
  const root = useRef<HTMLParagraphElement>(null)
  const tokens = useMemo(() => tokenize(text), [text])
  /** Line index per word (line mode). */
  const lines = useRef<number[]>([])
  /** Last lit amount per word, so a frame only touches the words that changed. */
  const lit = useRef<number[]>([])
  const update = useRef<() => void>(() => {})

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const words = [...el.querySelectorAll<HTMLElement>('[data-w]')]
    lit.current = words.map(() => -1)

    const measure = () => {
      let line = -1
      let top = -Infinity
      lines.current = words.map((w) => {
        if (w.offsetTop > top + 2) {
          line++
          top = w.offsetTop
        }
        return line
      })
    }

    const paint = (i: number, a: number) => {
      const w = words[i]
      if (lit.current[i] === a) return
      lit.current[i] = a
      if (a >= 1) {
        w.style.opacity = ''
        w.style.color = ''
        return
      }
      const target = w.dataset.accent !== undefined ? 'var(--color-accent)' : 'currentColor'
      w.style.opacity = String(DIM + (1 - DIM) * a)
      w.style.color = a <= 0 ? 'var(--color-mute)' : `color-mix(in srgb, ${target} ${Math.round(a * 100)}%, var(--color-mute))`
    }

    update.current = () => {
      if (prefersReducedMotion()) {
        words.forEach((_, i) => paint(i, 1))
        return
      }
      const r = el.getBoundingClientRect()
      const box = scroller?.current?.getBoundingClientRect()
      const vTop = box ? box.top : 0
      const vh = box ? box.height : window.innerHeight
      const start = vTop + from * vh
      const span = start - (vTop + to * vh) + r.height
      const p = span > 0 ? clamp((start - r.top) / span, 0, 1) : r.top < start ? 1 : 0
      const line = mode === 'line'
      const count = line ? (lines.current.at(-1) ?? 0) + 1 : words.length
      const soft = SOFT[mode]
      const head = p * (count + soft)
      words.forEach((_, i) => paint(i, clamp((head - (line ? (lines.current[i] ?? 0) : i)) / soft, 0, 1)))
    }

    measure()
    update.current()
    const ro = new ResizeObserver(() => {
      measure()
      update.current()
    })
    ro.observe(el)
    document.fonts?.ready.then(() => {
      measure()
      update.current()
    })
    return () => ro.disconnect()
  }, [tokens, from, to, mode, scroller])

  // listen to scroll only while the paragraph is near the viewport
  useEffect(() => {
    const el = root.current
    if (!el) return
    let raf = 0
    let on = false
    const frame = () => {
      raf = 0
      update.current()
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(frame)
    }
    const listen = (yes: boolean) => {
      if (yes === on) return
      on = yes
      // capture: also hears scrolling inside boxes, which does not bubble
      if (yes) {
        window.addEventListener('scroll', schedule, { passive: true, capture: true })
        window.addEventListener('resize', schedule, { passive: true })
      } else {
        window.removeEventListener('scroll', schedule, { capture: true })
        window.removeEventListener('resize', schedule)
      }
    }
    const io = new IntersectionObserver(
      ([e]) => {
        listen(e.isIntersecting)
        // settle on the final state when it leaves mid-scroll
        schedule()
      },
      { root: scroller?.current ?? null, rootMargin: '25% 0px 25% 0px' },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      listen(false)
      cancelAnimationFrame(raf)
    }
  }, [scroller])

  return (
    <Tag
      ref={root}
      className={cn('ui-head m-0 text-[clamp(22px,0.9rem+2.6vw,46px)] leading-[1.2] text-pretty text-ink', className)}
    >
      {tokens.map((t, i) => (
        <Fragment key={i}>
          {t.gap && ' '}
          <span data-w="" data-accent={t.accent ? '' : undefined} className={t.accent ? 'text-accent' : undefined}>
            {t.w}
          </span>
        </Fragment>
      ))}
    </Tag>
  )
}
