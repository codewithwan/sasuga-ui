import { Fragment, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { burst, centerOf, clamp, delayed, prefersReducedMotion, sfx, shards, sparkle, spawn, speedLines, uiStyle, useSprings } from '@/fx'
import { C } from '@/fx/palette'
import { cn } from '@/lib/utils'
import { dismissAchievement, removeAchievement, useAchievementQueue } from './use-achievement'
import type { AchievementItem } from './use-achievement'

export type AchievementHostProps = {
  /** Corner the banners stack in. */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  /** How many banners can be on screen; older ones are dismissed early. */
  max?: number
  /** Auto-dismiss time in ms (the drain bar). Hover pauses it. */
  duration?: number
  /** Lettering when the trophy stamps. `false` = none. */
  sfx?: string | false
  className?: string
}

const POP = 'cubic-bezier(.2,1.6,.4,1)'

function Trophy() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current stroke-[2.4] [stroke-linecap:round] [stroke-linejoin:round]">
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H5.5a2.5 2.5 0 0 0 3 4M16 6h2.5a2.5 2.5 0 0 1-3 4" />
      <path d="M12 13v3.5M8.5 20h7M10 20l.5-3.5h3L14 20" />
    </svg>
  )
}

function Banner({ item, side, duration, sfxText }: { item: AchievementItem; side: 'left' | 'right'; duration: number; sfxText: string | false }) {
  const root = useRef<HTMLDivElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const trophy = useRef<HTMLSpanElement>(null)
  const titleEl = useRef<HTMLSpanElement>(null)
  const chip = useRef<HTMLSpanElement>(null)
  const bar = useRef<HTMLSpanElement>(null)
  const drain = useRef<Animation | null>(null)
  const dir = side === 'left' ? -1 : 1
  const life = item.duration ?? duration
  const lettering = item.sfx ?? sfxText

  const spring = useSprings(
    root,
    { x: dir * 480, s: 0 },
    (v, el, vel) => {
      // smear frame: stretched along the slide while it is fast
      const stretch = 1 + Math.min(Math.abs(vel.x) / 4000, 0.35)
      el.style.transform = `translateX(${v.x}px) scale(${stretch * (1 + v.s * 0.025)}, ${(1 - v.s * 0.05) / stretch})`
    },
    { stiffness: 300, damping: 20 },
  )

  // entrance: slide + speed lines → trophy stamps with a burst → title rolls in → chip pops; then the drain
  useEffect(() => {
    const still = prefersReducedMotion()
    const flat = uiStyle() === 'flat'
    const timers: number[] = []
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))
    if (still) spring.snap({ x: 0 })
    else {
      spring.set({ x: 0 })
      at(120, () => {
        const r = root.current?.getBoundingClientRect()
        if (r) spawn(speedLines({ left: dir > 0 ? r.right - 40 : r.left - 40, top: r.top, width: 80, height: r.height }, dir > 0 ? -1 : 1, { count: 8, length: 120 }))
      })
      trophy.current?.animate(
        [
          { transform: flat ? 'scale(1.6)' : 'scale(2.8) rotate(-18deg)', opacity: 0 },
          { transform: 'scale(.82)', opacity: 1, offset: 0.55 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 300, delay: 260, easing: 'cubic-bezier(.5,0,.3,1.4)', fill: 'backwards' },
      )
      at(430, () => {
        const t = trophy.current
        if (!t) return
        const { x, y, rect: r } = centerOf(t)
        spring.kick({ s: 9 })
        card.current?.animate([{ translate: '0 0' }, { translate: '-3px 2px' }, { translate: '3px -1px' }, { translate: '0 0' }], { duration: 200 })
        spawn(burst(x, y, { radius: 34, spikes: 11 }), shards(x, y, { count: 8, speed: 380 }), delayed(0.1, sparkle(r.right + 4, r.top - 2, { size: 12, color: C.pop })))
        if (lettering) spawn(delayed(0.05, sfx(x + 10, r.top - 14, lettering, { size: 26, color: C.accent })))
      })
      titleEl.current?.querySelectorAll<HTMLElement>('[data-ch]').forEach((c, k) =>
        c.animate(
          flat
            ? [{ opacity: 0, transform: 'translateY(30%)' }, { opacity: 1, transform: 'none' }]
            : [{ opacity: 0, transform: 'translateY(110%) rotate(8deg)' }, { opacity: 1, transform: 'none' }],
          { duration: flat ? 260 : 380, delay: 400 + k * (flat ? 12 : 26), easing: POP, fill: 'backwards' },
        ),
      )
      chip.current?.animate([{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1.12)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], {
        duration: 380,
        delay: 700,
        easing: POP,
        fill: 'backwards',
      })
    }
    const b = bar.current
    if (b) {
      const a = b.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: life, delay: still ? 0 : 450, fill: 'forwards' })
      drain.current = a
      a.finished.then(
        () => dismissAchievement(item.id),
        () => {},
      )
    }
    return () => {
      timers.forEach(clearTimeout)
      drain.current?.cancel()
      drain.current = null
    }
  }, [item.id, dir, life, lettering, spring])

  // exit: slide back out, then leave the queue
  useEffect(() => {
    if (!item.leaving) return
    drain.current?.pause()
    if (prefersReducedMotion()) {
      removeAchievement(item.id)
      return
    }
    spring.set({ x: dir * 520 })
    root.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, delay: 120, fill: 'forwards' })
    const t = window.setTimeout(() => removeAchievement(item.id), 420)
    return () => window.clearTimeout(t)
  }, [item.leaving, item.id, dir, spring])

  const pause = () => drain.current?.pause()
  const resume = () => {
    if (!item.leaving) drain.current?.play()
  }
  const words = item.title.split(' ')
  const pct = item.next ? clamp((item.next.value / Math.max(1, item.next.max)) * 100, 0, 100) : 0

  return (
    <div ref={root} role="status" className="pointer-events-auto grid" onPointerEnter={pause} onPointerLeave={resume} onFocus={pause} onBlur={resume}>
      <div ref={card} className="ui-card ui-tone relative flex w-[min(calc(100vw-40px),380px)] items-center gap-3.5 overflow-hidden py-3 pr-3 pl-3 text-left text-ink">
        <span ref={trophy} className="ui-border-thin ui-pill ui-fill ui-shadow-sm grid size-12 shrink-0 place-items-center bg-accent text-white [&>svg]:size-6">
          {item.icon ?? <Trophy />}
        </span>
        <span className="grid min-w-0 flex-1 gap-1" aria-hidden="true">
          <span className="flex items-center gap-2 text-[11px] leading-none font-bold text-mute">
            Achievement unlocked
            {item.points != null && <span className="ui-pill ui-fill bg-pop px-1.5 py-[3px] text-[10px] leading-none text-white tabular-nums">+{item.points}</span>}
          </span>
          <span ref={titleEl} className="ui-head block text-[18px] leading-tight">
            {words.map((w, wi) => (
              <Fragment key={wi}>
                {wi > 0 && ' '}
                <span className="inline-flex overflow-hidden pb-[0.08em] align-bottom">
                  {[...w].map((ch, ci) => (
                    <span key={ci} data-ch className="inline-block">
                      {ch}
                    </span>
                  ))}
                </span>
              </Fragment>
            ))}
          </span>
          {item.description && <span className="truncate text-xs leading-snug text-mute">{item.description}</span>}
          {item.next && (
            <span ref={chip} className="ui-pill ui-border-thin mt-0.5 inline-flex items-center gap-2 justify-self-start bg-accent-soft/40 px-2 py-1 text-[11px] leading-none font-bold">
              {item.next.label ?? 'Next'}
              <span className="ui-pill relative block h-1.5 w-12 overflow-hidden bg-paper">
                <span className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${pct}%` }} />
              </span>
              <span className="tabular-nums">
                {item.next.value}/{item.next.max}
              </span>
            </span>
          )}
        </span>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => dismissAchievement(item.id)}
          className="ui-r-sm grid size-7 shrink-0 cursor-pointer place-items-center self-start border-0 bg-transparent p-0 text-mute transition-colors hover:bg-canvas hover:text-ink focus-visible:ui-focus"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current stroke-[3] [stroke-linecap:round]">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        <span ref={bar} aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 origin-left bg-accent" />
      </div>
      <span className="sr-only">
        Achievement unlocked: {item.title}.{item.description ? ` ${item.description}` : ''}
        {item.next ? ` ${item.next.label ?? 'Next'}: ${item.next.value} of ${item.next.max}.` : ''}
      </span>
    </div>
  )
}

/**
 * The fixed layer that shows achievement unlocks (separate from the toaster).
 * Mount it once; call `useAchievement().unlock({...})` from anywhere.
 * Each banner slides in on speed lines, its trophy stamps down with a burst, the title
 * rolls up letter by letter, and a drain bar counts down to auto-dismiss (hover pauses).
 */
export function AchievementHost({ position = 'top-right', max = 3, duration = 4500, sfx: sfxText = '解除!', className }: AchievementHostProps) {
  const items = useAchievementQueue()
  const top = position.startsWith('top')
  const side = position.endsWith('left') ? 'left' : 'right'
  const liveIds = items.filter((i) => !i.leaving).map((i) => i.id)
  const overflow = liveIds.length > max ? liveIds.slice(0, liveIds.length - max).join(',') : ''

  useEffect(() => {
    if (!overflow) return
    overflow.split(',').forEach((id) => dismissAchievement(Number(id)))
  }, [overflow])

  if (typeof document === 'undefined') return null
  // portalled to <body> so a transformed ancestor never becomes its containing block
  return createPortal(
    <div
      aria-live="polite"
      className={cn(
        'pointer-events-none fixed z-[9000] flex gap-3',
        top ? 'top-5 flex-col-reverse' : 'bottom-6 flex-col',
        side === 'left' ? 'left-5 items-start' : 'right-5 items-end',
        className,
      )}
    >
      {items.map((item) => (
        <Banner key={item.id} item={item} side={side} duration={duration} sfxText={sfxText} />
      ))}
    </div>,
    document.body,
  )
}
