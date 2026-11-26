import { useLayoutEffect, useRef } from 'react'
import { prefersReducedMotion, rand, uiStyle } from '@/fx'

/**
 * Small DOM-side helpers shared by the game HUD components (health bar, skill button,
 * combo counter, number ticker, damage numbers, countdown). Everything runs on demand,
 * never at module load, so the files stay SSR-safe.
 */

/** How loud DOM motion is in the active style (flat is calmer). */
export const hudKick = () => (uiStyle() === 'flat' ? 0.45 : 1)

/**
 * Screen-shake an element. Animates the `translate` property, so it composes with
 * whatever a spring writes to `transform`.
 */
export function shakeEl(el: Element | null | undefined, power = 1, duration = 360) {
  if (!el || prefersReducedMotion()) return
  const k = power * hudKick()
  const frames = [0, 1, 2, 3, 4, 5].map((i) => {
    const fall = 1 - i / 6
    return { translate: `${rand(-8, 8) * k * fall}px ${rand(-5, 5) * k * fall}px` }
  })
  el.animate([{ translate: '0 0' }, ...frames, { translate: '0 0' }], { duration, easing: 'linear' })
}

/** A quick white-ish flash on an overlay element (opacity 0 at rest). */
export function flashEl(el: Element | null | undefined, peak = 0.9, duration = 260) {
  if (!el) return
  el.animate([{ opacity: peak }, { opacity: 0 }], { duration: prefersReducedMotion() ? 120 : duration, easing: 'ease-out' })
}

/** Keep the latest value of something in a ref (for listeners and timers). */
export function useLatest<T>(value: T) {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  })
  return ref
}

export const POP_EASE = 'cubic-bezier(.2,1.6,.4,1)'
export const WHIP_EASE = 'cubic-bezier(.7,0,.2,1)'
