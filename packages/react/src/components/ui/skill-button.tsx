import { useEffect, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { KICK, burst, centerOf, delayed, impactOn, prefersReducedMotion, rand, sfx as sfxFx, sparkle, spawn, uiStyle, useSprings } from '@/fx'
import { C } from '@/fx/palette'
import { flashEl, shakeEl, useLatest } from './hud-fx'
import { cn } from '@/lib/utils'

export type SkillButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onClick'> & {
  /** Ability name: the accessible name and the caption under the button. */
  label: string
  /** The icon (emoji, svg, img…). */
  children?: ReactNode
  /** Cooldown after a cast, in ms. `0` = none. */
  cooldown?: number
  /** Fired when the skill is cast (ready + pressed). */
  onCast?: () => void
  /** Fired when the cooldown runs out. */
  onReady?: () => void
  /** Key hint in the corner, e.g. "Q". It also casts the skill unless `hotkey` is false. */
  keybind?: string
  /** Listen for `keybind` on the window (ignored while typing in a field). */
  hotkey?: boolean
  shape?: 'square' | 'round'
  size?: 'sm' | 'md' | 'lg'
  /** Lettering on cast. `false` = none. */
  sfx?: string | false
  /** Lettering when the cooldown ends. `false` = none. */
  readySfx?: string | false
  /** Show the label under the button. */
  showLabel?: boolean
}

const SIZE = {
  sm: { face: 'size-12 text-[22px]', num: 'text-[18px]', power: 0.55 },
  md: { face: 'size-16 text-[30px]', num: 'text-[24px]', power: 0.75 },
  lg: { face: 'size-20 text-[38px]', num: 'text-[30px]', power: 0.95 },
} as const

const secondsLeft = (ms: number) => (ms >= 1000 ? String(Math.ceil(ms / 1000)) : (ms / 1000).toFixed(1))
const keyOf = (k: string) => (k.toLowerCase() === 'space' ? ' ' : k.toLowerCase())

/**
 * An ability button for a game hotbar. Cast it and it hits like an anime impact frame,
 * then a radial sweep counts the cooldown down. When it is back it flashes, rings and
 * shouts READY; pressing it while it cools just shakes it off.
 */
export function SkillButton({
  label,
  children,
  cooldown = 3000,
  onCast,
  onReady,
  keybind,
  hotkey = true,
  shape = 'square',
  size = 'md',
  sfx = 'ドン!',
  readySfx = 'READY',
  showLabel = true,
  disabled,
  className,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  ...rest
}: SkillButtonProps) {
  const btn = useRef<HTMLButtonElement>(null)
  const body = useRef<HTMLSpanElement>(null)
  const face = useRef<HTMLSpanElement>(null)
  const sweep = useRef<HTMLSpanElement>(null)
  const num = useRef<HTMLSpanElement>(null)
  const flash = useRef<HTMLSpanElement>(null)
  const ring = useRef<HTMLSpanElement>(null)
  const endAt = useRef(0)
  const total = useRef(cooldown)
  const [cooling, setCooling] = useState(false)
  const [status, setStatus] = useState('')
  const s = SIZE[size]
  const round = shape === 'round' ? 'ui-pill' : 'ui-r'

  const spring = useSprings(
    body,
    { sx: 1, sy: 1, y: 0, r: 0 },
    (v, el) => {
      el.style.transform = `translateY(${v.y}px) rotate(${v.r}deg) scale(${v.sx}, ${v.sy})`
    },
    { stiffness: 640, damping: 15 },
  )

  // the sweep: what is left of the cooldown stays dark, clockwise from 12 o'clock
  const paint = (left: number) => {
    const done = 1 - left / Math.max(1, total.current)
    if (sweep.current) {
      sweep.current.style.background =
        left > 0
          ? `conic-gradient(from 0turn, transparent ${done}turn, var(--color-accent-soft) ${done}turn ${done + 0.012}turn, color-mix(in srgb, var(--color-ink) 64%, transparent) ${done + 0.012}turn)`
          : 'none'
    }
    if (num.current) num.current.textContent = left > 0 ? secondsLeft(left) : ''
  }

  const ready = () => {
    setCooling(false)
    setStatus(`${label} ready`)
    onReady?.()
    paint(0)
    const el = face.current
    if (!el || prefersReducedMotion()) return
    flashEl(flash.current, 1, 380)
    spring.kick({ sx: 4, sy: -5, y: -40 })
    ring.current?.animate(
      [
        { transform: 'scale(.9)', opacity: 1 },
        { transform: 'scale(1.7)', opacity: 0 },
      ],
      { duration: 520, easing: 'cubic-bezier(.2,.7,.3,1)' },
    )
    const { x, y, rect } = centerOf(el)
    spawn(burst(x, y, { radius: rect.width * 0.55, spikes: 10, color: C.accent }), delayed(0.08, sparkle(rect.right - 4, rect.top + 2, { size: 13, color: C.pop })))
    if (readySfx) spawn(delayed(0.04, sfxFx(x, rect.top - 18, readySfx, { size: 22 + rect.width * 0.12, color: C.accent })))
  }
  const readyRef = useLatest(ready)
  const paintRef = useLatest(paint)

  // cooldown loop: writes the sweep and the number straight to the DOM
  useEffect(() => {
    if (!cooling) return
    let raf = 0
    const tick = () => {
      const left = endAt.current - performance.now()
      if (left <= 0) {
        readyRef.current()
        return
      }
      paintRef.current(left)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [cooling, readyRef, paintRef])

  const fire = () => {
    if (disabled) return
    const el = face.current
    if (cooling) {
      // not yet: shake it off
      shakeEl(body.current?.parentElement, 0.9, 300)
      num.current?.animate([{ color: 'var(--color-pop)', transform: 'scale(1.35)' }, { transform: 'none' }], { duration: 320, easing: 'ease-out' })
      return
    }
    onCast?.()
    if (el && !prefersReducedMotion()) {
      spring.set({ sx: 1, sy: 1, y: 0, r: 0 })
      spring.kick({ sx: -7, sy: 10, y: -70, r: (Math.random() < 0.5 ? -1 : 1) * rand(40, 80) })
      flashEl(flash.current, 0.9, 220)
      impactOn(el, { text: sfx, size: s.power })
    }
    if (cooldown > 0) {
      total.current = cooldown
      endAt.current = performance.now() + cooldown
      paint(cooldown)
      setCooling(true)
      setStatus(`${label} cast, cooling down for ${Math.ceil(cooldown / 1000)} seconds`)
    } else {
      setStatus(`${label} cast`)
    }
  }
  const fireRef = useLatest(fire)

  // keyboard hotkey on the window
  useEffect(() => {
    if (!keybind || !hotkey) return
    const want = keyOf(keybind)
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || e.key.toLowerCase() !== want) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      if (t === btn.current && (want === ' ' || want === 'enter')) return // the button handles it itself
      e.preventDefault()
      fireRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [keybind, hotkey, fireRef])

  const press = () => {
    if (disabled || cooling) return
    const k = KICK[uiStyle()]
    spring.set({ sx: 1 + 0.12 * k, sy: 1 - 0.16 * k, y: 3 * k })
  }
  const release = () => spring.set({ sx: 1, sy: 1, y: 0 })

  return (
    <>
    <button
      ref={btn}
      type="button"
      {...rest}
      disabled={disabled}
      aria-label={label}
      aria-disabled={cooling || undefined}
      aria-keyshortcuts={keybind}
      data-cooling={cooling || undefined}
      onClick={fire}
      onPointerDown={(e) => {
        press()
        onPointerDown?.(e)
      }}
      onPointerUp={(e) => {
        release()
        onPointerUp?.(e)
      }}
      onPointerLeave={(e) => {
        release()
        onPointerLeave?.(e)
      }}
      className={cn(
        'group relative inline-grid cursor-pointer touch-manipulation justify-items-center gap-2 border-0 bg-transparent p-0 text-ink focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-cooling:cursor-not-allowed',
        className,
      )}
    >
      <span className="relative grid">
        <span ref={body} className="relative grid origin-[50%_90%]">
          <span
            ref={face}
            className={cn(
              'ui-border ui-shadow ui-fill relative grid place-items-center overflow-hidden bg-accent leading-none text-white transition-[translate,box-shadow,background-color,color] duration-200 ease-snap',
              'group-hover:-translate-y-0.5 group-hover:ui-shadow-hover group-active:translate-y-[3px] group-active:ui-shadow-press',
              'group-focus-visible:outline-[2.5px] group-focus-visible:outline-offset-4 group-focus-visible:outline-accent group-focus-visible:outline-solid',
              'group-data-cooling:bg-canvas group-data-cooling:text-mute group-data-cooling:ui-shadow-sm group-data-cooling:group-hover:translate-y-0',
              round,
              s.face,
            )}
          >
            <span aria-hidden="true" className="relative grid place-items-center transition-[scale,filter] duration-300 group-data-cooling:scale-90 group-data-cooling:grayscale">
              {children}
            </span>
            {/* glossy cap */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-[18%] top-[8%] h-[14%] rounded-full bg-white/35 group-data-cooling:hidden" />
            <span ref={sweep} aria-hidden="true" className="pointer-events-none absolute inset-0" />
            <span ref={num} aria-hidden="true" className={cn('ui-head pointer-events-none absolute inset-0 grid place-items-center leading-none text-paper tabular-nums [text-shadow:0_1px_6px_var(--color-ink)]', s.num)} />
            <span ref={flash} aria-hidden="true" className="pointer-events-none absolute inset-0 bg-paper opacity-0" />
          </span>
          {/* ready ring */}
          <span ref={ring} aria-hidden="true" className={cn('pointer-events-none absolute inset-0 opacity-0 outline-[3px] outline-accent outline-solid', round)} />
        </span>
        {keybind && (
          <kbd className="ui-head ui-border-thin ui-r-sm ui-shadow-sm absolute -top-2 -right-2 z-10 inline-flex min-w-[1.7em] items-center justify-center bg-paper px-1.5 pt-1 pb-0.5 text-xs leading-none text-ink">
            {keybind}
          </kbd>
        )}
      </span>
      {showLabel && (
        <span aria-hidden="true" className="ui-head max-w-24 truncate text-xs leading-none">
          {label}
        </span>
      )}
    </button>
    <span className="sr-only" aria-live="polite">
      {status}
    </span>
    </>
  )
}
