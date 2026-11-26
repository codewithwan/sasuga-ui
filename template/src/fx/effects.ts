import type { Fx } from './engine'
import { TAU, easeInCubic, easeOutBack, easeOutCubic, pick, rand, timed } from './engine'
import { C } from './palette'
import { uiStyle } from './style'

type Pt = { a: number; r: number }

function starPath(ctx: CanvasRenderingContext2D, pts: Pt[], R: number) {
  ctx.beginPath()
  pts.forEach((p, i) => {
    const x = Math.cos(p.a) * p.r * R
    const y = Math.sin(p.a) * p.r * R
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.closePath()
}

/** Jagged comic "impact" star: ink outline, red body, white core. */
function hypeBurst(x: number, y: number, { radius = 70, spikes = 12, color = C.accent } = {}): Fx {
  const pts: Pt[] = Array.from({ length: spikes * 2 }, (_, i) => ({
    a: (i / (spikes * 2)) * TAU + rand(-0.09, 0.09),
    r: i % 2 === 0 ? rand(0.85, 1.3) : rand(0.36, 0.52),
  }))
  const rot = rand(0, TAU)
  return timed(0.42, (ctx, t) => {
    const s = easeOutBack(Math.min(t * 2.6, 1), 2.4)
    ctx.globalAlpha = t < 0.5 ? 1 : 1 - (t - 0.5) / 0.5
    ctx.translate(x, y)
    ctx.rotate(rot + t * 0.25)
    ctx.lineJoin = 'miter'
    starPath(ctx, pts, radius * s * 1.12)
    ctx.fillStyle = C.ink
    ctx.fill()
    starPath(ctx, pts, radius * s)
    ctx.fillStyle = color
    ctx.fill()
    starPath(ctx, pts, radius * s * 0.5)
    ctx.fillStyle = C.white
    ctx.fill()
  })
}

/** Manga focus lines: tapered spikes thrown outward from a centre. */
function hypeRays(
  x: number,
  y: number,
  { count = 16, inner = 34, outer = 150, width = 7, color = C.ink } = {},
): Fx {
  const rs = Array.from({ length: count }, () => ({
    a: rand(0, TAU),
    len: rand(0.6, 1.1),
    w: rand(0.45, 1) * width,
  }))
  return timed(0.36, (ctx, t) => {
    const head = easeOutCubic(Math.min(t * 1.7, 1))
    const tail = easeOutCubic(t)
    ctx.translate(x, y)
    ctx.fillStyle = color
    for (const r of rs) {
      const span = outer * r.len - inner
      const h = inner + span * head
      const tl = inner + span * tail * 0.95
      if (h - tl < 1) continue
      const cx = Math.cos(r.a)
      const cy = Math.sin(r.a)
      const nx = -cy * r.w * (1 - t * 0.6)
      const ny = cx * r.w * (1 - t * 0.6)
      ctx.beginPath()
      ctx.moveTo(cx * tl, cy * tl)
      ctx.lineTo(cx * h + nx, cy * h + ny)
      ctx.lineTo(cx * h - nx, cy * h - ny)
      ctx.closePath()
      ctx.fill()
    }
  })
}

/** Spinning triangular debris with gravity. */
function hypeShards(
  x: number,
  y: number,
  { count = 10, speed = 520, size = 10, colors = [C.accent, C.ink, C.white, C.pop] as readonly string[], round = false } = {},
): Fx {
  const ps = Array.from({ length: count }, () => {
    const a = rand(0, TAU)
    const v = speed * rand(0.45, 1)
    return {
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - speed * 0.25,
      r: rand(0, TAU),
      vr: rand(-14, 14),
      s: size * rand(0.6, 1.3),
      c: pick(colors),
      life: rand(0.4, 0.75),
      age: 0,
    }
  })
  return {
    update(dt) {
      let alive = false
      for (const p of ps) {
        p.age += dt
        p.vy += 1500 * dt
        p.vx *= 1 - 2.2 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.r += p.vr * dt
        if (p.age < p.life) alive = true
      }
      return alive
    },
    draw(ctx) {
      for (const p of ps) {
        if (p.age >= p.life) continue
        const k = 1 - p.age / p.life
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.r)
        ctx.scale(k, k)
        ctx.beginPath()
        if (round) ctx.arc(0, 0, p.s * 0.6, 0, TAU)
        else {
          ctx.moveTo(0, -p.s)
          ctx.lineTo(p.s * 0.9, p.s * 0.7)
          ctx.lineTo(-p.s * 0.8, p.s * 0.5)
          ctx.closePath()
        }
        ctx.fillStyle = p.c
        ctx.fill()
        if (p.c === C.white || p.c === C.pop) {
          ctx.lineWidth = 2
          ctx.strokeStyle = C.ink
          ctx.stroke()
        }
        ctx.restore()
      }
    },
  }
}

/** Cartoon smoke puffs (outline drawn once around the whole cluster). */
function hypeSmoke(x: number, y: number, { count = 6, spread = 60, size = 18 } = {}): Fx {
  const puffs = Array.from({ length: count }, () => {
    const a = rand(0, TAU)
    return {
      a,
      d: spread * rand(0.5, 1),
      s: size * rand(0.7, 1.3),
      blobs: Array.from({ length: 3 }, () => ({ dx: rand(-0.6, 0.6), dy: rand(-0.6, 0.6), r: rand(0.6, 1) })),
    }
  })
  return timed(0.6, (ctx, t) => {
    const e = easeOutCubic(t)
    const scale = 0.35 + 0.9 * e
    ctx.globalAlpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4
    const circles: [number, number, number][] = []
    for (const p of puffs) {
      const px = x + Math.cos(p.a) * p.d * e
      const py = y + Math.sin(p.a) * p.d * e - 14 * e
      const shrink = t > 0.5 ? 1 - (t - 0.5) * 1.4 : 1
      for (const b of p.blobs) circles.push([px + b.dx * p.s, py + b.dy * p.s, p.s * b.r * scale * shrink])
    }
    ctx.fillStyle = C.ink
    for (const [cx, cy, r] of circles) {
      ctx.beginPath()
      ctx.arc(cx, cy, r + 3, 0, TAU)
      ctx.fill()
    }
    ctx.fillStyle = C.white
    for (const [cx, cy, r] of circles) {
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(r, 0), 0, TAU)
      ctx.fill()
    }
  })
}

/** Four-point twinkle. */
export function sparkle(x: number, y: number, { size = 16, color = C.white } = {}): Fx {
  const rot = rand(-0.3, 0.3)
  return timed(0.55, (ctx, t) => {
    const s = t < 0.35 ? easeOutBack(t / 0.35, 3) : 1 - easeInCubic((t - 0.35) / 0.65)
    ctx.translate(x, y)
    ctx.rotate(rot + t * 1.5)
    ctx.scale(s, s)
    ctx.beginPath()
    const r = size
    const k = size * 0.22
    ctx.moveTo(0, -r)
    ctx.quadraticCurveTo(k, -k, r, 0)
    ctx.quadraticCurveTo(k, k, 0, r)
    ctx.quadraticCurveTo(-k, k, -r, 0)
    ctx.quadraticCurveTo(-k, -k, 0, -r)
    ctx.closePath()
    ctx.lineWidth = 3
    ctx.strokeStyle = C.ink
    ctx.stroke()
    ctx.fillStyle = color
    ctx.fill()
  })
}

/** Horizontal speed streaks trailing behind something that moved. */
function hypeSpeedLines(
  rect: { left: number; top: number; width: number; height: number },
  dir: 1 | -1,
  { count = 9, color = C.ink, length = 90 } = {},
): Fx {
  const ls = Array.from({ length: count }, () => ({
    y: rect.top + rand(0.05, 0.95) * rect.height,
    x: dir > 0 ? rect.left + rand(-10, rect.width * 0.4) : rect.left + rect.width - rand(-10, rect.width * 0.4),
    len: length * rand(0.4, 1),
    w: rand(1.5, 4),
  }))
  return timed(0.32, (ctx, t) => {
    const e = easeOutCubic(t)
    ctx.strokeStyle = color
    ctx.lineCap = 'round'
    for (const l of ls) {
      const back = -dir * (l.len * (0.3 + e))
      const shrink = 1 - t
      ctx.lineWidth = l.w * shrink
      ctx.beginPath()
      ctx.moveTo(l.x + back * 0.2, l.y)
      ctx.lineTo(l.x + back * (0.2 + shrink * 0.8), l.y)
      ctx.stroke()
    }
  })
}

/** A blade swipe: crescent that draws in then retracts. */
function hypeSlash(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  { width = 12, color = C.white, echo = C.accent, bend = 0.18 } = {},
): Fx {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  const nx = -dy / len
  const ny = dx / len
  const point = (u: number, side: number) => {
    const curve = Math.sin(Math.PI * u) * len * bend
    const thick = Math.sin(Math.PI * u) * width * side
    return [x1 + dx * u + nx * (curve + thick), y1 + dy * u + ny * (curve + thick)] as const
  }
  const shape = (ctx: CanvasRenderingContext2D, a: number, b: number, ox: number, oy: number) => {
    const N = 18
    ctx.beginPath()
    for (let i = 0; i <= N; i++) {
      const [px, py] = point(a + ((b - a) * i) / N, 1)
      if (i === 0) ctx.moveTo(px + ox, py + oy)
      else ctx.lineTo(px + ox, py + oy)
    }
    for (let i = N; i >= 0; i--) {
      const [px, py] = point(a + ((b - a) * i) / N, -0.25)
      ctx.lineTo(px + ox, py + oy)
    }
    ctx.closePath()
  }
  return timed(0.34, (ctx, t) => {
    const head = easeOutCubic(Math.min(t * 2.4, 1))
    const tail = easeInCubic(t)
    if (head - tail < 0.01) return
    shape(ctx, tail, head, 5, 5)
    ctx.fillStyle = echo
    ctx.fill()
    shape(ctx, tail, head, 0, 0)
    ctx.lineWidth = 3
    ctx.strokeStyle = C.ink
    ctx.lineJoin = 'round'
    ctx.stroke()
    ctx.fillStyle = color
    ctx.fill()
  })
}

/** Manga sound-effect lettering: per-glyph jitter, pop, shake, drift. */
function hypeSfx(
  x: number,
  y: number,
  text: string,
  { size = 54, color = C.accent, rot = rand(-0.22, 0.12), dur = 0.85, soft = false } = {},
): Fx {
  const chars = [...text]
  const glyphs = chars.map((ch, i) => ({
    ch,
    r: rand(-0.16, 0.16),
    s: i === 0 ? 1.18 : rand(0.86, 1.08),
    dy: rand(-0.12, 0.12) * size,
  }))
  let widths: number[] | null = null
  const font = (px: number) =>
    soft ? `${px}px "Mochiy Pop One", "Dela Gothic One", sans-serif` : `${px}px "Dela Gothic One", "Anton", sans-serif`
  return timed(dur, (ctx, t) => {
    if (!widths) {
      widths = glyphs.map((g) => {
        ctx.font = font(size * g.s)
        return ctx.measureText(g.ch).width * 0.92
      })
    }
    const total = widths.reduce((a, b) => a + b, 0)
    const pop = 0.2 + 0.8 * easeOutBack(Math.min(t / 0.22, 1), 3.2)
    const shake = soft ? 0 : t < 0.35 ? (1 - t / 0.35) * 5 : 0
    ctx.globalAlpha = t > 0.68 ? 1 - (t - 0.68) / 0.32 : 1
    ctx.translate(x + rand(-shake, shake), y - easeOutCubic(t) * 26 + rand(-shake, shake))
    ctx.rotate(rot)
    ctx.scale(pop, pop)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    const passes: [string, number, number, 'stroke' | 'fill'][] = [
      [C.ink, size * 0.34, 5, 'stroke'],
      [C.ink, size * 0.3, 0, 'stroke'],
      [C.white, size * 0.18, 0, 'stroke'],
      [color, 0, 0, 'fill'],
    ]
    for (const [style, lw, off, mode] of passes) {
      let cx = -total / 2
      glyphs.forEach((g, i) => {
        const w = widths![i]
        ctx.save()
        ctx.translate(cx + w / 2 + off, g.dy + off)
        ctx.rotate(g.r)
        ctx.font = font(size * g.s)
        if (mode === 'stroke') {
          ctx.lineWidth = lw
          ctx.strokeStyle = style
          ctx.strokeText(g.ch, 0, 0)
        } else {
          ctx.fillStyle = style
          ctx.fillText(g.ch, 0, 0)
        }
        ctx.restore()
        cx += w
      })
    }
  })
}

/* ─────────────── Style-aware entry points ───────────────
   Components always call these; the active style (see ./style) decides how loud the result is. */

const NONE: Fx = { update: () => false, draw() {} }

/** Thin expanding circle: the quiet hit of the clean style. */
function ring(x: number, y: number, radius: number, color: string): Fx {
  return timed(0.5, (ctx, t) => {
    const e = easeOutCubic(t)
    ctx.globalAlpha = (1 - t) * 0.9
    ctx.strokeStyle = color
    ctx.lineWidth = 2.5 * (1 - t) + 0.5
    ctx.beginPath()
    ctx.arc(x, y, radius * (0.35 + 0.75 * e), 0, TAU)
    ctx.stroke()
  })
}

/** A ring of round dots popping outward: the soft style's hit. */
function pop(x: number, y: number, radius: number): Fx {
  const n = 9
  const off = rand(0, TAU)
  return timed(0.55, (ctx, t) => {
    const e = easeOutBack(Math.min(t * 1.6, 1), 1.4)
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * TAU
      const r = radius * 0.5 * e + 8
      ctx.fillStyle = i % 2 ? C.pop : C.accent
      ctx.beginPath()
      ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, Math.max(0, 5 * (1 - t)), 0, TAU)
      ctx.fill()
    }
  })
}

export function burst(x: number, y: number, opts: Parameters<typeof hypeBurst>[2] = {}): Fx {
  if (uiStyle() === 'flat') {
    const r = opts.radius ?? 70
    return group(ring(x, y, r * 0.8, opts.color ?? C.accent), pop(x, y, r * 0.9))
  }
  return hypeBurst(x, y, opts)
}

/** Focus lines converging on the hit: cel and manga. */
export function rays(x: number, y: number, opts: Parameters<typeof hypeRays>[2] = {}): Fx {
  const s = uiStyle()
  if (s === 'flat') return NONE
  if (s === 'cel') return hypeRays(x, y, { ...opts, color: C.soft, count: Math.round((opts.count ?? 16) * 0.8) })
  return hypeRays(x, y, opts)
}

export function shards(x: number, y: number, opts: Parameters<typeof hypeShards>[2] = {}): Fx {
  const s = uiStyle()
  if (s === 'flat') return NONE
  if (s === 'cel') return hypeShards(x, y, { ...opts, count: Math.ceil((opts.count ?? 10) * 0.8), round: true })
  return hypeShards(x, y, opts)
}

export function smoke(...args: Parameters<typeof hypeSmoke>): Fx {
  return uiStyle() === 'flat' ? NONE : hypeSmoke(...args)
}

export function speedLines(...args: Parameters<typeof hypeSpeedLines>): Fx {
  return uiStyle() === 'flat' ? NONE : hypeSpeedLines(...args)
}

export function slash(...args: Parameters<typeof hypeSlash>): Fx {
  return uiStyle() === 'flat' ? NONE : hypeSlash(...args)
}

export function sfx(x: number, y: number, text: string, opts: Parameters<typeof hypeSfx>[3] = {}): Fx {
  const s = uiStyle()
  if (s === 'flat') return NONE
  // cel letters in the rounded pop face, a touch smaller and bouncier
  if (s === 'cel') return hypeSfx(x, y + 4, text, { ...opts, size: (opts.size ?? 54) * 0.9, rot: rand(-0.16, 0.16), soft: true })
  return hypeSfx(x, y, text, opts)
}

/** Several effects as one. */
function group(...fx: Fx[]): Fx {
  let live = fx
  return {
    update(dt) {
      live = live.filter((f) => f.update(dt))
      return live.length > 0
    },
    draw(ctx) {
      for (const f of live) {
        ctx.save()
        f.draw(ctx)
        ctx.restore()
      }
    },
  }
}

/** Dot ring, exported for components that want a gentle pop. */
export { pop }
