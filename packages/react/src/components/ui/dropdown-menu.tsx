import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { burst, delayed, prefersReducedMotion, sfx, shards, sparkle, spawn, speedLines, uiStyle, useSprings } from '@/fx'
import { C } from '@/fx/palette'
import { cn } from '@/lib/utils'
import { keepInView, portalRoot, useAnchored } from './use-anchored'

export type DropdownMenuEntry =
  | {
      type?: 'item'
      label: string
      onSelect?: () => void
      /** Small second line. */
      hint?: string
      /** Keyboard hint shown on the right (display only). */
      shortcut?: string
      icon?: ReactNode
      /** Destructive action: drawn in the hit colour. */
      danger?: boolean
      disabled?: boolean
      /** Lettering for this item; overrides the menu's `sfx`. */
      sfx?: string | false
    }
  | {
      type: 'checkbox'
      label: string
      /** Controlled state. */
      checked?: boolean
      /** Initial state when uncontrolled. */
      defaultChecked?: boolean
      onCheckedChange?: (checked: boolean) => void
      shortcut?: string
      disabled?: boolean
    }
  | { type: 'separator' }
  | { type: 'label'; label: string }

const trigger = cva(
  'ui-head ui-border ui-r ui-shadow inline-flex origin-[50%_100%] items-center gap-2.5 py-2.5 pr-2.5 pl-4 text-[17px] leading-none transition-[box-shadow,background-color] duration-200 ease-snap group-hover:ui-shadow-hover group-focus-visible:outline-[2.5px] group-focus-visible:outline-offset-4 group-focus-visible:outline-accent group-focus-visible:outline-solid',
  {
    variants: {
      variant: {
        paper: 'bg-paper text-ink group-aria-expanded:bg-canvas',
        accent: 'ui-fill bg-accent text-white',
        ink: 'ui-fill bg-ink text-paper',
      },
    },
    defaultVariants: { variant: 'paper' },
  },
)

export type DropdownMenuProps = VariantProps<typeof trigger> & {
  /** Content of the trigger button. */
  trigger: ReactNode
  items: DropdownMenuEntry[]
  /** Accessible name for the trigger when its content is not text (an icon). */
  triggerLabel?: string
  /** Which trigger edge the menu lines up with. */
  align?: 'start' | 'end'
  /** Lettering when an item is chosen. `false` = none. */
  sfx?: string | false
  onOpenChange?: (open: boolean) => void
  className?: string
}

const POP = 'cubic-bezier(.2,1.55,.4,1)'
const WHIP = 'cubic-bezier(.7,0,.2,1)'

type Actionable = Extract<DropdownMenuEntry, { label: string; type?: 'item' | 'checkbox' }>
const isActionable = (it: DropdownMenuEntry): it is Actionable => it.type === undefined || it.type === 'item' || it.type === 'checkbox'
const canFocus = (it: DropdownMenuEntry | undefined) => !!it && isActionable(it) && !it.disabled

/**
 * A menu button. The trigger squashes, the menu pops out of it and deals its items
 * in from alternating sides, a highlight glides between them (stretching with its
 * speed), and choosing an item flashes it and lands a hit. Checkbox items toggle in
 * place with a popping check. Keyboard: arrows, Home/End, Enter/Space, Esc, Tab and
 * type-ahead; focus moves through the items (roving focus) and returns to the trigger.
 */
export function DropdownMenu({
  trigger: content,
  items,
  triggerLabel,
  align = 'start',
  variant,
  sfx: sfxText = 'ポチッ',
  onOpenChange,
  className,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  // where the menu is portalled: the body, or the open <dialog> holding the trigger
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [active, setActive] = useState(-1)
  const [local, setLocal] = useState<Record<number, boolean>>({})
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const face = useRef<HTMLSpanElement>(null)
  const pos = useRef<HTMLDivElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const cursor = useRef<HTMLSpanElement>(null)
  const leaving = useRef(false)
  const typed = useRef({ text: '', at: 0 })
  const base = useId()
  const triggerId = `${base}-trigger`
  const menuId = `${base}-menu`
  const itemId = (i: number) => `${base}-item-${i}`
  const itemEl = (i: number) => document.getElementById(itemId(i))

  const body = useSprings(
    face,
    { sx: 1, sy: 1, y: 0 },
    (s, el) => {
      el.style.transform = `translateY(${s.y}px) scale(${s.sx}, ${s.sy})`
    },
    { stiffness: 600, damping: 14 },
  )
  const glide = useSprings(
    cursor,
    { y: 0, h: 40 },
    (s, el, vel) => {
      const stretch = Math.min(Math.abs(vel.y) / 2400, 0.35)
      el.style.transform = `translateY(${s.y}px) scale(${1 - stretch * 0.4}, ${1 + stretch})`
      el.style.height = `${s.h}px`
    },
    { stiffness: 420, damping: 24 },
  )

  // fixed, portalled: never clipped by a card, follows scrolls and resizes
  useAnchored(open, button, pos, { side: 'bottom', align: align === 'end' ? 'end' : 'start', gap: 14 })
  const above = () => pos.current?.dataset.side === 'top'

  const isChecked = (i: number) => {
    const it = items[i]
    if (!it || it.type !== 'checkbox') return false
    return it.checked ?? local[i] ?? it.defaultChecked ?? false
  }

  const step = (from: number, dir: 1 | -1) => {
    for (let k = 1; k <= items.length; k++) {
      const i = (from + dir * k + items.length * 2) % items.length
      if (canFocus(items[i])) return i
    }
    return from
  }
  const first = () => step(-1, 1)
  const last = () => step(items.length, -1)

  const setOpenState = (v: boolean) => {
    setOpen(v)
    onOpenChange?.(v)
  }

  const openAt = (i: number) => {
    if (open) return
    setHost(portalRoot(button.current))
    setActive(i)
    setOpenState(true)
    body.kick({ sx: 4, sy: -6, y: 30 })
    const t = button.current
    if (t && !prefersReducedMotion()) {
      const r = t.getBoundingClientRect()
      spawn(speedLines({ left: r.left, top: r.bottom - 4, width: Math.max(r.width, 160), height: 40 }, 1, { count: 6, length: 50, color: C.soft }))
    }
  }

  /** Animate the menu away, then unmount it. `chosen` stays put and fades last. */
  const close = (focusTrigger = true, chosen?: number) => {
    const m = menu.current
    if (!open || leaving.current) return
    const done = () => {
      leaving.current = false
      setOpenState(false)
    }
    if (focusTrigger) button.current?.focus()
    if (!m || prefersReducedMotion()) return done()
    leaving.current = true
    const flat = uiStyle() === 'flat'
    Array.from(m.querySelectorAll<HTMLElement>('[data-entry]')).forEach((el, n) => {
      if (Number(el.dataset.entry) === chosen) return
      const dir = n % 2 ? 1 : -1
      el.animate(
        [{ transform: 'none', opacity: 1 }, { transform: flat ? 'translateY(-6px)' : `translateX(${dir * 60}px) rotate(${dir * 8}deg)`, opacity: 0 }],
        { duration: flat ? 140 : 220, delay: n * 16, easing: WHIP, fill: 'forwards' },
      )
    })
    if (chosen === undefined && cursor.current) cursor.current.style.opacity = '0'
    m.animate([{ opacity: 1 }, { opacity: 0, transform: `translateY(${above() ? 10 : -10}px) scale(.96)` }], {
      duration: flat ? 160 : 240,
      delay: chosen === undefined ? 0 : 140,
      easing: WHIP,
      fill: 'forwards',
    }).finished.then(done, done)
  }

  const activate = (i: number) => {
    const it = items[i]
    if (!it || !canFocus(it) || leaving.current || !isActionable(it)) return
    const el = itemEl(i)
    const still = prefersReducedMotion()
    const r = el?.getBoundingClientRect()

    if (it.type === 'checkbox') {
      const next = !isChecked(i)
      if (it.checked === undefined) setLocal((m) => ({ ...m, [i]: next }))
      it.onCheckedChange?.(next)
      if (still || !el || !r) return
      el.querySelector('[data-check]')?.animate(
        [{ transform: 'scale(.4) rotate(-20deg)' }, { transform: 'scale(1.35) rotate(6deg)', offset: 0.55 }, { transform: 'none' }],
        { duration: 380, easing: POP },
      )
      if (next) spawn(sparkle(r.left + 26, r.top + 6, { size: 10, color: C.pop }), burst(r.left + 22, r.top + r.height / 2, { radius: 14, spikes: 8 }))
      return
    }

    it.onSelect?.()
    close(true, i)
    if (still || !el || !r) return
    // impact frame on the chosen row
    const flat = uiStyle() === 'flat'
    el.animate([{ transform: 'none' }, { transform: flat ? 'scale(1.02)' : 'scale(1.08, .9)', offset: 0.3 }, { transform: 'none' }], { duration: 260, easing: POP })
    cursor.current?.animate([{ filter: 'brightness(1.9)' }, { filter: 'none' }], { duration: 300, easing: 'ease-out' })
    const x = r.right - 24
    const y = r.top + r.height / 2
    const color = it.danger ? C.pop : C.accent
    spawn(burst(x, y, { radius: 24, spikes: 10, color }), shards(x, y, { count: 7, speed: 360, size: 7 }))
    const text = it.sfx === undefined ? sfxText : it.sfx
    if (text) spawn(delayed(0.04, sfx(x - 10, r.top - 14, text, { size: 26, color })))
  }

  // open: pop out of the trigger and deal the entries in
  useLayoutEffect(() => {
    const m = menu.current
    if (!open || !m) return
    const el = itemEl(active)
    if (el) {
      glide.snap({ y: el.offsetTop, h: el.offsetHeight })
      el.focus({ preventScroll: true })
    } else m.focus()
    if (prefersReducedMotion()) return
    const flat = uiStyle() === 'flat'
    m.animate(
      [
        { transform: `translateY(${(flat ? 6 : 18) * (above() ? 1 : -1)}px) ${flat ? 'scale(.98)' : 'scale(.7, .4)'}`, opacity: 0 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: flat ? 200 : 380, easing: POP },
    )
    if (cursor.current) {
      cursor.current.style.opacity = '1'
      cursor.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: flat ? 60 : 220, fill: 'backwards' })
    }
    Array.from(m.querySelectorAll<HTMLElement>('[data-entry]')).forEach((row, n) => {
      const dir = n % 2 ? 1 : -1
      row.animate(
        [
          { transform: flat ? 'translateY(-6px)' : `translate(${dir * 56}px, -20px) rotate(${dir * -10}deg) scale(.8)`, opacity: 0 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: flat ? 220 : 440, delay: (flat ? 20 : 60) + n * (flat ? 16 : 45), easing: POP, fill: 'backwards' },
      )
    })
    // only on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // highlight + focus follow the active item
  useEffect(() => {
    if (!open) return
    const el = itemEl(active)
    if (!el) return
    glide.set({ y: el.offsetTop, h: el.offsetHeight })
    if (document.activeElement !== el) el.focus({ preventScroll: true })
    if (menu.current) keepInView(menu.current, el)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active])

  // close on a pointerdown outside both the trigger and the menu
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (root.current?.contains(t) || pos.current?.contains(t)) return
      close(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  })

  const onTriggerKey = (e: KeyboardEvent) => {
    if (['ArrowDown', 'Enter', ' '].includes(e.key)) {
      e.preventDefault()
      openAt(first())
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      openAt(last())
    }
  }

  const onMenuKey = (e: KeyboardEvent) => {
    const moves: Record<string, () => number> = {
      ArrowDown: () => step(active, 1),
      ArrowUp: () => step(active, -1),
      Home: first,
      End: last,
    }
    if (e.key in moves) {
      e.preventDefault()
      setActive(moves[e.key]())
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      activate(active)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'Tab') {
      close(false)
    } else if (e.key.length === 1 && /\S/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
      // type-ahead: keep typing to narrow, repeat one letter to cycle
      const now = performance.now()
      const t = typed.current
      t.text = now - t.at > 600 ? e.key.toLowerCase() : t.text + e.key.toLowerCase()
      t.at = now
      const cycle = [...t.text].every((c) => c === t.text[0])
      const query = cycle ? t.text[0] : t.text
      const startAt = cycle || t.text.length === 1 ? active : active - 1
      for (let k = 1; k <= items.length; k++) {
        const i = (startAt + k + items.length) % items.length
        const it = items[i]
        if (canFocus(it) && isActionable(it) && it.label.toLowerCase().startsWith(query)) {
          setActive(i)
          break
        }
      }
    }
  }

  const activeItem = items[active]

  return (
    <div ref={root} className={cn('relative inline-block', className)}>
      <button
        ref={button}
        id={triggerId}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={triggerLabel}
        onClick={() => (open ? close() : openAt(first()))}
        onKeyDown={onTriggerKey}
        className="group cursor-pointer touch-manipulation border-0 bg-transparent p-0 text-left focus-visible:outline-none"
      >
        <span ref={face} className={trigger({ variant })}>
          {content}
          <span
            aria-hidden="true"
            className="ui-border-thin ui-pill grid size-7 shrink-0 rotate-0 place-items-center bg-paper text-ink transition-[rotate,scale] duration-500 ease-snap group-hover:scale-110 group-aria-expanded:rotate-180"
          >
            <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-[3.4] [stroke-linecap:round] [stroke-linejoin:round]">
              <path d="M6 9.5 L12 15.5 L18 9.5" />
            </svg>
          </span>
        </span>
      </button>

      {open &&
        createPortal(
          <div ref={pos} className="group/pos fixed top-0 left-0 z-[110] w-max">
            <div
              ref={menu}
              id={menuId}
              role="menu"
              tabIndex={-1}
              aria-labelledby={triggerId}
              aria-orientation="vertical"
              onKeyDown={onMenuKey}
              className="ui-card ui-tone relative grid max-h-[min(20rem,var(--avail-h,20rem))] w-max max-w-[min(320px,calc(100vw-16px))] min-w-[230px] origin-[var(--anchor-ox,0)_0] overflow-auto p-2 text-ink outline-none group-data-[side=top]/pos:origin-[var(--anchor-ox,0)_100%]"
            >
              {/* the gliding highlight sits under the items */}
              <span
                ref={cursor}
                aria-hidden="true"
                data-danger={(activeItem && isActionable(activeItem) && activeItem.type !== 'checkbox' && activeItem.danger) || undefined}
                className="ui-border-thin ui-r-sm ui-shadow-sm pointer-events-none absolute inset-x-2 top-0 origin-left bg-accent-soft transition-colors duration-200 data-danger:bg-pop/30"
              />
              {items.map((it, i) => {
                if (it.type === 'separator') return <div key={i} role="separator" data-entry={i} className="ui-divider mx-2 my-1.5" />
                if (it.type === 'label')
                  return (
                    <div key={i} role="presentation" data-entry={i} className="relative px-3 pt-2 pb-1 text-xs leading-none font-bold text-mute">
                      {it.label}
                    </div>
                  )
                const isActive = i === active
                const checkbox = it.type === 'checkbox'
                const checked = checkbox && isChecked(i)
                const danger = !checkbox && it.danger
                return (
                  <div
                    key={i}
                    id={itemId(i)}
                    data-entry={i}
                    role={checkbox ? 'menuitemcheckbox' : 'menuitem'}
                    aria-checked={checkbox ? checked : undefined}
                    aria-disabled={it.disabled || undefined}
                    tabIndex={-1}
                    data-active={isActive || undefined}
                    onPointerMove={() => !isActive && !it.disabled && setActive(i)}
                    onClick={() => activate(i)}
                    className={cn(
                      'group/it relative flex cursor-pointer items-center gap-3 px-3 py-2.5 outline-none select-none',
                      it.disabled && 'cursor-not-allowed opacity-45',
                      danger && 'text-pop',
                    )}
                  >
                    {checkbox ? (
                      <span
                        data-check=""
                        aria-hidden="true"
                        className={cn(
                          'ui-border-thin ui-r-sm grid size-5 shrink-0 place-items-center transition-colors duration-200',
                          checked ? 'ui-fill bg-accent text-white' : 'bg-paper text-transparent',
                        )}
                      >
                        <svg viewBox="0 0 24 24" className="size-3.5 fill-none stroke-current stroke-[4] [stroke-linecap:round] [stroke-linejoin:round]">
                          <path d="M5 12.5 9.5 17 19 7" />
                        </svg>
                      </span>
                    ) : (
                      it.icon && (
                        <span
                          aria-hidden="true"
                          className="grid size-5 shrink-0 place-items-center transition-[scale] duration-200 ease-snap group-data-active/it:scale-125 [&>svg]:size-[1.1em]"
                        >
                          {it.icon}
                        </span>
                      )
                    )}
                    <span className="grid min-w-0 flex-1 transition-[translate] duration-300 ease-snap group-data-active/it:translate-x-1">
                      <span className="ui-head truncate text-[16px] leading-tight">{it.label}</span>
                      {!checkbox && it.hint && <span className="truncate text-xs leading-snug text-mute">{it.hint}</span>}
                    </span>
                    {it.shortcut && (
                      <span className="ui-border-thin ui-r-sm shrink-0 bg-paper px-1.5 pt-0.5 pb-px font-mono text-[11px] leading-tight text-mute">{it.shortcut}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>,
          host ?? document.body,
        )}
    </div>
  )
}
