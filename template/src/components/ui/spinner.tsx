import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import type { CSSProperties, HTMLAttributes, ReactNode, RefObject } from 'react'
import { cva } from 'class-variance-authority'
import { TAU, prefersReducedMotion, uiStyle } from '@/fx'
import type { UiStyle } from '@/fx'
import { cn } from '@/lib/utils'

/* ═══════════════════════════ shared plumbing ═══════════════════════════ */

const subscribeStyle = (cb: () => void) => {
  const mo = new MutationObserver(cb)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-style'] })
  return () => mo.disconnect()
}
/** The live kit style, so Web Animations rebuild when the style picker changes. */
function useUiStyle() {
  return useSyncExternalStore(subscribeStyle, uiStyle, () => 'cel' as UiStyle)
}

/**
 * Looping Web Animations for one element. `make` builds them (rebuilt when the style or
 * `key` changes); `speed` is applied as playbackRate so it can change live.
 * Under prefers-reduced-motion nothing runs and the element keeps its static frame.
 */
function useLoop(ref: RefObject<HTMLElement | null>, speed: number, make: (el: HTMLElement, style: UiStyle) => Animation[], key = '', paused = false) {
  const style = useUiStyle()
  const anims = useRef<Animation[]>([])
  const makeRef = useRef(make)
  const speedRef = useRef(speed)
  const pausedRef = useRef(paused)
  useLayoutEffect(() => {
    makeRef.current = make
  })
  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return
    const list = makeRef.current(el, style)
    list.forEach((a) => {
      a.playbackRate = speedRef.current
      if (pausedRef.current) a.pause()
    })
    anims.current = list
    return () => {
      list.forEach((a) => a.cancel())
      anims.current = []
    }
  }, [ref, style, key])
  useEffect(() => {
    speedRef.current = speed
    anims.current.forEach((a) => a.updatePlaybackRate(speed))
  }, [speed])
  useEffect(() => {
    pausedRef.current = paused
    anims.current.forEach((a) => (paused ? a.pause() : a.play()))
  }, [paused])
}

/** CSS animation timing scaled by speed (CSS loops get prefers-reduced-motion from index.css). */
const at = (speed: number, dur: number, delay = 0): CSSProperties => ({
  animationDuration: `${dur / speed}s`,
  animationDelay: delay ? `${delay / speed}s` : undefined,
})

const polar = (r: number, a: number) => `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`
const TOP = -Math.PI / 2
const WHIP = 'cubic-bezier(.7,0,.2,1)'
const POP = 'cubic-bezier(.2,1.4,.4,1)'

/** A 4-blade throwing star with hooked edges and a centre hole (viewBox -50 -50 100 100). */
const SHURIKEN = (() => {
  let d = ''
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + TOP
    d += `${i ? 'L' : 'M'}${polar(47, a)} Q${polar(17, a + 0.55)} ${polar(11, a + Math.PI / 4)} `
  }
  return `${d}Z M5 0 A5 5 0 1 0 -5 0 A5 5 0 1 0 5 0Z`
})()

/** Swoosh arcs trailing each blade tip. */
const SHURIKEN_ARCS = Array.from({ length: 4 }, (_, i) => {
  const a = (i / 4) * TAU + TOP
  return [`M${polar(44, a - 1.05)} A44 44 0 0 1 ${polar(44, a - 0.22)}`, `M${polar(33, a - 0.85)} A33 33 0 0 1 ${polar(33, a - 0.3)}`]
}).flat()

/** Starburst spikes; every other spike uses the short radius. */
function raysPath(n: number, rIn: number, rLong: number, rShort: number, half: number) {
  let d = ''
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + TOP
    d += `M${polar(rIn, a - half)} L${polar(i % 2 ? rShort : rLong, a)} L${polar(rIn, a + half)}Z `
  }
  return d
}
const RAYS_OUT = raysPath(12, 20, 49, 38, 0.2)
const RAYS_IN = raysPath(8, 10, 30, 24, 0.13)

/** Equalizer levels per bar, one row per bar. */
const BARS = [
  [0.35, 0.9, 0.5, 1, 0.35],
  [0.8, 0.4, 1, 0.55, 0.8],
  [0.5, 1, 0.3, 0.75, 0.5],
  [1, 0.55, 0.85, 0.35, 1],
  [0.4, 0.75, 0.6, 0.95, 0.4],
]

/** A 4-point twinkle as inline svg. */
function Twinkle({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className} style={style}>
      <path d="M10 0 Q11.6 8.4 20 10 Q11.6 11.6 10 20 Q8.4 11.6 0 10 Q8.4 8.4 10 0Z" className="fill-paper stroke-ink" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

const BOX = 'relative grid size-(--sz) shrink-0 place-items-center'
const CELL = 'col-start-1 row-start-1'
const LINE = 'stroke-(--ui-line) [stroke-width:var(--ui-bw-thin)] [vector-effect:non-scaling-stroke]'

type G = { speed: number }

/* ═══════════════════════════ the glyphs ═══════════════════════════ */

function Ring({ speed }: G) {
  return (
    <span aria-hidden="true" className="relative grid size-(--sz) shrink-0">
      <span className={cn(CELL, 'ui-border ui-pill ui-shadow-sm grid overflow-hidden bg-accent-soft/40')}>
        <span className={cn(CELL, 'scale-150 animate-[spin_0.8s_steps(8)_infinite] bg-[conic-gradient(var(--color-accent)_0_30%,transparent_0)]')} style={at(speed, 0.8)} />
        <span className={cn(CELL, 'ui-border-thin ui-pill m-[26%] animate-pulse bg-paper')} style={at(speed, 2)} />
      </span>
      {/* a sparkle riding the rim, on the same stepped beat */}
      <span className={cn(CELL, 'fx-only pointer-events-none relative animate-[spin_1.6s_steps(16)_infinite]')} style={at(speed, 1.6)}>
        <Twinkle className="absolute -top-[18%] left-1/2 size-[42%] -translate-x-1/2" />
      </span>
    </span>
  )
}

function Dots({ speed }: G) {
  const ref = useRef<HTMLSpanElement>(null)
  useLoop(ref, speed, (el, s) => {
    const k = s === 'flat' ? 0.55 : 1
    return Array.from(el.children).map((dot, i) =>
      dot.animate(
        [
          { transform: `translateY(0) scale(${1 + 0.3 * k}, ${1 - 0.3 * k})`, easing: 'cubic-bezier(.2,.7,.3,1)' },
          { transform: `translateY(${-90 * k}%) scale(${1 - 0.12 * k}, ${1 + 0.16 * k})`, offset: 0.35, easing: 'cubic-bezier(.6,0,.9,.4)' },
          { transform: 'translateY(0) scale(1)', offset: 0.6 },
          { transform: `translateY(0) scale(${1 + 0.3 * k}, ${1 - 0.3 * k})`, offset: 0.68 },
          { transform: 'translateY(0) scale(1)', offset: 0.85 },
          { transform: `translateY(0) scale(${1 + 0.3 * k}, ${1 - 0.3 * k})` },
        ],
        { duration: 760, delay: i * 120, iterations: Infinity },
      ),
    )
  })
  return (
    <span ref={ref} aria-hidden="true" className="inline-flex h-(--sz) items-end gap-[calc(var(--sz)*0.12)] pb-[calc(var(--sz)*0.1)]">
      {['bg-accent', 'bg-pop', 'bg-accent'].map((c, i) => (
        <span key={i} className={cn('ui-border-thin ui-pill ui-fill size-[calc(var(--sz)*0.32)] origin-bottom', c)} />
      ))}
    </span>
  )
}

function Orbit({ speed }: G) {
  return (
    <span aria-hidden="true" className={BOX}>
      <span className={cn(CELL, 'ui-border-thin ui-pill ui-fill size-[34%] animate-pulse bg-accent')} style={at(speed, 2)} />
      <span className={cn(CELL, 'relative size-full animate-[spin_1.1s_linear_infinite]')} style={at(speed, 1.1)}>
        {[0, 120, 240].map((a, i) => (
          <Twinkle
            key={a}
            className="absolute top-1/2 left-1/2 size-[36%] animate-pulse"
            style={{
              transform: `translate(-50%, -50%) rotate(${a}deg) translateY(calc(var(--sz) * -0.42)) scale(${1 - i * 0.22})`,
              ...at(speed, 2, i * 0.22),
            }}
          />
        ))}
      </span>
    </span>
  )
}

/** Spinning star blade with afterimages and swoosh arcs; manga turns it in 12 stepped frames. */
function Shuriken({ speed }: G) {
  return (
    <span aria-hidden="true" className={BOX}>
      <svg
        viewBox="-50 -50 100 100"
        className={cn(CELL, 'size-full animate-[spin_0.7s_linear_infinite] overflow-visible in-data-[style=manga]:[animation-timing-function:steps(12)]')}
        style={at(speed, 0.7)}
      >
        <g className="fx-only fill-none stroke-accent-soft" strokeWidth="5" strokeLinecap="round">
          {SHURIKEN_ARCS.map((d, i) => (
            <path key={i} d={d} opacity={i % 2 ? 0.6 : 1} />
          ))}
        </g>
        <path d={SHURIKEN} fillRule="evenodd" transform="rotate(-36)" className="fx-only fill-accent-soft opacity-30" />
        <path d={SHURIKEN} fillRule="evenodd" transform="rotate(-18)" className="fill-accent-soft opacity-60" />
        <path d={SHURIKEN} fillRule="evenodd" strokeLinejoin="round" className={cn('fill-accent', LINE)} />
      </svg>
    </span>
  )
}

/** Concentric rings rippling out of a beating core. */
function Pulse({ speed }: G) {
  const core = useRef<HTMLSpanElement>(null)
  useLoop(core, speed, (el, s) => {
    const k = s === 'flat' ? 0.5 : 1
    return [
      el.animate(
        [
          { scale: '1' },
          { scale: `${1 + 0.3 * k}`, offset: 0.15 },
          { scale: `${1 - 0.1 * k}`, offset: 0.35 },
          { scale: '1', offset: 0.55 },
          { scale: '1' },
        ],
        { duration: 500, iterations: Infinity, easing: 'ease-out' },
      ),
    ]
  })
  return (
    <span aria-hidden="true" className={BOX}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            CELL,
            'size-1/2 animate-[ping_1.5s_cubic-bezier(0,0,.2,1)_infinite] rounded-full border-[length:var(--ui-bw-thin)] border-solid',
            i === 1 ? 'border-pop' : 'border-accent',
          )}
          style={at(speed, 1.5, -i * 0.5)}
        />
      ))}
      <span ref={core} className={cn(CELL, 'ui-border-thin ui-shadow-sm ui-fill size-[38%] rounded-full bg-accent')} />
    </span>
  )
}

/** Equalizer bars that spring between levels (manga: stepped, flat: smaller swings). */
function Bars({ speed }: G) {
  const ref = useRef<HTMLSpanElement>(null)
  useLoop(ref, speed, (el, s) => {
    const k = s === 'flat' ? 0.6 : 1
    const easing = s === 'manga' ? 'steps(3, jump-end)' : s === 'flat' ? 'ease-in-out' : 'cubic-bezier(.3,1.6,.5,1)'
    return Array.from(el.children).map((bar, i) =>
      bar.animate(
        BARS[i % BARS.length].map((h) => ({ height: `${(0.55 + (h - 0.55) * k) * 100}%`, easing })),
        { duration: 1100, iterations: Infinity },
      ),
    )
  })
  return (
    <span aria-hidden="true" className="relative flex size-(--sz) shrink-0 flex-col justify-end gap-[6%]">
      <span ref={ref} className="flex h-[80%] items-end justify-center gap-[6%]">
        {BARS.map((_, i) => (
          <span key={i} className={cn('ui-border-thin ui-r-sm ui-fill h-1/2 w-[15%]', i % 2 ? 'bg-pop' : 'bg-accent')} />
        ))}
      </span>
      <span className="ui-rule w-full" />
    </span>
  )
}

/** A card flipping over Y, then X, squashing on each turn, over a breathing floor shadow. */
function Flip({ speed }: G) {
  const card = useRef<HTMLSpanElement>(null)
  const floor = useRef<HTMLSpanElement>(null)
  useLoop(card, speed, (el, s) => {
    const o = s === 'flat' ? 4 : 14
    const sq = s === 'flat' ? 0.97 : 0.9
    const easing = s === 'manga' ? WHIP : 'cubic-bezier(.4,0,.2,1)'
    const f = (x: number, y: number, sc: number, offset: number): Keyframe => ({ transform: `rotateX(${x}deg) rotateY(${y}deg) scale(${sc})`, offset, easing })
    const list = [
      el.animate(
        [f(0, 0, 1, 0), f(0, -o, sq, 0.1), f(0, 180 + o, 1.06, 0.32), f(0, 180, 1, 0.4), f(0, 180, 1, 0.5), f(-o, 180, sq, 0.6), f(180 + o, 180, 1.06, 0.82), f(180, 180, 1, 0.9), f(180, 180, 1, 1)],
        { duration: 1700, iterations: Infinity },
      ),
    ]
    const fl = floor.current
    if (fl)
      list.push(
        fl.animate(
          [
            { scale: '1 1', offset: 0 },
            { scale: '.5 1', offset: 0.21 },
            { scale: '1 1', offset: 0.4 },
            { scale: '1 1', offset: 0.5 },
            { scale: '.5 1', offset: 0.71 },
            { scale: '1 1', offset: 0.9 },
            { scale: '1 1', offset: 1 },
          ],
          { duration: 1700, iterations: Infinity },
        ),
      )
    return list
  })
  const face = 'ui-border ui-r-sm ui-fill absolute inset-0 grid place-items-center [backface-visibility:hidden]'
  return (
    <span aria-hidden="true" className={cn(BOX, '[perspective:calc(var(--sz)*3)]')}>
      <span ref={floor} className={cn(CELL, 'h-[8%] w-[60%] self-end rounded-full bg-ink/15')} />
      <span ref={card} className={cn(CELL, 'relative mb-[10%] h-[74%] w-[56%] [transform-style:preserve-3d]')}>
        <span className={cn(face, 'bg-accent')}>
          <Twinkle className="size-[62%]" />
        </span>
        <span className={cn(face, 'bg-pop [transform:rotateY(180deg)]')}>
          <span className="ui-border-thin size-[38%] rounded-full bg-paper" />
        </span>
      </span>
    </span>
  )
}

/** A clock face whose hand sweeps a fading wedge; the hour hand ticks. Manga ticks both. */
function Clock({ speed }: G) {
  return (
    <span aria-hidden="true" className={BOX}>
      <span className={cn(CELL, 'ui-border ui-shadow-sm ui-tone relative size-full overflow-hidden rounded-full bg-paper')}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full stroke-ink" strokeLinecap="round">
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * TAU
            const r = i % 3 ? 33 : 27
            const [x1, y1] = [50 + r * Math.sin(a), 50 - r * Math.cos(a)]
            const [x2, y2] = [50 + 39 * Math.sin(a), 50 - 39 * Math.cos(a)]
            return <line key={i} x1={x1.toFixed(2)} y1={y1.toFixed(2)} x2={x2.toFixed(2)} y2={y2.toFixed(2)} strokeWidth={i % 3 ? 3 : 5} />
          })}
        </svg>
        <span className="absolute inset-0 animate-[spin_14.4s_steps(12)_infinite]" style={at(speed, 14.4)}>
          <span className="ui-pill absolute bottom-1/2 left-1/2 h-[24%] w-[10%] -translate-x-1/2 bg-ink" />
        </span>
        <span className="absolute inset-0 animate-[spin_1.2s_linear_infinite] in-data-[style=manga]:[animation-timing-function:steps(12)]" style={at(speed, 1.2)}>
          <span className="fx-only absolute inset-0 rounded-full bg-[conic-gradient(transparent_0_70%,var(--color-accent-soft)_100%)]" />
          <span className="ui-pill ui-fill absolute bottom-1/2 left-1/2 h-[38%] w-[8%] -translate-x-1/2 bg-accent" />
        </span>
        <span className="ui-border-thin absolute top-1/2 left-1/2 size-[18%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-pop" />
      </span>
    </span>
  )
}

/** Characters (default 読 込 中) popping in and out of a sticker, one at a time. */
function Kanji({ speed, glyphs }: G & { glyphs: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const chars = [...glyphs]
  useLoop(
    ref,
    speed,
    (el, s) => {
      const n = el.children.length
      const w = 1 / n
      const off = (x: number) => Math.min(x * w, 1)
      const flat = s === 'flat'
      const pop = flat ? 1.08 : 1.32
      const rot = flat ? 0 : 14
      const step = s === 'manga' ? 520 : 640
      const gone = { opacity: 0, transform: `translateY(-45%) scale(.5) rotate(${rot}deg)` }
      const kf: Keyframe[] = [
        { opacity: 0, transform: `translateY(25%) scale(.2) rotate(${-rot}deg)`, offset: 0, easing: s === 'manga' ? WHIP : POP },
        { opacity: 1, transform: `translateY(-6%) scale(${pop}) rotate(${rot * 0.4}deg)`, offset: off(0.22) },
        { opacity: 1, transform: `translateY(0) scale(.94) rotate(${-rot * 0.15}deg)`, offset: off(0.4) },
        { opacity: 1, transform: 'translateY(0) scale(1) rotate(0deg)', offset: off(0.55) },
        { opacity: 1, transform: 'translateY(0) scale(1) rotate(0deg)', offset: off(0.85), easing: 'ease-in' },
        { ...gone, offset: off(1.1) },
      ]
      if (off(1.1) < 1) kf.push({ ...gone, offset: 1 })
      return Array.from(el.children).map((ch, i) => ch.animate(kf, { duration: step * n, delay: i * step, iterations: Infinity, fill: 'backwards' }))
    },
    glyphs,
  )
  return (
    <span aria-hidden="true" className={BOX}>
      <span className={cn(CELL, 'ui-border ui-r ui-shadow-sm ui-tone size-[88%] bg-paper')} />
      <span ref={ref} className={cn(CELL, 'grid place-items-center')}>
        {chars.map((c, i) => (
          <span
            key={i}
            className={cn(
              CELL,
              'ui-lettering text-[calc(var(--sz)*0.52)] in-data-[style=flat]:[-webkit-text-stroke:0] in-data-[style=flat]:[text-shadow:none]',
            )}
            // without motion only the first character shows
            style={{ color: i % 2 ? 'var(--color-pop)' : 'var(--color-accent)', opacity: i ? 0 : 1 }}
          >
            {c}
          </span>
        ))}
      </span>
      <Twinkle className="fx-only absolute -top-[6%] -right-[6%] size-[30%] animate-pulse" style={at(speed, 1)} />
    </span>
  )
}

const CHASERS = [
  { color: 'bg-accent', delay: -0.7 },
  { color: 'bg-pop', delay: -1.02 },
]
const GHOSTS = [
  { lag: 0.05, opacity: 0.5, scale: 0.82 },
  { lag: 0.1, opacity: 0.3, scale: 0.66 },
  { lag: 0.15, opacity: 0.15, scale: 0.5 },
]

/** Two dots chasing each other round a track, easing in and out so they bunch and split, with afterimages. */
function Chase({ speed }: G) {
  const layer = 'relative col-start-1 row-start-1 size-full animate-[spin_1.4s_cubic-bezier(.6,.05,.4,.95)_infinite]'
  const dot = 'absolute top-[11%] left-1/2 size-[22%] -translate-x-1/2 -translate-y-1/2 rounded-full'
  return (
    <span aria-hidden="true" className="relative grid size-(--sz) shrink-0">
      <span className={cn(CELL, 'ui-border-thin m-[11%] rounded-full opacity-25')} />
      {CHASERS.map((c, ci) => (
        <span key={ci} className={cn(CELL, 'grid')}>
          {GHOSTS.map((g, gi) => (
            <span key={gi} className={cn(layer, gi && 'fx-only')} style={at(speed, 1.4, c.delay + g.lag)}>
              <span className={cn(dot, c.color)} style={{ opacity: g.opacity, scale: String(g.scale) }} />
            </span>
          ))}
          <span className={layer} style={at(speed, 1.4, c.delay)}>
            <span className={cn(dot, 'ui-border-thin ui-fill', c.color)} />
          </span>
        </span>
      ))}
    </span>
  )
}

/** Impact rays turning (manga: stepped), a counter-turning inner star and a popping core. */
function Burst({ speed }: G) {
  return (
    <span aria-hidden="true" className={BOX}>
      <svg
        viewBox="-50 -50 100 100"
        className={cn(CELL, 'size-full animate-[spin_4s_linear_infinite] overflow-visible in-data-[style=manga]:[animation-timing-function:steps(16)]')}
        style={at(speed, 4)}
      >
        <path d={RAYS_OUT} strokeLinejoin="round" className={cn('fill-accent-soft', LINE)} />
      </svg>
      <svg viewBox="-50 -50 100 100" className={cn(CELL, 'size-full animate-[spin_2s_linear_infinite] overflow-visible')} style={{ ...at(speed, 2), animationDirection: 'reverse' }}>
        <path d={RAYS_IN} className="fill-accent" />
      </svg>
      <span className={cn(CELL, 'ui-border-thin ui-fill size-[30%] animate-[pop-in_0.9s_var(--ease-snap)_infinite] rounded-full bg-pop')} style={at(speed, 0.9)} />
    </span>
  )
}

/* ═══════════════════════════ Spinner ═══════════════════════════ */

const spinner = cva('inline-flex items-center gap-3', {
  variants: {
    size: {
      sm: '[--sz:24px] text-[11px]',
      md: '[--sz:40px] text-sm',
      lg: '[--sz:64px] text-lg',
      xl: '[--sz:96px] text-xl',
    },
  },
  defaultVariants: { size: 'md' },
})

export type SpinnerVariant = 'ring' | 'dots' | 'orbit' | 'shuriken' | 'pulse' | 'bars' | 'flip' | 'clock' | 'kanji' | 'chase' | 'burst'

export type SpinnerProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  /** Preset size, or the glyph size in px. */
  size?: 'sm' | 'md' | 'lg' | 'xl' | number
  /**
   * ring     — outlined ring whose arc turns in 8 stepped frames, a sparkle riding it
   * dots     — three dots that hop, stretch and squash on landing
   * orbit    — sparkles orbiting a pulsing core
   * shuriken — spinning star blade with afterimages and swoosh trails
   * pulse    — concentric rings rippling out of a beating core
   * bars     — equalizer bars springing between levels
   * flip     — a card flipping over, squashing on each turn
   * clock    — a hand sweeping a fading wedge, the hour hand ticking
   * kanji    — characters popping in and out one at a time (see `glyphs`)
   * chase    — two dots chasing round a track with afterimages
   * burst    — impact rays turning around a popping core
   */
  variant?: SpinnerVariant
  /** Playback speed multiplier (2 = twice as fast). */
  speed?: number
  /** Visible caption; its letters ride a wave. `false` hides it. Default 読込中 (none for kanji). */
  label?: string | false
  /** Text announced by screen readers (the root is role="status"). */
  srLabel?: string
  /** Characters cycled by the kanji variant. */
  glyphs?: string
}

/** A loader with eleven kinds of motion and a waving caption; it adapts to the kit style. */
export function Spinner({
  size,
  variant = 'ring',
  label = variant === 'kanji' ? false : '読込中',
  srLabel = 'Loading',
  speed = 1,
  glyphs = '読込中',
  className,
  style,
  ...props
}: SpinnerProps) {
  const sp = Math.max(speed, 0.05)
  const px = typeof size === 'number'
  const glyph = (() => {
    switch (variant) {
      case 'dots':
        return <Dots speed={sp} />
      case 'orbit':
        return <Orbit speed={sp} />
      case 'shuriken':
        return <Shuriken speed={sp} />
      case 'pulse':
        return <Pulse speed={sp} />
      case 'bars':
        return <Bars speed={sp} />
      case 'flip':
        return <Flip speed={sp} />
      case 'clock':
        return <Clock speed={sp} />
      case 'kanji':
        return <Kanji key={glyphs} speed={sp} glyphs={glyphs || '読込中'} />
      case 'chase':
        return <Chase speed={sp} />
      case 'burst':
        return <Burst speed={sp} />
      default:
        return <Ring speed={sp} />
    }
  })()
  return (
    <span
      role="status"
      className={cn(spinner({ size: px ? undefined : size }), className)}
      style={px ? ({ '--sz': `${size}px`, ...style } as CSSProperties) : style}
      {...props}
    >
      {glyph}
      {label !== false && (
        <span aria-hidden="true" className="inline-flex font-jp leading-none tracking-widest">
          {[...label].map((ch, i) => (
            <span key={i} className="inline-block animate-[bob_.45s_ease-in-out_infinite_alternate]" style={at(sp, 0.45, i * 0.11 - 0.9)}>
              {ch}
            </span>
          ))}
        </span>
      )}
      <span className="sr-only">{srLabel}</span>
    </span>
  )
}

/* ═══════════════════════════ Spin ═══════════════════════════ */

export type SpinProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  children: ReactNode
  /**
   * spin   — continuous turn (CSS)
   * steps  — turns in `steps` held frames, like limited animation (CSS)
   * wobble — rocks back and forth
   * bounce — hops, spins a full turn in the air and lands with a squash
   * flip   — coin flip around the vertical axis
   */
  mode?: 'spin' | 'steps' | 'wobble' | 'bounce' | 'flip'
  /** 1 = one loop per second (wobble/flip slightly slower). */
  speed?: number
  direction?: 'cw' | 'ccw'
  /** Frame count for mode="steps". */
  steps?: number
  paused?: boolean
}

/**
 * Spins any child. spin/steps are plain CSS (`animate-[spin_…]`, so reduced motion is
 * handled by the stylesheet); wobble/bounce/flip are Web Animations and stay still
 * under prefers-reduced-motion. Decorative by default; label the child yourself.
 */
export function Spin({ mode = 'spin', speed = 1, direction = 'cw', steps = 8, paused = false, className, style, children, ...props }: SpinProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const sp = Math.max(speed, 0.05)
  const css = mode === 'spin' || mode === 'steps'
  const dir = direction === 'ccw' ? -1 : 1

  useLoop(
    ref,
    sp,
    (el, s) => {
      if (css) return []
      const k = s === 'flat' ? 0.55 : 1
      if (mode === 'wobble')
        return [
          el.animate([{ transform: `rotate(${-18 * k * dir}deg)` }, { transform: `rotate(${18 * k * dir}deg)` }], {
            duration: 600,
            iterations: Infinity,
            direction: 'alternate',
            easing: s === 'manga' ? 'steps(4, jump-none)' : 'ease-in-out',
          }),
        ]
      if (mode === 'flip')
        return [
          el.animate(
            [
              { transform: 'perspective(30em) rotateY(0deg)', easing: 'cubic-bezier(.5,0,.3,1)' },
              { transform: `perspective(30em) rotateY(${360 * dir}deg)`, offset: 0.7 },
              { transform: `perspective(30em) rotateY(${360 * dir}deg)` },
            ],
            { duration: 1200, iterations: Infinity },
          ),
        ]
      const sq = (x: number) => `scale(${1 + x * k}, ${1 - x * k})`
      const t = (y: number, r: number, scale: string, offset: number, easing?: string): Keyframe => ({
        transform: `translateY(${y * k}%) rotate(${r * dir}deg) ${scale}`,
        offset,
        easing,
      })
      return [
        el.animate(
          [
            t(0, 0, sq(0.18), 0, 'cubic-bezier(.2,.7,.3,1)'),
            t(-8, 20, sq(-0.1), 0.12, 'cubic-bezier(.2,.6,.4,1)'),
            t(-40, 180, sq(0), 0.45, 'cubic-bezier(.6,0,.8,.4)'),
            t(0, 360, sq(-0.08), 0.78, 'ease-out'),
            t(0, 360, sq(0.18), 0.86, POP),
            t(0, 360, sq(0), 0.94),
            t(0, 360, sq(0.18), 1),
          ],
          { duration: 1000, iterations: Infinity },
        ),
      ]
    },
    `${mode}:${direction}`,
    paused,
  )

  return (
    <span
      ref={ref}
      className={cn('inline-block', css && 'animate-[spin_1s_linear_infinite]', className)}
      style={
        css
          ? {
              animationDuration: `${1 / sp}s`,
              animationDirection: dir < 0 ? 'reverse' : undefined,
              animationTimingFunction: mode === 'steps' ? `steps(${Math.max(1, Math.round(steps))})` : undefined,
              animationPlayState: paused ? 'paused' : undefined,
              ...style,
            }
          : style
      }
      {...props}
    >
      {children}
    </span>
  )
}
