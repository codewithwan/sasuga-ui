import { useEffect, useImperativeHandle, useLayoutEffect, useRef } from 'react'
import type { KeyboardEvent, PointerEvent, Ref } from 'react'
import { TAU, burst, clamp, delayed, easeOutCubic, pop, prefersReducedMotion, rand, rays, sfx, shards, slash, smoke, sparkle, timed, uiStyle } from '@/fx'
import type { Fx } from '@/fx'
import { C } from '@/fx/palette'
import { cn } from '@/lib/utils'

// The option lists, for URL / form parsers (the embed page reads these).
// oxlint-disable-next-line react/only-export-components -- option list
export const FX_SCREEN_EFFECTS = ['speed-lines', 'focus-lines', 'impact', 'flash-cut', 'sparkle-rain', 'slash-storm'] as const
// oxlint-disable-next-line react/only-export-components -- option list
export const FX_SCREEN_COLORS = ['accent', 'pop', 'ink', 'paper'] as const
// oxlint-disable-next-line react/only-export-components -- option list
export const FX_SCREEN_BACKGROUNDS = ['transparent', 'paper', 'ink', 'canvas'] as const
// oxlint-disable-next-line react/only-export-components -- option list
export const FX_SCREEN_TRIGGERS = ['loop', 'click', 'interval'] as const

export type FxScreenEffect = (typeof FX_SCREEN_EFFECTS)[number]
export type FxScreenColor = (typeof FX_SCREEN_COLORS)[number]
export type FxScreenBackground = (typeof FX_SCREEN_BACKGROUNDS)[number]
export type FxScreenTrigger = (typeof FX_SCREEN_TRIGGERS)[number]

export type FxScreenHandle = {
  /** Play one hit now, at `at` ([x, y], 0..1 of the screen) or at `center`. */
  hit: (at?: [number, number]) => void
}

export type FxScreenProps = {
  effect?: FxScreenEffect
  /** 0..1: density, size and shake. */
  intensity?: number
  /** Time multiplier for everything on the screen (0.25..3). */
  speed?: number
  /** Effect colour, from the theme tokens. */
  color?: FxScreenColor
  /** What the screen sits on. `transparent` lets the page (or an OBS scene) show through. */
  background?: FxScreenBackground
  /** What fires the hits: on the effect's own beat, on click / Enter, or every `interval` ms. */
  trigger?: FxScreenTrigger
  /** ms between hits with trigger="interval". */
  interval?: number
  /** Big lettering that slams in on each hit (cel / manga; flat fades a calm word). */
  text?: string
  /** Where hits land and lines converge, [x, y] as 0..1 of the screen. */
  center?: [number, number]
  /** Direction of the speed lines in degrees (0 = horizontal). */
  angle?: number
  /** false: the screen shows a calm still frame. */
  play?: boolean
  /** flash-cut only. false replaces the full-frame flashes with a cut that does not flash. Flashes never exceed 3 per second. */
  flashes?: boolean
  onHit?: () => void
  /** Accessible name. Default: the effect's name (and the text). */
  label?: string
  className?: string
  ref?: Ref<FxScreenHandle>
}

type Opts = Required<Omit<FxScreenProps, 'text' | 'onHit' | 'label' | 'className' | 'ref'>> & { text?: string; onHit?: () => void }

const NAMES: Record<FxScreenEffect, string> = {
  'speed-lines': 'Speed lines',
  'focus-lines': 'Focus lines',
  impact: 'Impact',
  'flash-cut': 'Flash cut',
  'sparkle-rain': 'Sparkle rain',
  'slash-storm': 'Slash storm',
}

/** Seconds between hits on the effect's own beat (trigger="loop"), before `speed`. */
const BEAT: Record<FxScreenEffect, number> = {
  'speed-lines': 2.4,
  'focus-lines': 1.6,
  impact: 1.25,
  'flash-cut': 0.55,
  'sparkle-rain': 2.2,
  'slash-storm': 1.1,
}

/** Hard flashes never come closer together than this: at most 3 per second (WCAG 2.3.1). */
const FLASH_GAP = 1000 / 3
const FLASH_HOLD = 0.075

const BG: Record<FxScreenBackground, string> = { transparent: '', paper: 'bg-paper', ink: 'bg-ink', canvas: 'bg-canvas' }

type Pal = { ink: string; paper: string; canvas: string; accent: string; soft: string; pop: string }

function readPalette(el: Element): Pal {
  const cs = getComputedStyle(el)
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback
  return {
    ink: v('--color-ink', C.ink),
    paper: v('--color-paper', C.white),
    canvas: v('--color-canvas', C.white),
    accent: v('--color-accent', C.accent),
    soft: v('--color-accent-soft', C.soft),
    pop: v('--color-pop', C.pop),
  }
}

type Streak = { x: number; y: number; len: number; w: number; v: number; tone: number }
type Star = { x: number; y: number; vy: number; ph: number; s: number; r: number; vr: number; tone: number; dot: boolean }

/** Thick ring thrown out from a hit. */
function ring(x: number, y: number, radius: number, color: string, width: number): Fx {
  return timed(0.5, (ctx, t) => {
    ctx.globalAlpha = 1 - t
    ctx.strokeStyle = color
    ctx.lineWidth = width * (1 - t) + 1
    ctx.beginPath()
    ctx.arc(x, y, radius * (0.08 + 0.92 * easeOutCubic(t)), 0, TAU)
    ctx.stroke()
  })
}

/** Flat's word: fades and settles, no lettering tricks. */
function calmWord(x: number, y: number, text: string, size: number, color: string): Fx {
  return timed(0.9, (ctx, t) => {
    ctx.globalAlpha = t < 0.2 ? t / 0.2 : t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1
    const s = 0.94 + 0.06 * easeOutCubic(Math.min(t / 0.3, 1))
    ctx.translate(x, y)
    ctx.scale(s, s)
    ctx.font = `800 ${size}px "Plus Jakarta Sans", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = color
    ctx.fillText(text, 0, 0)
  })
}

/** Flat's slash: a thin line that draws across and retracts. */
function sweep(x1: number, y1: number, x2: number, y2: number, color: string, width: number): Fx {
  return timed(0.32, (ctx, t) => {
    const head = easeOutCubic(Math.min(t * 2, 1))
    const tail = t * t
    ctx.globalAlpha = 0.75
    ctx.strokeStyle = color
    ctx.lineCap = 'round'
    ctx.lineWidth = width
    ctx.beginPath()
    ctx.moveTo(x1 + (x2 - x1) * tail, y1 + (y2 - y1) * tail)
    ctx.lineTo(x1 + (x2 - x1) * head, y1 + (y2 - y1) * head)
    ctx.stroke()
  })
}

/** A four-point twinkle added to the current path (rotated, no transform needed). */
function starTo(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
  const k = r * 0.22 * Math.SQRT2
  const a0 = rot - Math.PI / 2
  ctx.moveTo(x + Math.cos(a0) * r, y + Math.sin(a0) * r)
  for (let q = 0; q < 4; q++) {
    const c = a0 + q * (Math.PI / 2) + Math.PI / 4
    const a = a0 + (q + 1) * (Math.PI / 2)
    ctx.quadraticCurveTo(x + Math.cos(c) * k, y + Math.sin(c) * k, x + Math.cos(a) * r, y + Math.sin(a) * r)
  }
  ctx.closePath()
}

/** Runs fn with a fixed-seed Math.random (the @/fx factories use it), so a still frame looks the same every time it is redrawn. */
function seeded(fn: () => void) {
  const real = Math.random
  let seed = 0x2f6b3a1
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  try {
    fn()
  } finally {
    Math.random = real
  }
}

type Scene = { hit: (u?: number, v?: number) => void; sync: () => void; destroy: () => void }

/**
 * The drawing loop of one screen: its own canvas, its own effect list (the factories from @/fx
 * drawn here instead of on the page-wide layer), a field that runs between hits, and a still frame.
 */
function createScene(host: HTMLElement, canvas: HTMLCanvasElement, get: () => Opts): Scene {
  const ctx = canvas.getContext('2d')
  let w = 1
  let h = 1
  let dpr = 1
  let pal = readPalette(host)
  let fx: Fx[] = []
  let streaks: Streak[] = []
  let stars: Star[] = []
  let focus = new Float32Array(0)
  let focusAge = 0
  let time = 0
  let shake = 0
  let boost = 0
  let punch = 0
  let flashLeft = 0
  let flashKind = 0
  let lastFlash = -Infinity
  let shotX = 0
  let shotY = 0
  let untilHit = 0.3
  let untilSlash = 0
  let raf = 0
  let last = 0
  let onScreen = true
  let reduced = prefersReducedMotion()
  let effect: FxScreenEffect | null = null

  const diag = () => Math.hypot(w, h)
  const k = () => clamp(Math.min(w, h) / 360, 0.45, 3)
  const running = () => get().play && !reduced && onScreen && !document.hidden
  const main = () => pal[get().color]
  /** The depth tone: coloured lines get ink (cel: the soft tint), ink or paper lines get the accent. */
  const second = () => {
    const o = get()
    if (o.color === 'ink' || o.color === 'paper') return pal.accent
    if (uiStyle() === 'cel') return pal.soft
    return o.background === 'ink' ? pal.paper : pal.ink
  }

  function counts() {
    const o = get()
    const area = clamp(diag() / 900, 0.5, 1.8)
    const flat = uiStyle() === 'flat'
    return {
      streaks: Math.round((10 + 70 * o.intensity) * area * (flat ? 0.5 : 1)),
      stars: Math.round((12 + 70 * o.intensity) * area * (flat ? 0.6 : 1)),
      focus: Math.round((40 + 140 * o.intensity) * (flat ? 0.4 : 1) * (o.effect === 'flash-cut' ? 0.6 : 1)),
    }
  }

  function newStreak(spread: boolean): Streak {
    const D = diag()
    const I = get().intensity
    return {
      x: spread ? rand(-D / 2, D / 2) : D / 2 + rand(0, D * 0.4),
      y: rand(-D / 2, D / 2),
      len: D * rand(0.12, 0.42) * (0.7 + 0.6 * I),
      w: rand(1.2, 5.5) * k(),
      v: rand(0.9, 1.8),
      tone: Math.random() < 0.3 ? 1 : 0,
    }
  }

  function newStar(spread: boolean): Star {
    return {
      x: rand(0, w),
      y: spread ? rand(-h * 0.1, h) : rand(-h * 0.25, -10),
      vy: rand(50, 150) * k(),
      ph: rand(0, TAU),
      s: rand(5, 14) * k(),
      r: rand(0, TAU),
      vr: rand(-2, 2),
      tone: Math.random() < 0.25 ? 1 : Math.random() < 0.4 ? 2 : 0,
      dot: Math.random() < 0.35,
    }
  }

  function regenFocus(n: number) {
    if (focus.length !== n * 3) focus = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      focus[i * 3] = rand(0, TAU)
      focus[i * 3 + 1] = Math.random()
      focus[i * 3 + 2] = rand(0.35, 1)
    }
  }

  /** Match the field to the effect, size and intensity (fresh = scatter everything again). */
  function build(fresh: boolean) {
    const n = counts()
    const e = get().effect
    if (e === 'speed-lines') {
      if (fresh) streaks = []
      while (streaks.length < n.streaks) streaks.push(newStreak(true))
      streaks.length = n.streaks
    } else streaks = []
    if (e === 'sparkle-rain') {
      if (fresh) stars = []
      while (stars.length < n.stars) stars.push(newStar(true))
      stars.length = n.stars
    } else stars = []
    if (e === 'focus-lines' || e === 'flash-cut') {
      if (fresh || focus.length !== n.focus * 3) regenFocus(n.focus)
    } else focus = new Float32Array(0)
  }

  /* ───── field: what runs between hits ───── */

  function drawStreaks() {
    if (!ctx) return
    const flat = uiStyle() === 'flat'
    ctx.save()
    ctx.translate(w / 2, h / 2)
    ctx.rotate((get().angle * Math.PI) / 180)
    for (const tone of [1, 0]) {
      ctx.beginPath()
      for (const s of streaks) {
        if (s.tone !== tone) continue
        const hw = (s.w / 2) * (flat ? 0.45 : 1) * (1 + boost * 0.6)
        const L = s.len * (1 + boost * 0.8)
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(s.x + L * 0.12, s.y - hw)
        ctx.lineTo(s.x + L, s.y)
        ctx.lineTo(s.x + L * 0.12, s.y + hw)
        ctx.closePath()
      }
      ctx.fillStyle = tone ? second() : main()
      ctx.globalAlpha = flat ? 0.45 : tone ? 0.85 : 1
      ctx.fill()
    }
    ctx.restore()
  }

  function drawFocus(cx: number, cy: number, colorA: string, colorB: string, alpha: number) {
    if (!ctx) return
    const n = focus.length / 3
    if (!n) return
    const flat = uiStyle() === 'flat'
    const I = get().intensity
    const R = diag() * 1.1
    const ex = clamp(w / h, 0.6, 1.9) ** 0.5
    const pulse = 1 + 0.05 * Math.sin(time * TAU * 1.4)
    const r0 = Math.min(w, h) * (0.36 - 0.12 * I) * pulse * (1 - 0.45 * punch)
    const rot = flat ? time * 0.04 : 0
    const width = k() * (flat ? 1.6 : 5 + 9 * I)
    ctx.save()
    ctx.globalAlpha = alpha * (flat ? 0.4 : 1)
    for (const tone of [0, 1]) {
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        if ((i % 4 === 0 ? 1 : 0) !== tone) continue
        const a = focus[i * 3] + rot
        const ri = r0 * (1 + focus[i * 3 + 1] * 0.9)
        const hw = focus[i * 3 + 2] * width
        const c = Math.cos(a)
        const s = Math.sin(a)
        ctx.moveTo(cx + c * ri * ex, cy + (s * ri) / ex)
        ctx.lineTo(cx + c * R - s * hw, cy + s * R + c * hw)
        ctx.lineTo(cx + c * R + s * hw, cy + s * R - c * hw)
        ctx.closePath()
      }
      ctx.fillStyle = tone ? colorB : colorA
      ctx.fill()
    }
    ctx.restore()
  }

  function drawStars() {
    if (!ctx) return
    const style = uiStyle()
    // white twinkles need the ink outline; flat has none, so its third tone is the soft tint
    const tones = [main(), get().color === 'pop' ? pal.accent : pal.pop, style === 'flat' ? pal.soft : C.white]
    ctx.save()
    ctx.lineJoin = 'round'
    for (let tone = 0; tone < 3; tone++) {
      ctx.beginPath()
      for (const s of stars) {
        if (s.tone !== tone) continue
        const tw = 0.6 + 0.4 * Math.sin(time * 4 + s.ph)
        if (s.dot) {
          ctx.moveTo(s.x + s.s * 0.32 * tw, s.y)
          ctx.arc(s.x, s.y, s.s * 0.32 * tw, 0, TAU)
        } else starTo(ctx, s.x, s.y, s.s * tw, s.r)
      }
      ctx.fillStyle = tones[tone]
      ctx.globalAlpha = style === 'flat' ? 0.75 : 1
      ctx.fill()
      if (style !== 'flat') {
        ctx.lineWidth = 2
        ctx.strokeStyle = pal.ink
        ctx.stroke()
      }
    }
    ctx.restore()
  }

  function drawField() {
    const e = get().effect
    const [u, v] = get().center
    if (e === 'speed-lines') drawStreaks()
    else if (e === 'focus-lines') drawFocus(u * w, v * h, main(), second(), 1)
    else if (e === 'flash-cut') drawFocus(u * w + shotX, v * h + shotY, main(), second(), 0.9)
    else if (e === 'sparkle-rain') drawStars()
  }

  function drawFlash() {
    if (!ctx) return
    const flat = uiStyle() === 'flat'
    const accent = get().color === 'accent' || get().color === 'pop' ? main() : pal.accent
    const [u, v] = get().center
    ctx.save()
    ctx.globalAlpha = flat ? 0.55 : 1
    ctx.fillStyle = flashKind ? accent : pal.ink
    ctx.fillRect(-60, -60, w + 120, h + 120)
    ctx.restore()
    // the negative frame: lines in the opposite tone
    if (!flat) drawFocus(u * w + shotX, v * h + shotY, flashKind ? pal.ink : pal.paper, flashKind ? pal.ink : pal.paper, 1)
  }

  function slashAcross(x: number, y: number, spread: number): Fx {
    const D = diag()
    const a = rand(0, TAU)
    const L = D * rand(0.45, 0.85)
    const off = rand(-spread, spread) * Math.min(w, h)
    const mx = x - Math.sin(a) * off
    const my = y + Math.cos(a) * off
    const dx = (Math.cos(a) * L) / 2
    const dy = (Math.sin(a) * L) / 2
    if (uiStyle() === 'flat') return sweep(mx - dx, my - dy, mx + dx, my + dy, main(), 2.5 * k())
    return slash(mx - dx, my - dy, mx + dx, my + dy, { width: rand(8, 16) * k(), color: main(), echo: second(), bend: rand(0.08, 0.2) })
  }

  function lettering(x: number, y: number): Fx | null {
    const text = get().text?.trim()
    if (!text) return null
    const n = [...text].length
    const size = Math.min(h * 0.26, (w * 0.8) / (Math.max(n, 2) * 0.95))
    if (uiStyle() === 'flat') return calmWord(x, y, text, size * 0.8, main())
    return sfx(x, y, text, { size, color: main(), dur: 0.85 })
  }

  /* ───── hits ───── */

  function hitAt(x: number, y: number) {
    const o = get()
    const K = k()
    const I = o.intensity
    const D = diag()
    const flat = uiStyle() === 'flat'
    const color = main()
    const add = (...f: Fx[]) => fx.push(...f)
    switch (o.effect) {
      case 'speed-lines':
        boost = 1
        add(rays(x, y, { inner: 40 * K, outer: 0.6 * D, count: Math.round(14 + 16 * I), width: 8 * K }))
        if (flat) add(ring(x, y, 140 * K, color, 3))
        break
      case 'focus-lines':
        punch = 1
        add(burst(x, y, { radius: (40 + 40 * I) * K, color }), delayed(0.03, shards(x, y, { count: Math.round(6 + 10 * I), speed: 480 * K, size: 9 * K })))
        break
      case 'impact':
        shake = (flat ? 4 : 10 + 14 * I) * K
        add(
          rays(x, y, { inner: 34 * K, outer: 0.55 * D, count: Math.round(16 + 18 * I), width: 9 * K }),
          burst(x, y, { radius: (52 + 46 * I) * K, color }),
          ring(x, y, 0.45 * D, flat ? color : second(), 10 * K),
          delayed(0.02, shards(x, y, { count: Math.round(8 + 16 * I), speed: (420 + 300 * I) * K, size: 10 * K })),
          delayed(0.05, smoke(x, y + 8 * K, { spread: 70 * K, size: 16 * K })),
          delayed(0.12, sparkle(x + rand(40, 90) * K, y - rand(30, 70) * K, { size: 16 * K })),
        )
        break
      case 'flash-cut': {
        const now = performance.now()
        shotX = rand(-0.12, 0.12) * w
        shotY = rand(-0.1, 0.1) * h
        punch = 1
        if (o.flashes && now - lastFlash >= FLASH_GAP) {
          lastFlash = now
          flashLeft = FLASH_HOLD
          flashKind ^= 1
        }
        shake = (flat ? 2 : 6) * K
        add(delayed(FLASH_HOLD, burst(x, y, { radius: (36 + 30 * I) * K, color })))
        if (!o.flashes) add(ring(x, y, 0.4 * D, color, 6 * K))
        break
      }
      case 'sparkle-rain': {
        boost = 1
        const R = 110 * K
        const n = Math.round(5 + 6 * I)
        for (let i = 0; i < n; i++) {
          add(delayed(i * 0.035, sparkle(x + rand(-1, 1) * R, y + rand(-0.6, 0.6) * R, { size: rand(10, 22) * K, color: i % 2 ? pal.pop : C.white })))
        }
        add(pop(x, y, 120 * K))
        break
      }
      case 'slash-storm': {
        const n = Math.round(3 + 4 * I)
        for (let i = 0; i < n; i++) add(delayed(i * 0.05, slashAcross(x, y, 0.08)))
        add(delayed(n * 0.05, burst(x, y, { radius: (40 + 30 * I) * K, color })))
        shake = (flat ? 2 : 6 + 6 * I) * K
        break
      }
    }
    const word = lettering(x, y)
    if (word) add(o.effect === 'flash-cut' ? delayed(FLASH_HOLD, word) : word)
  }

  function hit(u?: number, v?: number) {
    const o = get()
    o.onHit?.()
    if (!running()) return
    hitAt((u ?? o.center[0]) * w, (v ?? o.center[1]) * h)
  }

  /* ───── loop ───── */

  function step(dt: number, real: number) {
    const o = get()
    time += dt
    boost = Math.max(0, boost - dt * 1.6)
    punch = Math.max(0, punch - dt * 3.2)
    shake *= Math.exp(-dt * 12)
    flashLeft -= real
    if (o.trigger !== 'click') {
      untilHit -= o.trigger === 'interval' ? real : dt
      if (untilHit <= 0) {
        untilHit = o.trigger === 'interval' ? Math.max(o.interval, 120) / 1000 : BEAT[o.effect]
        hitAt(o.center[0] * w, o.center[1] * h)
        o.onHit?.()
      }
    }
    const D = diag()
    if (streaks.length) {
      const run = D * 1.1 * (1 + 2.5 * boost) * dt
      for (let i = 0; i < streaks.length; i++) {
        const s = streaks[i]
        s.x -= s.v * run
        if (s.x + s.len * 1.8 < -D / 2) streaks[i] = newStreak(false)
      }
    }
    if (stars.length) {
      const K = k()
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i]
        s.y += s.vy * dt * (1 + boost * 2)
        s.x += Math.sin(time * 1.3 + s.ph) * 14 * K * dt
        s.r += s.vr * dt
        if (s.y > h + 24) stars[i] = newStar(false)
      }
    }
    if (focus.length && uiStyle() !== 'flat') {
      // drawn on threes: the lines jump to a new set ~12 times a second
      focusAge += dt
      if (focusAge > 1 / 12) {
        focusAge = 0
        regenFocus(focus.length / 3)
      }
    }
    if (o.effect === 'slash-storm') {
      untilSlash -= dt
      if (untilSlash <= 0) {
        untilSlash = rand(0.15, 0.45) / (0.35 + o.intensity)
        fx.push(slashAcross(o.center[0] * w, o.center[1] * h, 0.35))
      }
    }
    fx = fx.filter((f) => f.update(dt))
  }

  function render() {
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    if (shake > 0.3) ctx.translate(rand(-shake, shake), rand(-shake, shake))
    drawField()
    if (flashLeft > 0) drawFlash()
    for (const f of fx) {
      ctx.save()
      f.draw(ctx)
      ctx.restore()
    }
  }

  function frame(now: number) {
    const real = Math.min((now - last) / 1000, 1 / 30)
    last = now
    step(real * clamp(get().speed, 0.25, 3), real)
    render()
    raf = requestAnimationFrame(frame)
  }

  /** The calm frame: the field scattered once and a hit frozen mid-way, no motion, no flash. */
  function still() {
    if (ctx) seeded(drawStill)
  }

  function drawStill() {
    if (!ctx) return
    fx = []
    boost = punch = shake = flashLeft = shotX = shotY = 0
    build(true)
    const o = get()
    const x = o.center[0] * w
    const y = o.center[1] * h
    const K = k()
    const frozen: [Fx, number][] = []
    if (o.effect === 'impact') {
      frozen.push([rays(x, y, { inner: 34 * K, outer: 0.5 * diag(), count: Math.round(16 + 18 * o.intensity), width: 9 * K }), 0.14])
      frozen.push([burst(x, y, { radius: (52 + 46 * o.intensity) * K, color: main() }), 0.16])
    } else if (o.effect === 'slash-storm') {
      for (let i = 0; i < 3; i++) frozen.push([slashAcross(x, y, 0.3), 0.15])
    }
    const word = lettering(x, y)
    if (word) frozen.push([word, 0.34])
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    drawField()
    for (const [f, at] of frozen) {
      f.update(at)
      ctx.save()
      f.draw(ctx)
      ctx.restore()
    }
  }

  function stop() {
    cancelAnimationFrame(raf)
    raf = 0
  }

  function sync() {
    reduced = prefersReducedMotion()
    const o = get()
    if (o.effect !== effect) {
      effect = o.effect
      fx = []
      build(true)
      untilHit = 0.3
    } else build(false)
    if (running()) {
      if (!raf) {
        untilHit = Math.min(untilHit, 0.35)
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    } else {
      stop()
      still()
    }
  }

  function resize() {
    w = Math.max(1, host.clientWidth)
    h = Math.max(1, host.clientHeight)
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    build(true)
    if (running()) render()
    else still()
  }

  const ro = new ResizeObserver(resize)
  ro.observe(host)
  const io = new IntersectionObserver((entries) => {
    onScreen = entries[entries.length - 1].isIntersecting
    sync()
  })
  io.observe(host)
  // style / colour / mode switches repaint with the new tokens
  const mo = new MutationObserver(() => {
    pal = readPalette(host)
    if (!running()) still()
  })
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-style', 'data-theme', 'data-mode', 'class', 'style'] })
  document.addEventListener('visibilitychange', sync)
  resize()

  return {
    hit,
    sync,
    destroy() {
      stop()
      ro.disconnect()
      io.disconnect()
      mo.disconnect()
      document.removeEventListener('visibilitychange', sync)
    },
  }
}

/**
 * A self-contained anime FX screen: fills its positioned parent with a canvas and plays speed lines,
 * focus lines, impact frames, flash cuts, sparkle rain or a slash storm on its own layer, so it can sit
 * anywhere (a hero, a stream overlay, an iframe). Pauses off-screen and in hidden tabs; with reduced
 * motion (or play={false}) it shows one calm still frame. Flash frames are capped at 3 per second.
 */
export function FxScreen({
  effect = 'speed-lines',
  intensity = 0.7,
  speed = 1,
  color = 'accent',
  background = 'transparent',
  trigger = 'loop',
  interval = 1200,
  text,
  center = [0.5, 0.5],
  angle = 0,
  play = true,
  flashes = true,
  onHit,
  label,
  className,
  ref,
}: FxScreenProps) {
  const host = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const scene = useRef<Scene | null>(null)
  const opts = useRef<Opts | null>(null)
  const clickable = trigger === 'click'

  useLayoutEffect(() => {
    opts.current = {
      effect,
      intensity: clamp(intensity, 0, 1),
      speed,
      color,
      background,
      trigger,
      interval,
      text,
      center: [clamp(center[0], 0, 1), clamp(center[1], 0, 1)],
      angle,
      play,
      flashes,
      onHit,
    }
    scene.current?.sync()
  })

  useEffect(() => {
    if (!host.current || !canvas.current) return
    const s = createScene(host.current, canvas.current, () => opts.current!)
    scene.current = s
    s.sync()
    return () => {
      s.destroy()
      scene.current = null
    }
  }, [])

  // load the lettering faces for this text, so the first hit measures the real glyphs
  useEffect(() => {
    if (!text || typeof document === 'undefined' || !document.fonts) return
    for (const f of ['40px "Dela Gothic One"', '40px "Mochiy Pop One"', '800 40px "Plus Jakarta Sans"']) document.fonts.load(f, text).catch(() => {})
  }, [text])

  useImperativeHandle(ref, () => ({ hit: (at) => scene.current?.hit(at?.[0], at?.[1]) }), [])

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    scene.current?.hit((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    scene.current?.hit()
  }
  const name = label ?? `${NAMES[effect]} effect${text ? `: ${text}` : ''}`

  return (
    <div
      ref={host}
      role={clickable ? 'button' : 'img'}
      aria-label={clickable ? `${name}. Press to hit` : name}
      tabIndex={clickable ? 0 : undefined}
      onPointerDown={clickable ? onPointerDown : undefined}
      onKeyDown={clickable ? onKeyDown : undefined}
      className={cn(
        'absolute inset-0 overflow-hidden',
        BG[background],
        clickable
          ? 'cursor-pointer touch-manipulation select-none focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-accent'
          : 'pointer-events-none',
        className,
      )}
    >
      <canvas ref={canvas} aria-hidden="true" className="block size-full" />
    </div>
  )
}
