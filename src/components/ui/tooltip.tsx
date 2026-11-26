import { cloneElement, useEffect, useId, useRef, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { burst, prefersReducedMotion, spawn, sparkle, useSprings } from '@/fx'
import { C } from '@/fx/palette'
import { cn } from '@/lib/utils'

export type TooltipProps = {
  content: ReactNode
  /** A single focusable element (button, link…). It gets aria-describedby. */
  children: ReactElement<{ 'aria-describedby'?: string }>
  side?: 'top' | 'bottom'
  className?: string
}

/**
 * Small sticker bubble with a tail. It pops out of its trigger on hover or keyboard
 * focus: squashed flat against the trigger, it stretches out past its size, wobbles
 * to rest, and a tiny burst marks where it left the trigger.
 */
export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const id = useId()
  const bubble = useRef<HTMLSpanElement>(null)
  const anchor = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState(false)
  const visible = useRef(false)
  const top = side === 'top'

  const spring = useSprings(
    bubble,
    { s: 0, y: top ? 10 : -10, r: 0, q: 0 },
    (v, el) => {
      const s = Math.max(v.s, 0)
      // q > 0: stretched along the pop direction, q < 0: squashed flat
      el.style.transform = `translateX(-50%) translateY(${v.y}px) rotate(${v.r}deg) scale(${s * (1 - v.q * 0.18)}, ${s * (1 + v.q * 0.28)})`
      el.style.visibility = v.s < 0.02 ? 'hidden' : 'visible'
    },
    { stiffness: 520, damping: 17 },
  )

  const show = () => {
    setShown(true)
    if (visible.current) return
    visible.current = true
    // anticipation: flat against the trigger, then fling out
    spring.snap({ s: 0.35, y: top ? 12 : -12, q: -1.2, r: 0 })
    spring.set({ s: 1, y: 0, r: 0, q: 0 })
    spring.kick({ r: top ? -90 : 90, q: 16, y: top ? -120 : 120 })
    const a = anchor.current
    if (!a || prefersReducedMotion()) return
    const r = a.getBoundingClientRect()
    const x = r.left + r.width / 2
    const y = top ? r.top - 4 : r.bottom + 4
    spawn(burst(x, y, { radius: 12, spikes: 8 }), sparkle(x + (Math.random() < 0.5 ? -1 : 1) * 18, y + (top ? -8 : 8), { size: 7, color: C.pop }))
  }
  const hide = () => {
    setShown(false)
    visible.current = false
    spring.set({ s: 0, y: top ? 10 : -10, q: -0.6 })
  }

  useEffect(() => {
    if (!shown) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setShown(false)
      visible.current = false
      spring.set({ s: 0, y: top ? 10 : -10 })
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [shown, spring, top])

  return (
    <span ref={anchor} className="relative inline-flex" onPointerEnter={show} onPointerLeave={hide} onFocus={show} onBlur={hide}>
      {cloneElement(children, { 'aria-describedby': id })}
      <span
        ref={bubble}
        id={id}
        role="tooltip"
        className={cn(
          'ui-border ui-r ui-shadow-sm pointer-events-none absolute left-1/2 z-50 w-max max-w-[240px] bg-paper px-4 py-2.5 text-center text-sm leading-snug font-bold text-ink',
          top ? 'bottom-full mb-4 origin-bottom' : 'top-full mt-4 origin-top',
          className,
        )}
        style={{ visibility: 'hidden', transform: 'translateX(-50%) scale(0)' }}
      >
        {content}
        {/* tail: a square turned 45° with the style's line on its two outer sides (functional rotation) */}
        <span
          aria-hidden="true"
          className={cn(
            'absolute left-[38%] size-3.5 rotate-45 border-(color:--ui-line) bg-paper',
            top
              ? '-bottom-[calc(var(--ui-bw)+4px)] border-r-(length:--ui-bw) border-b-(length:--ui-bw)'
              : '-top-[calc(var(--ui-bw)+4px)] border-t-(length:--ui-bw) border-l-(length:--ui-bw)',
          )}
        />
      </span>
    </span>
  )
}
