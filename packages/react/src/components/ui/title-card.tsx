import { useCallback, useLayoutEffect, useRef } from 'react'
import { clamp, easeInCubic, easeOutBack, easeOutCubic, impactOn, prefersReducedMotion, uiStyle } from '@/fx'
import { cn } from '@/lib/utils'

type Props = {
  /** Episode number (3 becomes "EP.03") or a ready label ("EP.03", "FINAL"). */
  episode: number | string
  title: string
  subtitle?: string
  /** Small Japanese line under the subtitle. */
  jp?: string
  /** Plays the card once (in, hold, out) whenever it turns true. Default true (on mount). False hides it. */
  play?: boolean
  /** Called when a played card has wiped out. */
  onDone?: () => void
  /** How long the card holds between in and out when it plays itself, in ms. Infinity keeps it up. */
  hold?: number
  /** Drive it from a clock (a Timeline, a video's currentTime), in seconds. Overrides play. */
  time?: number
  /** With `time`: the [in, out] seconds. Out is optional (stays). Default [0]. */
  at?: [number, number?]
  /** full: covers its (relative) container like a chapter break; inline: a card in the flow. */
  variant?: 'full' | 'inline'
  /** Lettering drawn with the stamp's burst (cel and manga). False for none. */
  sfx?: string | false
  className?: string
}

/* Timings in seconds. In: the field opens (iris in cel, stepped wipe in manga, fade in flat),
   the episode slams down and bursts, the title assembles letter by letter, the rule draws,
   subtitle and jp line rise. Out: the text lifts away and the field closes the same way. */
const FIELD = 0.5
const STAMP_AT = 0.42
const CONTACT = 0.62
const TITLE_AT = 0.78
const CHAR_MS = 0.42
const OUT_TEXT = 0.2
const OUT_END = 0.62

const seg = (t: number, start: number, dur: number) => clamp((t - start) / dur, 0, 1)
const inOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)
/** Stepped progress: comic frames instead of a smooth slide (manga). */
const steps = (t: number, n: number) => (t >= 1 ? 1 : Math.floor(t * n) / n)

const charStep = (n: number) => Math.min(0.045, 0.8 / Math.max(1, n))
function timeline(chars: number) {
  const rule = TITLE_AT + chars * charStep(chars) + 0.12
  const sub = rule + 0.22
  return { rule, sub, end: sub + 0.5 }
}

const label = (ep: number | string) => (typeof ep === 'number' ? `EP.${String(ep).padStart(2, '0')}` : ep)

/**
 * An anime episode title card. The field opens (iris in cel, a stepped comic wipe in manga,
 * a fade in flat), the episode number slams down with a style-aware burst, the title
 * assembles letter by letter, a rule draws, it holds, then wipes out. Plays itself (`play`,
 * `hold`, `onDone`) or follows a clock (`time` + `at`) so a Timeline or a video can scrub it.
 * Transform and opacity only. Screen readers get one plain line while it is on screen.
 */
export function TitleCard({
  episode,
  title,
  subtitle,
  jp,
  play = true,
  onDone,
  hold = 1800,
  time,
  at,
  variant = 'full',
  sfx = false,
  className,
}: Props) {
  const root = useRef<HTMLDivElement>(null)
  const raf = useRef(0)
  const prevU = useRef(-1)
  const done = useRef(onDone)
  const driven = time !== undefined
  const words = title.split(/\s+/).filter(Boolean)
  const chars = words.reduce((n, w) => n + [...w].length, 0)
  const inEnd = timeline(chars).end
  const ep = label(episode)

  useLayoutEffect(() => {
    done.current = onDone
  })

  // the iris has to reach the corners: its diameter is the container's diagonal
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      el.style.setProperty('--tc-d', `${Math.ceil(Math.hypot(r.width, r.height)) + 4}px`)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /** Draw the card at u seconds after "in" and v seconds after "out" (negative = not yet). */
  const pose = useCallback(
    (u: number, v: number) => {
      const el = root.current
      if (!el) return
      const reduced = prefersReducedMotion()
      if (reduced) {
        u = u >= 0 ? 99 : u
        v = v >= 0 ? 99 : v
      }
      const hidden = u < 0 || v >= OUT_END
      el.style.visibility = hidden ? 'hidden' : ''
      const last = prevU.current
      prevU.current = u
      if (hidden) return

      const style = uiStyle()
      const flat = style === 'flat'
      const back = (t: number, s = 1.7) => (flat ? easeOutCubic(t) : easeOutBack(t, s))
      const q = <T extends HTMLElement>(s: string) => el.querySelector<T>(s)
      const out = v >= 0

      // the field: iris (cel), stepped wipe (manga), fade (flat)
      const opened = out ? 1 - seg(v, OUT_TEXT * 0.75, OUT_END - OUT_TEXT * 0.75) : seg(u, 0, FIELD)
      const iris = q('[data-iris]')
      const panel = q('[data-panel]')
      if (iris && panel) {
        iris.style.opacity = style === 'cel' ? '1' : '0'
        panel.style.opacity = style === 'cel' ? '0' : flat ? String(opened) : '1'
        iris.style.transform = `translate(-50%, -50%) scale(${inOut(opened)})`
        if (style === 'manga') {
          // in from the left, out to the right
          const x = out ? steps(1 - opened, 5) : steps(opened, 5) - 1
          panel.style.transform = `translateX(${x * 100}%)`
        } else panel.style.transform = flat ? `scale(${1.04 - 0.04 * easeOutCubic(opened)})` : 'none'
      }
      const rim = q('[data-rim]')
      if (rim) rim.style.opacity = String(style === 'manga' ? (opened >= 1 ? 1 : 0) : opened)

      // the text block: lifts away first on the way out; shakes a beat on the stamp
      const body = q('[data-body]')
      if (body) {
        const k = seg(u, CONTACT, 0.32)
        const shake = flat || u < CONTACT ? 0 : Math.sin(k * 38) * 7 * (1 - k) ** 2
        const lift = out ? seg(v, 0, OUT_TEXT) : 0
        body.style.opacity = String(1 - lift)
        body.style.transform = `translate(${shake}px, ${-lift * 14}px)`
      }

      // the episode stamp: slams down from big, squashes on contact
      const stamp = q('[data-stamp]')
      if (stamp) {
        let sx = 1
        let sy = 1
        if (u < CONTACT) sx = sy = 2.6 - 1.6 * easeInCubic(seg(u, STAMP_AT, CONTACT - STAMP_AT))
        else {
          const k = seg(u, CONTACT, 0.34)
          const sq = (1 - k) * (flat ? 0.35 : 1) * Math.cos(k * 9)
          sx = 1 + 0.16 * sq
          sy = 1 - 0.16 * sq
        }
        stamp.style.transform = `scale(${sx}, ${sy})`
        stamp.style.opacity = String(seg(u, STAMP_AT, 0.06))
        // the hit, only when playing forward across the contact (never while seeking back)
        if (!reduced && last < CONTACT && u >= CONTACT && u - last < 0.3) {
          const size = clamp(stamp.getBoundingClientRect().height / 52, 0.55, 1.3)
          impactOn(stamp, { text: sfx, size, smoky: !flat })
        }
      }

      // title letters assemble
      const glyphs = el.querySelectorAll<HTMLElement>('[data-ch]')
      const step = charStep(glyphs.length)
      const { rule: ruleAt, sub: subAt } = timeline(glyphs.length)
      glyphs.forEach((g, i) => {
        const t0 = TITLE_AT + i * step
        const p = back(seg(u, t0, CHAR_MS))
        g.style.transform = `translateY(${(1 - p) * 0.55}em) scale(${0.5 + 0.5 * p})`
        g.style.opacity = String(seg(u, t0, 0.1))
      })

      const rule = q('[data-rule]')
      if (rule) rule.style.transform = `scaleX(${inOut(seg(u, ruleAt, 0.45))})`
      el.querySelectorAll<HTMLElement>('[data-sub]').forEach((s, i) => {
        const p = seg(u, subAt + i * 0.12, 0.38)
        s.style.opacity = String(p)
        s.style.transform = `translateY(${(1 - easeOutCubic(p)) * 10}px)`
      })
    },
    [sfx],
  )

  // driven by a clock
  const a0 = at?.[0] ?? 0
  const a1 = at?.[1] ?? Infinity
  useLayoutEffect(() => {
    if (!driven) return
    cancelAnimationFrame(raf.current)
    pose(time - a0, time - a1)
  }, [driven, time, a0, a1, pose, episode, title, subtitle, jp])

  // plays itself: in, hold, out, done
  useLayoutEffect(() => {
    if (driven) return
    cancelAnimationFrame(raf.current)
    prevU.current = -1
    if (!play) {
      pose(-1, -1)
      return
    }
    const inAt = performance.now()
    const outAt = Number.isFinite(hold) ? inAt + (inEnd * 1000 + Math.max(0, hold)) : Infinity
    let timer = 0
    const loop = () => {
      const now = performance.now()
      const u = (now - inAt) / 1000
      const v = now >= outAt ? (now - outAt) / 1000 : -1
      pose(u, v)
      if (v >= OUT_END) {
        done.current?.()
        return
      }
      if (u < inEnd || v >= 0) raf.current = requestAnimationFrame(loop)
      // holding: sleep until the wipe out
      else if (outAt < Infinity) timer = window.setTimeout(loop, outAt - now)
    }
    loop()
    return () => {
      cancelAnimationFrame(raf.current)
      clearTimeout(timer)
    }
    // replays when play turns on or the text changes; a new onDone (read from a ref) does not restart it
  }, [driven, play, hold, pose, inEnd, title])

  const full = variant === 'full'

  return (
    <div
      ref={root}
      style={{ visibility: 'hidden' }}
      className={cn(
        '@container pointer-events-none isolate overflow-hidden text-paper',
        full ? 'absolute inset-0 z-10' : 'ui-r-lg relative grid min-h-[clamp(200px,48vw,320px)] w-full',
        className,
      )}
    >
      <p className="sr-only">{[`${ep}: ${title}`, subtitle, jp].filter(Boolean).join('. ')}</p>
      {/* field */}
      <div aria-hidden="true" data-panel="" className="ui-tone absolute inset-0 bg-ink will-change-transform" />
      <div
        aria-hidden="true"
        data-iris=""
        className="absolute top-1/2 left-1/2 size-[var(--tc-d,200%)] rounded-full bg-ink will-change-transform"
        style={{ transform: 'translate(-50%, -50%) scale(0)' }}
      />
      {!full && <div aria-hidden="true" data-rim="" className="ui-border ui-r-lg absolute inset-0 z-10" />}

      <div
        aria-hidden="true"
        data-body=""
        className="relative grid h-full w-full content-center justify-items-center gap-[clamp(8px,2.4cqw,18px)] px-[clamp(16px,6cqw,56px)] py-[clamp(18px,6cqw,48px)] text-center"
      >
        <span
          data-stamp=""
          className="ui-head ui-border ui-r ui-shadow-sm ui-fill inline-block bg-accent px-[0.55em] py-[0.28em] text-[clamp(14px,4.2cqw,30px)] leading-none text-white"
        >
          {ep}
        </span>
        <span className="ui-head flex max-w-full flex-wrap justify-center gap-x-[0.3em] text-[clamp(26px,9cqw,84px)] leading-[1.02]">
          {words.map((w, wi) => (
            <span key={wi} className="inline-flex max-w-full whitespace-nowrap">
              {[...w].map((c, ci) => (
                <span key={ci} data-ch="" className="inline-block will-change-transform">
                  {c}
                </span>
              ))}
            </span>
          ))}
        </span>
        <span data-rule="" className="block h-[var(--ui-bw)] w-[min(100%,22em)] rounded-full bg-accent text-[clamp(14px,3cqw,18px)]" />
        {subtitle && (
          <span data-sub="" className="block max-w-[36ch] text-[clamp(13px,3.2cqw,20px)] leading-snug font-semibold text-paper/80">
            {subtitle}
          </span>
        )}
        {jp && (
          <span data-sub="" lang="ja" className="block font-jp text-[clamp(12px,2.8cqw,16px)] leading-none text-accent">
            {jp}
          </span>
        )}
      </div>
    </div>
  )
}
