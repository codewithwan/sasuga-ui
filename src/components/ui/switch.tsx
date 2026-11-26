import { useEffect, useRef, useState } from 'react'
import { burst, clamp, delayed, prefersReducedMotion, sfx, shards, smoke, spawn, speedLines, uiStyle, useSprings } from '@/fx'
import { C } from '@/fx/palette'
import { cn } from '@/lib/utils'

type Props = {
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (checked: boolean) => void
  label: string
  /** Lettering when it lands on. `false` = none. */
  sfxOn?: string | false
  /** Lettering when it lands off. `false` = none. */
  sfxOff?: string | false
  disabled?: boolean
  className?: string
}

// Measured from the outer edge so the knob sits the same in every style (line weight varies).
const W = 76
const KNOB = 28
const GAP = 6
const TRAVEL = W - KNOB - GAP * 2
const KNOB_STYLE = { left: GAP, width: KNOB, height: KNOB, top: `calc(50% - ${KNOB / 2}px)` }
const GHOST_STYLE = { ...KNOB_STYLE, opacity: 0 }
const LAGS = [24, 48, 76]
const GHOST_ALPHA = [0.6, 0.38, 0.2]

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

function shake(el: HTMLElement | null, amp: number) {
  if (!el || prefersReducedMotion()) return
  const a = uiStyle() === 'flat' ? amp * 0.4 : amp
  el.animate(
    [{ translate: '0 0' }, { translate: `${-a}px ${a * 0.5}px` }, { translate: `${a}px ${-a * 0.4}px` }, { translate: `${-a * 0.5}px 0` }, { translate: '0 0' }],
    { duration: 260, easing: 'linear' },
  )
}

/**
 * Pill track + round knob. Flipping winds the knob back against the wall, then it dashes
 * across trailing afterimages while the accent wipes in behind it, slams into the far end
 * with a burst, ON! / OFF lettering and a jolt of the whole track.
 */
export function Switch({ checked, defaultChecked = false, onChange, label, sfxOn = 'ON!', sfxOff = 'OFF', disabled, className }: Props) {
  const [inner, setInner] = useState(defaultChecked)
  const on = checked ?? inner
  const root = useRef<HTMLButtonElement>(null)
  const track = useRef<HTMLSpanElement>(null)
  const wipe = useRef<HTMLSpanElement>(null)
  const knobBox = useRef<HTMLSpanElement>(null)
  const knob = useRef<HTMLSpanElement>(null)
  const ghosts = useRef<(HTMLSpanElement | null)[]>([])
  const trail = useRef<Sample[]>([])
  const landing = useRef<boolean | null>(null)
  const prev = useRef(on)

  const squash = useSprings(
    knob,
    { sx: 1, sy: 1 },
    (s, el) => {
      el.style.transform = `scale(${s.sx}, ${s.sy})`
    },
    { stiffness: 600, damping: 13 },
  )

  const land = (next: boolean) => {
    const t = track.current
    if (!t) return
    const r = t.getBoundingClientRect()
    const endX = next ? r.right - 20 : r.left + 20
    const y = r.top + r.height / 2
    const color = next ? C.accent : C.ink
    squash.kick({ sx: -6, sy: 8 })
    spawn(
      burst(endX, y, { radius: 28, color, spikes: 10 }),
      shards(endX, y, { count: 7, speed: 320, size: 7 }),
      delayed(0.04, smoke(endX, r.bottom - 2, { count: 3, spread: 22, size: 8 })),
    )
    const text = next ? sfxOn : sfxOff
    if (text) spawn(delayed(0.05, sfx(endX + (next ? 18 : -18), y - 40, text, { size: 30, color })))
    shake(root.current, 3)
  }

  const pos = useSprings(
    knobBox,
    { x: on ? TRAVEL : 0 },
    (s, el, vel) => {
      const x = clamp(s.x, 0, TRAVEL)
      const over = s.x - x
      const flat = uiStyle() === 'flat'
      const st = Math.min(Math.abs(vel.x) / 800, flat ? 0.3 : 0.75)
      const wall = Math.min(Math.abs(over) / 14, 0.4)
      el.style.transformOrigin = over > 0 ? '100% 50%' : over < 0 ? '0% 50%' : '50% 50%'
      el.style.transform = `translateX(${x}px) scale(${1 + st - wall}, ${1 - st * 0.4 + wall * 0.8})`
      if (wipe.current) wipe.current.style.width = `${(x / TRAVEL) * 100}%`
      // afterimages trail the dash
      const lag = lagged(trail.current, x, performance.now())
      ghosts.current.forEach((g, i) => {
        if (!g) return
        const gap = Math.abs(lag[i] - x)
        g.style.transform = `translateX(${lag[i]}px)`
        g.style.opacity = String(gap < 3 ? 0 : clamp((Math.abs(vel.x) - 80) / 500, 0, 1) * GHOST_ALPHA[i] * (flat ? 0.5 : 1))
      })
      const l = landing.current
      if (l !== null && (l ? s.x >= TRAVEL - 0.5 : s.x <= 0.5)) {
        landing.current = null
        land(l)
      }
    },
    { stiffness: 460, damping: 19 },
  )

  // Drive the visuals from the state, so controlled switches animate too.
  useEffect(() => {
    if (prev.current === on) return
    prev.current = on
    const to = on ? TRAVEL : 0
    if (prefersReducedMotion()) return pos.snap({ x: to })
    const dir = on ? 1 : -1
    // anticipation: the knob winds back into the wall it is leaving
    pos.set({ x: TRAVEL - to - dir * 6 })
    squash.kick({ sx: -3, sy: 3 })
    const id = window.setTimeout(() => {
      landing.current = on
      pos.set({ x: to })
      pos.kick({ x: dir * 320 })
      squash.kick({ sx: 3, sy: -3 })
      const t = track.current
      if (t) spawn(speedLines(t.getBoundingClientRect(), on ? 1 : -1, { count: 10, length: 80 }))
    }, 90)
    return () => window.clearTimeout(id)
  }, [on, pos, squash])

  const release = () => squash.set({ sx: 1, sy: 1 })

  return (
    <button
      ref={root}
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        const next = !on
        setInner(next)
        onChange?.(next)
      }}
      onPointerDown={() => squash.set({ sx: 1.14, sy: 0.84 })}
      onPointerUp={release}
      onPointerLeave={release}
      style={{ width: W }}
      className={cn(
        'group ui-pill relative h-10 shrink-0 cursor-pointer touch-manipulation border-0 bg-transparent p-0 disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
    >
      <span ref={track} className={cn('ui-border ui-pill ui-shadow-sm ui-tone absolute inset-0 overflow-hidden bg-canvas transition-colors duration-200', on && 'ui-fill')}>
        <span ref={wipe} className="ui-fill absolute inset-y-0 left-0 w-0 overflow-hidden bg-accent">
          <span aria-hidden="true" className="absolute inset-y-1.5 right-2 w-1.5 rounded-full bg-white/60" />
        </span>
      </span>
      {LAGS.map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            ghosts.current[i] = el
          }}
          aria-hidden="true"
          style={GHOST_STYLE}
          className="ui-border-thin ui-pill pointer-events-none absolute bg-accent-soft"
        />
      ))}
      <span ref={knobBox} aria-hidden="true" style={KNOB_STYLE} className="absolute">
        <span
          ref={knob}
          className="ui-border-thin ui-pill ui-shadow-press block size-full bg-paper"
        />
      </span>
    </button>
  )
}
