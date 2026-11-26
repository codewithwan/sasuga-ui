import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, HTMLAttributes, KeyboardEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { burst, centerOf, delayed, prefersReducedMotion, sfx, shards, slash, sparkle, spawn, uiStyle, useSprings } from '@/fx'
import { C } from '@/fx/palette'
import { cn } from '@/lib/utils'
import { Icon } from './icon'
import { portalRoot, useAnchored } from './use-anchored'

export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary'

export type InventoryItem = {
  id: string
  name: string
  /** Icon drawn in the slot (an SVG or <img>, sized to fill ~40px). */
  icon: ReactNode
  rarity?: ItemRarity
  /** Stack size; the badge shows when it is above 1. */
  quantity?: number
  /** Item type shown in the info card: 'Weapon', 'Consumable'… */
  kind?: string
  description?: string
  stats?: { label: string; value: string | number }[]
}

type RarityConfig = { rc: string; label: string; chip: string; tint: boolean }

const RARITY: Record<ItemRarity, RarityConfig> = {
  common: { rc: 'var(--ui-line)', label: 'Common', chip: 'bg-canvas text-mute', tint: false },
  rare: { rc: 'var(--color-accent-soft)', label: 'Rare', chip: 'bg-accent-soft text-ink', tint: true },
  epic: { rc: 'var(--color-accent)', label: 'Epic', chip: 'ui-fill bg-accent text-white', tint: true },
  legendary: { rc: 'var(--color-pop)', label: 'Legendary', chip: 'ui-fill bg-pop text-white', tint: true },
}
const fxColor = (r: ItemRarity) => (r === 'legendary' ? C.pop : r === 'epic' ? C.accent : C.soft)
const POP = 'cubic-bezier(.2,1.6,.4,1)'
const CORNER = 'absolute size-4 [--cb:max(var(--ui-bw),2.5px)_solid_var(--color-accent)]'

export type ItemSlotProps = Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> & {
  /** `null` / omitted = an empty slot. */
  item?: InventoryItem | null
  selected?: boolean
  equipped?: boolean
  /** Click / Enter on a slot that is not selected. */
  onSelect?: () => void
  /** Click / Enter on the selected slot (so a double-click equips). */
  onEquip?: () => void
  /** Where the info card opens. */
  infoPlacement?: 'top' | 'bottom'
  infoAlign?: 'start' | 'center' | 'end'
  /** Lettering when it gets equipped. `false` = none. */
  sfx?: string | false
}

/**
 * One inventory slot. The border takes the rarity colour, hovering lifts it and opens
 * an info card, selecting pops a cursor frame around it, and equipping cuts a slash
 * through it with "EQUIP!" lettering. Empty slots are a dashed socket.
 */
export function ItemSlot({
  item,
  selected = false,
  equipped = false,
  onSelect,
  onEquip,
  infoPlacement = 'top',
  infoAlign = 'center',
  sfx: sfxText = 'EQUIP!',
  className,
  style,
  onClick,
  onKeyDown,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  ...rest
}: ItemSlotProps) {
  const [peek, setPeek] = useState(false)
  const [host, setHost] = useState<HTMLElement | null>(null)
  const show = () => {
    setHost(portalRoot(slot.current))
    setPeek(true)
  }
  const slot = useRef<HTMLDivElement>(null)
  const info = useRef<HTMLSpanElement>(null)
  const body = useRef<HTMLSpanElement>(null)
  const face = useRef<HTMLSpanElement>(null)
  const cursor = useRef<HTMLSpanElement>(null)
  const breathe = useRef<HTMLSpanElement>(null)
  const badge = useRef<HTMLSpanElement>(null)
  const prevSel = useRef(selected)
  const prevEq = useRef(equipped)
  const tipId = useId()
  const rarity = item?.rarity ?? 'common'
  const cfg = RARITY[rarity]
  const qty = item?.quantity ?? 1
  const showInfo = peek && !!item
  // the info card is fixed and portalled so no card or scroller clips it
  useAnchored(showInfo, slot, info, { side: infoPlacement, align: infoAlign, gap: 14 })

  const squash = useSprings(
    body,
    { sx: 1, sy: 1, y: 0 },
    (v, el) => {
      el.style.transform = `translateY(${v.y}px) scale(${v.sx}, ${v.sy})`
    },
    { stiffness: 600, damping: 13 },
  )

  // selected: the cursor frame slams in from big, then breathes
  useEffect(() => {
    const was = prevSel.current
    prevSel.current = selected
    if (!selected || was || prefersReducedMotion()) return
    const flat = uiStyle() === 'flat'
    cursor.current?.animate(
      [
        { opacity: 0, transform: `scale(${flat ? 1.25 : 1.75})` },
        { opacity: 1, transform: 'scale(.9)', offset: 0.6 },
        { opacity: 1, transform: 'none' },
      ],
      { duration: flat ? 260 : 360, easing: POP },
    )
    squash.kick({ sx: 2.5, sy: 2.5 })
  }, [selected, squash])

  useEffect(() => {
    if (!selected || prefersReducedMotion()) return
    const a = breathe.current?.animate([{ scale: '1' }, { scale: uiStyle() === 'flat' ? '1.04' : '1.09' }], {
      duration: 650,
      iterations: Infinity,
      direction: 'alternate',
      easing: 'ease-in-out',
    })
    return () => a?.cancel()
  }, [selected])

  // equipped: slash + burst + lettering, the slot squashes and the E badge stamps on
  useEffect(() => {
    const was = prevEq.current
    prevEq.current = equipped
    if (!equipped || was || prefersReducedMotion()) return
    const el = face.current
    if (!el) return
    badge.current?.animate([{ transform: 'scale(2.6)', opacity: 0 }, { transform: 'scale(.85)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], {
      duration: 380,
      delay: 120,
      easing: POP,
      fill: 'backwards',
    })
    squash.kick({ sx: -6, sy: 9, y: -60 })
    const { x, y, rect: r } = centerOf(el)
    spawn(
      slash(r.left - 16, r.bottom + 12, r.right + 16, r.top - 12, { width: 11, bend: 0.14 }),
      delayed(0.09, burst(x, y, { radius: 36, spikes: 10, color: fxColor(rarity) })),
      delayed(0.09, shards(x, y, { count: 9, speed: 400 })),
      delayed(0.16, sparkle(r.right - 2, r.top + 2, { size: 12, color: C.pop })),
    )
    if (sfxText) spawn(delayed(0.1, sfx(x, r.top - 24, sfxText, { size: 28, color: C.accent })))
  }, [equipped, squash, sfxText, rarity])

  const activate = () => (selected && item ? onEquip?.() : onSelect?.())
  const label = item ? `${item.name}${qty > 1 ? `, ${qty}` : ''}, ${cfg.label}${equipped ? ', equipped' : ''}` : 'Empty slot'

  return (
    <div
      ref={slot}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-describedby={peek && item ? tipId : undefined}
      {...rest}
      data-selected={selected || undefined}
      className={cn('group relative inline-grid size-16 shrink-0 cursor-pointer touch-manipulation outline-none', className)}
      style={{ '--rc': cfg.rc, ...style } as CSSProperties}
      onClick={(e) => {
        activate()
        onClick?.(e)
      }}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (!e.repeat) activate()
        }
        onKeyDown?.(e)
      }}
      onPointerEnter={(e) => {
        show()
        onPointerEnter?.(e)
      }}
      onPointerLeave={(e) => {
        setPeek(false)
        onPointerLeave?.(e)
      }}
      onFocus={(e) => {
        show()
        onFocus?.(e)
      }}
      onBlur={(e) => {
        setPeek(false)
        onBlur?.(e)
      }}
    >
      <span ref={body} className="grid origin-bottom">
        <span
          ref={face}
          className={cn(
            'ui-r relative grid place-items-center transition-[translate,box-shadow,background-color] duration-200 ease-snap group-focus-visible:ui-focus',
            item
              ? 'ui-shadow-sm bg-paper [border:var(--ui-bw)_solid_var(--rc)] group-hover:-translate-y-1 group-hover:ui-shadow-hover group-data-selected:-translate-y-1'
              : 'bg-canvas/60 [border:var(--ui-bw-thin)_dashed_var(--color-line)] group-hover:bg-canvas',
          )}
        >
          {item && cfg.tint && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(to_top,color-mix(in_srgb,var(--rc)_32%,transparent),transparent_72%)]"
            />
          )}
          {item ? (
            <span aria-hidden="true" className="relative grid size-10 place-items-center text-ink [&>img]:size-full [&>svg]:size-full">
              {item.icon}
            </span>
          ) : (
            <span aria-hidden="true" className="size-2 rounded-full bg-line" />
          )}
          {item && rarity === 'legendary' && (
            <Icon name="sparkle" tone="solid" size={11} className="fx-only absolute top-0.5 right-0.5 animate-blink text-pop" />
          )}
          {qty > 1 && (
            <span aria-hidden="true" className="ui-head ui-pill absolute -right-1.5 -bottom-1.5 min-w-5 bg-ink px-1.5 py-[3px] text-center text-[11px] leading-none text-paper tabular-nums">
              {qty}
            </span>
          )}
          {equipped && (
            <span
              ref={badge}
              aria-hidden="true"
              className="ui-head ui-pill ui-fill ui-border-thin absolute -top-2 -left-2 grid size-5 place-items-center bg-pop text-[10px] leading-none text-white"
            >
              E
            </span>
          )}
        </span>
      </span>

      {selected && (
        <span ref={cursor} aria-hidden="true" className="pointer-events-none absolute -inset-2 z-10">
          <span ref={breathe} className="absolute inset-0">
            <span className={cn(CORNER, 'top-0 left-0 rounded-tl-[var(--ui-r)] [border-top:var(--cb)] [border-left:var(--cb)]')} />
            <span className={cn(CORNER, 'top-0 right-0 rounded-tr-[var(--ui-r)] [border-top:var(--cb)] [border-right:var(--cb)]')} />
            <span className={cn(CORNER, 'bottom-0 left-0 rounded-bl-[var(--ui-r)] [border-bottom:var(--cb)] [border-left:var(--cb)]')} />
            <span className={cn(CORNER, 'right-0 bottom-0 rounded-br-[var(--ui-r)] [border-right:var(--cb)] [border-bottom:var(--cb)]')} />
          </span>
        </span>
      )}

      {showInfo && item &&
        createPortal(
          <span ref={info} className="pointer-events-none fixed top-0 left-0 z-[110] w-max">
            <span id={tipId} role="tooltip" className="ui-card ui-tone grid w-56 animate-panel-in gap-1.5 p-3 text-left text-ink">
              <span className="flex items-start justify-between gap-2">
                <span className="ui-head text-[15px] leading-tight">{item.name}</span>
                <span className={cn('ui-pill shrink-0 px-2 py-[3px] text-[10px] leading-none font-bold', cfg.chip)}>{cfg.label}</span>
              </span>
              {item.kind && <span className="text-[11px] leading-none font-bold text-mute">{item.kind}</span>}
              {item.description && <span className="text-xs leading-snug">{item.description}</span>}
              {item.stats && item.stats.length > 0 && (
                <span className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-xs leading-snug">
                  {item.stats.map((s) => (
                    <span key={s.label} className="contents">
                      <span className="text-mute">{s.label}</span>
                      <span className="font-mono font-bold text-accent tabular-nums">{s.value}</span>
                    </span>
                  ))}
                </span>
              )}
              <span className="ui-divider pt-1.5 text-[11px] leading-none text-mute">
                {equipped ? 'Equipped · press again to unequip' : selected ? 'Press again to equip' : 'Click or Enter to select'}
              </span>
            </span>
          </span>,
          host ?? document.body,
        )}
    </div>
  )
}

export type InventoryGridProps = Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> & {
  /** One entry per slot; `null` is an empty slot. */
  items: (InventoryItem | null)[]
  /** Accessible name of the grid. */
  label: string
  columns?: number
  /** Controlled selected slot index (`null` = none). */
  selected?: number | null
  defaultSelected?: number | null
  onSelectedChange?: (index: number, item: InventoryItem | null) => void
  /** Controlled list of equipped item ids. */
  equipped?: string[]
  defaultEquipped?: string[]
  /** Fired when an item is equipped or unequipped, with the new id list. */
  onEquippedChange?: (ids: string[], item: InventoryItem) => void
  /** Lettering on equip. `false` = none. */
  sfx?: string | false
}

/**
 * A grid of ItemSlots with one tab stop: arrow keys move (wrapping by row),
 * Home/End jump within a row (Ctrl for the whole grid), Enter/Space selects,
 * and Enter/Space or a click on the selected slot equips / unequips.
 */
export function InventoryGrid({
  items,
  label,
  columns = 5,
  selected,
  defaultSelected = null,
  onSelectedChange,
  equipped,
  defaultEquipped = [],
  onEquippedChange,
  sfx: sfxText,
  className,
  onKeyDown,
  ...rest
}: InventoryGridProps) {
  const [selInner, setSelInner] = useState<number | null>(defaultSelected)
  const sel = selected === undefined ? selInner : selected
  const [eqInner, setEqInner] = useState<string[]>(defaultEquipped)
  const eq = equipped ?? eqInner
  const [active, setActive] = useState(() => sel ?? 0)
  const root = useRef<HTMLDivElement>(null)
  const cols = Math.max(1, columns)
  const rows = Math.ceil(items.length / cols)
  const last = items.length - 1
  const current = Math.min(active, Math.max(0, last))

  const focusAt = (i: number) => {
    setActive(i)
    root.current?.querySelector<HTMLElement>(`[data-slot="${i}"]`)?.focus()
  }
  const select = (i: number) => {
    setActive(i)
    setSelInner(i)
    onSelectedChange?.(i, items[i] ?? null)
  }
  const toggleEquip = (i: number) => {
    const it = items[i]
    if (!it) return
    const next = eq.includes(it.id) ? eq.filter((id) => id !== it.id) : [...eq, it.id]
    setEqInner(next)
    onEquippedChange?.(next, it)
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e)
    const i = current
    const col = i % cols
    let n: number
    switch (e.key) {
      case 'ArrowRight':
        n = Math.min(i + 1, last)
        break
      case 'ArrowLeft':
        n = Math.max(i - 1, 0)
        break
      case 'ArrowDown':
        n = i + cols <= last ? i + cols : i
        break
      case 'ArrowUp':
        n = i - cols >= 0 ? i - cols : i
        break
      case 'Home':
        n = e.ctrlKey ? 0 : i - col
        break
      case 'End':
        n = e.ctrlKey ? last : Math.min(i - col + cols - 1, last)
        break
      default:
        return
    }
    e.preventDefault()
    focusAt(n)
  }

  return (
    <div ref={root} role="grid" aria-label={label} {...rest} onKeyDown={onKey} className={cn('inline-grid gap-2.5', className)}>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} role="row" className="flex gap-2.5">
          {items.slice(r * cols, r * cols + cols).map((it, c) => {
            const i = r * cols + c
            return (
              <ItemSlot
                key={it?.id ?? `empty-${i}`}
                role="gridcell"
                data-slot={i}
                tabIndex={i === current ? 0 : -1}
                aria-selected={sel === i}
                item={it}
                selected={sel === i}
                equipped={!!it && eq.includes(it.id)}
                onSelect={() => select(i)}
                onEquip={() => toggleEquip(i)}
                onFocus={() => setActive(i)}
                infoPlacement={r < Math.ceil(rows / 2) ? 'bottom' : 'top'}
                infoAlign={c === 0 ? 'start' : c === cols - 1 ? 'end' : 'center'}
                sfx={sfxText}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
