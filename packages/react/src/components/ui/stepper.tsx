import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { burst, centerOf, clamp, delayed, prefersReducedMotion, sfx, shards, spawn, speedLines, uiStyle, useSprings } from '@/fx'
import { C } from '@/fx/palette'
import { Icon } from '@/components/ui/icon'
import { RollingNumber } from './rolling-number'
import { cn } from '@/lib/utils'

export type StepperProps = {
  /** Visible label (also the spinbutton's name). */
  label: string
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  min?: number
  max?: number
  step?: number
  /** Renders a hidden input so the value submits with a form. */
  name?: string
  /** Turns the number into display text, e.g. `(n) => n + 'x'`. */
  format?: (value: number) => string
  /** Lettering when it reaches max. `false` = none. */
  maxSfx?: string | false
  /** Lettering when it reaches min. `false` = none. */
  minSfx?: string | false
  className?: string
}

const POP = 'cubic-bezier(.2,1.6,.4,1)'
const HOLD_DELAY = 380
const MIN_INTERVAL = 45

type StepButtonProps = { dir: 1 | -1; label: string; atEdge: boolean; onPress: () => void; onRelease: () => void; onTap: () => void }

function StepButton({ dir, label, atEdge, onPress, onRelease, onTap }: StepButtonProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const spring = useSprings(
    ref,
    { sx: 1, sy: 1, y: 0 },
    (v, el) => {
      el.style.transform = `translateY(${v.y}px) scale(${v.sx}, ${v.sy})`
    },
    { stiffness: 640, damping: 13 },
  )
  const up = () => {
    spring.set({ sx: 1, sy: 1, y: 0 })
    spring.kick({ sx: -4, sy: 6 })
    onRelease()
  }
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      aria-disabled={atEdge || undefined}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.preventDefault()
        spring.set({ sx: 1.16, sy: 0.8, y: 2 })
        onPress()
      }}
      onPointerUp={up}
      onPointerLeave={() => {
        spring.set({ sx: 1, sy: 1, y: 0 })
        onRelease()
      }}
      onPointerCancel={up}
      onContextMenu={(e) => e.preventDefault()}
      // keyboard / assistive-tech activation has no pointer events
      onClick={(e) => {
        if (e.detail === 0) {
          spring.kick({ sx: 4, sy: -5 })
          onTap()
        }
      }}
      className="group grid cursor-pointer touch-none border-0 bg-transparent p-0 select-none aria-disabled:cursor-not-allowed"
    >
      <span
        ref={ref}
        className="ui-border-thin ui-r-sm ui-shadow-sm ui-fill grid size-10 place-items-center bg-accent text-white transition-[background-color,opacity] duration-200 group-hover:ui-shadow group-aria-disabled:bg-mute group-aria-disabled:opacity-60"
      >
        <Icon name={dir > 0 ? 'plus' : 'minus'} tone="line" size={20} className="[--icon-bw:5px]" />
      </span>
    </button>
  )
}

/**
 * A numeric stepper (role="spinbutton"). The number is a `RollingNumber`: each digit rolls in
 * its own clipped column the way you went, so nothing ever overlaps. Buttons squash on press; holding one
 * auto-repeats faster and faster with speed lines. Hitting min or max shakes the box with
 * lettering. Keyboard: arrows, PageUp/PageDown, Home/End.
 */
export function Stepper({ label, value, defaultValue = 0, onValueChange, min = 0, max = 99, step = 1, name, format, maxSfx = 'MAX!', minSfx = 'MIN', className }: StepperProps) {
  const decimals = (String(step).split('.')[1] ?? '').length
  const fix = (n: number) => clamp(Number(n.toFixed(decimals)), min, max)
  const show = (n: number) => (format ? format(n) : n.toFixed(decimals))
  const [inner, setInner] = useState(() => fix(defaultValue))
  const current = value ?? inner
  const cur = useRef(current)
  useLayoutEffect(() => {
    cur.current = current
  })

  const id = useId()
  const shell = useRef<HTMLDivElement>(null)
  const display = useRef<HTMLDivElement>(null)
  const hold = useRef({ timer: 0, interval: 0, dir: 0 as 0 | 1 | -1 })
  const [fast, setFast] = useState(false)

  const jolt = useSprings(
    shell,
    { x: 0, s: 1 },
    (v, el) => {
      el.style.transform = `translateX(${v.x}px) scale(${v.s})`
    },
    { stiffness: 700, damping: 14 },
  )

  useEffect(() => () => window.clearTimeout(hold.current.timer), [])

  const edgeHit = (atMax: boolean, bonk: boolean) => {
    const el = display.current
    if (!el || prefersReducedMotion()) return
    const dir = atMax ? 1 : -1
    jolt.kick({ x: dir * (bonk ? 420 : 700) })
    window.setTimeout(() => jolt.kick({ x: -dir * (bonk ? 300 : 520) }), 60)
    el.animate([{ scale: '1' }, { scale: '1.25 .8', offset: 0.3 }, { scale: '1' }], { duration: 300, easing: POP })
    if (bonk) return
    const { x, rect } = centerOf(el)
    spawn(burst(x, rect.top + rect.height / 2, { radius: 30, spikes: 10, color: atMax ? C.accent : C.ink }), delayed(0.03, shards(x, rect.top, { count: 7, speed: 320, size: 6 })))
    const text = atMax ? maxSfx : minSfx
    if (text) spawn(delayed(0.05, sfx(x, rect.top - 26, text, { size: 30, color: atMax ? C.accent : C.ink })))
  }

  /** Returns false when it could not move (already at the edge). */
  const nudge = (delta: number, opts: { fast?: boolean } = {}) => {
    const from = cur.current
    const next = fix(from + delta)
    if (next === from) {
      edgeHit(delta > 0, true)
      return false
    }
    setFast(Boolean(opts.fast))
    cur.current = next
    setInner(next)
    onValueChange?.(next)
    if (!prefersReducedMotion()) jolt.kick({ s: opts.fast ? 0.6 : 1.4 })
    if (next === max || next === min) edgeHit(next === max, false)
    return true
  }

  const stopHold = () => {
    window.clearTimeout(hold.current.timer)
    hold.current.dir = 0
  }

  const startHold = (dir: 1 | -1) => {
    stopHold()
    hold.current.dir = dir
    if (!nudge(dir * step)) return
    hold.current.interval = 170
    const tick = () => {
      if (!hold.current.dir) return
      const iv = hold.current.interval
      const fast = iv < 110
      if (fix(cur.current + dir * step) === cur.current || !nudge(dir * step, { fast })) return stopHold()
      // faster and faster, with speed lines once it's really going
      hold.current.interval = Math.max(MIN_INTERVAL, iv * 0.86)
      const el = display.current
      if (fast && el && uiStyle() !== 'flat') {
        spawn(speedLines(el.getBoundingClientRect(), dir, { count: iv < 70 ? 6 : 3, length: iv < 70 ? 70 : 45 }))
      }
      hold.current.timer = window.setTimeout(tick, hold.current.interval)
    }
    hold.current.timer = window.setTimeout(tick, HOLD_DELAY)
  }

  const onKey = (e: KeyboardEvent) => {
    const moves: Record<string, number> = {
      ArrowUp: step,
      ArrowRight: step,
      ArrowDown: -step,
      ArrowLeft: -step,
      PageUp: step * 10,
      PageDown: -step * 10,
    }
    if (e.key in moves) {
      e.preventDefault()
      nudge(moves[e.key], { fast: e.repeat })
      if (e.repeat && display.current && uiStyle() !== 'flat') spawn(speedLines(display.current.getBoundingClientRect(), moves[e.key] > 0 ? 1 : -1, { count: 3, length: 45 }))
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      nudge((e.key === 'End' ? max : min) - cur.current)
    }
  }

  const text = show(current)
  const atMax = current >= max
  const atMin = current <= min

  return (
    <div className={cn('grid justify-items-start gap-2', className)}>
      <span id={`${id}-label`} className="ui-head text-[15px] leading-none text-ink">
        {label}
      </span>
      {name && <input type="hidden" name={name} value={current} />}
      <div ref={shell} className="ui-border ui-r ui-shadow-sm ui-tone inline-flex items-center gap-1.5 bg-paper p-1.5">
        <StepButton dir={-1} label={`Decrease ${label}`} atEdge={atMin} onPress={() => startHold(-1)} onRelease={stopHold} onTap={() => nudge(-step)} />
        <div
          ref={display}
          role="spinbutton"
          tabIndex={0}
          aria-labelledby={`${id}-label`}
          aria-valuenow={current}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuetext={format ? text : undefined}
          onKeyDown={onKey}
          className="ui-head ui-r-sm flex min-w-[3.4em] cursor-ns-resize justify-center px-2 py-1.5 text-[28px] leading-none text-ink tabular-nums select-none focus-visible:ui-focus"
        >
          <RollingNumber value={current} format={show} live={false} duration={fast ? 240 : 480} stagger={fast ? 0 : 40} />
        </div>
        <StepButton dir={1} label={`Increase ${label}`} atEdge={atMax} onPress={() => startHold(1)} onRelease={stopHold} onTap={() => nudge(step)} />
      </div>
    </div>
  )
}
