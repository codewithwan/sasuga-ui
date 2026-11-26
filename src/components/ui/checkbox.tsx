import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { burst, centerOf, delayed, prefersReducedMotion, rand, sfx, shards, slash, smoke, sparkle, spawn, uiStyle, useSprings } from '@/fx'
import { C } from '@/fx/palette'
import { cn } from '@/lib/utils'

type Props = {
  children: ReactNode
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (checked: boolean) => void
  /** Lettering when it gets ticked. `false` = none. */
  sfx?: string | false
  name?: string
  disabled?: boolean
}

const TICK = 'M5.5 12.5 L10 17 L19 6.5'
const POP = 'cubic-bezier(.2,1.6,.4,1)'

/**
 * Native checkbox underneath. Ticking squashes the box, the check draws itself stroke by
 * stroke and ends in a burst with sparkles and lettering. Unticking erases it backwards
 * under a quick reverse slash.
 */
export function Checkbox({ children, checked, defaultChecked = false, onChange, sfx: sfxText = 'OK!', name, disabled }: Props) {
  const [inner, setInner] = useState(defaultChecked)
  const on = checked ?? inner
  const id = useId()
  const box = useRef<HTMLSpanElement>(null)
  const tick = useRef<SVGSVGElement>(null)
  const prev = useRef(on)
  const spring = useSprings(
    box,
    { sx: 1, sy: 1, r: 0 },
    (v, el) => {
      el.style.transform = `rotate(${v.r}deg) scale(${v.sx}, ${v.sy})`
    },
    { stiffness: 680, damping: 13 },
  )

  useEffect(() => {
    if (prev.current === on) return
    prev.current = on
    const b = box.current
    const svg = tick.current
    if (!b || !svg || prefersReducedMotion()) return
    spring.set({ sx: 1, sy: 1 })
    const { x, y, rect } = centerOf(b)
    const paths = svg.querySelectorAll('path')
    const flat = uiStyle() === 'flat'

    if (on) {
      // squash, then the tick draws itself and hits where its stroke ends
      spring.kick({ sx: 7, sy: -9, r: rand(60, 120) * (Math.random() < 0.5 ? -1 : 1) })
      svg.animate([{ transform: 'scale(.6)' }, { transform: 'scale(1.3)', offset: 0.7 }, { transform: 'none' }], { duration: 420, easing: POP })
      let done: Animation | undefined
      paths.forEach((p) => {
        done = p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 240, delay: 70, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'backwards' })
      })
      const hit = () => {
        const tx = rect.left + (19 / 24) * rect.width
        const ty = rect.top + (6.5 / 24) * rect.height
        spring.kick({ sx: -4, sy: 5 })
        spawn(
          burst(tx, ty, { radius: 22, spikes: 9 }),
          shards(tx, ty, { count: 7, speed: 300, size: 6 }),
          delayed(0.06, sparkle(rect.right + 12, rect.top - 8, { size: 12, color: C.pop })),
          delayed(0.12, sparkle(rect.left - 10, rect.bottom - 2, { size: 9 })),
          delayed(0.18, sparkle(x + 4, rect.top - 16, { size: 7 })),
        )
        if (sfxText) spawn(delayed(0.03, sfx(x + 14, y - 40, sfxText, { size: 26, color: C.accent })))
      }
      done?.finished.then(hit, () => {})
    } else {
      // reverse: the tick erases from its tip back to the start under a quick backhand slash
      spring.kick({ sx: -5, sy: -5, r: rand(-30, 30) })
      paths.forEach((p) => p.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: 1 }], { duration: 150, easing: 'cubic-bezier(.7,0,.8,.4)' }))
      spawn(
        slash(rect.right + 18, rect.top - 12, rect.left - 12, rect.bottom + 10, { width: 7, bend: -0.12, echo: C.ink }),
        delayed(0.08, smoke(x, rect.bottom, { count: 3, spread: 20, size: 7 })),
      )
      if (!flat) b.animate([{ translate: '0 0' }, { translate: '-3px 1px' }, { translate: '2px 0' }, { translate: '0 0' }], { duration: 180 })
    }
  }, [on, spring, sfxText])

  const release = () => spring.set({ sx: 1, sy: 1 })

  return (
    <label
      htmlFor={id}
      onPointerDown={() => spring.set({ sx: 1.12, sy: 0.84 })}
      onPointerUp={release}
      onPointerLeave={release}
      className="inline-flex cursor-pointer items-center gap-3 text-[17px] leading-tight font-semibold text-ink select-none has-disabled:pointer-events-none has-disabled:opacity-50"
    >
      <input
        id={id}
        type="checkbox"
        name={name}
        disabled={disabled}
        className="peer sr-only"
        checked={on}
        onChange={(e) => {
          setInner(e.target.checked)
          onChange?.(e.target.checked)
        }}
      />
      <span
        ref={box}
        aria-hidden="true"
        className={cn(
          'ui-border ui-r-sm ui-shadow-sm relative size-7 flex-none origin-[50%_80%] transition-colors duration-150',
          'peer-focus-visible:outline-[2.5px] peer-focus-visible:outline-offset-[3px] peer-focus-visible:outline-accent peer-focus-visible:outline-solid',
          on ? 'ui-fill bg-accent' : 'bg-paper',
        )}
      >
        <svg ref={tick} viewBox="0 0 24 24" className="absolute inset-0 size-full overflow-visible fill-none [stroke-linecap:round] [stroke-linejoin:round]">
          <path d={TICK} pathLength={1} strokeDasharray="1" style={{ strokeDashoffset: on ? 0 : 1 }} className="fx-only stroke-ink" strokeWidth={6.5} />
          <path d={TICK} pathLength={1} strokeDasharray="1" style={{ strokeDashoffset: on ? 0 : 1 }} className="stroke-white" strokeWidth={3.5} />
        </svg>
      </span>
      <span>{children}</span>
    </label>
  )
}
