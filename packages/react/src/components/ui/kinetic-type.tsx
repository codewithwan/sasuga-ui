import { useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef } from 'react'
import type { Ref } from 'react'
import { createSpring, prefersReducedMotion, uiStyle } from '@/fx'
import type { Spring, SpringConfig } from '@/fx'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { WordTile, tileBleed } from './word-tiles'
import type { WordStyle } from './word-tiles'

export type { WordStyle }

export type KineticTypeAlign = 'left' | 'center' | 'right' | 'justify'
export type KineticTypeVAlign = 'top' | 'middle' | 'bottom'
export type KineticTypeFit = 'none' | 'width' | 'box'
export type KineticTypeAnimate = 'reflow' | 'enter' | 'both' | 'none'

export type KineticTypeHandle = {
  /** Drop every word in again (ignored while `time` drives the entrance). */
  play(): void
}

export type KineticTypeProps = {
  /** The words. `*word*` (or `*several words*`) is emphasis, a line break (or a literal `\n`) forces a new line. */
  text: string
  /** Box width, any CSS length (a number is px). Default: the parent's width. */
  width?: number | string
  /** Box height, any CSS length (a number is px). Default: the parent's height, or the text's own height when that is 0. */
  height?: number | string
  align?: KineticTypeAlign
  valign?: KineticTypeVAlign
  /** `box`: the largest font size at which all the text fits the box. `width`: every line scaled to the box width (a poster stack). */
  fit?: KineticTypeFit
  wordStyle?: WordStyle
  /** Space between words and between lines, in em. One number for both. Default depends on the word style. */
  gap?: number | [x: number, y: number]
  /** Line height of a word (unitless). Tiles add their own padding on top. */
  lineHeight?: number
  uppercase?: boolean
  /** `reflow`: words glide to their new place when anything changes. `enter`: words drop in when the text changes or on play(). `both`: kept words glide, new ones drop in. */
  animate?: KineticTypeAnimate
  /** Drive the entrance from a clock (seconds), e.g. useTimeline().time. Pure function of the time: scrubbing lands exactly. */
  time?: number
  /** With `time`: the entrance starts at `in` and the words leave at `out`. */
  at?: [inAt: number, outAt?: number]
  className?: string
  ref?: Ref<KineticTypeHandle>
}

type Token = { key: string; text: string; hot: boolean; br: number }

/** Text → words with emphasis and the number of forced breaks before each one. */
function tokenize(text: string): Token[] {
  const lines = text.replace(/\\n/g, '\n').split('\n')
  const seen = new Map<string, number>()
  const out: Token[] = []
  let open = false
  let br = 0
  lines.forEach((line, li) => {
    if (li > 0) br++
    for (const raw of line.split(/\s+/)) {
      if (!raw) continue
      const opens = /^\W*\*/.test(raw)
      const stars = (raw.match(/\*/g) ?? []).length
      if (opens) open = true
      const hot = open
      if (/\*\W*$/.test(raw) && (!opens || stars > 1)) open = false
      const t = raw.replace(/\*/g, '')
      if (!t) continue
      const n = seen.get(t) ?? 0
      seen.set(t, n + 1)
      out.push({ key: `${t}#${n}`, text: t, hot, br: out.length ? br : 0 })
      br = 0
    }
  })
  return out
}

/** Widths and heights as lines in the font size: w(f) = a·f + b, h(f) = ah·f + bh. */
type Model = { a: number[]; b: number; ah: number; bh: number }
type Line = { idx: number[]; end: boolean }
type Place = { x: number; y: number; f: number; w: number; h: number }

const wordW = (m: Model, i: number, f: number) => m.a[i] * f + m.b
const lineH = (m: Model, f: number) => m.ah * f + m.bh

/** Greedy line breaking at font size f into width W. Empty lines come from blank lines in the text. */
function wrap(m: Model, toks: Token[], f: number, W: number, gx: number): Line[] {
  const lines: Line[] = []
  let cur: number[] = []
  let cw = 0
  toks.forEach((t, i) => {
    if (t.br && i > 0) {
      lines.push({ idx: cur, end: true })
      for (let k = 1; k < t.br; k++) lines.push({ idx: [], end: true })
      cur = []
      cw = 0
    }
    const w = wordW(m, i, f)
    if (cur.length && cw + gx * f + w > W + 0.01) {
      lines.push({ idx: cur, end: false })
      cur = []
      cw = 0
    }
    cw = cur.length ? cw + gx * f + w : w
    cur.push(i)
  })
  lines.push({ idx: cur, end: true })
  return lines
}

const widthOf = (m: Model, l: Line, f: number, gx: number) => l.idx.reduce((s, i, k) => s + wordW(m, i, f) + (k ? gx * f : 0), 0)

type Opts = { W: number; H: number; base: number; fit: KineticTypeFit; align: KineticTypeAlign; valign: KineticTypeVAlign; gx: number; gy: number; look: WordStyle }

/** The whole layout as a pure function of the measured model and the box. */
function layout(m: Model, toks: Token[], o: Opts): { places: Place[]; height: number } {
  const { W, H, gx, gy, look } = o
  const bleed = (f: number) => tileBleed(look, f)
  // the sticker's offset shadow needs a few pixels between lines on top of the gap
  const lead = (f: number) => gy * f + (look === 'sticker' ? 3 : 0)
  let lines: Line[]
  let sizes: number[]

  if (o.fit === 'box' && H > 0) {
    // one pixel of slack each way: positions are rounded to whole pixels
    const W = o.W - 1
    const H = o.H - 1
    const fits = (f: number) => {
      const ls = wrap(m, toks, f, W - bleed(f), gx)
      const tall = ls.length * lineH(m, f) + (ls.length - 1) * lead(f) + bleed(f)
      return tall <= H && ls.every((l) => widthOf(m, l, f, gx) <= W - bleed(f) + 0.01)
    }
    let lo = 2
    let hi = Math.max(lo, Math.min(H / Math.max(m.ah, 0.01), 4000))
    if (fits(hi)) lo = hi
    else
      for (let k = 0; k < 24 && hi - lo > 0.05; k++) {
        const mid = (lo + hi) / 2
        if (fits(mid)) lo = mid
        else hi = mid
      }
    // a hair under the limit: glyph widths are not perfectly linear in the font size
    const f = Math.max(2, Math.floor(lo * 0.992 * 4) / 4)
    lines = wrap(m, toks, f, W - bleed(f), gx)
    sizes = lines.map(() => f)
  } else if (o.fit === 'width') {
    lines = wrap(m, toks, o.base, W, gx)
    // per line: solve f·(Σa + gaps + bleed) + n·b = W
    sizes = lines.map((l) => {
      if (!l.idx.length) return o.base
      const sa = l.idx.reduce((s, i) => s + m.a[i], 0)
      const coef = sa + gx * (l.idx.length - 1) + (look === 'stamp' ? 0.11 : 0)
      return Math.max(2, (W - l.idx.length * m.b - (look === 'sticker' ? 5 : 0)) / Math.max(coef, 0.01))
    })
    // a stack taller than the box scales down as one (two passes absorb the constant parts)
    if (H > 0)
      for (let pass = 0; pass < 2; pass++) {
        const tall = sizes.reduce((s, f, k) => s + lineH(m, f) + (k ? lead(Math.min(f, sizes[k - 1])) : 0), 0) + bleed(Math.max(...sizes))
        if (tall <= H) break
        const k = H / tall
        sizes = sizes.map((f) => Math.max(2, f * k * 0.995))
      }
  } else {
    lines = wrap(m, toks, o.base, W - bleed(o.base), gx)
    sizes = lines.map(() => o.base)
  }

  const places: Place[] = new Array(toks.length)
  const heights = lines.map((_, k) => lineH(m, sizes[k]))
  const total = heights.reduce((s, h, k) => s + h + (k ? lead(Math.min(sizes[k], sizes[k - 1])) : 0), 0) + bleed(Math.max(...sizes))
  const top = o.valign === 'top' || !(H > 0) ? 0 : o.valign === 'middle' ? (H - total) / 2 : H - total
  let y = top
  lines.forEach((l, k) => {
    const f = sizes[k]
    if (k) y += lead(Math.min(f, sizes[k - 1]))
    const inner = W - bleed(f)
    const lw = widthOf(m, l, f, gx)
    const free = inner - lw
    const n = l.idx.length
    const justify = o.align === 'justify' && !l.end && n > 1 && free > 0
    let x = 0
    if (!justify && free > 0) x = o.align === 'center' ? free / 2 : o.align === 'right' ? free : 0
    const extra = justify ? free / (n - 1) : 0
    const h = heights[k]
    l.idx.forEach((i) => {
      const w = wordW(m, i, f)
      const wh = lineH(m, f)
      places[i] = { x: Math.max(0, Math.floor(x)), y: Math.floor(y + (h - wh)), f, w, h: wh }
      x += w + gx * f + extra
    })
    y += h
  })
  return { places, height: Math.ceil(total) }
}

type V = { x: number; y: number; s: number; o: number }
type Enter = { dy: number; se: number; eo: number }
type Rec = {
  el: HTMLSpanElement | null
  spring: Spring<keyof V, HTMLSpanElement>
  /** The spring's live values (set on the first draw). */
  v?: V
  f: number
  w: number
  h: number
  placed: boolean
  /** clock() when this word's own entrance starts, or -1. */
  enterAt: number
  e: Enter
  pending?: { due: number; to: Partial<V> }
}

const REST: Enter = { dy: 0, se: 1, eo: 1 }
const HIDDEN: Enter = { dy: 0, se: 1, eo: 0 }
const ENTER_LEN = 0.95
// the frame clock the loops share
const clock = () => performance.now()
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** One word's entrance (age ≥ 0) or exit (gone ≥ 0) at a time, in seconds. Pure. */
function entrance(age: number, hot: boolean, still: boolean, gone = -1): Enter {
  if (gone >= 0) {
    if (still) return HIDDEN
    const q = clamp01(gone / 0.24)
    return { dy: 0.28 * q * q, se: 1 - 0.18 * q, eo: 1 - clamp01(gone / 0.2) }
  }
  if (age < 0) return { dy: -0.5, se: 0.6, eo: 0 }
  if (still || age >= ENTER_LEN) return REST
  const flat = uiStyle() === 'flat'
  const amp = flat ? 0.5 : 1
  // a damped spring from 0 to 1 that overshoots (flat settles sooner)
  const k = 1 - Math.exp(-(flat ? 11 : 8) * age) * Math.cos((flat ? 10 : 14) * age)
  const lo = hot ? 0.3 : 0.58
  return { dy: -0.55 * amp * (1 - k), se: 1 - amp * (1 - lo) + amp * (1 - lo) * k, eo: clamp01(age / 0.09) }
}

const css = (v: number | string | undefined) => (typeof v === 'number' ? `${v}px` : v)

const GLIDE: Record<string, SpringConfig> = { cel: { stiffness: 250, damping: 21 }, manga: { stiffness: 380, damping: 27 }, flat: { stiffness: 210, damping: 25 } }

/**
 * Motion-graph type: a box of any size whose words lay themselves out inside it, aligned
 * left / center / right / justify and top / middle / bottom, optionally fitted to the box.
 * Change the size, the alignment, the style or the text and every word glides to its new place
 * on a spring, with a slight stagger: the re-flow is the effect.
 *
 * The layout is computed, not left to CSS: each word is measured once per text / style change
 * (one hidden pass at a fixed size), and every resize only runs the maths and writes transforms.
 * Springs write straight to the DOM; nothing re-renders per frame. Screen readers get the plain
 * text once.
 */
export function KineticType({
  text,
  width,
  height,
  align = 'left',
  valign = 'top',
  fit = 'none',
  wordStyle = 'plain',
  gap,
  lineHeight = 1.12,
  uppercase = false,
  animate = 'reflow',
  time,
  at,
  className,
  ref,
}: KineticTypeProps) {
  const toks = useMemo(() => tokenize(text), [text])
  const plainText = useMemo(() => toks.map((t) => t.text).join(' '), [toks])
  const { style } = useTheme()
  const tiles = wordStyle !== 'plain'
  const [gx, gy] = Array.isArray(gap) ? gap : gap === undefined ? (tiles ? [0.14, 0.14] : [0.26, 0.02]) : [gap, gap]
  const inAt = at?.[0] ?? 0
  const outAt = at?.[1] ?? Number.POSITIVE_INFINITY
  const driven = time !== undefined

  const root = useRef<HTMLDivElement>(null)
  const meter = useRef<HTMLDivElement>(null)
  const recs = useRef(new Map<string, Rec>())
  const model = useRef<Model | null>(null)
  const size = useRef({ W: 0, H: 0 })
  const raf = useRef({ stagger: 0, enter: 0 })
  const state = useRef({ toks, align, valign, fit, gx, gy, wordStyle, animate, driven, ready: false, minH: 0, prevKeys: new Set<string>() })

  // the latest props, read by the layout and the loops (which run outside React)
  useLayoutEffect(() => {
    Object.assign(state.current, { toks, align, valign, fit, gx, gy, wordStyle, animate, driven })
  })

  const rec = (key: string): Rec => {
    let r = recs.current.get(key)
    if (r) return r
    const made: Rec = {
      el: null,
      f: 0,
      w: 0,
      h: 0,
      placed: false,
      enterAt: -1,
      e: REST,
      spring: createSpring<keyof V, HTMLSpanElement>({ x: 0, y: 0, s: 1, o: 1 }),
    }
    made.spring.bind({
      el: () => made.el,
      config: () => GLIDE[uiStyle()] ?? GLIDE.cel,
      render: (v, el) => {
        made.v = v
        const { dy, se, eo } = made.e
        const S = v.s * se
        // entrance scale pops around the word's lower middle, layout scale grows from its corner
        const X = v.x + ((v.s - S) * made.w) / 2
        const Y = v.y + dy * made.f * v.s + (v.s - S) * made.h * 0.75
        el.style.transform = `translate(${X}px, ${Y}px) scale(${S})`
        el.style.opacity = String(v.o * eo)
      },
    })
    recs.current.set(key, made)
    r = made
    return r
  }

  /** Apply pending staggered targets that are due; one loop for every word. */
  const flush = () => {
    raf.current.stagger = 0
    const now = clock()
    let more = false
    recs.current.forEach((r) => {
      if (!r.pending) return
      if (r.pending.due <= now) {
        r.spring.set(r.pending.to)
        r.pending = undefined
      } else more = true
    })
    if (more) raf.current.stagger = requestAnimationFrame(flush)
  }

  /** The internal entrance clock (play() and new words); time-driven entrances never use it. */
  const tickEnter = () => {
    raf.current.enter = 0
    const now = clock()
    const still = prefersReducedMotion()
    let more = false
    const hot = new Map(state.current.toks.map((t) => [t.key, t.hot]))
    recs.current.forEach((r, key) => {
      if (r.enterAt < 0) return
      const age = (now - r.enterAt) / 1000
      r.e = entrance(age, hot.get(key) ?? false, still)
      if (age >= ENTER_LEN || still) {
        r.e = REST
        r.enterAt = -1
      } else more = true
      r.spring.draw()
    })
    if (more) raf.current.enter = requestAnimationFrame(tickEnter)
  }
  const startEnter = () => {
    if (!raf.current.enter) raf.current.enter = requestAnimationFrame(tickEnter)
  }

  /** Read every word once at 100px (one forced layout), into the linear model. */
  const measure = () => {
    const box = meter.current
    if (!box) return
    const nodes = Array.from(box.children) as HTMLElement[]
    if (!nodes.length) {
      model.current = { a: [], b: 0, ah: 1, bh: 0 }
      return
    }
    const faceOf = (n: HTMLElement) => (state.current.wordStyle === 'plain' ? n : ((n.lastElementChild as HTMLElement | null) ?? n))
    const cs = getComputedStyle(faceOf(nodes[0]))
    const b = (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.borderRightWidth) || 0)
    const bh = (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0)
    let ah = 0
    const a = nodes.map((n) => {
      const r = n.getBoundingClientRect()
      ah = Math.max(ah, (r.height - bh) / 100)
      return Math.max(0, (r.width - b) / 100)
    })
    model.current = { a, b, ah: ah || 1, bh }
  }

  /** Lay the words out and move them. `text`: the words changed; `snap`: no animation. */
  const run = (reason: 'init' | 'layout' | 'text' | 'snap') => {
    const el = root.current
    const m = model.current
    const s = state.current
    if (!el || !m || m.a.length !== s.toks.length) return
    const W = size.current.W || el.clientWidth
    const measured = size.current.H || el.clientHeight
    if (!(W > 0)) return
    // a box only as tall as the min-height we wrote is an auto-height box: lay out unbounded
    const H = s.fit !== 'box' && s.minH > 0 && measured <= s.minH + 0.5 ? 0 : measured
    const base = parseFloat(getComputedStyle(el).fontSize) || 16
    const { places, height: tall } = layout(m, s.toks, { W, H, base, fit: s.fit, align: s.align, valign: s.valign, gx: s.gx, gy: s.gy, look: s.wordStyle })
    // never collapse: an auto-height parent gets the text's own height (fit="box" needs a real height)
    s.minH = s.fit === 'box' ? 0 : tall
    el.style.minHeight = s.minH ? `${s.minH}px` : ''

    const still = prefersReducedMotion()
    const anim = s.animate
    const glide = !still && reason !== 'init' && reason !== 'snap' && (anim === 'reflow' || anim === 'both')
    const enterAll = !still && reason === 'text' && anim === 'enter'
    const enterNew = !still && reason === 'text' && (anim === 'enter' || anim === 'both')
    const now = clock()
    const n = s.toks.length
    const step = Math.min(16, 150 / Math.max(1, n)) // ms between words while gliding
    const estep = Math.min(70, 800 / Math.max(1, n)) // ms between words entering
    let entering = 0
    let staggered = false

    const live = new Set(s.toks.map((t) => t.key))
    recs.current.forEach((r, key) => {
      if (live.has(key)) return
      r.spring.stop()
      recs.current.delete(key)
    })

    s.toks.forEach((t, i) => {
      const r = rec(t.key)
      const p = places[i]
      const node = r.el
      if (!node || !p) return
      const isNew = !r.placed || !s.prevKeys.has(t.key)
      if (p.f !== r.f) {
        // FLIP the font size: keep the word's look this frame, then let s spring back to 1
        const k = r.f && r.v ? (r.v.s * r.f) / p.f : 1
        node.style.fontSize = `${p.f}px`
        r.f = p.f
        r.w = p.w
        r.h = p.h
        if (r.placed && glide && !isNew) r.spring.snap({ s: k })
      } else {
        r.w = p.w
        r.h = p.h
      }
      const to = { x: p.x, y: p.y, s: 1, o: 1 }
      if (!r.placed || !glide || enterAll || (isNew && enterNew)) {
        r.pending = undefined
        r.spring.snap(isNew && !enterNew && glide ? { ...to, o: 0 } : to)
        if (isNew && !enterNew && glide) r.spring.set({ o: 1 })
        if (!s.driven && (enterAll || (isNew && enterNew))) {
          r.enterAt = now + entering++ * estep
          r.e = entrance(-1, t.hot, still)
          r.spring.draw()
        }
      } else {
        const due = now + i * step
        r.pending = { due: r.pending ? Math.min(r.pending.due, due) : due, to }
        staggered = true
      }
      r.placed = true
    })
    s.prevKeys = live
    if (staggered && !raf.current.stagger) flush()
    if (entering) startEnter()
  }

  // measure + lay out whenever the words or their look change (and once fonts settle)
  const prevText = useRef<Token[] | null>(null)
  useLayoutEffect(() => {
    measure()
    const first = !state.current.ready
    const textChanged = prevText.current !== null && prevText.current !== toks
    prevText.current = toks
    state.current.ready = true
    run(first ? 'init' : textChanged ? 'text' : 'layout')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toks, wordStyle, uppercase, lineHeight, style])

  // alignment, fit and gaps only re-run the maths (the first pass already ran above)
  const mounted = useRef(false)
  useLayoutEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    run('layout')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [align, valign, fit, gx, gy, animate])

  // the box: ResizeObserver, plus a re-measure (no animation) when web fonts arrive
  useEffect(() => {
    const el = root.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const box = entry.contentRect
      if (box.width === size.current.W && box.height === size.current.H) return
      const had = size.current.W > 0
      size.current = { W: box.width, H: box.height }
      run(had ? 'layout' : 'snap')
    })
    ro.observe(el)
    const fonts = document.fonts
    const refit = () => {
      measure()
      run('snap')
    }
    fonts?.addEventListener?.('loadingdone', refit)
    fonts?.ready.then(refit)
    const loops = raf.current
    const all = recs.current
    return () => {
      ro.disconnect()
      fonts?.removeEventListener?.('loadingdone', refit)
      cancelAnimationFrame(loops.stagger)
      cancelAnimationFrame(loops.enter)
      all.forEach((r) => r.spring.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // time-driven entrance: every word's state is a pure function of `time`
  useLayoutEffect(() => {
    if (time === undefined) return
    const still = prefersReducedMotion()
    const n = toks.length
    const step = Math.min(0.07, 0.8 / Math.max(1, n))
    toks.forEach((t, i) => {
      const r = recs.current.get(t.key)
      if (!r) return
      r.enterAt = -1
      const gone = time >= outAt ? time - outAt - i * Math.min(0.04, 0.4 / Math.max(1, n)) : -1
      r.e = entrance(time - inAt - i * step, t.hot, still, gone)
      r.spring.draw()
    })
  }, [time, inAt, outAt, toks])

  // leaving time-driven mode: show every word at rest
  useLayoutEffect(() => {
    if (driven) return
    recs.current.forEach((r) => {
      if (r.enterAt >= 0) return
      r.e = REST
      r.spring.draw()
    })
  }, [driven])

  useImperativeHandle(
    ref,
    () => ({
      play() {
        if (state.current.driven || prefersReducedMotion()) return
        const now = clock()
        const n = state.current.toks.length
        const estep = Math.min(70, 800 / Math.max(1, n))
        state.current.toks.forEach((t, i) => {
          const r = recs.current.get(t.key)
          if (!r) return
          r.enterAt = now + i * estep
          r.e = entrance(-1, t.hot, false)
          r.spring.draw()
        })
        startEnter()
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const lh = { lineHeight }
  return (
    <div
      ref={root}
      className={cn('ui-head relative', uppercase && 'uppercase', className)}
      style={{ width: css(width) ?? '100%', height: css(height) ?? '100%', maxWidth: '100%' }}
    >
      <span className="sr-only">{plainText}</span>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {toks.map((t, i) => (
          <WordTile
            key={t.key}
            ref={(el) => {
              if (el) rec(t.key).el = el
              else {
                const r = recs.current.get(t.key)
                if (r) r.el = null
              }
            }}
            look={wordStyle}
            tone={t.hot ? 'pop' : 'base'}
            index={i}
            className="absolute top-0 left-0 origin-top-left"
            style={lh}
          >
            {t.text}
          </WordTile>
        ))}
      </div>
      {/* the measuring copy: same words at a fixed 100px, never painted */}
      <div ref={meter} aria-hidden="true" className="invisible pointer-events-none absolute top-0 left-0 size-0 overflow-hidden" style={{ fontSize: 100 }}>
        {toks.map((t, i) => (
          <WordTile key={t.key} look={wordStyle} tone={t.hot ? 'pop' : 'base'} index={i} className="absolute top-0 left-0" style={lh}>
            {t.text}
          </WordTile>
        ))}
      </div>
    </div>
  )
}
