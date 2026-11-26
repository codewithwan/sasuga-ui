import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { KICK, uiStyle } from './style'

export type SpringConfig = { stiffness?: number; damping?: number; mass?: number }

type Values<K extends string> = Record<K, number>
type Render<K extends string, T> = (value: Values<K>, el: T, velocity: Values<K>) => void
type State<K extends string> = { v: Values<K>; vel: Values<K>; target: Values<K>; raf: number; last: number }

function createState<K extends string>(initial: Values<K>): State<K> {
  const zero = {} as Values<K>
  for (const k in initial) zero[k] = 0
  return { v: { ...initial }, vel: zero, target: { ...initial }, raf: 0, last: 0 }
}

/**
 * Damped springs that write straight to the DOM (no React re-render per frame).
 * `set` moves the targets, `kick` adds velocity — that is what gives the
 * squash-and-overshoot feel.
 */
export function useSprings<K extends string, T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  initial: Values<K>,
  render: Render<K, T>,
  config: SpringConfig = {},
) {
  const state = useRef<State<K>>(createState(initial))
  const renderRef = useRef(render)
  const cfgRef = useRef(config)
  const loopRef = useRef<(t: number) => void>(() => {})

  useLayoutEffect(() => {
    renderRef.current = render
    cfgRef.current = config
  })

  useLayoutEffect(() => {
    const s = state.current
    loopRef.current = (t: number) => {
      const dt = Math.min((t - s.last) / 1000, 1 / 30)
      s.last = t
      const { stiffness = 520, damping = 18, mass = 1 } = cfgRef.current
      const steps = Math.max(1, Math.ceil(dt * 240))
      const h = dt / steps
      let moving = false
      for (const key in s.v) {
        for (let i = 0; i < steps; i++) {
          const f = -stiffness * (s.v[key] - s.target[key]) - damping * s.vel[key]
          s.vel[key] += (f / mass) * h
          s.v[key] += s.vel[key] * h
        }
        if (Math.abs(s.vel[key]) > 0.002 || Math.abs(s.v[key] - s.target[key]) > 0.0005) moving = true
        else {
          s.v[key] = s.target[key]
          s.vel[key] = 0
        }
      }
      if (ref.current) renderRef.current(s.v, ref.current, s.vel)
      s.raf = moving ? requestAnimationFrame((n) => loopRef.current(n)) : 0
    }
    if (ref.current) renderRef.current(s.v, ref.current, s.vel)
    return () => {
      cancelAnimationFrame(s.raf)
      s.raf = 0
    }
  }, [ref])

  const start = useCallback(() => {
    const s = state.current
    if (s.raf) return
    s.last = performance.now()
    s.raf = requestAnimationFrame((n) => loopRef.current(n))
  }, [])

  const set = useCallback(
    (target: Partial<Values<K>>) => {
      const s = state.current
      for (const k in target) if (target[k] !== undefined) s.target[k] = target[k] as number
      start()
    },
    [start],
  )

  const kick = useCallback(
    (vel: Partial<Values<K>>) => {
      const s = state.current
      const f = KICK[uiStyle()] // calmer styles get gentler kicks
      for (const k in vel) if (vel[k] !== undefined) s.vel[k] += (vel[k] as number) * f
      start()
    },
    [start],
  )

  /** Jump instantly (no animation), e.g. after a layout change. */
  const snap = useCallback(
    (value: Partial<Values<K>>) => {
      const s = state.current
      for (const k in value) {
        if (value[k] === undefined) continue
        s.v[k] = value[k] as number
        s.target[k] = value[k] as number
        s.vel[k] = 0
      }
      if (ref.current) renderRef.current(s.v, ref.current, s.vel)
    },
    [ref],
  )

  // Stable identity: components list `spring` in effect deps.
  return useMemo(() => ({ set, kick, snap }), [set, kick, snap])
}
