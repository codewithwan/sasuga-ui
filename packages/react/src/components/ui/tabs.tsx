import { useId, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { clamp, delayed, prefersReducedMotion, sfx, smoke, spawn, speedLines, uiStyle, useSprings } from '@/fx'

export type TabItem = { id: string; label: string; content: ReactNode; sfx?: string }

type Props = {
  tabs: TabItem[]
  label: string
  /** Id of the tab selected first. */
  defaultTab?: string
  onTabChange?: (id: string) => void
}

const LAGS = [30, 60, 95]
const GHOST_ALPHA = [0.5, 0.3, 0.16]
const POP = 'cubic-bezier(.2,1.5,.4,1)'

type Sample = { v: number; t: number }
function lagged(h: Sample[], v: number, now: number) {
  if (h.length && now - h[h.length - 1].t > 90) h.length = 0
  h.push({ v, t: now })
  if (h.length > 24) h.shift()
  return LAGS.map((lag) => {
    for (let i = h.length - 1; i >= 0; i--) if (now - h[i].t >= lag) return h[i].v
    return h[0].v
  })
}

/**
 * ARIA tabs in a pill bar. The accent pill dashes to the new tab, stretching and trailing
 * afterimages, lands in a puff of dust with lettering, and the panel slides in from the
 * side it travelled from.
 */
export function Tabs({ tabs, label, defaultTab, onTabChange }: Props) {
  const initial = Math.max(0, tabs.findIndex((t) => t.id === defaultTab))
  const [active, setActive] = useState(initial)
  const activeRef = useRef(initial)
  const dirRef = useRef(0)
  const base = useId()
  const list = useRef<HTMLDivElement>(null)
  const ink = useRef<HTMLSpanElement>(null)
  const btns = useRef<(HTMLButtonElement | null)[]>([])
  const panels = useRef<(HTMLDivElement | null)[]>([])
  const ghosts = useRef<(HTMLSpanElement | null)[]>([])
  const trail = useRef<Sample[]>([])
  const landing = useRef<{ i: number; x: number; y: number } | null>(null)
  const listW = useRef(0)

  const land = (i: number) => {
    const el = ink.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (!prefersReducedMotion()) el.animate([{ scale: '1' }, { scale: '1.04 .78' }, { scale: '.98 1.05' }, { scale: '1' }], { duration: 300, easing: 'ease-out' })
    const back = dirRef.current > 0 ? r.left + 8 : r.right - 8
    spawn(
      smoke(back, r.bottom, { count: 3, spread: 22, size: 8 }),
      delayed(0.04, smoke(dirRef.current > 0 ? r.right - 6 : r.left + 6, r.bottom, { count: 2, spread: 16, size: 6 })),
      delayed(0.06, sfx(r.left + r.width / 2, r.top - 22, tabs[i]?.sfx ?? 'シュッ', { size: 24 })),
    )
  }

  const spring = useSprings(
    ink,
    { x: 0, w: 0, y: 0, h: 0 },
    (v, el, vel) => {
      const flat = uiStyle() === 'flat'
      const speed = Math.abs(vel.x)
      // the pill stretches back along its path while it travels
      const st = clamp(speed * 0.05, 0, 80) * (flat ? 0.5 : 1)
      const left = Math.max(vel.x > 0 ? v.x - st : v.x, 4)
      const right = Math.min(v.x + v.w + (vel.x < 0 ? st : 0), (listW.current || Infinity) - 4)
      el.style.width = `${Math.max(right - left, 0)}px`
      el.style.height = `${Math.max(v.h, 0)}px`
      el.style.transform = `translate(${left}px, ${v.y}px) scaleY(${1 - clamp(speed / 5000, 0, 0.3)})`
      const lag = lagged(trail.current, v.x, performance.now())
      ghosts.current.forEach((g, i) => {
        if (!g) return
        g.style.width = `${Math.max(v.w, 0)}px`
        g.style.height = `${Math.max(v.h, 0)}px`
        g.style.transform = `translate(${lag[i]}px, ${v.y}px) scaleY(.86)`
        g.style.opacity = String(Math.abs(lag[i] - v.x) < 6 ? 0 : clamp((speed - 200) / 1600, 0, 1) * GHOST_ALPHA[i] * (flat ? 0.5 : 1))
      })
      const l = landing.current
      if (l && Math.abs(v.x - l.x) < 2 && Math.abs(v.y - l.y) < 2) {
        landing.current = null
        land(l.i)
      }
    },
    { stiffness: 420, damping: 21 },
  )

  const measure = (i: number) => {
    const b = btns.current[i]
    return b ? { x: b.offsetLeft, w: b.offsetWidth, y: b.offsetTop, h: b.offsetHeight } : null
  }

  useLayoutEffect(() => {
    const place = () => {
      listW.current = list.current?.scrollWidth ?? 0
      // tabs that do not fit wrap onto another row (no sideways scroll); the list then becomes a rounded box
      const tops = btns.current.filter((b): b is HTMLButtonElement => !!b).map((b) => b.offsetTop)
      list.current?.toggleAttribute('data-wrapped', tops.some((t) => Math.abs(t - tops[0]) > 2))
      const m = measure(activeRef.current)
      if (m) spring.snap(m)
    }
    place()
    const ro = new ResizeObserver(place)
    if (list.current) ro.observe(list.current)
    document.fonts?.ready.then(place)
    return () => ro.disconnect()
  }, [spring])

  // the new panel slides in from the direction of travel
  useLayoutEffect(() => {
    const dir = dirRef.current
    const p = panels.current[active]
    if (!dir || !p || prefersReducedMotion()) return
    const d = uiStyle() === 'flat' ? 18 : 56
    p.animate(
      [
        { transform: `translateX(${dir * d}px)`, opacity: 0 },
        { transform: `translateX(${-dir * d * 0.12}px)`, opacity: 1, offset: 0.65 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 440, easing: POP },
    )
  }, [active])

  const select = (i: number, focus = false) => {
    const from = activeRef.current
    if (i === from) return
    activeRef.current = i
    dirRef.current = i > from ? 1 : -1
    setActive(i)
    onTabChange?.(tabs[i].id)
    const m = measure(i)
    const b = btns.current[i]
    if (focus) b?.focus()
    if (!m) return
    if (prefersReducedMotion()) return spring.snap(m)
    landing.current = { i, x: m.x, y: m.y }
    spring.set(m)
    const a = btns.current[from]
    if (!a || !b) return
    const ra = a.getBoundingClientRect()
    const rb = b.getBoundingClientRect()
    const left = Math.min(ra.left, rb.left)
    spawn(speedLines({ left, top: rb.top + 2, width: Math.max(ra.right, rb.right) - left, height: rb.height - 4 }, i > from ? 1 : -1, { count: 7, length: 70 }))
  }

  const onKey = (e: KeyboardEvent) => {
    const n = tabs.length
    const keys: Record<string, number> = {
      ArrowRight: (active + 1) % n,
      ArrowLeft: (active - 1 + n) % n,
      Home: 0,
      End: n - 1,
    }
    if (e.key in keys) {
      e.preventDefault()
      select(keys[e.key], true)
    }
  }

  return (
    <div className="w-full min-w-0">
      <div
        ref={list}
        role="tablist"
        aria-label={label}
        onKeyDown={onKey}
        className="ui-border ui-pill ui-shadow-sm relative isolate inline-flex max-w-full flex-wrap gap-0.5 bg-paper p-1 data-wrapped:rounded-[var(--ui-r)] data-wrapped:justify-center"
      >
        {LAGS.map((_, i) => (
          <span
            key={i}
            ref={(el) => {
              ghosts.current[i] = el
            }}
            aria-hidden="true"
            className="ui-pill pointer-events-none absolute top-0 left-0 -z-10 bg-accent-soft opacity-0"
          />
        ))}
        <span ref={ink} aria-hidden="true" className="ui-pill absolute top-0 left-0 -z-10 bg-accent" />
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              btns.current[i] = el
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${t.id}`}
            aria-selected={i === active}
            aria-controls={`${base}-panel-${t.id}`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => select(i)}
            className="ui-head ui-pill shrink-0 cursor-pointer border-0 bg-transparent px-4 py-2.5 text-[16px] leading-none whitespace-nowrap text-mute transition-colors duration-200 hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ink aria-selected:text-white"
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div
          key={t.id}
          ref={(el) => {
            panels.current[i] = el
          }}
          role="tabpanel"
          id={`${base}-panel-${t.id}`}
          aria-labelledby={`${base}-tab-${t.id}`}
          hidden={i !== active}
          className="mt-3.5 min-w-0 text-[15px] leading-normal font-medium"
        >
          {t.content}
        </div>
      ))}
    </div>
  )
}
