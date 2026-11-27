import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, HTMLAttributes, Ref } from 'react'
import { burst, centerOf, delayed, impactOn, prefersReducedMotion, rand, rays, shards, smoke, sparkle, spawn } from '@/fx'
import { C } from '@/fx/palette'
import { useTheme } from '@/lib/theme'
import { Icon } from '@/components/ui/icon'
import { RollingNumber } from './rolling-number'
import { POP_EASE, hudKick, shakeEl, useLatest } from './hud-fx'
import { cn } from '@/lib/utils'

export type CountdownVariant = 'stamp' | 'ring' | 'timer'

export type CountdownProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /**
   * `stamp`: 3 · 2 · 1 · GO! crashing onto a flashing panel. `ring`: the same show inside a
   * round badge whose ring sweeps every beat. `timer`: an mm:ss clock with a draining ring.
   */
  variant?: CountdownVariant
  /** @deprecated Use `variant`. `'stamp' | 'timer'` still works. */
  mode?: 'stamp' | 'timer'
  /** Stamp / ring: the first number (3). Timer: seconds on the clock (60). */
  from?: number
  /** Stamp / ring: start the sequence when it turns true (again to replay). Timer: pause / resume. */
  running?: boolean
  /** Stamp / ring: fired on GO!. Timer: fired at 0. */
  onDone?: () => void
  /** Timer: called with the whole seconds left whenever they change. */
  onTick?: (secondsLeft: number) => void
  /** Stamp / ring: the last word. */
  goText?: string
  /** Stamp / ring: canvas lettering thrown with GO! (cel / manga). `false` = none. */
  goSfx?: string | false
  /** Stamp / ring: shown on the panel before the first run. `false` = nothing. */
  readyText?: string | false
  /** Timer: lettering stamped at 0. `false` = none. */
  endText?: string | false
  /** Stamp / ring: ms each number holds. */
  step?: number
  /** Timer: seconds left at which it starts to panic (pop colour, pulse, shake). */
  panicAt?: number
  /** Accessible name. */
  label?: string
}

const pad = (n: number) => String(n).padStart(2, '0')
function clock(total: number) {
  const t = Math.max(0, Math.round(total))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

// the panel flashes through the theme colours, one per beat
const BEAT_COLORS = ['var(--color-accent)', 'var(--color-pop)', 'var(--color-accent-soft)']

// the outgoing number breaks into a 3 × 2 grid of pieces (rectangular insets, oversized on
// the outer edges so the lettering stroke is never trimmed)
const PIECES = Array.from({ length: 6 }, (_, i) => {
  const c = i % 3
  const r = Math.floor(i / 3)
  const left = c === 0 ? '-40%' : `${(c * 100) / 3}%`
  const right = c === 2 ? '-40%' : `${((2 - c) * 100) / 3}%`
  const top = r === 0 ? '-40%' : '50%'
  const bottom = r === 0 ? '50%' : '-40%'
  return { c, r, clip: `inset(${top} ${right} ${bottom} ${left})` }
})

/* focus lines behind the number: a repeating conic fan, cleared in the middle */
const LINES: CSSProperties = {
  background: 'repeating-conic-gradient(from 0deg, color-mix(in srgb, var(--color-ink) 16%, transparent) 0deg 2.2deg, transparent 2.2deg 9deg)',
  maskImage: 'radial-gradient(circle, transparent 24%, #000 62%)',
  WebkitMaskImage: 'radial-gradient(circle, transparent 24%, #000 62%)',
}

function SweepRing({ progress, round }: { progress: Ref<SVGCircleElement>; round: boolean }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className="pointer-events-none absolute inset-0 size-full -rotate-90 overflow-visible">
      <circle cx="50" cy="50" r={round ? 46 : 40} pathLength={1} fill="none" strokeWidth={round ? 5 : 2.5} className="stroke-line" />
      <circle
        ref={progress}
        cx="50"
        cy="50"
        r={round ? 46 : 40}
        pathLength={1}
        fill="none"
        strokeWidth={round ? 5 : 2.5}
        strokeLinecap="round"
        strokeDasharray="1 1"
        strokeDashoffset={1}
        className="origin-center stroke-accent"
      />
    </svg>
  )
}

/**
 * Round start and round clock.
 *  - `stamp` / `ring`: each number crashes in huge with focus lines, the panel flashes the theme
 *    colours, a ring sweeps round once per beat and the old number shatters as the next one
 *    lands. GO! hits with a full burst, rays, lettering and a shake.
 *  - `timer`: an mm:ss `RollingNumber` inside a draining progress ring. The last seconds turn
 *    the pop colour, pulse and jolt on every tick, and TIME UP! is stamped at zero.
 */
export function Countdown({
  variant: variantProp,
  mode,
  from,
  running = true,
  onDone,
  onTick,
  goText = 'GO!',
  goSfx = 'ドン!',
  readyText = 'Ready?',
  endText = 'Time up!',
  step = 900,
  panicAt = 10,
  label,
  className,
  ...props
}: CountdownProps) {
  const variant: CountdownVariant = variantProp ?? mode ?? 'stamp'
  const timerMode = variant === 'timer'
  const round = variant === 'ring'
  const { style } = useTheme()
  const flat = style === 'flat'
  const start = Math.max(0, Math.round(from ?? (timerMode ? 60 : 3)))
  const root = useRef<HTMLDivElement>(null)
  const stamp = useRef<HTMLSpanElement>(null)
  const pieces = useRef<HTMLSpanElement>(null)
  const flash = useRef<HTMLSpanElement>(null)
  const lines = useRef<HTMLSpanElement>(null)
  const sweep = useRef<SVGCircleElement>(null)
  const face = useRef<HTMLDivElement>(null)
  const endStamp = useRef<HTMLSpanElement>(null)
  const onDoneRef = useLatest(onDone)
  const onTickRef = useLatest(onTick)
  const runs = useRef(0)

  /* ── stamp / ring: one timeout per beat ── */
  const [beat, setBeat] = useState<{ run: number; i: number }>({ run: 0, i: -1 })
  useEffect(() => {
    if (timerMode || !running) return
    const run = ++runs.current
    const ids: number[] = []
    for (let i = 0; i <= start; i++) ids.push(window.setTimeout(() => setBeat({ run, i }), i * step))
    // i === start + 1: cleared after GO! has had its moment
    ids.push(window.setTimeout(() => setBeat({ run, i: start + 1 }), start * step + step * 1.6))
    return () => ids.forEach(clearTimeout)
  }, [timerMode, running, start, step])

  const showing = !timerMode && running && beat.i >= 0 && beat.i <= start
  const isGo = showing && beat.i === start
  const stampText = isGo ? goText : String(start - beat.i)
  // the number that was just replaced shatters
  const brokenText = showing && beat.i >= 1 ? String(start - beat.i + 1) : null

  useLayoutEffect(() => {
    if (!showing) return
    if (isGo) onDoneRef.current?.()
    const el = stamp.current
    if (!el || prefersReducedMotion()) return
    const k = hudKick()
    const color = isGo ? 'var(--color-pop)' : BEAT_COLORS[beat.i % BEAT_COLORS.length]

    // the crash: huge and blurred → squashed on impact → overshoot → hold
    const big = 1 + (isGo ? 2.6 : 2.2) * k
    el.animate(
      isGo
        ? [
            { scale: `${big}`, opacity: 0, filter: 'blur(10px)' },
            { scale: `${1 - 0.18 * k}`, opacity: 1, filter: 'blur(0)', offset: 0.09 },
            { scale: `${1 + 0.1 * k}`, offset: 0.16 },
            { scale: '1', opacity: 1, offset: 0.26 },
            { scale: `${1 + 0.05 * k}`, opacity: 1, offset: 0.78 },
            { scale: `${1 + 0.6 * k}`, opacity: 0, filter: 'blur(6px)' },
          ]
        : [
            { scale: `${big}`, opacity: 0, filter: 'blur(10px)' },
            { scale: `${1 - 0.16 * k}`, opacity: 1, filter: 'blur(0)', offset: 0.14 },
            { scale: `${1 + 0.07 * k}`, offset: 0.24 },
            { scale: '1', opacity: 1, filter: 'blur(0)', offset: 0.36 },
            { scale: `${1 + 0.04 * k}`, opacity: 1, filter: 'blur(0)' },
          ],
      { duration: isGo ? step * 1.6 : step, easing: 'ease-out', fill: 'forwards' },
    )

    // the panel flashes this beat's colour
    if (flash.current) {
      flash.current.style.backgroundColor = color
      const peak = flat ? 0.3 : 0.95
      flash.current.animate(
        isGo ? [{ opacity: peak }, { opacity: peak * 0.2, offset: 0.2 }, { opacity: peak * 0.9, offset: 0.35 }, { opacity: 0 }] : [{ opacity: peak }, { opacity: 0 }],
        { duration: isGo ? 820 : step * 0.6, easing: 'ease-out' },
      )
    }
    lines.current?.animate(
      [
        { opacity: 0, scale: '1.5', rotate: `${rand(-10, 10)}deg` },
        { opacity: 1, scale: '1', rotate: '0deg', offset: 0.16 },
        { opacity: isGo ? 0 : 0.35, scale: '1', rotate: `${rand(-3, 3)}deg` },
      ],
      { duration: isGo ? step * 1.4 : step, easing: 'ease-out', fill: 'forwards' },
    )
    // the ring sweeps round once per beat; on GO! it blows outward
    const ring = sweep.current
    if (ring) {
      ring.style.stroke = isGo ? 'var(--color-pop)' : color === 'var(--color-accent-soft)' ? 'var(--color-accent)' : color
      ring.getAnimations().forEach((a) => a.cancel())
      if (isGo) {
        ring.animate([{ strokeDashoffset: 0, scale: '1', opacity: 1 }, { strokeDashoffset: 0, scale: '1.45', opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' })
      } else {
        ring.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: step, easing: 'linear', fill: 'forwards' })
      }
    }
    // the previous number breaks apart
    if (pieces.current) {
      const box = pieces.current.getBoundingClientRect()
      pieces.current.querySelectorAll<HTMLElement>('[data-piece]').forEach((p, n) => {
        const { c, r } = PIECES[n]
        const dx = ((c - 1) * 0.9 + rand(-0.3, 0.3)) * box.width * 0.7 * k
        const dy = ((r === 0 ? -1 : 1) * 0.6 + rand(-0.2, 0.3)) * box.height * k
        p.animate(
          [
            { translate: '0 0', rotate: '0deg', scale: '1', opacity: 1 },
            { translate: `${dx}px ${dy + box.height * 0.5}px`, rotate: `${rand(-50, 50)}deg`, scale: '.7', opacity: 0 },
          ],
          { duration: 520, easing: 'cubic-bezier(.15,.7,.35,1)', fill: 'forwards' },
        )
      })
      spawn(shards(box.left + box.width / 2, box.top + box.height / 2, { count: 10, speed: 420, size: 9 }))
    }

    // the hit lands when the number bottoms out
    const land = window.setTimeout(
      () => {
        const host = root.current
        if (!host) return
        const { x, y, rect } = centerOf(el)
        const reach = Math.max(rect.width, rect.height)
        if (isGo) {
          shakeEl(host, 3, 560)
          shakeEl(host.parentElement, 1.2, 420)
          impactOn(el, { text: goSfx, size: round ? 1.5 : 1.9, color: C.pop })
          spawn(
            rays(x, y, { inner: reach * 0.5, outer: reach * 2.6, count: 30 }),
            delayed(0.08, burst(x, y, { radius: reach * 0.45, spikes: 16, color: C.accent })),
            delayed(0.1, sparkle(rect.right, rect.top, { size: 20, color: C.pop })),
            delayed(0.18, sparkle(rect.left, rect.bottom - 8, { size: 15 })),
            delayed(0.24, sparkle(rect.right - 10, rect.bottom, { size: 12, color: C.accent })),
          )
        } else {
          shakeEl(host, 1.4, 300)
          spawn(
            rays(x, y, { inner: reach * 0.45, outer: reach * 1.8, count: 22 }),
            burst(x, y, { radius: reach * 0.26, spikes: 12, color: C.accent }),
            delayed(0.04, smoke(x, rect.bottom - 8, { count: 5, spread: rect.width * 0.5, size: 12 })),
          )
        }
      },
      step * 0.14,
    )
    return () => clearTimeout(land)
    // one run per beat
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showing, isGo, beat.i, beat.run, step])

  /* ── timer ── */
  const [left, setLeft] = useState(start)
  const remain = useRef(start * 1000)
  const paintRing = (ms: number) => {
    if (sweep.current) sweep.current.style.strokeDashoffset = String(1 - ms / Math.max(1, start * 1000))
  }
  useLayoutEffect(() => {
    if (timerMode) paintRing(remain.current)
  })
  useEffect(() => {
    if (!timerMode || !running || remain.current <= 0) return
    const end = performance.now() + remain.current
    let id = 0
    const tick = () => {
      const ms = Math.max(0, end - performance.now())
      remain.current = ms
      paintRing(ms)
      setLeft(Math.ceil(ms / 1000))
      if (ms <= 0) {
        onDoneRef.current?.()
        return
      }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
    // paintRing only reads refs and `start`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerMode, running, start, onDoneRef])

  const panic = timerMode && left > 0 && left <= panicAt
  const timeUp = timerMode && left <= 0
  const prevLeft = useRef(left)
  useEffect(() => {
    if (!timerMode || prevLeft.current === left) return
    prevLeft.current = left
    onTickRef.current?.(left)
    if (prefersReducedMotion()) return
    const el = face.current
    if (panic && el) {
      // every panicking second: the clock jolts, the face pulses, the ring flares
      const urgency = 1 - (left - 1) / Math.max(1, panicAt)
      shakeEl(root.current, 0.6 + urgency * 1.8, 280)
      el.animate([{ scale: `${1.06 + urgency * 0.08}` }, { scale: '1' }], { duration: 360, easing: POP_EASE })
      sweep.current?.animate([{ strokeWidth: 9 }, { strokeWidth: 5 }], { duration: 360, easing: 'ease-out' })
      if (left <= 3) {
        const { x, y, rect } = centerOf(el)
        spawn(rays(x, y, { inner: rect.width * 0.5, outer: rect.width * 0.95, count: 16 }))
      }
    } else if (timeUp && el) {
      shakeEl(root.current, 2.6, 520)
      impactOn(el, { text: false, size: 1.3, color: C.pop })
    }
  }, [timerMode, left, panic, timeUp, panicAt, onTickRef])

  useLayoutEffect(() => {
    const el = endStamp.current
    if (!timeUp || !el || prefersReducedMotion()) return
    const k = hudKick()
    el.animate(
      [
        { scale: `${1 + 2 * k}`, opacity: 0, filter: 'blur(6px)' },
        { scale: `${1 - 0.12 * k}`, opacity: 1, filter: 'blur(0)', offset: 0.55 },
        { scale: `${1 + 0.05 * k}`, offset: 0.75 },
        { scale: '1', opacity: 1, filter: 'blur(0)' },
      ],
      { duration: 480, easing: 'ease-out', fill: 'backwards' },
    )
  }, [timeUp])

  const letter = flat ? 'ui-head' : cn('ui-lettering', style === 'cel' && 'font-display')
  const spoken = !timerMode
    ? showing
      ? stampText
      : ''
    : timeUp
      ? endText || 'Time up'
      : panic && (left === panicAt || left <= 5)
        ? `${left} seconds left`
        : ''

  if (timerMode) {
    return (
      <div
        ref={root}
        role="timer"
        aria-label={label ?? 'Time left'}
        data-panic={panic || undefined}
        data-done={timeUp || undefined}
        className={cn('group/timer relative inline-grid place-items-center', className)}
        {...props}
      >
        <div ref={face} className="relative grid size-[184px] place-items-center">
          <svg viewBox="0 0 100 100" aria-hidden="true" className="pointer-events-none absolute inset-0 size-full -rotate-90 overflow-visible">
            <circle cx="50" cy="50" r="45" fill="none" strokeWidth={5} className="stroke-accent-soft transition-[stroke] duration-300 group-data-done/timer:stroke-line" />
            <circle cx="50" cy="50" r="50.5" pathLength={60} fill="none" strokeWidth={1.4} strokeDasharray="0.12 0.88" className="stroke-ink opacity-30" />
            <circle
              ref={sweep}
              cx="50"
              cy="50"
              r="45"
              pathLength={1}
              fill="none"
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray="1 1"
              className="stroke-accent transition-[stroke] duration-300 group-data-panic/timer:stroke-pop"
            />
          </svg>
          <div className="ui-card ui-tone relative grid size-[140px] place-content-center justify-items-center gap-1.5 overflow-hidden rounded-full!">
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-pop opacity-0 transition-opacity duration-300 group-data-panic/timer:opacity-15" />
            <span className="ui-head relative flex items-center gap-1 text-[12px] leading-none text-mute group-data-panic/timer:text-pop">
              <Icon name="clock" size={14} />
              {timeUp ? 'Done' : 'Time'}
            </span>
            <RollingNumber
              value={Math.max(0, left)}
              format={clock}
              duration={420}
              stagger={30}
              live={false}
              className="ui-head relative text-[36px] leading-none text-ink transition-colors duration-300 group-data-done/timer:text-mute group-data-panic/timer:text-pop"
            />
          </div>
        </div>
        {timeUp && endText && (
          <span
            ref={endStamp}
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-1/2 whitespace-nowrap',
              letter,
              flat ? 'ui-pill ui-shadow ui-fill bg-pop px-4 py-1.5 text-[22px] leading-none text-white' : 'text-[46px] text-pop!',
            )}
          >
            {endText}
          </span>
        )}
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {spoken}
        </span>
      </div>
    )
  }

  const numSize = round ? 'text-[88px]' : 'text-[124px]'
  const goSize = round ? 'text-[60px]' : 'text-[112px]'
  const numClass = (go: boolean) => cn('block leading-none whitespace-nowrap tabular-nums', letter, go ? cn(goSize, flat ? 'text-accent' : 'text-pop!') : cn(numSize, flat ? 'text-ink' : 'text-paper!'))

  return (
    <div
      ref={root}
      role="group"
      aria-label={label ?? 'Countdown'}
      className={cn('relative grid place-items-center', round ? 'size-[216px]' : 'h-[230px] w-[min(100%,320px)]', className)}
      {...props}
    >
      {/* the panel: flashes, focus lines */}
      <div className={cn('ui-tone absolute inset-0 overflow-hidden bg-paper', round ? 'ui-border ui-shadow rounded-full' : 'ui-card')}>
        <span ref={flash} aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-0" />
        <span ref={lines} aria-hidden="true" className="fx-only pointer-events-none absolute -inset-1/2 opacity-0" style={LINES} />
      </div>
      <div aria-hidden="true" className={cn('pointer-events-none absolute', round ? 'inset-2' : 'top-1/2 left-1/2 size-[200px] -translate-1/2')}>
        <SweepRing progress={sweep} round={round} />
      </div>
      {!showing && beat.run === 0 && readyText && <span className="ui-head relative text-[26px] leading-none text-mute">{readyText}</span>}
      {brokenText && !prefersReducedMotion() && (
        <span key={`b-${beat.run}-${beat.i}`} aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center">
          <span ref={pieces} className={cn('relative', numClass(false))}>
            <span className="invisible">{brokenText}</span>
            {PIECES.map((p, n) => (
              <span key={n} data-piece="" className="absolute inset-0" style={{ clipPath: p.clip }}>
                {brokenText}
              </span>
            ))}
          </span>
        </span>
      )}
      {showing && (
        <span key={`${beat.run}-${beat.i}`} aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center">
          <span ref={stamp} className={numClass(isGo)}>
            {stampText}
          </span>
        </span>
      )}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {spoken}
      </span>
    </div>
  )
}
