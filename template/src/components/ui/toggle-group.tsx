import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { burst, centerOf, delayed, prefersReducedMotion, sfx, shards, smoke, sparkle, spawn, speedLines, uiStyle, useSprings } from '@/fx'
import { C } from '@/fx/palette'
import { cn } from '@/lib/utils'

export type ToggleGroupItem = { value: string; label: ReactNode; disabled?: boolean }

type Common = {
  items: ToggleGroupItem[]
  /** Accessible name for the group. */
  label: string
  size?: 'sm' | 'md'
  /** Lettering when an item is selected. `false` = none. */
  sfx?: string | false
  className?: string
}
type Single = Common & { type?: 'single'; value?: string; defaultValue?: string; onValueChange?: (value: string) => void }
type Multiple = Common & { type: 'multiple'; value?: string[]; defaultValue?: string[]; onValueChange?: (value: string[]) => void }
export type ToggleGroupProps = Single | Multiple

const POP = 'cubic-bezier(.2,1.6,.4,1)'
const SIZE = { sm: 'px-3.5 py-2 text-[14px]', md: 'px-4 py-2.5 text-[16px]' }
const STICKER = 'ui-border-thin ui-pill ui-fill pointer-events-none absolute top-1 bottom-1 left-0 -z-10 bg-accent'

function hit(el: HTMLElement, text: string | false, big: boolean) {
  const { x, y, rect } = centerOf(el)
  spawn(
    burst(x, rect.top + 2, { radius: big ? 26 : 18, spikes: 9 }),
    delayed(0.03, shards(x, rect.top + 2, { count: big ? 7 : 4, speed: 300, size: 6 })),
    delayed(0.1, sparkle(rect.right - 4, rect.top - 6, { size: 10, color: C.pop })),
  )
  if (big) spawn(delayed(0.04, smoke(x, rect.bottom + 2, { count: 3, spread: rect.width * 0.4, size: 8 })))
  if (text) spawn(delayed(0.05, sfx(x, y - 36, text, { size: 24, color: C.accent })))
}

/**
 * A segmented control. In single mode a sticker slides under the picked item: its leading
 * edge shoots ahead, the trailing edge catches up, and it lands with a hit. Multiple mode
 * pops a sticker onto each pressed item. Arrow keys, Home and End move between items.
 */
export function ToggleGroup(props: ToggleGroupProps) {
  const { items, label, size = 'md', sfx: sfxText = 'ピタッ', className } = props
  const multi = props.type === 'multiple'
  const [single, setSingle] = useState(multi ? undefined : (props.defaultValue as string | undefined))
  const [many, setMany] = useState<string[]>(multi ? ((props.defaultValue as string[] | undefined) ?? []) : [])
  const selSingle = multi ? undefined : ((props.value as string | undefined) ?? single)
  const selMany = multi ? ((props.value as string[] | undefined) ?? many) : []
  const isOn = (v: string) => (multi ? selMany.includes(v) : selSingle === v)

  const root = useRef<HTMLDivElement>(null)
  const sticker = useRef<HTMLSpanElement>(null)
  const btns = useRef<(HTMLButtonElement | null)[]>([])
  const marks = useRef<(HTMLSpanElement | null)[]>([])
  const [focusIdx, setFocusIdx] = useState(0)
  const activeIdx = items.findIndex((it) => it.value === selSingle)
  const landing = useRef<number | null>(null)
  const timer = useRef(0)
  const prevSingle = useRef(activeIdx)
  const prevMany = useRef(selMany)

  // left / right edge of the sliding sticker, plus a squash
  const spring = useSprings(
    sticker,
    { l: 0, r: 0 },
    (v, el) => {
      el.style.width = `${Math.max(v.r - v.l, 0)}px`
      el.style.transform = `translateX(${v.l}px)`
      const i = landing.current
      const b = i === null ? null : btns.current[i]
      if (b && Math.abs(v.l - b.offsetLeft) < 1.5 && Math.abs(v.r - b.offsetLeft - b.offsetWidth) < 1.5) {
        landing.current = null
        el.animate([{ scale: '1' }, { scale: '1.06 .78', offset: 0.3 }, { scale: '.98 1.06', offset: 0.65 }, { scale: '1' }], { duration: 340, easing: 'ease-out' })
        b.animate([{ transform: 'none' }, { transform: 'translateY(-3px) scale(1.08)', offset: 0.4 }, { transform: 'none' }], { duration: 320, easing: POP })
        hit(b, sfxText, true)
      }
    },
    { stiffness: 520, damping: 22 },
  )

  const edges = (i: number) => {
    const b = btns.current[i]
    return b ? { l: b.offsetLeft, r: b.offsetLeft + b.offsetWidth } : null
  }

  useLayoutEffect(() => {
    if (multi) return
    const place = () => {
      const e = edges(prevSingle.current)
      if (e) spring.snap(e)
    }
    place()
    const ro = new ResizeObserver(place)
    if (root.current) ro.observe(root.current)
    document.fonts?.ready.then(place)
    return () => ro.disconnect()
  }, [multi, spring])
  useEffect(() => () => window.clearTimeout(timer.current), [])

  // single: slide the sticker — the leading edge goes first, the trailing one follows
  useLayoutEffect(() => {
    if (multi) return
    const from = prevSingle.current
    if (from === activeIdx) return
    prevSingle.current = activeIdx
    const e = edges(activeIdx)
    if (!e) return
    if (from < 0 || prefersReducedMotion()) {
      spring.snap(e)
      const b = btns.current[activeIdx]
      if (b && from < 0 && !prefersReducedMotion()) {
        sticker.current?.animate([{ scale: '0' }, { scale: '1.15' }, { scale: '1' }], { duration: 360, easing: POP })
        hit(b, sfxText, true)
      }
      return
    }
    const right = activeIdx > from
    landing.current = activeIdx
    sticker.current?.animate([{ scale: '1' }, { scale: '.94 1.1' }], { duration: 90, easing: 'ease-out' })
    window.clearTimeout(timer.current)
    if (right) spring.set({ r: e.r })
    else spring.set({ l: e.l })
    timer.current = window.setTimeout(() => spring.set(e), uiStyle() === 'flat' ? 50 : 95)
    const a = btns.current[from]?.getBoundingClientRect()
    const b = btns.current[activeIdx]?.getBoundingClientRect()
    if (a && b) {
      const left = Math.min(a.left, b.left)
      spawn(speedLines({ left, top: b.top + 2, width: Math.max(a.right, b.right) - left, height: b.height - 4 }, right ? 1 : -1, { count: 6, length: 60 }))
    }
  }, [multi, activeIdx, spring, sfxText])

  // multiple: each newly pressed item gets a sticker that pops on, released ones pop off
  useLayoutEffect(() => {
    if (!multi) return
    const was = prevMany.current
    prevMany.current = selMany
    if (prefersReducedMotion()) return
    items.forEach((it, i) => {
      const m = marks.current[i]
      const b = btns.current[i]
      if (!m || !b) return
      const now = selMany.includes(it.value)
      const before = was.includes(it.value)
      if (now && !before) {
        m.animate([{ scale: '.2 1.4', opacity: 0 }, { scale: '1.2 .8', opacity: 1, offset: 0.45 }, { scale: '1' }], { duration: 380, easing: POP })
        b.animate([{ transform: 'none' }, { transform: 'translateY(-3px) scale(1.08)', offset: 0.4 }, { transform: 'none' }], { duration: 320, easing: POP })
        hit(b, sfxText, false)
      } else if (!now && before) {
        m.animate([{ scale: '1', opacity: 1 }, { scale: '1.15 .7', opacity: 1, offset: 0.3 }, { scale: '0', opacity: 0 }], { duration: 220, easing: 'ease-in' })
      }
    })
    // selMany is a fresh array each render; compare by content
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multi, selMany.join('\u0000')])

  const choose = (i: number) => {
    const it = items[i]
    if (!it || it.disabled) return
    if (props.type === 'multiple') {
      const next = selMany.includes(it.value) ? selMany.filter((v) => v !== it.value) : [...selMany, it.value]
      setMany(next)
      props.onValueChange?.(next)
    } else {
      if (selSingle === it.value) return
      setSingle(it.value)
      props.onValueChange?.(it.value)
    }
  }

  const enabled = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0)
  const tabStop = multi ? (enabled.includes(focusIdx) ? focusIdx : enabled[0]) : activeIdx >= 0 ? activeIdx : enabled[0]

  const onKey = (e: KeyboardEvent, i: number) => {
    const pos = enabled.indexOf(i)
    const n = enabled.length
    const keys: Record<string, number> = {
      ArrowRight: enabled[(pos + 1) % n],
      ArrowDown: enabled[(pos + 1) % n],
      ArrowLeft: enabled[(pos - 1 + n) % n],
      ArrowUp: enabled[(pos - 1 + n) % n],
      Home: enabled[0],
      End: enabled[n - 1],
    }
    if (!(e.key in keys) || !n) return
    e.preventDefault()
    const to = keys[e.key]
    setFocusIdx(to)
    btns.current[to]?.focus()
    if (!multi) choose(to)
  }

  return (
    <div
      ref={root}
      role={multi ? 'group' : 'radiogroup'}
      aria-label={label}
      className={cn('ui-border ui-pill ui-shadow-sm relative isolate inline-flex max-w-full gap-0.5 bg-paper p-1', className)}
    >
      {!multi && <span ref={sticker} aria-hidden="true" className={cn(STICKER, activeIdx < 0 && 'opacity-0')} />}
      {items.map((it, i) => {
        const on = isOn(it.value)
        return (
          <button
            key={it.value}
            ref={(el) => {
              btns.current[i] = el
            }}
            type="button"
            role={multi ? undefined : 'radio'}
            aria-checked={multi ? undefined : on}
            aria-pressed={multi ? on : undefined}
            disabled={it.disabled}
            tabIndex={i === tabStop ? 0 : -1}
            data-on={on || undefined}
            onClick={() => {
              setFocusIdx(i)
              choose(i)
            }}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              'ui-head ui-pill relative shrink-0 cursor-pointer border-0 bg-transparent leading-none whitespace-nowrap text-mute transition-colors duration-200 hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ink active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 data-on:text-white',
              SIZE[size],
            )}
          >
            {multi && (
              <span
                ref={(el) => {
                  marks.current[i] = el
                }}
                aria-hidden="true"
                className={cn('ui-border-thin ui-pill ui-fill pointer-events-none absolute inset-0 -z-10 bg-accent', !on && 'opacity-0')}
              />
            )}
            {it.label}
          </button>
        )
      })}
    </div>
  )
}
