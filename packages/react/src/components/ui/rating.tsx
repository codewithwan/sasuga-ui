import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { KeyboardEvent, Ref } from 'react'
import { burst, centerOf, delayed, impactAt, prefersReducedMotion, rand, smoke, sparkle, spawn, uiStyle, useSprings } from '@/fx'
import { C } from '@/fx/palette'
import { cn } from '@/lib/utils'

const STAR = 'M24 4 L30.2 16.8 L44.5 18.6 L34 28.4 L36.8 42.6 L24 35.6 L11.2 42.6 L14 28.4 L3.5 18.6 L17.8 16.8 Z'
const POP = 'cubic-bezier(.2,1.6,.4,1)'
const CHAIN = 65

type StarApi = {
  /** Fill in after `delay` ms with a pop; `last` adds a hit. */
  chain: (delay: number, last: boolean) => void
  wiggle: (delay: number, amount: number) => void
  drop: (delay: number) => void
  jump: (delay: number) => void
  focus: () => void
}

type StarProps = {
  index: number
  count: number
  lit: boolean
  preview: boolean
  checked: boolean
  focusable: boolean
  api: Ref<StarApi>
  onPick: () => void
  onHover: () => void
}

function Star({ index, count, lit, preview, checked, focusable, api, onPick, onHover }: StarProps) {
  const btn = useRef<HTMLButtonElement>(null)
  const ref = useRef<HTMLSpanElement>(null)
  const fill = useRef<SVGPathElement>(null)
  const timers = useRef<number[]>([])
  const spring = useSprings(
    ref,
    { s: 1, r: 0, y: 0 },
    (v, el) => {
      el.style.transform = `translateY(${v.y}px) rotate(${v.r}deg) scale(${v.s})`
    },
    { stiffness: 560, damping: 13 },
  )

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])
  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  useImperativeHandle(api, () => ({
    chain(delay, last) {
      fill.current?.animate([{ scale: '0' }, { scale: '1.4', offset: 0.6 }, { scale: '1' }], { duration: 300, delay, easing: POP, fill: 'backwards' })
      later(delay, () => {
        spring.kick({ s: last ? 12 : 8, y: last ? -300 : -200, r: rand(-1, 1) * 480 })
        if (!ref.current) return
        const { x, y } = centerOf(ref.current)
        spawn(sparkle(x + rand(-18, 18), y - rand(14, 26), { size: last ? 13 : 9, color: C.pop }))
        if (last) spawn(burst(x, y, { radius: 26, spikes: 10 }))
      })
    },
    wiggle(delay, amount) {
      later(delay, () => spring.kick({ r: (index % 2 ? 1 : -1) * 300 * amount, s: 2 * amount, y: -40 * amount }))
    },
    drop(delay) {
      later(delay, () => {
        spring.kick({ s: -7, y: 140, r: rand(-1, 1) * 200 })
        if (!ref.current || uiStyle() === 'flat') return
        const { x, rect } = centerOf(ref.current)
        spawn(smoke(x, rect.bottom - 4, { count: 2, spread: 14, size: 6 }))
      })
    },
    jump(delay) {
      later(delay, () => spring.kick({ s: 6, y: -320, r: rand(-1, 1) * 300 }))
    },
    focus: () => btn.current?.focus(),
  }))

  return (
    <button
      ref={btn}
      type="button"
      role="radio"
      aria-checked={checked}
      aria-label={`${index + 1} of ${count}`}
      tabIndex={focusable ? 0 : -1}
      data-lit={lit || undefined}
      data-preview={preview || undefined}
      onClick={onPick}
      onPointerEnter={onHover}
      className="group ui-r-sm size-12 cursor-pointer touch-manipulation border-0 bg-transparent p-[3px]"
    >
      <span ref={ref} className="block size-full">
        <svg viewBox="0 0 48 48" aria-hidden="true" className="size-full overflow-visible [stroke-linejoin:round]">
          <path d={STAR} className="fill-paper" />
          <path
            ref={fill}
            d={STAR}
            className="origin-center fill-accent opacity-0 transition-[fill,opacity] duration-100 [transform-box:fill-box] group-data-lit:opacity-100 group-data-preview:fill-accent-soft"
          />
          <path d={STAR} className="fill-none stroke-(--ui-line) [stroke-width:calc(var(--ui-bw)*1.15)]" />
        </svg>
      </span>
    </button>
  )
}

type Props = {
  label: string
  defaultValue?: number
  value?: number
  onChange?: (value: number) => void
  /** Number of stars. */
  count?: number
  /** Lettering when the top score is picked. `false` = none. */
  sfx?: string | false
  className?: string
}

/**
 * Radio-group stars. Picking fills them in a quick chain, each popping with a sparkle after
 * the one before; hovering previews the score with a wiggle. The top score fires a big hit
 * with 最高! and makes the whole row jump again. Arrow keys, Home and End work.
 */
export function Rating({ label, defaultValue = 0, value: controlled, onChange, count = 5, sfx: sfxText = '最高!', className }: Props) {
  const [inner, setInner] = useState(defaultValue)
  const value = controlled ?? inner
  const [hover, setHover] = useState(0)
  const group = useRef<HTMLDivElement>(null)
  const stars = useRef<(StarApi | null)[]>([])
  const timer = useRef(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const pick = (n: number) => {
    const prev = value
    setInner(n)
    onChange?.(n)
    if (prefersReducedMotion()) return
    for (let i = 0; i < n; i++) stars.current[i]?.chain(i * CHAIN, i === n - 1)
    for (let i = n; i < prev; i++) stars.current[i]?.drop((i - n) * 45)
    if (n !== count || !group.current) return
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const el = group.current
      if (!el) return
      const { x, y, rect } = centerOf(el)
      impactAt(x, y, { text: sfxText, size: 1.15 })
      spawn(
        delayed(0.08, sparkle(rect.left - 6, rect.top + 4, { size: 14, color: C.pop })),
        delayed(0.16, sparkle(rect.right + 8, rect.top + 10, { size: 12 })),
        delayed(0.24, sparkle(rect.right - 20, rect.bottom + 8, { size: 10, color: C.pop })),
      )
      for (let i = 0; i < count; i++) stars.current[i]?.jump(80 + i * 40)
      if (uiStyle() !== 'flat')
        el.animate([{ translate: '0 0' }, { translate: '-5px 2px' }, { translate: '5px -2px' }, { translate: '-3px 1px' }, { translate: '0 0' }], { duration: 300 })
    }, n * CHAIN + 120)
  }

  const preview = (n: number) => {
    if (n === hover) return
    setHover(n)
    if (prefersReducedMotion()) return
    for (let i = 0; i < n; i++) stars.current[i]?.wiggle(i * 28, i === n - 1 ? 1 : 0.35)
  }

  const onKey = (e: KeyboardEvent) => {
    const keys: Record<string, number> = {
      ArrowRight: Math.min(count, value + 1),
      ArrowUp: Math.min(count, value + 1),
      ArrowLeft: Math.max(1, value - 1),
      ArrowDown: Math.max(1, value - 1),
      Home: 1,
      End: count,
    }
    if (!(e.key in keys)) return
    e.preventDefault()
    const n = keys[e.key]
    stars.current[n - 1]?.focus()
    if (n !== value) pick(n)
  }

  const shown = hover || value
  return (
    <div
      ref={group}
      role="radiogroup"
      aria-label={label}
      onPointerLeave={() => setHover(0)}
      onKeyDown={onKey}
      className={cn('inline-flex gap-1', className)}
    >
      {Array.from({ length: count }, (_, i) => (
        <Star
          key={i}
          index={i}
          count={count}
          api={(a) => {
            stars.current[i] = a
          }}
          lit={i < shown}
          preview={hover > 0 && hover !== value && i < hover}
          checked={value === i + 1}
          focusable={value ? value === i + 1 : i === 0}
          onPick={() => pick(i + 1)}
          onHover={() => preview(i + 1)}
        />
      ))}
    </div>
  )
}
