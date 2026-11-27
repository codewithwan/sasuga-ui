import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { burst, delayed, prefersReducedMotion, rays, sfx, shards, smoke, sparkle, spawn, uiStyle } from '@/fx'
import { C } from '@/fx/palette'
import { cn } from '@/lib/utils'

export type AnnounceVariant = 'accent' | 'pop' | 'ink'

export type AnnounceOptions = {
  /** A smaller line under the splash ("Stage 2-4", "+1200"). */
  sub?: string
  /** Fill colour of the lettering. */
  variant?: AnnounceVariant
  /** How long it holds once it has landed, ms. */
  duration?: number
  /** Canvas lettering thrown with the landing (cel / manga). `false` = none. Overrides the host. */
  sfx?: string | false
}

export type Announcement = AnnounceOptions & { id: number; text: string; leaving?: boolean }

/* A module store, like use-toast / use-achievement: announce() works from anywhere
   (game loops, event handlers, outside React) and the mounted <AnnouncerHost/> plays the queue. */
let queue: Announcement[] = []
let nextId = 1
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())
const subscribe = (f: () => void) => {
  subs.add(f)
  return () => {
    subs.delete(f)
  }
}
const snapshot = () => queue
const noop = () => () => {}
const onClient = () => true
const onServer = () => false

/** Queue a centre-screen splash. Returns its id. Needs an <AnnouncerHost/> mounted somewhere. */
// oxlint-disable-next-line react/only-export-components -- store API, usable outside React
export function announce(text: string, options: AnnounceOptions = {}): number {
  const id = nextId++
  queue = [...queue, { ...options, text, id }]
  emit()
  return id
}

/** Send a splash off early (or drop it from the queue if it has not played yet). */
// oxlint-disable-next-line react/only-export-components -- store API
export function dismissAnnouncement(id: number) {
  const i = queue.findIndex((a) => a.id === id)
  if (i < 0) return
  if (i > 0) queue = queue.filter((a) => a.id !== id)
  else if (!queue[0].leaving) queue = [{ ...queue[0], leaving: true }, ...queue.slice(1)]
  else return
  emit()
}

/** Empty the queue; the splash on screen leaves. */
// oxlint-disable-next-line react/only-export-components -- store API
export function clearAnnouncements() {
  if (!queue.length) return
  queue = queue[0].leaving ? [queue[0]] : [{ ...queue[0], leaving: true }]
  emit()
}

const removeAnnouncement = (id: number) => {
  queue = queue.filter((a) => a.id !== id)
  emit()
}

const api = { announce, dismiss: dismissAnnouncement, clear: clearAnnouncements }

/** `const { announce } = useAnnouncer()` → `announce('LEVEL UP!', { sub: 'Lv 12' })`. */
// oxlint-disable-next-line react/only-export-components -- hook next to its host
export const useAnnouncer = () => api

const FILL: Record<AnnounceVariant, string> = {
  accent: 'text-accent [--stroke:var(--color-ink)]',
  pop: 'text-pop [--stroke:var(--color-ink)]',
  ink: 'text-ink [--stroke:var(--color-paper)]',
}

const LETTERING =
  'ui-head [paint-order:stroke_fill] [-webkit-text-stroke:0.16em_var(--stroke)] [text-shadow:0.05em_0.07em_0_var(--stroke)] ' +
  '[[data-style=flat]_&]:[-webkit-text-stroke:0.09em_var(--stroke)] [[data-style=flat]_&]:[text-shadow:0_0.04em_0.14em_color-mix(in_srgb,var(--color-ink)_35%,transparent)]'

const STEP = 42
const IN_MS = 380

function Splash({ item, hold, sfxText }: { item: Announcement; hold: number; sfxText: string | false }) {
  const block = useRef<HTMLDivElement>(null)
  const title = useRef<HTMLDivElement>(null)
  const subEl = useRef<HTMLDivElement>(null)
  const gone = useRef(false)
  const [leaving, setLeaving] = useState(false)
  const words = item.text.split(/\s+/).filter(Boolean)
  const longest = Math.max(4, ...words.map((w) => [...w].length))
  // big, but the longest word always fits the width and the splash stays out of the way vertically
  const fontSize = `clamp(26px, min(${Math.min(15, 92 / longest).toFixed(2)}vw, 20vh), 150px)`
  const lettering = item.sfx ?? sfxText
  const life = item.duration ?? hold

  // entrance → land (fx) → hold → exit
  useEffect(() => {
    const el = block.current
    if (!el) return
    const still = prefersReducedMotion()
    const style = uiStyle()
    const flat = style === 'flat'
    const timers: number[] = []
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))
    const chars = [...(title.current?.querySelectorAll<HTMLElement>('[data-ch]') ?? [])]
    let land = 0

    if (still) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: 'backwards' })
    } else if (flat) {
      // calm: fade + scale, a soft stagger, a ring and dots
      el.animate([{ opacity: 0, transform: 'scale(.92)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.3,1.25,.5,1)', fill: 'backwards' })
      chars.forEach((c, i) =>
        c.animate([{ opacity: 0, transform: 'translateY(25%)' }, { opacity: 1, transform: 'none' }], { duration: 240, delay: i * 18, easing: 'cubic-bezier(.3,1.25,.5,1)', fill: 'backwards' }),
      )
      land = chars.length * 18 + 140
    } else {
      // slam: each letter drops from big and close, overshoots small, then settles
      chars.forEach((c, i) =>
        c.animate(
          [
            { opacity: 0, transform: 'translateY(-0.45em) scale(2.5)' },
            { opacity: 1, transform: 'scale(.84)', offset: 0.6 },
            { transform: 'scale(1.07)', offset: 0.8 },
            { transform: 'none' },
          ],
          { duration: IN_MS, delay: i * STEP, easing: 'cubic-bezier(.3,0,.3,1)', fill: 'backwards' },
        ),
      )
      land = Math.max(0, chars.length - 1) * STEP + IN_MS * 0.6
    }

    if (!still)
      at(land, () => {
        const r = (title.current ?? el).getBoundingClientRect()
        const x = r.left + r.width / 2
        const y = r.top + r.height / 2
        const k = Math.min(1.4, Math.max(0.5, r.width / 560))
        const reach = Math.max(window.innerWidth, window.innerHeight) * 0.6
        if (!flat) {
          el.animate(
            [{ transform: 'none' }, { transform: 'scale(1.07, .9)', offset: 0.25 }, { transform: 'scale(.98, 1.04)', offset: 0.6 }, { transform: 'none' }],
            { duration: 360, easing: 'cubic-bezier(.2,1.4,.4,1)' },
          )
          el.animate([{ translate: '0 0' }, { translate: '-6px 3px' }, { translate: '5px -3px' }, { translate: '-3px 1px' }, { translate: '0 0' }], { duration: 240 })
        }
        spawn(
          // focus lines frame the words (manga: ink, cel: soft; none in flat)
          rays(x, y, { inner: Math.max(r.width, r.height) * 0.62, outer: reach, count: style === 'manga' ? 46 : 30, width: 12 * k }),
          burst(x, y, { radius: 60 * k, spikes: 14 }),
          shards(x, y, { count: Math.round(10 * k), speed: 520 * k, size: 12 * k }),
          delayed(0.08, sparkle(r.right - r.width * 0.08, r.top, { size: 18 * k, color: C.pop })),
          delayed(0.16, sparkle(r.left + r.width * 0.1, r.bottom, { size: 13 * k })),
        )
        if (!flat) spawn(delayed(0.05, smoke(x, r.bottom, { spread: r.width * 0.32, size: 16 * k })))
        if (lettering) spawn(delayed(0.06, sfx(r.right - r.width * 0.12, r.top - 18 * k, lettering, { size: 40 * k, color: item.variant === 'pop' ? C.accent : C.pop })))
      })

    subEl.current?.animate([{ opacity: 0, transform: 'translateY(0.6em)' }, { opacity: 1, transform: 'none' }], {
      duration: still ? 160 : 320,
      delay: still ? 0 : land + 60,
      easing: 'cubic-bezier(.2,1.4,.4,1)',
      fill: 'backwards',
    })
    at(land + life, () => setLeaving(true))
    return () => timers.forEach(clearTimeout)
  }, [item.id, item.variant, life, lettering])

  // exit fast, then the next one in the queue plays
  useEffect(() => {
    if (!(leaving || item.leaving) || gone.current) return
    gone.current = true
    const el = block.current
    const done = () => removeAnnouncement(item.id)
    if (!el) return done()
    const still = prefersReducedMotion()
    const flat = uiStyle() === 'flat'
    const a = el.animate(
      [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: still ? 'none' : flat ? 'scale(.96)' : 'translateY(-0.15em) scale(1.12)' }],
      { duration: still ? 140 : 200, easing: 'cubic-bezier(.55,0,.75,.2)', fill: 'forwards' },
    )
    a.finished.then(done, done)
  }, [leaving, item.leaving, item.id])

  let n = 0
  return (
    <div ref={block} aria-hidden="true" className="grid max-w-full justify-items-center gap-[0.6em] text-center will-change-transform">
      <div ref={title} className={cn(LETTERING, FILL[item.variant ?? 'accent'], 'flex flex-wrap justify-center gap-x-[0.24em] leading-[1.02]')} style={{ fontSize }}>
        {words.map((w, wi) => (
          <span key={wi} className="inline-flex whitespace-nowrap">
            {[...w].map((ch) => (
              <span key={n++} data-ch="" className="inline-block origin-[50%_80%]">
                {ch}
              </span>
            ))}
          </span>
        ))}
      </div>
      {item.sub && (
        <div ref={subEl} className={cn(LETTERING, 'text-paper [--stroke:var(--color-ink)] text-[clamp(15px,4.2vw,30px)] leading-tight')}>
          {item.sub}
        </div>
      )}
    </div>
  )
}

export type AnnouncerHostProps = {
  /** Default hold time once a splash has landed, ms. */
  duration?: number
  /** Default canvas lettering on the landing (cel / manga). `false` = none. */
  sfx?: string | false
  className?: string
}

/**
 * The fixed centre layer for big splash text ("LEVEL UP!", "STAGE CLEAR"). Mount it once; call
 * `announce()` from anywhere. Letters slam in one by one with an overshoot and land with focus
 * lines, a burst and lettering (flat: a calm scale and fade with a ring). It holds, leaves fast,
 * and plays queued splashes in order. Never takes the pointer; screen readers hear it assertively.
 */
export function AnnouncerHost({ duration = 1500, sfx: sfxText = 'ドン!', className }: AnnouncerHostProps) {
  const items = useSyncExternalStore(subscribe, snapshot, snapshot)
  const mounted = useSyncExternalStore(noop, onClient, onServer)
  const current = items[0]
  // with a line waiting, each splash holds a little less
  const hold = items.length > 1 ? Math.round(duration * 0.7) : duration
  if (!mounted) return null
  return createPortal(
    <div className={cn('pointer-events-none fixed inset-0 z-[10000] grid place-items-center overflow-hidden px-4', className)}>
      {current && <Splash key={current.id} item={current} hold={hold} sfxText={sfxText} />}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {current ? `${current.text}${current.sub ? `. ${current.sub}` : ''}` : ''}
      </div>
    </div>,
    document.body,
  )
}
