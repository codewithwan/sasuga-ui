import { useCallback, useEffect, useLayoutEffect } from 'react'
import type { RefObject } from 'react'
import { clamp } from '@/fx'

export type AnchorSide = 'top' | 'bottom'
export type AnchorAlign = 'start' | 'center' | 'end'

export type AnchoredOptions = {
  /** Preferred side; flips when the other side has more room. */
  side?: AnchorSide
  align?: AnchorAlign
  /** Gap between the anchor and the floating element, px. */
  gap?: number
  /** Give the floating element the anchor's width. */
  matchWidth?: boolean
}

const MARGIN = 8

/** Places `el` (position: fixed) next to `a`. See useAnchored. */
export function placeAnchored(a: HTMLElement, el: HTMLElement, { side = 'bottom', align = 'start', gap = 12, matchWidth = false }: AnchoredOptions = {}) {
  const t = a.getBoundingClientRect()
  const vw = document.documentElement.clientWidth
  const vh = window.innerHeight
  if (matchWidth) el.style.width = `${t.width}px`
  const w = el.offsetWidth
  const h = el.offsetHeight
  const below = vh - t.bottom - gap - MARGIN
  const above = t.top - gap - MARGIN
  const want = side === 'top' ? above : below
  const other = side === 'top' ? below : above
  const s: AnchorSide = want < h && other > want ? (side === 'top' ? 'bottom' : 'top') : side
  const room = Math.max(120, s === 'top' ? above : below)
  let x = align === 'start' ? t.left : align === 'end' ? t.right - w : t.left + t.width / 2 - w / 2
  x = clamp(x, MARGIN, Math.max(MARGIN, vw - w - MARGIN))
  const y = s === 'top' ? t.top - gap - Math.min(h, room) : t.bottom + gap
  el.style.left = `${Math.round(x)}px`
  el.style.top = `${Math.round(y)}px`
  el.style.setProperty('--avail-h', `${Math.floor(room)}px`)
  el.style.setProperty('--anchor-ox', `${Math.round(clamp(t.left + Math.min(t.width / 2, 28) - x, 0, w))}px`)
  el.dataset.side = s
}

/**
 * Keeps a `position: fixed` element (portalled to the body) next to its anchor:
 * below and start-aligned by default, flips above / shifts sideways when it would
 * leave the viewport, and follows scrolls (any ancestor), resizes and size changes.
 * Writes `left` / `top` (and `width` with `matchWidth`) on `float`, plus
 * `data-side`, `--anchor-ox` (transform-origin x inside the element) and
 * `--avail-h` (room on the chosen side) for the inner, animated wrapper.
 * Never animate `float`'s own position or transform: animate an inner wrapper instead.
 */
export function useAnchored(open: boolean, anchor: RefObject<HTMLElement | null>, float: RefObject<HTMLElement | null>, options: AnchoredOptions = {}) {
  const { side, align, gap, matchWidth } = options
  const position = useCallback(() => {
    if (anchor.current && float.current) placeAnchored(anchor.current, float.current, { side, align, gap, matchWidth })
  }, [anchor, float, side, align, gap, matchWidth])

  // before paint, so the open animation starts at the right place
  useLayoutEffect(() => {
    if (open) position()
  }, [open, position])

  useEffect(() => {
    if (!open) return
    window.addEventListener('scroll', position, true)
    window.addEventListener('resize', position)
    const ro = new ResizeObserver(position)
    if (float.current) ro.observe(float.current)
    if (anchor.current) ro.observe(anchor.current)
    return () => {
      window.removeEventListener('scroll', position, true)
      window.removeEventListener('resize', position)
      ro.disconnect()
    }
  }, [open, position, anchor, float])

  return position
}

/** Where a popup should be portalled: the open <dialog> holding the anchor (top layer), else the body. */
export const portalRoot = (anchor: HTMLElement | null): HTMLElement =>
  (anchor?.closest('dialog[open]') as HTMLElement | null) ?? document.body

/** Scroll `item` into view inside its scrolling `box` only (never the page). */
export function keepInView(box: HTMLElement, item: HTMLElement, pad = 8) {
  const top = item.offsetTop
  const bottom = top + item.offsetHeight
  if (top - pad < box.scrollTop) box.scrollTop = Math.max(0, top - pad)
  else if (bottom + pad > box.scrollTop + box.clientHeight) box.scrollTop = bottom + pad - box.clientHeight
}
