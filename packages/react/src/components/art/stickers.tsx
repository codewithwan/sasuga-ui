import { useEffect, useId, useMemo, useRef } from 'react'
import type { CSSProperties, ReactNode, RefObject, SVGProps } from 'react'
import { prefersReducedMotion } from '@/fx/engine'
import { cn } from '@/lib/utils'
import { Chibi, Mascot } from './mascot'
import type { MascotExpression } from './mascot'

/**
 * Brand stickers: hand-built inline SVG decoration in theme colours.
 * Fills come from the accent / soft / pop / paper / ink tokens, outlines follow the
 * style's line (`--ui-line`, `--ui-bw`), and the offset drop is the soft tint in cel,
 * the ink in manga and gone in flat. Every sticker is decorative (aria-hidden) unless
 * it gets a `label`.
 */

export type StickerTone = 'accent' | 'pop' | 'soft' | 'paper' | 'ink'

export type StickerProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  /** Accessible name. Without it the sticker is decorative (aria-hidden). */
  label?: string
}

const FILL: Record<StickerTone, string> = {
  accent: 'var(--color-accent)',
  pop: 'var(--color-pop)',
  soft: 'var(--color-accent-soft)',
  paper: 'var(--color-paper)',
  ink: 'var(--color-ink)',
}
/** Text classes that read on each fill (white only ever sits on accent / pop). */
const ON_TEXT: Record<StickerTone, string> = { accent: 'text-white', pop: 'text-white', soft: 'text-ink', paper: 'text-ink', ink: 'text-paper' }
/** A deep shade that stays dark in both modes (ink in light, canvas in dark). */
const DEEP = 'light-dark(var(--color-ink), var(--color-canvas))'
const shade = (tone: StickerTone, k = 72) => `color-mix(in srgb, ${FILL[tone]} ${k}%, ${DEEP})`

/** The outline: style line colour and weight, constant on screen however big the sticker is. */
const LINE = { vectorEffect: 'non-scaling-stroke', strokeLinejoin: 'round', strokeLinecap: 'round' } as const
const lineStyle = (k = 1): CSSProperties => ({ stroke: 'var(--ui-line)', strokeWidth: `calc(var(--ui-bw) * ${k})` })
/** The offset drop: soft in cel, ink in manga, hidden in flat. */
const DROP = 'fx-only fill-accent-soft in-data-[style=manga]:fill-ink'

const a11y = (label?: string) => (label ? ({ role: 'img', 'aria-label': label } as const) : ({ 'aria-hidden': true, focusable: false } as const))

const useUid = (p: string) => p + useId().replace(/[^\w-]/g, '')

/* ───────────── Geometry ───────────── */

/** Tiny seeded PRNG so the hand-drawn jitter is stable between renders. */
function prng(seed: number) {
  let s = Math.abs(Math.trunc(seed * 9973)) % 233280 || 1
  return () => (s = (s * 9301 + 49297) % 233280) / 233280
}

const f = (n: number) => n.toFixed(1)

/** A spiky burst: `n` points, alternating outer / inner radii with a little jitter. `tail` stretches one point into a pointer. */
function burstPath(cx: number, cy: number, rx: number, ry: number, n: number, depth: number, seed = 1, tail?: { at: number; k: number }) {
  const r = prng(seed)
  const pts: string[] = []
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2
    const outer = i % 2 === 0
    let k = outer ? 1 - r() * 0.16 : depth + (r() - 0.5) * 0.08
    if (tail && outer && i / 2 === tail.at) k = tail.k
    pts.push(`${f(cx + Math.cos(a) * rx * k)} ${f(cy + Math.sin(a) * ry * k)}`)
  }
  return `M${pts.join('L')}Z`
}

/** A four-point sparkle with curved sides. */
function sparklePath(x: number, y: number, r: number) {
  const k = r * 0.16
  return `M${x} ${y - r}Q${x + k} ${y - k} ${x + r} ${y}Q${x + k} ${y + k} ${x} ${y + r}Q${x - k} ${y + k} ${x - r} ${y}Q${x - k} ${y - k} ${x} ${y - r}Z`
}

/** A smooth closed blob through `n` jittered points (Catmull-Rom → cubic Bézier). */
function blobPath(cx: number, cy: number, r: number, n = 8, seed = 1, wobble = 0.22) {
  const rnd = prng(seed)
  const p = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    const k = 1 - wobble / 2 + rnd() * wobble
    return [cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k] as const
  })
  let d = `M${f(p[0][0])} ${f(p[0][1])}`
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n]
    const p1 = p[i]
    const p2 = p[(i + 1) % n]
    const p3 = p[(i + 2) % n]
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`
  }
  return `${d}Z`
}

/** Font size that keeps `text` inside `max` user units (CJK glyphs are ~1em wide, latin display ~0.72em). */
function fitSize(text: string, size: number, max: number) {
  const chars = [...text]
  const em = chars.reduce((a, c) => a + (/[　-鿿＀-￯]/.test(c) ? 0.98 : /[!?.,'’]/.test(c) ? 0.34 : 0.72), 0)
  return Math.min(size, max / Math.max(em, 0.1))
}

/** Gentle scale twinkle on `[data-tw]` children (off under reduced motion). */
function useTwinkle(ref: RefObject<SVGSVGElement | null>, on: boolean) {
  useEffect(() => {
    const root = ref.current
    if (!root || !on || prefersReducedMotion()) return
    const anims = [...root.querySelectorAll<SVGGElement>('[data-tw]')].map((el, i) =>
      el.animate([{ transform: 'scale(1)' }, { transform: 'scale(0.55)', opacity: 0.6 }, { transform: 'scale(1)' }], {
        duration: 1600 + i * 370,
        delay: i * 420,
        iterations: Infinity,
        easing: 'ease-in-out',
      }),
    )
    return () => anims.forEach((a) => a.cancel())
  }, [ref, on])
}

const TW: CSSProperties = { transformBox: 'fill-box', transformOrigin: 'center' }

/* ───────────── Logo ───────────── */

/** The brand mark: an impact star with a heart, or with a short text (`mark`, e.g. '好')
 *  stamped in its place when `mark` is anything other than 'heart'. */
export function BrandMark({ mark = 'heart', label, className, style, ...rest }: StickerProps & { mark?: string }) {
  const d = burstPath(32, 32, 30, 30, 10, 0.78, 4)
  return (
    <svg viewBox="0 0 64 64" {...a11y(label)} className={cn('block h-auto w-full overflow-visible', className)} style={style} {...rest}>
      {label && <title>{label}</title>}
      <path d={d} className={DROP} transform="translate(2.5 3)" />
      <path d={d} {...LINE} style={{ fill: FILL.accent, ...lineStyle() }} />
      {mark === 'star' ? (
        <g data-glyph="">
          <path d="M32.00 17.50L36.11 27.84L47.22 28.56L38.66 35.66L41.40 46.44L32.00 40.50L22.60 46.44L25.34 35.66L16.78 28.56L27.89 27.84Z" {...LINE} style={{ fill: '#fff', ...lineStyle() }} />
        </g>
      ) : mark === 'heart' ? (
        <g data-glyph="">
          <path
            d="M32 44.5C24 39 18.5 33.6 18.5 27.6c0-4.3 3.2-7.4 7.1-7.4 2.7 0 5 1.4 6.4 3.6 1.4-2.2 3.7-3.6 6.4-3.6 3.9 0 7.1 3.1 7.1 7.4 0 6-5.5 11.4-13.5 16.9Z"
            {...LINE}
            style={{ fill: '#fff', ...lineStyle() }}
          />
          <ellipse cx={24.6} cy={26.4} rx={2.2} ry={1.5} style={{ fill: FILL.pop }} />
        </g>
      ) : (
        <text
          data-glyph=""
          x={32}
          y={33}
          textAnchor="middle"
          dominantBaseline="central"
          className="text-white"
          style={{ fill: 'currentColor', font: '400 31px var(--font-jp)' }}
        >
          {mark}
        </text>
      )}
    </svg>
  )
}

/** Mark + wordmark: `word` followed by an accent "UI". The wordmark is real text. */
export function BrandLogo({
  word,
  suffix = 'UI',
  mark,
  className,
  markClassName,
}: {
  word: string
  /** Drawn in the accent colour; a suffix starting with "/" (like "/ui") sits flush against the word. */
  suffix?: string
  mark?: string
  className?: string
  markClassName?: string
}) {
  return (
    <span className={cn('ui-head inline-flex items-center gap-[0.35em] leading-none', className)}>
      <BrandMark mark={mark} className={cn('w-[1.45em] shrink-0', markClassName)} />
      <span>
        {word}
        {suffix.startsWith('/') ? '' : ' '}
        <span className="text-accent">{suffix}</span>
      </span>
    </span>
  )
}

/* ───────────── Bursts and lettering ───────────── */

export type ImpactStarProps = StickerProps & {
  tone?: StickerTone
  /** Number of spikes. */
  spikes?: number
  /** Optional lettering in the middle. */
  text?: string
  seed?: number
}

/** A spiky impact star, two-tone, with an optional word on it. */
export function ImpactStar({ tone = 'pop', spikes = 12, text, seed = 2, label, className, style, ...rest }: ImpactStarProps) {
  const outer = useMemo(() => burstPath(60, 60, 56, 56, spikes, 0.6, seed), [spikes, seed])
  const inner = useMemo(() => burstPath(60, 60, 34, 34, spikes, 0.62, seed + 1), [spikes, seed])
  const innerTone: StickerTone = tone === 'soft' || tone === 'paper' ? 'accent' : 'paper'
  return (
    <svg viewBox="0 0 120 120" {...a11y(label)} className={cn('block h-auto w-full overflow-visible', className)} style={style} {...rest}>
      {label && <title>{label}</title>}
      <path d={outer} className={DROP} transform="translate(4 5)" />
      <path d={outer} {...LINE} style={{ fill: FILL[tone], ...lineStyle() }} />
      <path d={inner} {...LINE} style={{ fill: FILL[innerTone], ...lineStyle(0.7), opacity: text ? 1 : 0.9 }} />
      {text && <Lettering x={60} y={62} text={text} size={fitSize(text, 34, 70)} tone={innerTone === 'paper' ? tone : 'paper'} />}
    </svg>
  )
}

/** Comic lettering in SVG: a fill, a thick ink outline behind it and an ink drop. */
function Lettering({ x, y, text, size, tone = 'accent', font = 'var(--font-jp)' }: { x: number; y: number; text: string; size: number; tone?: StickerTone; font?: string }) {
  const base: CSSProperties = { font: `400 ${size}px ${font}`, paintOrder: 'stroke fill', strokeLinejoin: 'round', stroke: 'var(--color-ink)', strokeWidth: size * 0.16 }
  return (
    <g>
      <text x={x + size * 0.07} y={y + size * 0.07} textAnchor="middle" dominantBaseline="central" className="fx-only" style={{ ...base, fill: 'var(--color-ink)' }}>
        {text}
      </text>
      <text x={x} y={y} textAnchor="middle" dominantBaseline="central" style={{ ...base, fill: FILL[tone] }}>
        {text}
      </text>
    </g>
  )
}

export type SfxStickerProps = StickerProps & {
  /** The sound effect, e.g. ドン, キラッ, バーン. Short words read best. */
  text: string
  /** Burst colour behind the lettering. */
  tone?: StickerTone
  /** Lettering colour. */
  ink?: StickerTone
  spikes?: number
  seed?: number
}

/** An onomatopoeia sticker: sound-effect lettering on a burst. */
export function SfxSticker({ text, tone = 'soft', ink = 'accent', spikes = 14, seed = 3, label, className, style, ...rest }: SfxStickerProps) {
  const d = useMemo(() => burstPath(100, 60, 96, 56, spikes, 0.74, seed), [spikes, seed])
  return (
    <svg viewBox="0 0 200 120" {...a11y(label)} className={cn('block h-auto w-full overflow-visible', className)} style={style} {...rest}>
      {label && <title>{label}</title>}
      <path d={d} className={DROP} transform="translate(5 6)" />
      <path d={d} {...LINE} style={{ fill: FILL[tone], ...lineStyle() }} />
      <Lettering x={100} y={62} text={text} size={fitSize(text, 62, 150)} tone={ink} />
    </svg>
  )
}

type PresetProps = Omit<SfxStickerProps, 'text'> & { text?: string }

/** ドン — a heavy hit. */
export const DonSticker = ({ text = 'ドン!', tone = 'pop', ink = 'paper', seed = 5, ...p }: PresetProps) => <SfxSticker text={text} tone={tone} ink={ink} seed={seed} {...p} />
/** キラッ — a sparkle, a glint. */
export const KiraSticker = ({ text = 'キラッ', tone = 'paper', ink = 'accent', seed = 8, spikes = 18, ...p }: PresetProps) => (
  <SfxSticker text={text} tone={tone} ink={ink} seed={seed} spikes={spikes} {...p} />
)
/** バーン — a big bang. */
export const BaanSticker = ({ text = 'バーン!', tone = 'accent', ink = 'paper', seed = 11, spikes = 12, ...p }: PresetProps) => (
  <SfxSticker text={text} tone={tone} ink={ink} seed={seed} spikes={spikes} {...p} />
)

/* ───────────── Bubbles (HTML text on a stretched SVG shape) ───────────── */

export type BubbleProps = {
  children: ReactNode
  /** Which way the tail points. */
  tail?: 'left' | 'right' | 'none'
  tone?: Extract<StickerTone, 'paper' | 'soft' | 'accent' | 'pop'>
  className?: string
  style?: CSSProperties
}

/**
 * A round speech bubble. The text is real HTML, so it wraps and sizes itself; the shape
 * stretches around it while the outline keeps its weight.
 */
export function SpeechBubble({ children, tail = 'left', tone = 'paper', className, style }: BubbleProps) {
  const right = tail === 'right'
  const body = 'M100 4C154 4 196 22 196 50C196 78 154 96 100 96C46 96 4 78 4 50C4 22 46 4 100 4Z'
  const t = right ? 'M128 88L162 118L148 84Z' : 'M72 88L38 118L52 84Z'
  return (
    <span
      className={cn(
        'ui-head relative isolate inline-grid place-items-center px-[1.35em] pt-[0.85em] pb-[1.55em] text-center leading-tight',
        ON_TEXT[tone],
        className,
      )}
      style={style}
    >
      <svg aria-hidden="true" viewBox="0 0 200 120" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 -z-10 size-full overflow-visible">
        <g className={DROP} transform="translate(4 5)">
          <path d={body} />
          {tail !== 'none' && <path d={t} />}
        </g>
        {tail !== 'none' && <path d={t} {...LINE} style={{ fill: FILL[tone], ...lineStyle() }} />}
        <path d={body} {...LINE} style={{ fill: FILL[tone], ...lineStyle() }} />
        {/* cover the seam where the tail meets the body */}
        {tail !== 'none' && <path d={right ? 'M130 86L152 104L146 82Z' : 'M70 86L48 104L54 82Z'} style={{ fill: FILL[tone] }} />}
      </svg>
      <span className="relative">{children}</span>
    </span>
  )
}

/** A spiky shout bubble for yelled lines. Same stretch-to-fit trick as SpeechBubble. */
export function ShoutBubble({ children, tail = 'left', tone = 'paper', className, style }: BubbleProps) {
  const at = tail === 'right' ? 7 : tail === 'left' ? 11 : -1
  const d = useMemo(() => burstPath(100, 58, 98, 56, 18, 0.8, 7, at >= 0 ? { at, k: 1.22 } : undefined), [at])
  return (
    <span
      className={cn('ui-head relative isolate inline-grid place-items-center px-[1.9em] py-[1.35em] text-center leading-tight', ON_TEXT[tone], className)}
      style={style}
    >
      <svg aria-hidden="true" viewBox="0 0 200 116" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 -z-10 size-full overflow-visible">
        <path d={d} className={DROP} transform="translate(5 6)" />
        <path d={d} {...LINE} style={{ fill: FILL[tone], ...lineStyle() }} />
      </svg>
      <span className="relative">{children}</span>
    </span>
  )
}

/** A ribbon banner with folded, notched tails. Text is HTML and sizes the ribbon. */
export function RibbonBanner({ children, tone = 'accent', className, style }: Omit<BubbleProps, 'tail'>) {
  const band = 'M22 6H178V44H22Z'
  const tailL = 'M0 16H34V56H0L10 36Z'
  const tailR = 'M200 16H166V56H200L190 36Z'
  const fold = 'M22 44L34 56V44ZM178 44L166 56V44Z'
  return (
    <span className={cn('ui-head relative isolate inline-grid place-items-center px-[2.4em] pt-[0.42em] pb-[0.95em] text-center leading-none', ON_TEXT[tone], className)} style={style}>
      <svg aria-hidden="true" viewBox="0 0 200 60" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 -z-10 size-full overflow-visible">
        <g className={DROP} transform="translate(3 4)">
          <path d={tailL} />
          <path d={tailR} />
          <path d={band} />
        </g>
        <path d={`${tailL}${tailR}`} {...LINE} style={{ fill: shade(tone, 78), ...lineStyle() }} />
        <path d={fold} {...LINE} style={{ fill: shade(tone, 52), ...lineStyle(0.8) }} />
        <path d={band} {...LINE} style={{ fill: FILL[tone], ...lineStyle() }} />
      </svg>
      <span className="relative">{children}</span>
    </span>
  )
}

/* ───────────── Small stickers ───────────── */

export type SparkleClusterProps = StickerProps & {
  /** Twinkle (scale pulse). Off under reduced motion. */
  animated?: boolean
}

/** Three sparkles and a couple of dots. */
export function SparkleCluster({ animated = true, label, className, style, ...rest }: SparkleClusterProps) {
  const ref = useRef<SVGSVGElement>(null)
  useTwinkle(ref, animated)
  const stars: [number, number, number, StickerTone][] = [
    [42, 50, 30, 'paper'],
    [80, 24, 15, 'pop'],
    [78, 76, 11, 'accent'],
  ]
  return (
    <svg ref={ref} viewBox="0 0 100 100" {...a11y(label)} className={cn('block h-auto w-full overflow-visible', className)} style={style} {...rest}>
      {label && <title>{label}</title>}
      {stars.map(([x, y, r, tone], i) => (
        <g key={i} data-tw="" style={TW}>
          <path d={sparklePath(x + 2.5, y + 3, r)} className={DROP} />
          <path d={sparklePath(x, y, r)} {...LINE} style={{ fill: FILL[tone], ...lineStyle(0.9) }} />
        </g>
      ))}
      <circle cx={16} cy={20} r={4} {...LINE} style={{ fill: FILL.soft, ...lineStyle(0.7) }} />
      <circle cx={92} cy={50} r={3} style={{ fill: FILL.accent }} />
      <circle cx={20} cy={86} r={3.4} style={{ fill: FILL.pop }} />
    </svg>
  )
}

/** One sparkle, for scattering. */
export function Sparkle({ tone = 'paper', animated = false, label, className, style, ...rest }: SparkleClusterProps & { tone?: StickerTone }) {
  const ref = useRef<SVGSVGElement>(null)
  useTwinkle(ref, animated)
  return (
    <svg ref={ref} viewBox="0 0 40 40" {...a11y(label)} className={cn('block h-auto w-full overflow-visible', className)} style={style} {...rest}>
      {label && <title>{label}</title>}
      <g data-tw="" style={TW}>
        <path d={sparklePath(21.5, 22, 17)} className={DROP} />
        <path d={sparklePath(20, 20, 17)} {...LINE} style={{ fill: FILL[tone], ...lineStyle(0.9) }} />
      </g>
    </svg>
  )
}

export type ArrowDoodleProps = StickerProps & {
  tone?: StickerTone
  /** Mirror it to point the other way. */
  flip?: 'x' | 'y' | 'both'
}

/** A loopy hand-drawn arrow, for pointing at things. */
export function ArrowDoodle({ tone = 'ink', flip, label, className, style, ...rest }: ArrowDoodleProps) {
  const sx = flip === 'x' || flip === 'both' ? -1 : 1
  const sy = flip === 'y' || flip === 'both' ? -1 : 1
  return (
    <svg viewBox="0 0 120 80" {...a11y(label)} className={cn('block h-auto w-full overflow-visible', className)} style={style} {...rest}>
      {label && <title>{label}</title>}
      <g transform={`translate(${sx < 0 ? 120 : 0} ${sy < 0 ? 80 : 0}) scale(${sx} ${sy})`} style={{ fill: 'none', stroke: FILL[tone] }}>
        <path d="M8 64C22 72 40 58 46 44C51 32 44 22 37 28C29 35 40 50 56 50C76 50 92 34 106 18" {...LINE} style={{ strokeWidth: 'calc(var(--ui-bw) * 1.1)' }} />
        <path d="M92 16L107 17L104 32" {...LINE} style={{ strokeWidth: 'calc(var(--ui-bw) * 1.1)' }} />
      </g>
    </svg>
  )
}

/** A "NEW!" price-tag sticker (any short word fits). */
export function NewTag({ text = 'NEW!', tone = 'pop', label, className, style, ...rest }: StickerProps & { text?: string; tone?: StickerTone }) {
  const d = 'M32 6H108Q114 6 114 12V52Q114 58 108 58H32L8 32Z'
  return (
    <svg viewBox="0 0 120 64" {...a11y(label)} className={cn('block h-auto w-full overflow-visible', className)} style={style} {...rest}>
      {label && <title>{label}</title>}
      <path d={d} className={DROP} transform="translate(3 4)" />
      <path d={d} {...LINE} style={{ fill: FILL[tone], ...lineStyle() }} />
      <circle cx={27} cy={32} r={5} {...LINE} style={{ fill: FILL.paper, ...lineStyle(0.8) }} />
      <text
        x={73}
        y={33}
        textAnchor="middle"
        dominantBaseline="central"
        className={ON_TEXT[tone]}
        style={{ fill: 'currentColor', font: `var(--ui-font-weight, 400) ${fitSize(text, 26, 70)}px var(--font-display)`, textTransform: 'uppercase' }}
      >
        {text}
      </text>
    </svg>
  )
}

/* ───────────── Backdrops ───────────── */

export type SpeedLinesProps = StickerProps & {
  /** focus = manga focus lines closing in on the centre, horizontal = speed streaks. */
  variant?: 'focus' | 'horizontal'
  count?: number
  seed?: number
}

/**
 * A speed-line backdrop drawn in `currentColor` (set it with a text-* class and opacity).
 * It covers its box (`slice` for focus lines, stretched for streaks).
 */
export function SpeedLines({ variant = 'focus', count, seed = 1, label, className, style, ...rest }: SpeedLinesProps) {
  const d = useMemo(() => {
    const r = prng(seed)
    let out = ''
    if (variant === 'focus') {
      const n = count ?? 56
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.06
        const w = 0.012 + r() * 0.022
        const inner = 52 + r() * 30
        const R = 160
        const p = (ang: number, rad: number) => `${f(100 + Math.cos(ang) * rad)} ${f(100 + Math.sin(ang) * rad)}`
        out += `M${p(a - w, R)}L${p(a, inner)}L${p(a + w, R)}Z`
      }
    } else {
      const n = count ?? 22
      for (let i = 0; i < n; i++) {
        const y = 6 + (i / n) * 188 + (r() - 0.5) * 6
        const x = r() * 300
        const len = 60 + r() * 180
        const h = 0.8 + r() * 2.4
        out += `M${f(x)} ${f(y)}L${f(x + len)} ${f(y - h / 2)}L${f(x + len)} ${f(y + h / 2)}Z`
        // wrap so the strip tiles seamlessly when it drifts
        if (x + len > 400) out += `M${f(x - 400)} ${f(y)}L${f(x + len - 400)} ${f(y - h / 2)}L${f(x + len - 400)} ${f(y + h / 2)}Z`
      }
    }
    return out
  }, [variant, count, seed])
  return (
    <svg
      viewBox={variant === 'focus' ? '0 0 200 200' : '0 0 400 200'}
      preserveAspectRatio={variant === 'focus' ? 'xMidYMid slice' : 'none'}
      {...a11y(label)}
      className={cn('block size-full', className)}
      style={style}
      {...rest}
    >
      {label && <title>{label}</title>}
      <path d={d} style={{ fill: 'currentColor' }} />
    </svg>
  )
}

export type ToneBlobProps = StickerProps & {
  /** Dot colour. */
  tone?: StickerTone
  /** Draw the blob's outline too. */
  outlined?: boolean
  /** The dots fade out toward one side like a gradient screentone. */
  fade?: boolean
  seed?: number
}

/** A halftone (screentone) blob: an organic shape filled with dots. */
export function ToneBlob({ tone = 'accent', outlined = false, fade = true, seed = 3, label, className, style, ...rest }: ToneBlobProps) {
  const uid = useUid('tb')
  const d = useMemo(() => blobPath(100, 100, 88, 9, seed), [seed])
  return (
    <svg viewBox="0 0 200 200" {...a11y(label)} className={cn('block h-auto w-full overflow-visible', className)} style={style} {...rest}>
      {label && <title>{label}</title>}
      <defs>
        <pattern id={`${uid}p`} width={9} height={9} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <circle cx={4.5} cy={4.5} r={2.3} style={{ fill: FILL[tone] }} />
        </pattern>
        <linearGradient id={`${uid}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity={0.08} />
        </linearGradient>
        <mask id={`${uid}m`}>
          <rect width={200} height={200} fill={fade ? `url(#${uid}g)` : '#fff'} />
        </mask>
      </defs>
      <path d={d} fill={`url(#${uid}p)`} mask={`url(#${uid}m)`} />
      {outlined && <path d={d} {...LINE} style={{ fill: 'none', ...lineStyle(0.8) }} />}
    </svg>
  )
}

/* ───────────── Film strip ───────────── */

const FRAMES: MascotExpression[] = ['neutral', 'surprised', 'angry', 'happy']

/**
 * A strip of film frames. By default Koma winds up through four keyframes; pass your own
 * `frames` (any node per frame).
 */
export function FilmStrip({ frames, label, className }: { frames?: ReactNode[]; label?: string; className?: string }) {
  const cells = frames ?? FRAMES.map((e) => <Mascot key={e} crop="face" expression={e} animated={false} />)
  const holes = Array.from({ length: cells.length * 3 + 1 }, (_, i) => <span key={i} className="h-[7px] w-[11px] shrink-0 rounded-[2px] bg-paper" />)
  return (
    <div {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })} className={cn('ui-r ui-border ui-shadow-sm inline-grid max-w-full gap-1.5 bg-ink px-2 py-1.5', className)}>
      <div className="flex justify-between gap-1 overflow-hidden">{holes}</div>
      <div className="flex gap-1.5">
        {cells.map((c, i) => (
          <div key={i} className="ui-r-sm grid aspect-[5/4] w-[clamp(52px,17vw,84px)] place-items-center overflow-hidden bg-accent-soft">
            {c}
          </div>
        ))}
      </div>
      <div className="flex justify-between gap-1 overflow-hidden">{holes}</div>
    </div>
  )
}

/* ───────────── Koma scenes ───────────── */

export type KomaSceneName = 'hello' | 'shout' | 'cheer' | 'wink'

export type KomaSceneProps = {
  scene?: KomaSceneName
  /** Replace the scene's line. */
  line?: ReactNode
  /** Idle life on Koma (blink, bounce). Off under reduced motion anyway. */
  animated?: boolean
  /** Accessible description. Without it the scene is decorative. */
  label?: string
  className?: string
}

const LINES: Record<KomaSceneName, string> = { hello: "Hi! I'm Koma.", shout: 'Let\'s go!', cheer: 'You did it!', wink: 'Looking sharp.' }

/**
 * Ready-made compositions of Koma with stickers. Square, sized by width; the bubble
 * text scales with the scene (container units).
 */
export function KomaScene({ scene = 'hello', line, animated = true, label, className }: KomaSceneProps) {
  const text = line ?? LINES[scene]
  return (
    <div
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      className={cn('@container relative isolate aspect-square w-full max-w-[360px] select-none', className)}
    >
      {scene === 'hello' && (
        <>
          <ToneBlob className="absolute top-[18%] left-[4%] -z-10 w-[70%]" seed={4} />
          <Chibi pose="idle" expression="happy" animated={animated} className="absolute bottom-[2%] left-[6%] w-[52%]" />
          <SpeechBubble tail="left" className="absolute top-[6%] right-[2%] max-w-[58%] text-[7.5cqw]">
            {text}
          </SpeechBubble>
          <SparkleCluster animated={animated} className="absolute right-[10%] bottom-[14%] w-[22%]" />
        </>
      )}
      {scene === 'shout' && (
        <>
          <div className="absolute inset-[4%] -z-10 overflow-hidden rounded-full text-ink opacity-15">
            <SpeedLines variant="focus" seed={6} />
          </div>
          <Mascot expression="angry" animated={animated} className="absolute bottom-0 left-[2%] w-[66%]" />
          <ShoutBubble tail="left" tone="pop" className="absolute top-[4%] right-0 text-[11cqw]">
            <span className="font-jp">{text}</span>
          </ShoutBubble>
        </>
      )}
      {scene === 'cheer' && (
        <>
          <ImpactStar tone="soft" className="absolute top-[8%] left-1/2 -z-10 w-[78%] -translate-x-1/2 opacity-70" spikes={16} />
          <Chibi pose="cheer" animated={animated} className="absolute bottom-[2%] left-1/2 w-[56%] -translate-x-1/2" />
          <BaanSticker className="absolute top-[2%] right-0 w-[44%]" text={typeof text === 'string' && text.length < 6 ? text : undefined} />
          <SparkleCluster animated={animated} className="absolute top-[30%] left-[2%] w-[22%]" />
          {typeof text === 'string' && text.length >= 6 && (
            <RibbonBanner className="absolute bottom-[1%] left-1/2 -translate-x-1/2 text-[7cqw] whitespace-nowrap">{text}</RibbonBanner>
          )}
        </>
      )}
      {scene === 'wink' && (
        <>
          <ToneBlob tone="pop" className="absolute top-[6%] right-[0%] -z-10 w-[64%]" seed={9} />
          <Mascot expression="wink" animated={animated} className="absolute bottom-0 left-[4%] w-[64%]" />
          <KiraSticker className="absolute top-[8%] right-[2%] w-[46%]" />
          <SpeechBubble tail="left" tone="soft" className="absolute right-[2%] bottom-[18%] max-w-[50%] text-[6.5cqw]">
            {text}
          </SpeechBubble>
        </>
      )}
    </div>
  )
}
