import { useMemo } from 'react'

export type DamageKind = 'damage' | 'heal' | 'miss' | 'crit'

/** Where a number spawns: an element (its upper middle) or a viewport point, e.g. a pointer event's clientX/Y. */
export type DamageTarget = Element | { x: number; y: number }

export type DamageOptions = {
  kind?: DamageKind
  /** Replace the text (default: the value, "+value" for heals, "MISS" for misses). */
  text?: string
}

export type DamageItem = { id: number; x: number; y: number; kind: DamageKind; text: string; value?: number }

type Layer = (item: DamageItem) => void

// Module-level bus: any component can spawn, the first mounted <DamageLayer> draws.
const layers: Layer[] = []
let nextId = 1

/** @internal used by <DamageLayer>. Returns an unsubscribe. */
export function registerDamageLayer(layer: Layer) {
  layers.push(layer)
  return () => {
    const i = layers.indexOf(layer)
    if (i >= 0) layers.splice(i, 1)
  }
}

function pointOf(target: DamageTarget) {
  if (!('getBoundingClientRect' in target)) return { x: target.x, y: target.y }
  const r = target.getBoundingClientRect()
  return { x: r.left + r.width / 2 + (Math.random() - 0.5) * r.width * 0.4, y: r.top + r.height * 0.3 }
}

/** Spawn a floating number. Works anywhere (no hook needed) once a <DamageLayer> is mounted. */
export function showDamage(target: DamageTarget, value?: number, { kind = 'damage', text }: DamageOptions = {}) {
  const layer = layers[0]
  if (!layer || typeof window === 'undefined') return
  const { x, y } = pointOf(target)
  const n = value === undefined ? '' : Math.abs(Math.round(value)).toLocaleString()
  const label = text ?? (kind === 'miss' ? 'MISS' : kind === 'heal' ? `+${n}` : n)
  layer({ id: nextId++, x, y, kind, text: label, value })
}

/**
 * Floating combat numbers.
 *
 *   const dmg = useDamageNumbers()
 *   dmg.damage(enemyEl, 42)
 *   dmg.crit({ x: e.clientX, y: e.clientY }, 248)
 *   dmg.heal(heroEl, 30)
 *   dmg.miss(enemyEl)
 */
export function useDamageNumbers() {
  return useMemo(
    () => ({
      show: showDamage,
      damage: (target: DamageTarget, value: number) => showDamage(target, value, { kind: 'damage' }),
      crit: (target: DamageTarget, value: number) => showDamage(target, value, { kind: 'crit' }),
      heal: (target: DamageTarget, value: number) => showDamage(target, value, { kind: 'heal' }),
      miss: (target: DamageTarget) => showDamage(target, undefined, { kind: 'miss' }),
    }),
    [],
  )
}
