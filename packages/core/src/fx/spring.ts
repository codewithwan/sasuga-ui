import { KICK, uiStyle } from './style'

export type SpringConfig = { stiffness?: number; damping?: number; mass?: number }

export type SpringValues<K extends string> = Record<K, number>
export type SpringRender<K extends string, T> = (value: SpringValues<K>, el: T, velocity: SpringValues<K>) => void

export type SpringOptions<K extends string, T> = {
  /** The element to draw on, read on every frame (so it can come from a ref that is set later). */
  el: () => T | null | undefined
  /** Writes the values to the element (no framework re-render per frame). */
  render: SpringRender<K, T>
  /** Read on every frame, so it can change between frames. */
  config?: () => SpringConfig
}

export type Spring<K extends string, T = HTMLElement> = {
  /** Move the targets; the values spring towards them. */
  set: (target: Partial<SpringValues<K>>) => void
  /** Add velocity (scaled by the style's KICK) — the squash-and-overshoot feel. */
  kick: (velocity: Partial<SpringValues<K>>) => void
  /** Jump instantly (no animation), e.g. after a layout change. */
  snap: (value: Partial<SpringValues<K>>) => void
  /** Draw the current values once (e.g. when the element mounts). */
  draw: () => void
  /** Stop the animation loop (e.g. when the element unmounts). A later set/kick restarts it. */
  stop: () => void
  /** Swap the element getter, render function or config (adapters re-bind them after every render). */
  bind: (options: Partial<SpringOptions<K, T>>) => void
}

/**
 * Damped springs that write straight to the DOM. Framework-agnostic: the React hook
 * (useSprings) and any other adapter wrap this and tie draw/stop to mount/unmount.
 */
export function createSpring<K extends string, T = HTMLElement>(initial: SpringValues<K>, options: Partial<SpringOptions<K, T>> = {}): Spring<K, T> {
  let opts = options
  const v = { ...initial }
  const target = { ...initial }
  const vel = {} as SpringValues<K>
  for (const k in initial) vel[k] = 0
  let raf = 0
  let last = 0

  const draw = () => {
    const node = opts.el?.()
    if (node && opts.render) opts.render(v, node, vel)
  }

  const loop = (t: number) => {
    const dt = Math.min((t - last) / 1000, 1 / 30)
    last = t
    const { stiffness = 520, damping = 18, mass = 1 } = opts.config?.() ?? {}
    const steps = Math.max(1, Math.ceil(dt * 240))
    const h = dt / steps
    let moving = false
    for (const key in v) {
      for (let i = 0; i < steps; i++) {
        const f = -stiffness * (v[key] - target[key]) - damping * vel[key]
        vel[key] += (f / mass) * h
        v[key] += vel[key] * h
      }
      if (Math.abs(vel[key]) > 0.002 || Math.abs(v[key] - target[key]) > 0.0005) moving = true
      else {
        v[key] = target[key]
        vel[key] = 0
      }
    }
    draw()
    raf = moving ? requestAnimationFrame(loop) : 0
  }

  const start = () => {
    if (raf) return
    last = performance.now()
    raf = requestAnimationFrame(loop)
  }

  return {
    set(next) {
      for (const k in next) if (next[k] !== undefined) target[k] = next[k] as number
      start()
    },
    kick(add) {
      const f = KICK[uiStyle()] // calmer styles get gentler kicks
      for (const k in add) if (add[k] !== undefined) vel[k] += (add[k] as number) * f
      start()
    },
    snap(value) {
      for (const k in value) {
        if (value[k] === undefined) continue
        v[k] = value[k] as number
        target[k] = value[k] as number
        vel[k] = 0
      }
      draw()
    },
    draw,
    stop() {
      cancelAnimationFrame(raf)
      raf = 0
    },
    bind(next) {
      opts = { ...opts, ...next }
    },
  }
}
