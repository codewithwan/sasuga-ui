import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { HTMLAttributes, KeyboardEvent, ReactNode } from 'react'
import { impactOn, prefersReducedMotion, uiStyle, useSprings } from '@/fx'
import { cn } from '@/lib/utils'
import { Icon } from './icon'

export type GameMenuItem = {
  id: string
  label: string
  /** Small text shown while the item is under the cursor. */
  hint?: string
  disabled?: boolean
  onSelect?: () => void
}

export type GameMenuProps = Omit<HTMLAttributes<HTMLDivElement>, 'onSelect' | 'title'> & {
  items: GameMenuItem[]
  /** Accessible name of the menu. */
  label: string
  /** Optional visible heading above the items. */
  title?: ReactNode
  defaultIndex?: number
  /** Called on confirm (click / Enter / Space) of an enabled item. */
  onSelect?: (item: GameMenuItem, index: number) => void
  /** Escape. */
  onBack?: () => void
  cursor?: 'arrow' | 'hand'
  /** Lettering on confirm. `false` = none. */
  sfx?: string | false
  /** Shows the key hints row. */
  hints?: boolean
}

const CURSOR_H = 28

function Hand() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-full overflow-visible fill-paper stroke-ink stroke-[1.8] [stroke-linejoin:round]">
      <path d="M2 9h4l3-3h3.5a1.5 1.5 0 0 1 0 3H20.25a1.75 1.75 0 0 1 0 3.5H14a1.5 1.5 0 0 1 0 3h-.5a1.5 1.5 0 0 1 0 3H8l-2-1.5H2Z" />
    </svg>
  )
}

function Glyph({ kind }: { kind: 'arrow' | 'hand' }) {
  return kind === 'hand' ? <Hand /> : <span className="grid h-7 place-items-center text-accent">
      <Icon name="play" tone="solid" size={20} />
    </span>
}

/**
 * A JRPG command menu. A pointing cursor springs between items trailing afterimages,
 * the item under it slides out on a highlight, confirming flashes it with an impact,
 * and disabled items shake "no". Keyboard: ↑/↓ (wrapping), Home/End, Enter/Space, Esc → onBack.
 */
export function GameMenu({
  items,
  label,
  title,
  defaultIndex,
  onSelect,
  onBack,
  cursor = 'arrow',
  sfx: sfxText = '決定!',
  hints = true,
  className,
  onKeyDown,
  ...rest
}: GameMenuProps) {
  const first = Math.max(
    0,
    items.findIndex((it) => !it.disabled),
  )
  const [active, setActive] = useState(() => Math.min(defaultIndex ?? first, Math.max(0, items.length - 1)))
  const base = useId()
  const itemId = (i: number) => `${base}-item-${i}`
  const panel = useRef<HTMLDivElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const cur = useRef<HTMLSpanElement>(null)
  const ghostA = useRef<HTMLSpanElement>(null)
  const ghostB = useRef<HTMLSpanElement>(null)
  const point = useRef<HTMLSpanElement>(null)
  const current = Math.min(active, Math.max(0, items.length - 1))

  const main = useSprings(
    cur,
    { y: 0, x: 0 },
    (v, el, vel) => {
      const st = Math.min(Math.abs(vel.y) / 3000, 0.3)
      el.style.transform = `translate(${v.x}px, ${v.y}px) scale(${1 - st * 0.4}, ${1 + st})`
    },
    { stiffness: 560, damping: 26 },
  )
  // afterimages: lazier springs, visible only while they move
  const trailA = useSprings(
    ghostA,
    { y: 0 },
    (v, el, vel) => {
      el.style.transform = `translateY(${v.y}px)`
      el.style.opacity = String(Math.min(Math.abs(vel.y) / 1700, 0.55))
    },
    { stiffness: 320, damping: 24 },
  )
  const trailB = useSprings(
    ghostB,
    { y: 0 },
    (v, el, vel) => {
      el.style.transform = `translateY(${v.y}px)`
      el.style.opacity = String(Math.min(Math.abs(vel.y) / 2200, 0.32))
    },
    { stiffness: 190, damping: 21 },
  )
  const squash = useSprings(
    panel,
    { s: 0 },
    (v, el) => {
      el.style.transform = `scale(${1 + v.s * 0.012}, ${1 - v.s * 0.02})`
    },
    { stiffness: 560, damping: 13 },
  )

  const itemEl = (i: number) => document.getElementById(itemId(i))
  const yOf = (i: number) => {
    const el = itemEl(i)
    return el ? el.offsetTop + el.offsetHeight / 2 - CURSOR_H / 2 : 0
  }

  // cursor: jump into place on mount, spring after
  const placed = useRef(false)
  useLayoutEffect(() => {
    const y = yOf(current)
    if (!placed.current || prefersReducedMotion()) {
      placed.current = true
      main.snap({ y })
      trailA.snap({ y })
      trailB.snap({ y })
      return
    }
    main.set({ y })
    trailA.set({ y })
    trailB.set({ y })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, items.length])

  // the idle "pointing" nudge
  useEffect(() => {
    if (prefersReducedMotion()) return
    const a = point.current?.animate([{ translate: '0 0' }, { translate: `${uiStyle() === 'flat' ? -2 : -5}px 0` }], {
      duration: 420,
      iterations: Infinity,
      direction: 'alternate',
      easing: 'ease-in-out',
    })
    return () => a?.cancel()
  }, [cursor])

  const confirm = (i: number) => {
    const it = items[i]
    const el = itemEl(i)
    if (!it || !el) return
    const still = prefersReducedMotion()
    const flat = uiStyle() === 'flat'
    if (it.disabled) {
      if (still) return
      const a = flat ? 3 : 6
      el.animate([{ translate: '0 0' }, { translate: `${-a}px 0` }, { translate: `${a}px 0` }, { translate: `${-a * 0.6}px 0` }, { translate: `${a * 0.4}px 0` }, { translate: '0 0' }], {
        duration: 340,
        easing: 'linear',
      })
      main.kick({ x: -260 })
      return
    }
    if (!still) {
      const bar = el.querySelector<HTMLElement>('[data-bar]')
      const text = el.querySelector<HTMLElement>('[data-label]')
      bar?.animate([{ backgroundColor: 'var(--color-pop)', scale: '1.04 1.2' }, { backgroundColor: 'var(--color-accent-soft)', scale: '1 1' }], { duration: 420, easing: 'ease-out' })
      text?.animate([{ color: 'var(--color-paper)', scale: '1.12' }, { scale: '1' }], { duration: 380, easing: 'cubic-bezier(.2,1.6,.4,1)' })
      main.kick({ x: 520 })
      squash.kick({ s: 6 })
      impactOn(text ?? el, { text: sfxText, size: 0.7, smoky: false })
    }
    it.onSelect?.()
    onSelect?.(it, i)
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e)
    if (e.defaultPrevented || !items.length) return
    const last = items.length - 1
    const moves: Record<string, number> = {
      ArrowDown: current >= last ? 0 : current + 1,
      ArrowUp: current <= 0 ? last : current - 1,
      Home: 0,
      End: last,
    }
    if (e.key in moves) {
      e.preventDefault()
      setActive(moves[e.key])
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (!e.repeat) confirm(current)
    } else if (e.key === 'Escape' && onBack) {
      e.preventDefault()
      onBack()
    }
  }

  return (
    <div ref={panel} className={cn('ui-card ui-tone grid w-[min(100%,300px)] origin-top gap-2 p-3 text-ink', className)}>
      {title && <div className="ui-head ui-border-b px-2 pt-1 pb-2.5 text-[15px] leading-none">{title}</div>}
      <div
        ref={menu}
        role="menu"
        aria-label={label}
        aria-activedescendant={items.length ? itemId(current) : undefined}
        tabIndex={0}
        {...rest}
        onKeyDown={onKey}
        className="ui-r-sm relative grid outline-none focus-visible:ui-focus"
      >
        <span ref={ghostB} aria-hidden="true" className="fx-only pointer-events-none absolute top-0 left-1 z-10 h-7 w-7 opacity-0">
          <Glyph kind={cursor} />
        </span>
        <span ref={ghostA} aria-hidden="true" className="fx-only pointer-events-none absolute top-0 left-1 z-10 h-7 w-7 opacity-0">
          <Glyph kind={cursor} />
        </span>
        <span ref={cur} aria-hidden="true" className="pointer-events-none absolute top-0 left-1 z-20 h-7 w-7 origin-left">
          <span ref={point} className="block size-full">
            <Glyph kind={cursor} />
          </span>
        </span>

        {items.map((it, i) => {
          const on = i === current
          return (
            <div
              key={it.id}
              id={itemId(i)}
              role="menuitem"
              aria-disabled={it.disabled || undefined}
              data-active={on || undefined}
              onPointerMove={() => !on && setActive(i)}
              onClick={() => {
                setActive(i)
                confirm(i)
              }}
              className="group/item relative flex cursor-pointer items-center gap-3 py-2.5 pr-3 pl-11 aria-disabled:cursor-not-allowed"
            >
              <span
                data-bar
                aria-hidden="true"
                className="ui-r-sm absolute inset-y-0.5 right-0 left-8 origin-left scale-x-0 bg-accent-soft opacity-0 transition-[scale,opacity] duration-300 ease-snap group-data-active/item:scale-x-100 group-data-active/item:opacity-100 group-aria-disabled/item:bg-canvas"
              />
              <span
                data-label
                className="ui-head relative inline-block text-[20px] leading-none transition-[translate,color] duration-300 ease-snap group-aria-disabled/item:text-mute group-aria-disabled/item:opacity-60 group-data-active/item:translate-x-2.5"
              >
                {it.label}
              </span>
              {it.hint && (
                <span className="relative ml-auto truncate text-xs leading-none text-mute opacity-0 transition-opacity duration-200 group-data-active/item:opacity-100">
                  {it.hint}
                </span>
              )}
            </div>
          )
        })}
      </div>
      {hints && (
        <div aria-hidden="true" className="ui-divider flex flex-wrap gap-x-3 gap-y-1 px-2 pt-2 text-[11px] leading-none text-mute">
          <span>
            <kbd className="ui-border-thin ui-r-sm inline-flex bg-paper px-0.5 py-px align-middle text-ink">
              <Icon name="arrow-right" tone="line" size={10} className="-rotate-90" />
              <Icon name="arrow-right" tone="line" size={10} className="rotate-90" />
            </kbd>{' '}
            Move
          </span>
          <span>
            <kbd className="ui-border-thin ui-r-sm bg-paper px-1 py-px font-mono text-[10px]">Enter</kbd> Select
          </span>
          {onBack && (
            <span>
              <kbd className="ui-border-thin ui-r-sm bg-paper px-1 py-px font-mono text-[10px]">Esc</kbd> Back
            </span>
          )}
        </div>
      )}
    </div>
  )
}
