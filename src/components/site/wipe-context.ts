import { createContext, useContext } from 'react'

/**
 * Go to a place behind the page wipe (drawn per style, see Wipe.tsx). `to` is a path, a path with a hash
 * ('/components#cat-Game', '/docs/theming'), just a hash on the current page ('#game'), or a function that
 * changes something while the screen is covered (theme / style / mode switches use this).
 * `label` is flashed on the cover.
 */
export type WipeFn = (to: string | (() => void), label?: string) => void

export const WipeContext = createContext<WipeFn>(() => {})

export const useWipe = () => useContext(WipeContext)

/** Scroll to `#hash` on the current page, or to the top when there is none. */
export function landOn(hash: string) {
  const el = hash ? document.getElementById(hash) : null
  window.scrollTo({ top: el ? el.getBoundingClientRect().top + window.scrollY : 0, behavior: 'instant' })
  ;(el ?? document.querySelector<HTMLElement>('main'))?.focus({ preventScroll: true })
}

/**
 * onClick for a real <a href> (e.g. ButtonLink) that goes through the wipe on a plain left click,
 * after `delay` ms so the button's own hit can play first. Modified clicks open normally.
 */
export function useWipeClick() {
  const wipe = useWipe()
  return (to: string, label?: string, delay = 240) =>
    (e: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; preventDefault(): void }) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      e.preventDefault()
      window.setTimeout(() => wipe(to, label), delay)
    }
}
