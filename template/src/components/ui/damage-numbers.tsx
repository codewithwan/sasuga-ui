import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { burst, delayed, prefersReducedMotion, rand, rays, shards, sparkle, spawn, uiStyle } from '@/fx'
import { C } from '@/fx/palette'
import { useTheme } from '@/lib/theme'
import { registerDamageLayer } from './use-damage-numbers'
import type { DamageItem, DamageKind } from './use-damage-numbers'
import { cn } from '@/lib/utils'

export type DamageLayerProps = {
  /** Most numbers alive at once; the oldest go first. */
  limit?: number
  /** Canvas hit effects (burst on crits, sparkles on heals). */
  effects?: boolean
  /** Announce numbers to screen readers (aria-live="polite"). */
  announce?: boolean
  /** z-index of the fixed layer (the FX canvas sits at 9999). */
  zIndex?: number
}

/* Chunky outlined digits that read in light and dark: a light fill inside a dark line.
   (In dark mode the ink token turns light, so the line falls back to the canvas.) */
const LINE = 'light-dark(var(--color-ink), var(--color-canvas))'
const LIGHT = 'light-dark(var(--color-paper), var(--color-ink))'
const outline = (color: string, px: number): CSSProperties => ({
  color,
  fontSize: px,
  fontFamily: 'var(--font-display)',
  fontWeight: 900,
  WebkitTextStroke: `0.2em ${LINE}`,
  paintOrder: 'stroke fill',
  textShadow: `0.05em 0.09em 0 ${LINE}`,
  letterSpacing: '0.02em',
})
const LETTER: Record<DamageKind, CSSProperties> = {
  damage: outline(LIGHT, 32),
  crit: outline('var(--color-pop)', 50),
  heal: outline('var(--color-accent)', 32),
  miss: { ...outline('var(--color-mute)', 20), WebkitTextStroke: `0.16em ${LINE}`, textShadow: 'none' },
}
const FLAT: Record<DamageKind, string> = {
  damage: 'ui-head text-[26px] text-ink',
  crit: 'ui-head text-[38px] text-pop',
  heal: 'ui-head text-[26px] text-accent',
  miss: 'ui-head text-[18px] text-mute',
}
const SPOKEN: Record<DamageKind, string> = { damage: 'damage', crit: 'critical damage', heal: 'healed', miss: '' }

const subscribeNothing = () => () => {}

function frames(kind: DamageKind, calm: number): Keyframe[] {
  const dx = rand(-50, 50) * calm
  const up = (px: number) => px * (0.6 + 0.4 * calm)
  const t = (x: number, y: number, s: number) => `translate(${x}px, ${y}px) scale(${s})`
  switch (kind) {
    case 'crit': {
      const j = () => rand(-7, 7) * calm
      return [
        { transform: t(0, 0, 0.3), opacity: 0 },
        { transform: t(0, up(-30), 1 + 1.1 * calm), opacity: 1, offset: 0.1 },
        { transform: t(j(), up(-34) + j(), 1.15), offset: 0.16 },
        { transform: t(j(), up(-34) + j(), 1.1), offset: 0.22 },
        { transform: t(j() * 0.5, up(-36), 1.05), offset: 0.28 },
        { transform: t(dx * 0.6, up(-70), 1), opacity: 1, offset: 0.75 },
        { transform: t(dx, up(-56), 0.92), opacity: 0 },
      ]
    }
    case 'heal':
      return [
        { transform: t(0, 10, 0.5), opacity: 0 },
        { transform: t(0, up(-14), 1.15), opacity: 1, offset: 0.16 },
        { transform: t(6 * calm, up(-44), 1), opacity: 1, offset: 0.6 },
        { transform: t(-4 * calm, up(-80), 0.95), opacity: 0 },
      ]
    case 'miss': {
      const side = Math.random() < 0.5 ? -1 : 1
      return [
        { transform: t(0, 0, 0.7), opacity: 0 },
        { transform: t(side * 12, up(-18), 1), opacity: 1, offset: 0.2 },
        { transform: t(side * 34, up(-10), 1), opacity: 1, offset: 0.65 },
        { transform: t(side * 46, 12, 0.95), opacity: 0 },
      ]
    }
    default: {
      // a parabola off the target: up and over to one side, then a drop
      const n = 10
      return Array.from({ length: n }, (_, k) => {
        const u = k / (n - 1)
        const y = up(-74) * Math.sin(Math.PI * Math.min(1, u * 1.12)) + 26 * u
        const s = u < 0.12 ? 0.4 + (1 + 0.35 * calm - 0.4) * (u / 0.12) : u < 0.3 ? 1 + 0.35 * calm * (1 - (u - 0.12) / 0.18) : 1 - 0.12 * ((u - 0.3) / 0.7)
        return { transform: t(dx * 1.4 * u, y, s), opacity: u === 0 ? 0 : u > 0.75 ? 1 - (u - 0.75) / 0.25 : 1, offset: u }
      })
    }
  }
}

const DURATION: Record<DamageKind, number> = { damage: 900, crit: 1300, heal: 1150, miss: 800 }

function DamageNumber({ item, flat, onDone }: { item: DamageItem; flat: boolean; onDone: (id: number) => void }) {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const still = prefersReducedMotion()
    const a = el.animate(still ? [{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }] : frames(item.kind, flat ? 0.5 : 1), {
      duration: DURATION[item.kind],
      easing: 'cubic-bezier(.2,.7,.3,1)',
      fill: 'forwards',
    })
    a.finished.then(
      () => onDone(item.id),
      () => {},
    )
    // each digit pops in on its own beat
    const digits = still ? [] : Array.from(el.querySelectorAll('[data-digit]'))
    const big = item.kind === 'crit'
    const pops = digits.map((d, k) =>
      d.animate(
        [
          { transform: 'translateY(.45em) scale(.2)', opacity: 0 },
          { transform: `translateY(-.12em) scale(${flat ? 1.1 : big ? 1.5 : 1.3})`, opacity: 1, offset: 0.55 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: big ? 300 : 240, delay: k * (big ? 55 : 38), easing: 'cubic-bezier(.2,1.6,.4,1)', fill: 'backwards' },
      ),
    )
    return () => {
      a.cancel()
      pops.forEach((p) => p.cancel())
    }
  }, [item, flat, onDone])

  return (
    <span
      ref={ref}
      className="absolute grid -translate-1/2 justify-items-center whitespace-nowrap tabular-nums will-change-transform"
      style={{ left: item.x, top: item.y }}
    >
      {item.kind === 'crit' && (
        <span className={cn('ui-head mb-0.5 leading-none', flat ? 'text-[12px] text-pop' : 'ui-pill ui-fill bg-ink px-2 py-0.5 text-[12px] text-paper')}>CRIT!</span>
      )}
      <span className={cn('flex leading-none', flat && FLAT[item.kind])} style={flat ? undefined : LETTER[item.kind]}>
        {[...item.text].map((ch, k) => (
          <span key={k} data-digit="" className="inline-block">
            {ch}
          </span>
        ))}
      </span>
    </span>
  )
}

/**
 * The layer that floating combat numbers are drawn in: a fixed, click-through DOM layer
 * portalled to <body>. Mount it once near the root, then spawn numbers anywhere with
 * `useDamageNumbers()` / `showDamage()` from './use-damage-numbers'.
 */
export function DamageLayer({ limit = 40, effects = true, announce = true, zIndex = 10000 }: DamageLayerProps) {
  const client = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  )
  const { style } = useTheme()
  const [items, setItems] = useState<DamageItem[]>([])
  const [spoken, setSpoken] = useState('')
  const limitRef = useRef(limit)
  const fxRef = useRef(effects)
  useLayoutEffect(() => {
    limitRef.current = limit
    fxRef.current = effects
  })

  useEffect(
    () =>
      registerDamageLayer((item) => {
        setItems((list) => [...list.slice(-(limitRef.current - 1)), item])
        setSpoken(item.kind === 'miss' ? 'Miss' : `${item.value === undefined ? item.text : Math.abs(Math.round(item.value))} ${SPOKEN[item.kind]}`)
        if (!fxRef.current || prefersReducedMotion()) return
        const { x, y } = item
        if (item.kind === 'crit') {
          spawn(
            burst(x, y, { radius: 40, spikes: 12, color: C.pop }),
            rays(x, y, { inner: 26, outer: 120, count: 16 }),
            shards(x, y, { count: 8, speed: 460, size: 9 }),
            delayed(0.1, sparkle(x + rand(20, 40), y - rand(20, 40), { size: 14, color: C.pop })),
          )
        } else if (item.kind === 'heal') {
          for (let i = 0; i < 3; i++) spawn(delayed(0.1 + i * 0.1, sparkle(x + rand(-26, 26), y - 10 - i * 16, { size: rand(9, 13), color: i % 2 ? C.accent : C.soft })))
        } else if (item.kind === 'damage' && uiStyle() !== 'flat') {
          spawn(shards(x, y + 10, { count: 4, speed: 280, size: 6 }))
        }
      }),
    [],
  )

  const remove = useCallback((id: number) => setItems((list) => list.filter((i) => i.id !== id)), [])

  if (!client) return null
  return createPortal(
    <div aria-hidden={!announce || undefined} className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex }}>
      <div aria-hidden="true">
        {items.map((item) => (
          <DamageNumber key={item.id} item={item} flat={style === 'flat'} onDone={remove} />
        ))}
      </div>
      {announce && (
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {spoken}
        </span>
      )}
    </div>,
    document.body,
  )
}
