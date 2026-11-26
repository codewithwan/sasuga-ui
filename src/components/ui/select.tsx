import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { burst, delayed, prefersReducedMotion, rand, sfx, slash, smoke, spawn, speedLines, uiStyle, useSprings } from '@/fx'
import { C } from '@/fx/palette'
import { cn } from '@/lib/utils'
import { Icon } from './icon'
import { keepInView, portalRoot, useAnchored } from './use-anchored'

export type SelectOption = {
  value: string
  label: string
  /** Small second line under the label. */
  hint?: string
}

export type SelectProps = {
  options: SelectOption[]
  /** Visible label above the trigger (also the listbox's name). */
  label: string
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  /** Renders a hidden input so the value submits with a form. */
  name?: string
  /** Lettering when an option is picked. `false` = none. */
  sfx?: string | false
  className?: string
}

const POP = 'cubic-bezier(.2,1.55,.4,1)'
const WHIP = 'cubic-bezier(.7,0,.2,1)'
const pad = (i: number) => String(i + 1).padStart(2, '0')

/**
 * A "card deal" select. The sticker trigger squashes, the menu pops out of it and
 * deals its options in from alternating sides, a cursor springs between them, and
 * picking flings the chosen card into the trigger where it lands with a hit.
 * Full listbox keyboard support: arrows, Home/End, Enter/Space, Esc, Tab, type-ahead.
 */
export function Select({
  options,
  label,
  value,
  defaultValue,
  onValueChange,
  placeholder = 'Choose…',
  name,
  sfx: sfxText = 'キマリ!',
  className,
}: SelectProps) {
  const [inner, setInner] = useState(defaultValue)
  const current = value ?? inner
  const [open, setOpen] = useState(false)
  // where the menu is portalled: the body, or the open <dialog> holding the trigger
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [active, setActive] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const face = useRef<HTMLSpanElement>(null)
  const valueRef = useRef<HTMLSpanElement>(null)
  const pos = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const cursor = useRef<HTMLSpanElement>(null)
  const leaving = useRef(false)
  const base = useId()
  const labelId = `${base}-label`
  const optId = (i: number) => `${base}-opt-${i}`
  const selectedIndex = options.findIndex((o) => o.value === current)
  const selected = options[selectedIndex]

  // trigger squash
  const body = useSprings(
    face,
    { sx: 1, sy: 1, y: 0 },
    (s, el) => {
      el.style.transform = `translateY(${s.y}px) scale(${s.sx}, ${s.sy})`
    },
    { stiffness: 600, damping: 14 },
  )
  // highlight cursor: glides between options and stretches with its speed
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

  const optionEl = (i: number) => document.getElementById(optId(i))

  // fixed, portalled, as wide as the trigger: never clipped by a card, follows scrolls and resizes
  useAnchored(open, trigger, pos, { side: 'bottom', align: 'start', gap: 14, matchWidth: true })
  const above = () => pos.current?.dataset.side === 'top'

  const openAt = (i: number) => {
    if (open) return
    setHost(portalRoot(trigger.current))
    setActive(Math.max(0, Math.min(options.length - 1, i)))
    setOpen(true)
    body.kick({ sx: 4, sy: -6, y: 30 })
    const t = trigger.current
    if (t && !prefersReducedMotion()) {
      const r = t.getBoundingClientRect()
      spawn(speedLines({ left: r.left, top: r.bottom - 4, width: r.width, height: 40 }, 1, { count: 6, length: 50, color: C.soft }))
    }
  }

  /** Animate the menu away, then unmount it. `chosen` flies into the trigger instead of scattering. */
  const close = (focusTrigger = true, chosen?: number) => {
    const ul = list.current
    if (!open || leaving.current) return
    const done = () => {
      leaving.current = false
      setOpen(false)
    }
    if (focusTrigger) trigger.current?.focus()
    if (!ul || prefersReducedMotion()) return done()
    leaving.current = true
    const flat = uiStyle() === 'flat'
    Array.from(ul.querySelectorAll<HTMLElement>('[role=option]')).forEach((li, i) => {
      if (i === chosen) return
      const dir = i % 2 ? 1 : -1
      li.animate(
        [{ transform: 'none', opacity: 1 }, { transform: flat ? 'translateY(-6px)' : `translateX(${dir * 70}px) rotate(${dir * 9}deg)`, opacity: 0 }],
        { duration: flat ? 140 : 230, delay: i * 18, easing: WHIP, fill: 'forwards' },
      )
    })
    if (cursor.current) cursor.current.style.opacity = '0'
    const menu = ul.animate([{ opacity: 1 }, { opacity: 0, transform: `translateY(${above() ? 10 : -10}px) scale(.96)` }], {
      duration: flat ? 160 : 260,
      delay: chosen === undefined ? 0 : 60,
      easing: WHIP,
      fill: 'forwards',
    })
    menu.finished.then(done, done)
  }

  const pick = (i: number) => {
    const o = options[i]
    if (!o || leaving.current) return
    const from = optionEl(i)?.getBoundingClientRect()
    setInner(o.value)
    onValueChange?.(o.value)
    close(true, i)
    const t = trigger.current
    const v = valueRef.current
    if (!t || !v) return
    const r = t.getBoundingClientRect()
    const land = () => {
      body.kick({ sx: -5, sy: 9, y: -40 })
      spawn(
        burst(r.right - 30, r.top + r.height / 2, { radius: 30, spikes: 10 }),
        slash(r.left - 10, r.bottom + 6, r.right + 10, r.top - 6, { width: 8, bend: 0.1 }),
        delayed(0.05, smoke(r.left + r.width / 2, r.bottom, { count: 4, spread: 40, size: 9 })),
      )
      if (sfxText) spawn(delayed(0.06, sfx(r.right - 20, r.top - 18, sfxText, { size: 26, color: C.accent })))
    }
    if (!from || prefersReducedMotion()) return land()
    // FLIP: the new value starts where the option card was and flies into the trigger
    requestAnimationFrame(() => {
      const to = v.getBoundingClientRect()
      const dx = from.left + 12 - to.left
      const dy = from.top + from.height / 2 - (to.top + to.height / 2)
      v.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) rotate(${rand(-8, 8)}deg) scale(1.1)`, color: 'var(--color-accent)' },
          { transform: 'translate(0,0) scale(1.25)', offset: 0.7 },
          { transform: 'none' },
        ],
        { duration: 380, easing: POP },
      ).finished.then(land, land)
    })
  }

  // open: pop the menu out of the trigger and deal the options in
  useLayoutEffect(() => {
    if (!open || !list.current) return
    list.current.focus({ preventScroll: true })
    const el = optionEl(active)
    if (el) glide.snap({ y: el.offsetTop, h: el.offsetHeight })
    if (prefersReducedMotion()) return
    const flat = uiStyle() === 'flat'
    list.current.animate(
      [
        { transform: `translateY(${(flat ? 6 : 18) * (above() ? 1 : -1)}px) ${flat ? 'scale(.98)' : 'scale(.7, .4)'}`, opacity: 0 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: flat ? 200 : 380, easing: POP },
    )
    if (cursor.current) {
      cursor.current.style.opacity = '1'
      cursor.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: flat ? 60 : 200, fill: 'backwards' })
    }
    Array.from(list.current.querySelectorAll<HTMLElement>('[role=option]')).forEach((li, i) => {
      const dir = i % 2 ? 1 : -1
      li.animate(
        [
          { transform: flat ? 'translateY(-6px)' : `translate(${dir * 60}px, -24px) rotate(${dir * -12}deg) scale(.8)`, opacity: 0 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: flat ? 220 : 460, delay: (flat ? 20 : 70) + i * (flat ? 18 : 55), easing: POP, fill: 'backwards' },
      )
    })
    // only on open; moving the cursor is handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // cursor follows the active option; keep it in view
  useEffect(() => {
    if (!open) return
    const el = optionEl(active)
    if (!el) return
    glide.set({ y: el.offsetTop, h: el.offsetHeight })
    if (list.current) keepInView(list.current, el)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active])

  // close on outside pointer
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
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault()
      openAt(selectedIndex >= 0 ? selectedIndex : e.key === 'ArrowUp' ? options.length - 1 : 0)
    }
  }

  const onListKey = (e: KeyboardEvent) => {
    const last = options.length - 1
    const moves: Record<string, number> = {
      ArrowDown: Math.min(active + 1, last),
      ArrowUp: Math.max(active - 1, 0),
      Home: 0,
      End: last,
    }
    if (e.key in moves) {
      e.preventDefault()
      setActive(moves[e.key])
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      pick(active)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'Tab') {
      close(false)
    } else if (e.key.length === 1 && /\S/.test(e.key)) {
      // type-ahead: next option whose label starts with the typed character
      const ch = e.key.toLowerCase()
      for (let step = 1; step <= options.length; step++) {
        const i = (active + step) % options.length
        if (options[i].label.toLowerCase().startsWith(ch)) {
          setActive(i)
          break
        }
      }
    }
  }

  return (
    <div ref={root} className={cn('relative grid w-[min(100%,340px)] gap-2', className)}>
      <span id={labelId} className="ui-head justify-self-start text-[15px] leading-none text-ink">
        {label}
      </span>
      {name && <input type="hidden" name={name} value={current ?? ''} />}
      <button
        ref={trigger}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${labelId} ${base}-value`}
        onClick={() => (open ? close() : openAt(selectedIndex >= 0 ? selectedIndex : 0))}
        onKeyDown={onTriggerKey}
        className="group w-full cursor-pointer touch-manipulation border-0 bg-transparent p-0 text-left text-ink focus-visible:outline-none"
      >
        <span
          ref={face}
          className="ui-border ui-r ui-shadow flex origin-[50%_100%] items-center gap-3 bg-paper py-2.5 pr-2.5 pl-4 transition-[box-shadow,background-color] duration-200 ease-snap group-hover:ui-shadow-hover group-focus-visible:outline-[2.5px] group-focus-visible:outline-offset-4 group-focus-visible:outline-accent group-focus-visible:outline-solid group-aria-expanded:bg-canvas"
        >
          <span className="grid min-w-0 flex-1">
            <span className="text-[11px] leading-none font-bold tracking-wide text-mute">{selected ? `${pad(selectedIndex)} / ${pad(options.length - 1)}` : 'Pick one'}</span>
            <span id={`${base}-value`} ref={valueRef} className={cn('ui-head mt-1 inline-block truncate text-[19px] leading-tight', !selected && 'text-mute')}>
              {selected ? selected.label : placeholder}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="ui-border-thin ui-pill ui-fill grid size-9 shrink-0 rotate-0 place-items-center bg-accent text-white transition-[rotate,scale] duration-500 ease-snap group-hover:scale-110 group-aria-expanded:rotate-180"
          >
            <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-[3.2] [stroke-linecap:round] [stroke-linejoin:round]">
              <path d="M6 9.5 L12 15.5 L18 9.5" />
            </svg>
          </span>
        </span>
      </button>

      {open &&
        createPortal(
          <div ref={pos} className="group/pos fixed top-0 left-0 z-[110]">
            <ul
              ref={list}
              role="listbox"
              tabIndex={-1}
              aria-labelledby={labelId}
              aria-activedescendant={optId(active)}
              onKeyDown={onListKey}
              className="ui-card ui-tone relative m-0 max-h-[min(18rem,var(--avail-h,18rem))] w-full origin-top list-none overflow-auto p-2 text-ink outline-none group-data-[side=top]/pos:origin-bottom"
            >
              {/* the gliding cursor sits under the options */}
              <span
                ref={cursor}
                aria-hidden="true"
                className="ui-border-thin ui-r-sm ui-shadow-sm pointer-events-none absolute inset-x-2 top-0 origin-left bg-accent-soft"
              />
              {options.map((o, i) => {
                const isSel = o.value === current
                const isActive = i === active
                return (
                  <li
                    key={o.value}
                    id={optId(i)}
                    role="option"
                    aria-selected={isSel}
                    data-active={isActive || undefined}
                    onPointerMove={() => !isActive && setActive(i)}
                    onClick={() => pick(i)}
                    className="group/opt relative flex cursor-pointer items-center gap-3 px-3 py-2.5 text-ink"
                  >
                    <span className="ui-head w-6 shrink-0 text-[13px] leading-none text-mute transition-[color,scale] duration-200 ease-snap group-data-active/opt:scale-125 group-data-active/opt:text-accent">
                      {pad(i)}
                    </span>
                    <span className="grid min-w-0 flex-1 transition-[translate] duration-300 ease-snap group-data-active/opt:translate-x-1.5">
                      <span className="ui-head truncate text-[16px] leading-tight">{o.label}</span>
                      {o.hint && <span className="truncate text-xs leading-snug text-mute">{o.hint}</span>}
                    </span>
                    {isSel ? (
                      <span className="ui-border-thin ui-pill ui-fill grid size-6 shrink-0 place-items-center bg-pop text-white">
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 fill-none stroke-current stroke-[4] [stroke-linecap:round] [stroke-linejoin:round]">
                          <path d="M5 12.5 9.5 17 19 7" />
                        </svg>
                      </span>
                    ) : (
                      <Icon
                        name="arrow-right"
                        tone="line"
                        size={18}
                        className="-translate-x-2 text-accent opacity-0 transition duration-200 ease-snap group-data-active/opt:translate-x-0 group-data-active/opt:opacity-100"
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          </div>,
          host ?? document.body,
        )}
    </div>
  )
}
