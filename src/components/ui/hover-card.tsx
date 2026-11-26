import { cloneElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { FocusEvent, ReactElement, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { burst, clamp, prefersReducedMotion, spawn, sparkle, uiStyle } from '@/fx'
import { C } from '@/fx/palette'
import { cn } from '@/lib/utils'

type Side = 'top' | 'bottom' | 'left' | 'right'
type Align = 'start' | 'center' | 'end'

export type HoverCardProps = {
  /** The card's content (a profile, a preview…). It may hold links and buttons. */
  content: ReactNode
  /** One trigger element, usually a link. It gets aria-expanded and, while open, aria-describedby. */
  children: ReactElement<{ 'aria-describedby'?: string; 'aria-expanded'?: boolean }>
  /** Preferred side. The card flips to the other side when it does not fit. */
  side?: Side
  /** Alignment along the trigger edge. The card shifts to stay on screen. */
  align?: Align
  /** ms of hover before it opens. */
  openDelay?: number
  /** ms after the pointer leaves (trigger and card) before it closes. */
  closeDelay?: number
  /** Gap between trigger and card, in px. */
  offset?: number
  onOpenChange?: (open: boolean) => void
  /** Classes for the card surface. */
  className?: string
}

const MARGIN = 8
const FLIP = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as const
/* unit vector from the card towards its trigger: where it pops out of */
const TOWARD: Record<Side, [number, number]> = { top: [0, 1], bottom: [0, -1], left: [1, 0], right: [-1, 0] }

function place(t: DOMRect, w: number, h: number, want: Side, align: Align, gap: number) {
  const vw = document.documentElement.clientWidth
  const vh = window.innerHeight
  const room = { top: t.top - gap - MARGIN, bottom: vh - t.bottom - gap - MARGIN, left: t.left - gap - MARGIN, right: vw - t.right - gap - MARGIN }
  const vertical0 = want === 'top' || want === 'bottom'
  const need = vertical0 ? h : w
  const side: Side = room[want] < need && room[FLIP[want]] > room[want] ? FLIP[want] : want
  const vertical = side === 'top' || side === 'bottom'
  let x: number
  let y: number
  if (vertical) {
    y = side === 'top' ? t.top - gap - h : t.bottom + gap
    x = align === 'start' ? t.left : align === 'end' ? t.right - w : t.left + t.width / 2 - w / 2
  } else {
    x = side === 'left' ? t.left - gap - w : t.right + gap
    y = align === 'start' ? t.top : align === 'end' ? t.bottom - h : t.top + t.height / 2 - h / 2
  }
  x = clamp(x, MARGIN, Math.max(MARGIN, vw - w - MARGIN))
  y = clamp(y, MARGIN, Math.max(MARGIN, vh - h - MARGIN))
  // grow from the point of the trigger nearest the card
  const ox = vertical ? clamp(t.left + t.width / 2 - x, 12, w - 12) : side === 'left' ? w : 0
  const oy = vertical ? (side === 'top' ? h : 0) : clamp(t.top + t.height / 2 - y, 12, h - 12)
  return { x, y, side, ox, oy }
}

/**
 * A rich card that opens when you hover or focus its trigger. It pops out of the trigger:
 * squashed flat against it, it stretches past its size and settles, with a tiny burst where
 * it left (a calm rise in flat), and closes with a quick shrink. It lives in a portal with
 * fixed positioning, flips and shifts to stay on screen and follows scrolls. Touch: the first
 * tap opens it (the link does not fire), a second tap follows the link, a tap outside closes.
 * Esc closes.
 */
export function HoverCard({
  content,
  children,
  side = 'bottom',
  align = 'center',
  openDelay = 320,
  closeDelay = 200,
  offset = 10,
  onOpenChange,
  className,
}: HoverCardProps) {
  const id = useId()
  const anchor = useRef<HTMLSpanElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const openRef = useRef(false)
  const hovering = useRef(false)
  const swallowClick = useRef(false)
  const timer = useRef(0)
  const anim = useRef<Animation | null>(null)
  const placed = useRef<Side>(side)
  const changeRef = useRef(onOpenChange)
  useLayoutEffect(() => {
    changeRef.current = onOpenChange
  })

  const show = useCallback(() => {
    window.clearTimeout(timer.current)
    if (openRef.current) return
    openRef.current = true
    setMounted(true)
    setOpen(true)
    changeRef.current?.(true)
  }, [])
  const hide = useCallback(() => {
    window.clearTimeout(timer.current)
    if (!openRef.current) return
    openRef.current = false
    setOpen(false)
    if (prefersReducedMotion()) setMounted(false)
    changeRef.current?.(false)
  }, [])
  const later = (fn: () => void, ms: number) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(fn, ms)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const position = useCallback(() => {
    const a = anchor.current
    const el = card.current
    if (!a || !el) return
    const p = place(a.getBoundingClientRect(), el.offsetWidth, el.offsetHeight, side, align, offset)
    placed.current = p.side
    el.style.left = `${p.x}px`
    el.style.top = `${p.y}px`
    el.style.transformOrigin = `${p.ox}px ${p.oy}px`
    el.dataset.side = p.side
  }, [side, align, offset])

  // pop in / shrink out
  useLayoutEffect(() => {
    const el = card.current
    if (!mounted || !el) return
    anim.current?.cancel()
    const reduced = prefersReducedMotion()
    const flat = uiStyle() === 'flat'
    if (open) {
      position()
      const [dx, dy] = TOWARD[placed.current]
      const vertical = dy !== 0
      if (reduced) {
        anim.current = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120 })
        return
      }
      anim.current = el.animate(
        flat
          ? [
              { transform: `translate(${dx * 6}px, ${dy * 6}px) scale(.96)`, opacity: 0 },
              { transform: 'none', opacity: 1 },
            ]
          : [
              { transform: `translate(${dx * 10}px, ${dy * 10}px) scale(${vertical ? '.7, .18' : '.18, .7'})`, opacity: 0 },
              { transform: `translate(${-dx * 3}px, ${-dy * 3}px) scale(${vertical ? '.95, 1.07' : '1.07, .95'})`, opacity: 1, offset: 0.42 },
              { transform: `scale(${vertical ? '1.02, .98' : '.98, 1.02'})`, offset: 0.72 },
              { transform: 'none', opacity: 1 },
            ],
        { duration: flat ? 220 : 460, easing: 'cubic-bezier(.2,.8,.3,1)' },
      )
      const a = anchor.current?.getBoundingClientRect()
      if (!a) return
      const x = vertical ? a.left + a.width / 2 : dx > 0 ? a.left - 2 : a.right + 2
      const y = vertical ? (dy > 0 ? a.top - 2 : a.bottom + 2) : a.top + a.height / 2
      spawn(burst(x, y, { radius: 13, spikes: 8 }))
      if (!flat) spawn(sparkle(x - dy * 20 + dx * 8, y + dx * 14 - dy * 8, { size: 7, color: C.pop }))
      return
    }
    if (reduced) return
    const [dx, dy] = TOWARD[placed.current]
    const out = el.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${dx * 4}px, ${dy * 4}px) scale(${flat ? 0.97 : 0.9})`, opacity: 0 }], {
      duration: flat ? 120 : 140,
      easing: 'cubic-bezier(.5,0,.75,0)',
      fill: 'forwards',
    })
    anim.current = out
    out.onfinish = () => {
      if (!openRef.current) setMounted(false)
    }
  }, [open, mounted, position])

  // follow scrolls / resizes / content changes; Esc and outside taps close
  useEffect(() => {
    if (!open) return
    const el = card.current
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide()
    }
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (anchor.current?.contains(t) || card.current?.contains(t)) return
      hide()
    }
    window.addEventListener('scroll', position, true)
    window.addEventListener('resize', position)
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    const ro = new ResizeObserver(position)
    if (el) ro.observe(el)
    return () => {
      window.removeEventListener('scroll', position, true)
      window.removeEventListener('resize', position)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
      ro.disconnect()
    }
  }, [open, hide, position])

  const enter = (e: { pointerType: string }) => {
    if (e.pointerType !== 'mouse') return
    hovering.current = true
    if (openRef.current) window.clearTimeout(timer.current)
    else later(show, openDelay)
  }
  const leave = (e: { pointerType: string; relatedTarget: EventTarget | null }) => {
    if (e.pointerType !== 'mouse') return
    // moving between the trigger and the card (React bubbles portal events through the trigger)
    const to = e.relatedTarget
    if (to instanceof Node && (anchor.current?.contains(to) || card.current?.contains(to))) return
    hovering.current = false
    if (openRef.current) later(hide, closeDelay)
    else window.clearTimeout(timer.current)
  }
  const blur = (e: FocusEvent) => {
    const to = e.relatedTarget as Node | null
    if (to && (anchor.current?.contains(to) || card.current?.contains(to))) return
    if (!hovering.current) later(hide, closeDelay)
  }

  const describedBy = [children.props['aria-describedby'], mounted ? id : undefined].filter(Boolean).join(' ') || undefined

  return (
    <span
      ref={anchor}
      className="relative inline-flex"
      onPointerEnter={enter}
      onPointerLeave={leave}
      onPointerDown={(e) => {
        // touch: the first tap only opens the card
        swallowClick.current = e.pointerType !== 'mouse' && !openRef.current
        if (swallowClick.current) show()
      }}
      onClickCapture={(e) => {
        if (!swallowClick.current) return
        swallowClick.current = false
        e.preventDefault()
      }}
      onFocus={() => {
        if (!openRef.current) later(show, Math.min(openDelay, 150))
      }}
      onBlur={blur}
    >
      {cloneElement(children, { 'aria-describedby': describedBy, 'aria-expanded': open })}
      {mounted &&
        createPortal(
          <div
            ref={card}
            id={id}
            onPointerEnter={(e) => {
              if (e.pointerType !== 'mouse') return
              hovering.current = true
              window.clearTimeout(timer.current)
              if (!openRef.current) show()
            }}
            onPointerLeave={leave}
            className={cn('ui-card fixed z-[120] w-max max-w-[calc(100vw-16px)] p-4 text-left text-ink', className)}
            style={{ left: 0, top: 0 }}
          >
            {content}
          </div>,
          document.body,
        )}
    </span>
  )
}
