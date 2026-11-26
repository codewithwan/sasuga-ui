import { useEffect, useRef, useState } from 'react'
import type { HTMLAttributes } from 'react'
import { pop, prefersReducedMotion, spawn, useSprings } from '@/fx'
import { cn } from '@/lib/utils'

export type KbdProps = HTMLAttributes<HTMLElement> & {
  /** Hold the key down (e.g. while the player presses it). */
  pressed?: boolean
  /** Light up while this real key is held: a KeyboardEvent.key value, or several. Case-insensitive. */
  listen?: string | string[]
}

/**
 * Keycap sticker: outlined, with the style's small shadow. It squashes into its
 * shadow when pressed (pointer, `pressed` or a `listen`ed key) and springs back up
 * with a little dot pop on release.
 */
export function Kbd({ pressed, listen, className, onPointerDown, onPointerUp, onPointerLeave, ...props }: KbdProps) {
  const ref = useRef<HTMLElement>(null)
  const [held, setHeld] = useState(false)
  const [keyHeld, setKeyHeld] = useState(false)
  const down = !!pressed || held || keyHeld
  const was = useRef(down)
  const spring = useSprings(
    ref,
    { q: 0 },
    (v, el) => {
      el.style.transform = `scale(${1 + v.q * 0.08}, ${1 - v.q * 0.12})`
    },
    { stiffness: 700, damping: 14 },
  )

  useEffect(() => {
    if (was.current === down) return
    was.current = down
    if (down) {
      spring.set({ q: 1 })
      return
    }
    spring.set({ q: 0 })
    spring.kick({ q: -14 })
    const el = ref.current
    if (!el || prefersReducedMotion()) return
    const r = el.getBoundingClientRect()
    spawn(pop(r.left + r.width / 2, r.top + r.height / 2, Math.max(28, r.width * 0.9)))
  }, [down, spring])

  const keys = (Array.isArray(listen) ? listen : listen ? [listen] : []).map((k) => k.toLowerCase()).join('\u0000')
  useEffect(() => {
    if (!keys) return
    const list = keys.split('\u0000')
    const match = (e: KeyboardEvent) => list.includes(e.key.toLowerCase())
    const onDown = (e: KeyboardEvent) => match(e) && setKeyHeld(true)
    const onUp = (e: KeyboardEvent) => match(e) && setKeyHeld(false)
    const onBlur = () => setKeyHeld(false)
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [keys])

  return (
    <kbd
      ref={ref}
      data-pressed={down || undefined}
      className={cn(
        'ui-head ui-border-thin ui-r-sm ui-shadow-sm inline-flex min-w-[2em] origin-bottom items-center justify-center bg-paper px-2 pt-1 pb-0.5 text-sm leading-none text-ink select-none [&>svg]:size-[1.15em]',
        'transition-[translate,box-shadow,background-color,color] duration-75 data-pressed:translate-x-px data-pressed:translate-y-0.5 data-pressed:bg-accent-soft data-pressed:ui-shadow-press',
        className,
      )}
      onPointerDown={(e) => {
        setHeld(true)
        onPointerDown?.(e)
      }}
      onPointerUp={(e) => {
        setHeld(false)
        onPointerUp?.(e)
      }}
      onPointerLeave={(e) => {
        setHeld(false)
        onPointerLeave?.(e)
      }}
      {...props}
    />
  )
}
