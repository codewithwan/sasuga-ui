import { useId, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { burst, centerOf, delayed, prefersReducedMotion, sfx, shards, sparkle, spawn, uiStyle } from '@/fx'
import { C } from '@/fx/palette'
import { cn } from '@/lib/utils'

export type RadioOption = { value: string; label: ReactNode; hint?: ReactNode }

export type RadioGroupProps = {
  options: RadioOption[]
  /** Accessible name for the group. */
  label: string
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  name?: string
  /** Lettering when an option is picked. `false` = none. */
  sfx?: string | false
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

type Parts = { card: HTMLSpanElement | null; ring: HTMLSpanElement | null }
type PartRef = (part: keyof Parts, el: HTMLSpanElement | null) => void

function Option({
  option,
  name,
  checked,
  setPart,
  onPick,
}: {
  option: RadioOption
  name: string
  checked: boolean
  setPart: PartRef
  onPick: (value: string) => void
}) {
  const id = useId()
  return (
    <label htmlFor={id} className="cursor-pointer">
      <input id={id} type="radio" name={name} value={option.value} checked={checked} onChange={() => onPick(option.value)} className="peer sr-only" />
      <span
        ref={(el) => setPart('card', el)}
        className={cn(
          'ui-border ui-r ui-shadow-sm flex origin-bottom items-center gap-3 bg-paper px-4 py-2.5 text-ink transition-[translate,box-shadow,background-color] duration-200 ease-snap',
          'hover:-translate-y-0.5 hover:ui-shadow active:translate-y-0.5 active:ui-shadow-press',
          'peer-checked:bg-accent-soft/45',
          'peer-focus-visible:outline-[2.5px] peer-focus-visible:outline-offset-[3px] peer-focus-visible:outline-accent peer-focus-visible:outline-solid',
        )}
      >
        <span
          ref={(el) => setPart('ring', el)}
          aria-hidden="true"
          className="ui-border-thin relative size-[22px] shrink-0 rounded-full bg-paper"
        >
          <span className={cn('absolute inset-[3px] rounded-full bg-accent transition-[scale] duration-300 ease-snap', checked ? 'scale-100' : 'scale-0')} />
        </span>
        <span className="grid">
          <span className="ui-head text-[17px] leading-none">{option.label}</span>
          {option.hint && <span className="mt-1 text-xs leading-tight font-medium text-mute">{option.hint}</span>}
        </span>
      </span>
    </label>
  )
}

const POP = 'cubic-bezier(.2,1.6,.4,1)'

/**
 * Native radios (arrow keys, form submit and a11y for free) dressed as sticker chips.
 * Picking another option launches the selection dot out of the old chip: it flies over in
 * an arc trailing afterimages, lands in the new one with a burst, and both chips bounce.
 */
export function RadioGroup({
  options,
  label,
  value,
  defaultValue,
  onValueChange,
  name,
  sfx: sfxText = 'ピッ',
  orientation = 'horizontal',
  className,
}: RadioGroupProps) {
  const [inner, setInner] = useState(defaultValue)
  const current = value ?? inner
  const auto = useId()
  const group = name ?? auto
  const host = useRef<HTMLFieldSetElement>(null)
  const parts = useRef(new Map<string, Parts>())
  const prev = useRef(current)

  const partRef = (v: string): PartRef => (part, el) => {
    let p = parts.current.get(v)
    if (!p) parts.current.set(v, (p = { card: null, ring: null }))
    p[part] = el
  }

  const pick = (v: string) => {
    setInner(v)
    onValueChange?.(v)
  }

  useLayoutEffect(() => {
    const from = prev.current
    if (from === current) return
    prev.current = current
    if (current === undefined || prefersReducedMotion()) return
    const to = parts.current.get(current)
    const dot = to?.ring?.firstElementChild as HTMLElement | null | undefined
    if (!to?.ring || !dot) return
    const flat = uiStyle() === 'flat'

    const land = () => {
      dot.style.scale = ''
      dot.animate([{ scale: '1.6 .55' }, { scale: '.8 1.25', offset: 0.4 }, { scale: '1' }], { duration: 380, easing: POP })
      to.card?.animate(
        [{ transform: 'none' }, { transform: 'translateY(3px) scale(1.04, .9)', offset: 0.22 }, { transform: 'translateY(-6px) scale(.98, 1.04)', offset: 0.6 }, { transform: 'none' }],
        { duration: 460, easing: 'ease-out' },
      )
      const { x, y } = centerOf(to.ring!)
      spawn(
        burst(x, y, { radius: 26, spikes: 9 }),
        delayed(0.03, shards(x, y, { count: 7, speed: 300, size: 6 })),
        delayed(0.12, sparkle(x + 22, y - 18, { size: 10, color: C.pop })),
      )
      if (sfxText) spawn(delayed(0.05, sfx(x + 28, y - 32, sfxText, { size: 22, color: C.accent })))
    }

    const src = from !== undefined ? parts.current.get(from) : undefined
    const fs = host.current
    if (!src?.ring || !fs) return land()

    // the old dot squashes and launches
    const old = src.ring.firstElementChild as HTMLElement | null
    old?.animate([{ scale: '1' }, { scale: '1.4 .6', offset: 0.45 }, { scale: '0' }], { duration: 150, easing: 'ease-in' })
    src.card?.animate([{ transform: 'none' }, { transform: 'translateY(2px) scale(1.02, .95)' }, { transform: 'none' }], { duration: 220 })
    dot.style.scale = '0'

    // a flying dot arcs from the old chip into the new one
    const hr = fs.getBoundingClientRect()
    const a = src.ring.getBoundingClientRect()
    const b = to.ring.getBoundingClientRect()
    const ax = a.left + a.width / 2 - hr.left
    const ay = a.top + a.height / 2 - hr.top
    const bx = b.left + b.width / 2 - hr.left
    const by = b.top + b.height / 2 - hr.top
    const dx = bx - ax
    const dy = by - ay
    const dist = Math.hypot(dx, dy) || 1
    let nx = -dy / dist
    let ny = dx / dist
    if (Math.abs(dx) >= Math.abs(dy) ? ny > 0 : nx > 0) {
      nx = -nx
      ny = -ny
    }
    const lift = Math.min(90, 24 + dist * 0.35) * (flat ? 0.45 : 1)
    const size = Math.max(10, to.ring.clientWidth - 2)
    const N = 14
    const frames: Keyframe[] = []
    for (let i = 0; i <= N; i++) {
      const t = i / N
      const h = Math.sin(Math.PI * t) * lift
      const px = ax + dx * t + nx * h - size / 2
      const py = ay + dy * t + ny * h - size / 2
      // tangent: stretch the dot along its flight
      const dh = Math.cos(Math.PI * t) * Math.PI * lift
      const ang = Math.atan2(dy + ny * dh, dx + nx * dh)
      const st = (flat ? 0.15 : 0.45) * Math.sin(Math.PI * t)
      frames.push({ transform: `translate(${px}px, ${py}px) rotate(${ang}rad) scale(${1 + st + 0.3 * Math.sin(Math.PI * t)}, ${1 - st * 0.5})` })
    }
    const duration = Math.min(460, 260 + dist * 0.6) * (flat ? 0.8 : 1)
    const fly = (cls: string, alpha: number, delay: number) => {
      const d = document.createElement('span')
      d.setAttribute('aria-hidden', 'true')
      d.className = cls
      Object.assign(d.style, { left: '0', top: '0', width: `${size}px`, height: `${size}px`, opacity: String(alpha) })
      fs.appendChild(d)
      const anim = d.animate(frames, { duration, delay, easing: 'cubic-bezier(.45,0,.4,1)', fill: 'both' })
      const done = () => d.remove()
      anim.finished.then(done, done)
      return anim
    }
    if (!flat) {
      fly('ui-border-thin pointer-events-none absolute z-10 rounded-full bg-accent-soft', 0.25, 70)
      fly('ui-border-thin pointer-events-none absolute z-10 rounded-full bg-accent-soft', 0.5, 35)
    }
    const main = fly('ui-border-thin pointer-events-none absolute z-20 rounded-full bg-accent', 1, 60)
    main.finished.then(land, () => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  return (
    <fieldset ref={host} className={cn('relative m-0 min-w-0 border-0 p-0', className)}>
      <legend className="sr-only">{label}</legend>
      <div className={cn('flex gap-3', orientation === 'vertical' ? 'flex-col items-start' : 'flex-wrap')}>
        {options.map((o) => (
          <Option key={o.value} option={o} name={group} checked={current === o.value} setPart={partRef(o.value)} onPick={pick} />
        ))}
      </div>
    </fieldset>
  )
}
