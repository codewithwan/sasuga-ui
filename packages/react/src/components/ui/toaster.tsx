import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { burst, delayed, prefersReducedMotion, sfx, smoke, spawn, speedLines, uiStyle, useSprings } from '@/fx'
import { C } from '@/fx/palette'
import { cn } from '@/lib/utils'
import { ToastContext } from './use-toast'
import type { ToastFn, ToastOptions } from './use-toast'
import { Icon } from './icon'

type Item = { id: number; message: string; sfx: string | false; duration: number; variant: NonNullable<ToastOptions['variant']>; out?: boolean }

const TONE = {
  info: { dot: 'bg-accent', bar: 'bg-accent' },
  success: { dot: 'bg-accent', bar: 'bg-accent' },
  danger: { dot: 'bg-pop', bar: 'bg-pop' },
} as const

const MAX = 3
const FLING = 90 // px of drag that dismisses

function Toast({ item, onDone }: { item: Item; onDone: (id: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLSpanElement>(null)
  const timer = useRef<Animation | null>(null)
  const gone = useRef(false)
  const prevTop = useRef<number | null>(null)
  const drag = useRef<{ x0: number; dx: number; t: number; vx: number } | null>(null)
  const [leaving, setLeaving] = useState(false)
  // what it was born with (an eviction swaps the item object, which must not replay the entrance)
  const [init] = useState(item)
  const spring = useSprings(
    ref,
    { x: 460, y: 0, r: 0, q: 0 },
    (v, el, vel) => {
      // stretch along the motion while it is fast: the smear frame of a slide-in
      const stretch = 1 + Math.min(Math.abs(vel.x) / 4000, 0.35)
      el.style.transform = `translate(${v.x}px, ${v.y}px) rotate(${v.r}deg) scale(${stretch * (1 - v.q * 0.06)}, ${(1 / stretch) * (1 + v.q * 0.1)})`
    },
    { stiffness: 300, damping: 19 },
  )

  const leave = useCallback(
    (dir: 1 | -1 = 1) => {
      if (gone.current) return
      gone.current = true
      timer.current?.pause()
      setLeaving(true)
      const el = card.current
      if (el && !prefersReducedMotion()) {
        const r = el.getBoundingClientRect()
        spawn(speedLines({ left: r.left, top: r.top, width: r.width, height: r.height }, dir, { count: 8, length: 130 }))
      }
      spring.set({ x: dir * 520, r: dir * 8 })
      spring.kick({ x: dir * 1400 })
      window.setTimeout(() => onDone(item.id), 340)
    },
    [spring, onDone, item.id],
  )

  // enter: slam in from the edge, land with a squash, lettering and dust
  useEffect(() => {
    const still = prefersReducedMotion()
    if (still) spring.snap({ x: 0 })
    else spring.set({ x: 0 })
    const land = window.setTimeout(
      () => {
        const el = card.current
        if (!el || still) return
        spring.kick({ q: 10 })
        const r = el.getBoundingClientRect()
        spawn(
          speedLines({ left: r.right - 40, top: r.top, width: 80, height: r.height }, -1, { count: 8, length: 120 }),
          burst(r.left + 6, r.top + r.height / 2, { radius: 18, spikes: 8, color: init.variant === 'danger' ? C.pop : C.accent }),
          delayed(0.03, smoke(r.left + 10, r.bottom - 4, { count: 3, spread: 30, size: 8 })),
        )
        if (init.sfx) spawn(delayed(0.05, sfx(r.left + 30, r.top - 6, init.sfx, { size: 30, color: init.variant === 'danger' ? C.pop : C.accent })))
        if (init.variant === 'danger' && uiStyle() !== 'flat') {
          el.animate([{ translate: '0 0' }, { translate: '-6px 0' }, { translate: '5px 0' }, { translate: '-3px 0' }, { translate: '0 0' }], { duration: 300, delay: 60 })
        }
      },
      still ? 0 : 150,
    )
    // the timer bar drains, and when it is empty the toast leaves
    const a = bar.current?.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: init.duration, easing: 'linear', fill: 'forwards' })
    if (a) {
      timer.current = a
      a.finished.then(
        () => leave(1),
        () => {},
      )
    }
    return () => {
      clearTimeout(land)
      a?.cancel()
    }
  }, [init, spring, leave])

  // evicted by a newer toast
  useEffect(() => {
    if (item.out) leave(1)
  }, [item.out, leave])

  // springy reflow: when the stack shifts, start from the old spot and spring into the new one
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const top = el.offsetTop
    const prev = prevTop.current
    prevTop.current = top
    if (prev === null || prev === top || prefersReducedMotion()) return
    const d = prev - top
    spring.snap({ y: d })
    spring.set({ y: 0 })
    spring.kick({ y: -d * 3 })
  })

  const pause = () => !gone.current && timer.current?.pause()
  const resume = () => !gone.current && !drag.current && timer.current?.play()

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (gone.current || (e.target as Element).closest('button')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x0: e.clientX, dx: 0, t: performance.now(), vx: 0 }
    pause()
  }
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const now = performance.now()
    const dx = e.clientX - d.x0
    d.vx = (dx - d.dx) / Math.max(1, now - d.t)
    d.dx = dx
    d.t = now
    // resist dragging inward, follow freely outward
    const x = dx > 0 ? dx : dx * 0.45
    spring.snap({ x, r: x * 0.03 })
  }
  const onUp = () => {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (Math.abs(d.dx) > FLING || Math.abs(d.vx) > 0.7) leave(d.dx >= 0 ? 1 : -1)
    else {
      spring.set({ x: 0, r: 0 })
      spring.kick({ q: 4 })
      timer.current?.play()
    }
  }

  const tone = TONE[item.variant]
  return (
    <div ref={ref} data-leaving={leaving || undefined} className="pointer-events-auto grid transition-opacity delay-100 duration-300 data-leaving:opacity-0">
      <div
        ref={card}
        role="status"
        onPointerEnter={pause}
        onPointerLeave={resume}
        onFocus={pause}
        onBlur={resume}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="ui-card ui-tone ui-head relative flex cursor-grab touch-pan-y items-center gap-3 overflow-hidden py-3.5 pr-3 pl-4 text-[18px] leading-tight text-ink select-none active:cursor-grabbing"
      >
        <span aria-hidden="true" className={cn('ui-border-thin ui-pill ui-fill size-3 shrink-0', tone.dot)} />
        <span className="mr-2">{item.message}</span>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => leave(1)}
          className="ui-pill ml-auto grid size-7 shrink-0 cursor-pointer place-items-center border-0 bg-transparent p-0 leading-none text-mute transition-[scale,background-color,color] duration-200 ease-snap hover:scale-110 hover:bg-ink hover:text-paper focus-visible:ui-focus"
        >
          <Icon name="close" tone="line" size={14} />
        </button>
        {/* timer: drains to zero, pauses while hovered, focused or dragged */}
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-ink/10">
          <span ref={bar} className={cn('absolute inset-0 origin-left', tone.bar)} />
        </span>
      </div>
    </div>
  )
}

/**
 * Toast provider and stack. Toasts slam in from the right edge with speed lines and
 * lettering, stack on a spring (the rest re-flow when one leaves), can be swiped or
 * flung away, and leave on their own when the timer bar runs out.
 */
export function Toaster({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([])
  const next = useRef(1)

  const push = useCallback<ToastFn>((message, opts) => {
    const id = next.current++
    setItems((list) => {
      const live = list.filter((i) => !i.out)
      const evict = live.length >= MAX ? live.slice(0, live.length - MAX + 1).map((i) => i.id) : []
      const kept = list.map((i) => (evict.includes(i.id) ? { ...i, out: true } : i))
      return [
        ...kept,
        { id, message, sfx: opts?.sfx === undefined ? 'ポン!' : opts.sfx, duration: opts?.duration ?? 3200, variant: opts?.variant ?? 'info' },
      ]
    })
  }, [])
  const remove = useCallback((id: number) => setItems((list) => list.filter((i) => i.id !== id)), [])

  return (
    <ToastContext value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed right-5 bottom-6 z-[9000] grid max-w-[calc(100vw-40px)] justify-items-end gap-3.5">
        {items.map((item) => (
          <Toast key={item.id} item={item} onDone={remove} />
        ))}
      </div>
    </ToastContext>
  )
}
