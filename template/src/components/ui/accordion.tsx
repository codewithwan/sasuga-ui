import { useLayoutEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { delayed, easeOutCubic, prefersReducedMotion, rand, smoke, sparkle, spawn, timed, uiStyle } from '@/fx'
import type { Fx } from '@/fx'
import { C } from '@/fx/palette'
import { cn } from '@/lib/utils'

export type AccordionItem = { id: string; title: ReactNode; content: ReactNode }

export type AccordionProps = {
  items: AccordionItem[]
  /** 'single' keeps at most one item open. */
  type?: 'single' | 'multiple'
  defaultOpen?: string[]
  className?: string
}

/** Vertical streaks raining down a panel as it slams open (cel: soft, manga: ink, flat: none). */
function dropLines(rect: { left: number; top: number; width: number; height: number }, count = 8): Fx {
  const s = uiStyle()
  if (s === 'flat') return { update: () => false, draw() {} }
  const color = s === 'cel' ? C.soft : C.ink
  const ls = Array.from({ length: count }, () => ({
    x: rect.left + rand(0.05, 0.95) * rect.width,
    y: rect.top + rand(-0.1, 0.3) * rect.height,
    len: rand(0.35, 0.8) * Math.max(50, rect.height),
    w: rand(1.5, 4),
  }))
  return timed(0.34, (ctx, t) => {
    const e = easeOutCubic(t)
    const shrink = 1 - t
    ctx.strokeStyle = color
    ctx.lineCap = 'round'
    for (const l of ls) {
      const head = l.y + l.len * (0.3 + e)
      ctx.lineWidth = l.w * shrink
      ctx.beginPath()
      ctx.moveTo(l.x, head - l.len * shrink * 0.9)
      ctx.lineTo(l.x, head)
      ctx.stroke()
    }
  })
}

function Item({ item, isOpen, base, onToggle }: { item: AccordionItem; isOpen: boolean; base: string; onToggle: () => void }) {
  const card = useRef<HTMLDivElement>(null)
  const head = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const chev = useRef<HTMLSpanElement>(null)
  const title = useRef<HTMLSpanElement>(null)
  const prev = useRef(isOpen)
  const btnId = `${base}-h-${item.id}`
  const panelId = `${base}-p-${item.id}`

  useLayoutEffect(() => {
    if (prev.current === isOpen) return
    prev.current = isOpen
    const p = panel.current
    const c = content.current
    if (!p || !c || prefersReducedMotion()) return
    const flat = uiStyle() === 'flat'
    const h = c.offsetHeight
    p.getAnimations().forEach((a) => a.cancel())

    if (isOpen) {
      // slam: the panel shoots down past its height and bounces back
      const over = flat ? 1.04 : 1.12
      p.animate(
        [
          { height: '0px' },
          { height: `${h * over}px`, offset: 0.45 },
          { height: `${h * (flat ? 0.99 : 0.96)}px`, offset: 0.7 },
          { height: `${h * 1.01}px`, offset: 0.86 },
          { height: `${h}px` },
        ],
        { duration: flat ? 380 : 520, easing: 'cubic-bezier(.3,.7,.4,1)' },
      )
      c.animate(
        [
          { transform: 'translateY(-22px)', opacity: 0 },
          { transform: 'translateY(4px)', opacity: 1, offset: 0.6 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 440, delay: 60, easing: 'ease-out', fill: 'backwards' },
      )
      chev.current?.animate([{ rotate: '0deg' }, { rotate: flat ? '200deg' : '560deg', offset: 0.7 }, { rotate: flat ? '180deg' : '540deg' }], {
        duration: flat ? 380 : 620,
        easing: 'cubic-bezier(.3,1.3,.5,1)',
      })
      title.current?.animate([{ transform: 'none' }, { transform: 'translateX(8px)', offset: 0.4 }, { transform: 'none' }], { duration: 360, easing: 'ease-out' })
      const hr = head.current?.getBoundingClientRect()
      if (!hr) return
      spawn(
        dropLines({ left: hr.left + 12, top: hr.bottom, width: hr.width - 24, height: h }),
        delayed(0.2, smoke(hr.left + 14, hr.bottom + h * over, { count: 3, spread: 26, size: 9 })),
        delayed(0.22, smoke(hr.right - 14, hr.bottom + h * over, { count: 3, spread: 26, size: 9 })),
        delayed(0.16, sparkle(hr.right - 30, hr.top + hr.height / 2, { size: 12, color: C.pop })),
      )
      card.current?.animate([{ scale: '1' }, { scale: '1.012 .985', offset: 0.5 }, { scale: '1' }], { duration: 420, delay: 160, easing: 'ease-out' })
    } else {
      // snap shut: a tiny lift, then straight up
      p.animate([{ height: `${h}px` }, { height: `${h * 1.03}px`, offset: 0.2 }, { height: '0px' }], { duration: flat ? 200 : 220, easing: 'cubic-bezier(.7,0,.2,1)' })
      c.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-12px)' }], { duration: 180, easing: 'ease-in' })
      chev.current?.animate([{ rotate: '180deg' }, { rotate: '-25deg', offset: 0.6 }, { rotate: '0deg' }], { duration: 280, easing: 'ease-out' })
    }
  }, [isOpen])

  return (
    <div
      ref={card}
      className={cn(
        'ui-border ui-r bg-paper transition-[box-shadow,translate] duration-300 ease-snap has-[>h3>button:focus-visible]:outline-[2.5px] has-[>h3>button:focus-visible]:outline-offset-[3px] has-[>h3>button:focus-visible]:outline-accent has-[>h3>button:focus-visible]:outline-solid',
        isOpen ? 'ui-shadow -translate-y-0.5' : 'ui-shadow-sm',
      )}
    >
      <h3 className="m-0">
        <button
          ref={head}
          id={btnId}
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className="group ui-head ui-r flex w-full cursor-pointer items-center justify-between gap-4 border-0 bg-transparent px-5 py-4 text-left text-[clamp(17px,2.2vw,20px)] leading-tight text-ink transition-colors duration-200 hover:text-accent focus-visible:outline-none aria-expanded:text-accent"
        >
          <span ref={title}>{item.title}</span>
          <span
            ref={chev}
            aria-hidden="true"
            className="ui-border-thin ui-pill grid size-8 shrink-0 place-items-center bg-paper text-ink transition-[background-color,color] duration-300 ease-snap group-aria-expanded:rotate-180 group-aria-expanded:bg-accent group-aria-expanded:text-white"
          >
            <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-3 [stroke-linecap:round] [stroke-linejoin:round]">
              <path d="M6 9.5 L12 15.5 L18 9.5" />
            </svg>
          </span>
        </button>
      </h3>
      <div ref={panel} id={panelId} role="region" aria-labelledby={btnId} inert={!isOpen} className={cn('overflow-hidden', !isOpen && 'h-0')}>
        <div ref={content} className="mx-5 border-t border-line pt-4 pb-5 text-[15px] leading-relaxed text-ink">
          {item.content}
        </div>
      </div>
    </div>
  )
}

/**
 * Sticker panels. Opening slams the panel down past its height with streaks raining down,
 * bounces it back with a puff of dust and spins the chevron; closing snaps it straight up.
 */
export function Accordion({ items, type = 'single', defaultOpen = [], className }: AccordionProps) {
  const [open, setOpen] = useState<string[]>(defaultOpen)
  const base = useId()

  const toggle = (id: string) =>
    setOpen((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : type === 'single' ? [id] : [...cur, id]))

  return (
    <div className={cn('grid gap-3.5', className)}>
      {items.map((item) => (
        <Item key={item.id} item={item} base={base} isOpen={open.includes(item.id)} onToggle={() => toggle(item.id)} />
      ))}
    </div>
  )
}
