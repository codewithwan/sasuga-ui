import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { clamp, easeOutBack, easeOutCubic, prefersReducedMotion, uiStyle } from '@/fx'
import { cn } from '@/lib/utils'

export type LowerThirdVariant = 'accent' | 'paper' | 'ink'

type Props = {
  /** The name on the strip. Words rise in one after another. */
  title: string
  /** Second line (role, handle, location). It types in after the title. */
  subtitle?: string
  /** Small badge before the title, e.g. "LIVE". */
  tag?: ReactNode
  /** Which side it sweeps in from (and which edge carries the stripe). */
  align?: 'left' | 'right'
  /** Controlled: true sweeps it in, false sweeps it out. Default true (in on mount). */
  show?: boolean
  /** Auto-out: ms it stays on screen, counted from the start of the entrance. */
  duration?: number
  /** Drive it from a clock (a Timeline, a video's currentTime), in seconds. Overrides show / duration. */
  time?: number
  /** With `time`: the [in, out] seconds. Out is optional (stays). Default [0]. */
  at?: [number, number?]
  variant?: LowerThirdVariant
  className?: string
}

/* Timings in seconds. Entrance: the sweep grows from the start edge, then retracts to
   the far edge revealing the card; the card settles, title words rise, subtitle types,
   tag pops. Exit: the sweep comes back from the far edge and leaves the other way. */
const SWEEP = 0.3
const SWEEP_OFF = 0.32
const WORDS_AT = 0.4
const WORD_STEP = 0.07
const WORD_MS = 0.5
const TAG_AT = 0.55
const OUT_COVER = 0.24
const OUT_END = 0.5

const seg = (t: number, start: number, dur: number) => clamp((t - start) / dur, 0, 1)
const inOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)

const CARD: Record<LowerThirdVariant, string> = {
  accent: 'ui-fill bg-accent text-white',
  paper: 'bg-paper text-ink',
  ink: 'ui-fill bg-ink text-paper',
}
const SUB: Record<LowerThirdVariant, string> = { accent: 'text-white/85', paper: 'text-mute', ink: 'text-paper/75' }
const SWEEP_BG: Record<LowerThirdVariant, string> = { accent: 'bg-ink', paper: 'bg-accent', ink: 'bg-accent' }
const STRIPE: Record<LowerThirdVariant, string> = { accent: 'bg-pop', paper: 'bg-accent', ink: 'bg-pop' }
const TAG: Record<LowerThirdVariant, string> = {
  accent: 'bg-paper text-ink',
  paper: 'ui-fill bg-pop text-white',
  ink: 'ui-fill bg-pop text-white',
}

/** When everything in the entrance has landed, in seconds. */
function entranceEnd(words: number, chars: number) {
  const typeAt = WORDS_AT + words * WORD_STEP + 0.15
  return Math.max(TAG_AT + 0.45, typeAt + chars * typeStep(chars) + 0.06, WORDS_AT + (words - 1) * WORD_STEP + WORD_MS)
}
const typeStep = (chars: number) => Math.min(0.024, 0.9 / Math.max(1, chars))

/**
 * A broadcast / streamer name strip. An accent panel sweeps in, the card follows, the
 * title words rise in sequence, the subtitle types and the tag pops; on the way out the
 * panel sweeps back and leaves the other way. Plays itself (`show`, `duration`) or follows
 * a clock (`time` + `at`) so it can be scrubbed with a Timeline or synced to a video.
 * Transform and opacity only. Screen readers get the text once, while it is on screen.
 */
export function LowerThird({ title, subtitle, tag, align = 'left', show = true, duration, time, at, variant = 'accent', className }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const raf = useRef(0)
  const wait = useRef(0)
  const clock = useRef({ inAt: -1, outAt: -1 })
  const words = title.split(/\s+/).filter(Boolean)
  const chars = subtitle ? [...subtitle] : []
  const right = align === 'right'
  const driven = time !== undefined
  const inEnd = entranceEnd(words.length, chars.length)

  /** Draw the strip at u seconds after "in" and v seconds after "out" (negative = not yet). */
  const pose = useCallback(
    (u: number, v: number) => {
      const el = root.current
      if (!el) return
      const hidden = u < 0 || v >= OUT_END
      el.style.visibility = hidden ? 'hidden' : ''
      if (hidden) return
      if (prefersReducedMotion()) {
        u = 99
        v = v >= 0 ? 99 : v
        if (v >= OUT_END) {
          el.style.visibility = 'hidden'
          return
        }
      }
      const flat = uiStyle() === 'flat'
      const back = (t: number, s = 1.6) => (flat ? easeOutCubic(t) : easeOutBack(t, s))
      const start = right ? 'right' : 'left'
      const end = right ? 'left' : 'right'
      const dir = right ? -1 : 1
      const q = <T extends HTMLElement>(s: string) => el.querySelector<T>(s)
      const out = v >= 0

      // the sweep panel
      const sweep = q('[data-sweep]')
      if (sweep) {
        let sx: number
        let origin: string
        if (!out) {
          if (u < SWEEP) [sx, origin] = [inOut(seg(u, 0, SWEEP)), start]
          else [sx, origin] = [1 - inOut(seg(u, SWEEP, SWEEP_OFF)), end]
        } else if (v < OUT_COVER) [sx, origin] = [inOut(seg(v, 0, OUT_COVER)), end]
        else [sx, origin] = [1 - inOut(seg(v, OUT_COVER, OUT_END - OUT_COVER)), start]
        sweep.style.transformOrigin = `${origin} center`
        sweep.style.transform = `scaleX(${sx})`
      }

      // the card, behind the sweep: there once the sweep covers it, gone once it covers it again
      const card = q('[data-card]')
      if (card) {
        const on = u >= SWEEP && !(out && v >= OUT_COVER)
        card.style.opacity = on ? '1' : '0'
        card.style.transform = `translateX(${(1 - back(seg(u, SWEEP, 0.5), 1.3)) * -18 * dir}px)`
      }
      const stripe = q('[data-stripe]')
      if (stripe) stripe.style.transform = `scaleY(${easeOutCubic(seg(u, 0.5, 0.3))})`
      const content = q('[data-content]')
      if (content) content.style.opacity = out ? String(1 - seg(v, 0, 0.16)) : '1'

      // title words rise out of their own clipped line
      el.querySelectorAll<HTMLElement>('[data-word]').forEach((w, i) => {
        const t0 = WORDS_AT + i * WORD_STEP
        w.style.transform = `translateY(${(1 - back(seg(u, t0, WORD_MS))) * 110}%)`
        w.style.opacity = String(seg(u, t0, 0.15))
      })

      // subtitle types in
      const glyphs = el.querySelectorAll<HTMLElement>('[data-ch]')
      const typeAt = WORDS_AT + words.length * WORD_STEP + 0.15
      const step = typeStep(glyphs.length)
      glyphs.forEach((g, i) => {
        g.style.opacity = String(seg(u, typeAt + i * step, 0.05))
      })

      const badge = q('[data-tag]')
      if (badge) {
        const t = seg(u, TAG_AT, 0.45)
        badge.style.transform = `scale(${flat ? easeOutCubic(t) : easeOutBack(t, 2.6)})`
        badge.style.opacity = String(seg(u, TAG_AT, 0.08))
      }
    },
    [right, words.length],
  )

  // driven by a clock
  const a0 = at?.[0] ?? 0
  const a1 = at?.[1] ?? Infinity
  useLayoutEffect(() => {
    if (!driven) return
    cancelAnimationFrame(raf.current)
    clearTimeout(wait.current)
    pose(time - a0, time - a1)
  }, [driven, time, a0, a1, pose, title, subtitle, tag])

  // plays itself: a rAF clock that only runs while something moves
  const tick = useCallback(() => {
    cancelAnimationFrame(raf.current)
    clearTimeout(wait.current)
    const loop = () => {
      const { inAt, outAt } = clock.current
      const now = performance.now()
      const u = inAt < 0 ? -1 : (now - inAt) / 1000
      const leaving = outAt >= 0 && now >= outAt
      const v = leaving ? (now - outAt) / 1000 : -1
      pose(u, v)
      if (inAt < 0) return
      if (leaving ? v < OUT_END : u < inEnd) raf.current = requestAnimationFrame(loop)
      // landed, an auto-out is due later: sleep until then
      else if (outAt > now) wait.current = window.setTimeout(loop, outAt - now)
    }
    loop()
  }, [pose, inEnd])

  useLayoutEffect(() => {
    if (driven) return
    const c = clock.current
    const now = performance.now()
    if (show) {
      c.inAt = now
      c.outAt = duration !== undefined ? now + Math.max(0, duration) : -1
    } else if (c.inAt >= 0 && (c.outAt < 0 || c.outAt > now)) {
      c.outAt = now
    }
    tick()
  }, [driven, show, duration, tick])

  // new text while it is on screen: redraw in place
  useLayoutEffect(() => {
    if (driven) return
    tick()
  }, [driven, title, subtitle, tag, tick])

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current)
      clearTimeout(wait.current)
    },
    [],
  )

  const label = [typeof tag === 'string' ? tag : null, title, subtitle].filter(Boolean).join(', ')

  return (
    <div
      ref={root}
      style={{ visibility: 'hidden' }}
      className={cn('flex max-w-full min-w-0 flex-col', right ? 'items-end text-right' : 'items-start text-left', className)}
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="relative max-w-full min-w-0">
        <div
          data-card=""
          className={cn(
            'ui-border ui-r-lg ui-shadow relative isolate max-w-full min-w-0 overflow-hidden py-2 sm:py-3',
            right ? 'pr-4 pl-3.5 sm:pr-6 sm:pl-5' : 'pr-3.5 pl-4 sm:pr-5 sm:pl-6',
            CARD[variant],
          )}
        >
          <span
            data-stripe=""
            className={cn('absolute inset-y-0 w-1.5 origin-top sm:w-2', right ? 'right-0' : 'left-0', STRIPE[variant])}
          />
          <div data-content="" className="grid min-w-0 gap-0.5 sm:gap-1">
            <div className={cn('flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1', right && 'flex-row-reverse')}>
              {tag != null && tag !== false && (
                <span
                  data-tag=""
                  className={cn(
                    'ui-head ui-pill inline-flex shrink-0 items-center gap-1 px-2 py-1 text-[11px] leading-none sm:text-[13px] [&>svg]:size-[1.1em]',
                    right ? 'origin-right' : 'origin-left',
                    TAG[variant],
                  )}
                >
                  {tag}
                </span>
              )}
              <span className="ui-head flex min-w-0 flex-wrap gap-x-[0.28em] text-[clamp(17px,4.4vw,30px)] leading-[1.05]">
                {words.map((w, i) => (
                  <span key={i} className="inline-block max-w-full overflow-clip -my-[0.15em] py-[0.15em] whitespace-nowrap">
                    <span data-word="" className="inline-block will-change-transform">
                      {w}
                    </span>
                  </span>
                ))}
              </span>
            </div>
            {subtitle && (
              <p className={cn('m-0 min-w-0 text-[clamp(12px,3.2vw,16px)] leading-snug font-semibold [overflow-wrap:anywhere]', SUB[variant])}>
                {chars.map((c, i) => (
                  <span key={i} data-ch="">
                    {c}
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>
        <div data-sweep="" className={cn('ui-r-lg pointer-events-none absolute inset-0 will-change-transform', SWEEP_BG[variant])} style={{ transform: 'scaleX(0)' }} />
      </div>
    </div>
  )
}
