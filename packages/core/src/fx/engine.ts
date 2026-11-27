/**
 * One shared, full-viewport canvas that every effect draws on.
 * It is created lazily on the first effect, runs a rAF loop only while
 * something is alive, and never captures the pointer.
 */

export interface Fx {
  /** Advance by dt seconds. Return false when the effect is finished. */
  update(dt: number): boolean
  draw(ctx: CanvasRenderingContext2D): void
}

let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
const live: Fx[] = []
let raf = 0
let last = 0
let vw = 0
let vh = 0

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function resize() {
  if (!canvas || !ctx) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  vw = window.innerWidth
  vh = window.innerHeight
  canvas.width = Math.round(vw * dpr)
  canvas.height = Math.round(vh * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function ensure() {
  if (ctx) return ctx
  canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  canvas.className = 'fx-layer'
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    zIndex: '9999',
  })
  document.body.appendChild(canvas)
  ctx = canvas.getContext('2d')
  resize()
  window.addEventListener('resize', resize)
  return ctx
}

function frame(t: number) {
  const dt = Math.min((t - last) / 1000, 1 / 30)
  last = t
  if (!ctx) return
  for (let i = live.length - 1; i >= 0; i--) {
    if (!live[i].update(dt)) live.splice(i, 1)
  }
  ctx.clearRect(0, 0, vw, vh)
  for (const fx of live) {
    ctx.save()
    fx.draw(ctx)
    ctx.restore()
  }
  raf = live.length ? requestAnimationFrame(frame) : 0
}

export function spawn(...fxs: Fx[]) {
  if (prefersReducedMotion()) return
  if (!ensure()) return
  live.push(...fxs)
  if (!raf) {
    last = performance.now()
    raf = requestAnimationFrame(frame)
  }
}

/** Wrap an effect so it only starts after `delay` seconds. */
export function delayed(delay: number, fx: Fx): Fx {
  let wait = delay
  return {
    update(dt) {
      if (wait > 0) {
        wait -= dt
        return true
      }
      return fx.update(dt)
    },
    draw(c) {
      if (wait <= 0) fx.draw(c)
    },
  }
}

/** An effect with a fixed duration; draw gets normalised time 0..1. */
export function timed(dur: number, draw: (ctx: CanvasRenderingContext2D, t: number) => void): Fx {
  let age = 0
  return {
    update(dt) {
      age += dt
      return age < dur
    },
    draw(c) {
      draw(c, Math.min(age / dur, 1))
    },
  }
}

export const TAU = Math.PI * 2
export const rand = (a: number, b: number) => a + Math.random() * (b - a)
export const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)]
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3
export const easeInCubic = (t: number) => t ** 3
export const easeOutBack = (t: number, s = 1.70158) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2

export function centerOf(el: Element) {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, rect: r }
}
