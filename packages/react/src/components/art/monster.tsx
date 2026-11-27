import { useEffect, useLayoutEffect, useRef } from 'react'
import type { CSSProperties, SVGProps } from 'react'
import { prefersReducedMotion } from '@/fx/engine'
import { cn } from '@/lib/utils'

/**
 * Purin (プリン), the arena's jelly slime: a wobbly pudding blob with a syrup cap and two
 * stubby horns. Body follows the theme pop colour, the cap the accent, the line the ink
 * (a deep tinted shade in dark mode, like Koma) and its weight the style (`--ui-bw`).
 * It faces left, toward whoever stands opposite.
 */
export const MONSTER_NAME = 'Purin'

export type MonsterPose = 'idle' | 'windup' | 'attack' | 'hurt' | 'ko'

export type MonsterProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  /** idle = bob, windup = squash back and tremble (the tell), attack = lunge left, hurt = flinch, ko = puddle. */
  pose?: MonsterPose
  /** Bump this number on every hit: the body flashes once. */
  hit?: number
  /** Idle bob and wind-up tremble. Always off under reduced motion. */
  animated?: boolean
  label?: string
}

/* Fixed character colours (eye whites, mouth, flash), the rest mixed from theme tokens. */
const SCLERA = '#fffdfb'
const FLASH = '#fffaf6'
const TONGUE = '#ff8b9e'

const V = {
  line: 'var(--mo-line)',
  body: 'var(--mo-body)',
  shade: 'var(--mo-shade)',
  light: 'var(--mo-light)',
  cap: 'var(--mo-cap)',
  capShade: 'var(--mo-cap-shade)',
  mouth: 'var(--mo-mouth)',
  blush: 'var(--mo-blush)',
} as const

const PAINT = {
  '--mo-line': 'light-dark(var(--color-ink), color-mix(in srgb, var(--color-pop) 16%, var(--color-canvas)))',
  '--mo-w': 'calc(var(--ui-bw, 3px) * 0.95)',
  '--mo-w2': 'calc(var(--ui-bw-thin, 2px) * 0.8)',
  '--mo-body': 'color-mix(in srgb, var(--color-pop) 58%, #fff6f0)',
  '--mo-shade': 'color-mix(in srgb, var(--mo-body) 74%, var(--mo-line))',
  '--mo-light': 'color-mix(in srgb, var(--mo-body) 30%, #fffaf6)',
  '--mo-cap': 'color-mix(in srgb, var(--color-accent) 78%, #fff6f0)',
  '--mo-cap-shade': 'color-mix(in srgb, var(--mo-cap) 70%, var(--mo-line))',
  '--mo-mouth': 'color-mix(in srgb, var(--color-pop) 40%, var(--mo-line))',
  '--mo-blush': 'color-mix(in srgb, var(--color-pop) 70%, #ffd6e0)',
  stroke: V.line,
  strokeWidth: 'var(--mo-w)',
  strokeLinejoin: 'round',
  strokeLinecap: 'round',
  fill: 'none',
} as CSSProperties

const fill = (f: string, extra?: CSSProperties): CSSProperties => ({ fill: f, ...extra })
const flat = (f: string, extra?: CSSProperties): CSSProperties => ({ fill: f, stroke: 'none', ...extra })
const thin: CSSProperties = { strokeWidth: 'var(--mo-w2)' }

/* ── shapes (160 × 150, floor at y = 140) ── */
const BODY =
  'M24 134C11 134 8 121 14 108C20 70 44 36 82 36C120 36 144 70 148 108C153 121 149 134 136 134Q128 140 119 134Q109 141 99 134Q88 140 77 134Q65 141 53 134Q38 140 24 134Z'
const CAP =
  'M34 76C44 50 62 37 82 37C104 37 124 50 134 74C128 80 122 72 118 79C113 89 106 76 100 82C94 89 88 78 82 83C76 90 68 79 62 84C55 91 49 79 44 84C39 88 35 82 34 76Z'
const SHADE = 'M124 64C142 80 148 104 142 128C134 131 126 129 119 125C131 104 132 82 124 64Z'
const HORN_L = 'M58 46C52 32 56 20 66 16C64 27 68 35 72 40Z'
const HORN_R = 'M96 40C100 30 106 23 116 21C114 31 112 39 108 45Z'
const NUB = 'M30 100C18 97 10 105 14 113C17 119 26 116 32 110Z'
const NUB_BACK = 'M134 102C146 100 152 108 148 115C145 120 138 117 134 112Z'

type Face = { eyes: 'open' | 'glare' | 'squeeze' | 'x'; mouth: 'w' | 'roar' | 'wave' | 'tongue'; brows: boolean; sweat: boolean; vein: boolean }
const FACE: Record<MonsterPose, Face> = {
  idle: { eyes: 'open', mouth: 'w', brows: false, sweat: false, vein: false },
  windup: { eyes: 'glare', mouth: 'roar', brows: true, sweat: false, vein: true },
  attack: { eyes: 'glare', mouth: 'roar', brows: true, sweat: false, vein: true },
  hurt: { eyes: 'squeeze', mouth: 'wave', brows: false, sweat: true, vein: false },
  ko: { eyes: 'x', mouth: 'tongue', brows: false, sweat: false, vein: false },
}

const POSE: Record<MonsterPose, string> = {
  idle: 'translate(0px, 0px) rotate(0deg) scale(1, 1)',
  windup: 'translate(8px, 3px) rotate(7deg) scale(1.08, 0.9)',
  attack: 'translate(-34px, -4px) rotate(-9deg) scale(0.9, 1.12)',
  hurt: 'translate(6px, 2px) rotate(6deg) scale(1.12, 0.86)',
  ko: 'translate(0px, 14px) rotate(0deg) scale(1.22, 0.58)',
}
const SPRINGY = 'transform .26s cubic-bezier(.2,1.6,.4,1)'

function Eye({ x, kind, mirror }: { x: number; kind: Face['eyes']; mirror: boolean }) {
  const s = mirror ? -1 : 1
  if (kind === 'squeeze') return <path d={`M${x - 6 * s} 80L${x + 5 * s} 86L${x - 6 * s} 92`} style={{ strokeWidth: 'calc(var(--mo-w) * 1.2)' }} />
  if (kind === 'x') return <path d={`M${x - 6} 80L${x + 6} 92M${x + 6} 80L${x - 6} 92`} style={{ strokeWidth: 'calc(var(--mo-w) * 1.1)' }} />
  const ry = kind === 'glare' ? 6.5 : 9
  return (
    <g>
      <ellipse cx={x} cy={86} rx={7.5} ry={ry} style={flat(V.line)} />
      <circle cx={x - 2.4} cy={86 - ry * 0.45} r={2.7} style={flat(SCLERA)} />
      <circle cx={x + 2.2} cy={86 + ry * 0.35} r={1.2} style={flat(SCLERA)} />
    </g>
  )
}

function Mouth({ kind }: { kind: Face['mouth'] }) {
  switch (kind) {
    case 'roar':
      return (
        <g>
          <path d="M61 101Q74 98 87 101Q85 116 74 117Q63 116 61 101Z" style={fill(V.mouth, thin)} />
          <path d="M65 101.6L67.5 106.5L70 101.2ZM78 101.2L80.5 106.5L83 101.6Z" style={flat(SCLERA)} />
        </g>
      )
    case 'wave':
      return <path d="M63 105Q67 101 71 105Q75 109 79 105Q83 101 87 105" style={thin} />
    case 'tongue':
      return (
        <g>
          <path d="M72 104Q72 114 77 114Q82 114 81.5 104Z" style={fill(TONGUE, thin)} />
          <path d="M63 104Q74 100 86 104" style={thin} />
        </g>
      )
    default:
      return (
        <g>
          <path d="M77 103.2L79 108L81 103.2Z" style={fill(SCLERA, thin)} />
          <path d="M65 102Q69.5 106.5 74 102Q78.5 106.5 83 102" style={thin} />
        </g>
      )
  }
}

/** The arena slime. Pose changes spring between shapes; `hit` flashes it white. */
export function Monster({ pose = 'idle', hit = 0, animated = true, label, className, style, ...rest }: MonsterProps) {
  const flash = useRef<SVGPathElement>(null)
  const shiver = useRef<SVGGElement>(null)
  const face = FACE[pose]
  const lively = animated && !prefersReducedMotion()

  // one white flash per hit
  const first = useRef(true)
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (prefersReducedMotion()) return
    flash.current?.animate([{ opacity: 0.95 }, { opacity: 0 }], { duration: 260, easing: 'ease-out' })
  }, [hit])

  // the tell: a growing tremble while it winds up
  useEffect(() => {
    const el = shiver.current
    if (!el || pose !== 'windup' || !lively) return
    const a = el.animate(
      [{ translate: '0 0' }, { translate: '-1.6px 0.6px' }, { translate: '1.8px -0.4px' }, { translate: '-1px -0.8px' }, { translate: '0 0' }],
      { duration: 160, iterations: Infinity },
    )
    return () => a.cancel()
  }, [pose, lively])

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 160 150"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-pose={pose}
      className={cn('block h-auto w-full overflow-visible select-none', className)}
      style={{ ...PAINT, ...style }}
      {...rest}
    >
      {label && <title>{label}</title>}
      <ellipse cx={80} cy={140} rx={pose === 'ko' ? 66 : 56} ry={5} style={flat(V.line, { opacity: 0.14, transition: 'rx .3s' })} />
      <g className={cn(lively && (pose === 'idle' || pose === 'hurt') && 'animate-bob')}>
        <g ref={shiver}>
          <g style={{ transform: POSE[pose], transformOrigin: '80px 138px', transition: SPRINGY }}>
            <path d={NUB_BACK} style={fill(V.shade)} />
            <path d={HORN_L} style={fill(V.cap)} />
            <path d={HORN_R} style={fill(V.cap)} />
            <path d={BODY} style={fill(V.body)} />
            <path d={SHADE} style={flat(V.shade)} />
            <path d={CAP} style={fill(V.cap)} />
            <path d="M118 79C113 89 106 76 100 82C108 80 112 86 118 79Z" style={flat(V.capShade)} />
            <ellipse cx={56} cy={64} rx={9} ry={5} transform="rotate(-32 56 64)" style={flat(V.light, { opacity: 0.85 })} />
            <ellipse cx={46} cy={112} rx={4} ry={7} transform="rotate(18 46 112)" style={flat(V.light, { opacity: 0.6 })} />
            <path d={NUB} style={fill(V.body)} />

            {/* face, shifted left: it looks at its opponent */}
            <ellipse cx={47} cy={98} rx={6.5} ry={3.6} style={flat(V.blush, { opacity: pose === 'ko' ? 0.35 : 0.75 })} />
            <ellipse cx={101} cy={98} rx={6.5} ry={3.6} style={flat(V.blush, { opacity: pose === 'ko' ? 0.35 : 0.75 })} />
            <Eye x={60} kind={face.eyes} mirror={false} />
            <Eye x={89} kind={face.eyes} mirror />
            {face.brows && <path d="M49 70L68 77M100 70L81 77" style={{ strokeWidth: 'calc(var(--mo-w) * 1.15)' }} />}
            <Mouth kind={face.mouth} />
            {face.sweat && <path d="M112 62Q118 70 114 75Q108 77 108 71Q108 67 112 62Z" style={fill(SCLERA, thin)} />}
            {face.vein && <path d="M118 46Q123 51 128 46M118 56Q123 51 128 56" style={{ stroke: 'var(--color-pop)', strokeWidth: 'var(--mo-w)' }} />}

            <path ref={flash} d={BODY} style={flat(FLASH, { opacity: 0 })} />
          </g>
        </g>
      </g>
    </svg>
  )
}
