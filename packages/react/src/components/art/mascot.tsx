import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode, RefObject, SVGProps } from 'react'
import { prefersReducedMotion } from '@/fx/engine'
import { cn } from '@/lib/utils'

/**
 * The kit's mascot: Koma. A koma (コマ) is one drawn frame of animation, and one panel
 * of a manga page, which is everything this kit is made of.
 * Hair follows the theme accent, eyes / ribbon / clip follow the pop colour, the line
 * follows the ink and its weight follows the style (`--ui-bw`).
 */
export const MASCOT_NAME = 'Koma'

export type MascotExpression = 'neutral' | 'happy' | 'surprised' | 'angry' | 'hurt' | 'wink' | 'smug'

export type MascotColors = {
  /** Hair. Default: the theme accent. */
  hair?: string
  /** Irises. Default: the theme pop colour. */
  eyes?: string
  /** Hoodie (and socks). Default: a cream tinted by the accent. */
  outfit?: string
  /** Sailor collar, skirt and shoes. Default: a deep shade of the accent. */
  trim?: string
  /** Ribbon, hair ties and the star clip. Default: the theme pop colour. */
  ribbon?: string
}

/* ───────────── Palette ─────────────
   Skin and the eye whites are fixed character colours; everything else is mixed from
   the theme tokens, so she recolours with data-theme. In dark mode the ink token turns
   light, so the drawing line falls back to a deep accent-tinted shade instead. */
const SKIN = '#ffe5d6'
const SKIN_SHADE = '#f6c0ab'
const BLUSH = '#ff8aa2'
const SCLERA = '#fffdfb'
const SHINE = '#fffefb'
const MOUTH = '#a02f4c'
const TONGUE = '#ff8b9e'
const TEAR = '#c8ebff'

const V = {
  line: 'var(--m-line)',
  hair: 'var(--m-hair)',
  hairShade: 'var(--m-hair-shade)',
  hairDeep: 'var(--m-hair-deep)',
  hairLight: 'var(--m-hair-light)',
  eye: 'var(--m-eye)',
  eyeDark: 'var(--m-eye-dark)',
  eyeLight: 'var(--m-eye-light)',
  outfit: 'var(--m-outfit)',
  outfitShade: 'var(--m-outfit-shade)',
  trim: 'var(--m-trim)',
  pop: 'var(--m-pop)',
  popShade: 'var(--m-pop-shade)',
} as const

const W = 'var(--m-w)'
const W2 = 'var(--m-w2)'
const thick = (k: number) => `calc(var(--m-w) * ${k})`

function paint(c: MascotColors): CSSProperties {
  return {
    '--m-line': 'light-dark(var(--color-ink), color-mix(in srgb, var(--color-accent) 16%, var(--color-canvas)))',
    '--m-w': 'calc(var(--ui-bw, 3px) * 0.9)',
    '--m-w2': 'calc(var(--ui-bw-thin, 2px) * 0.75)',
    '--m-hair': c.hair ?? 'var(--color-accent)',
    '--m-hair-shade': 'color-mix(in srgb, var(--m-hair) 74%, var(--m-line))',
    '--m-hair-deep': 'color-mix(in srgb, var(--m-hair) 40%, var(--m-line))',
    '--m-hair-light': 'color-mix(in srgb, var(--m-hair) 42%, #fff6ee)',
    '--m-eye': c.eyes ?? 'var(--color-pop)',
    '--m-eye-dark': 'color-mix(in srgb, var(--m-eye) 42%, var(--m-line))',
    '--m-eye-light': 'color-mix(in srgb, var(--m-eye) 38%, #fffaf2)',
    '--m-outfit': c.outfit ?? 'color-mix(in srgb, var(--color-accent) 9%, #fffaf4)',
    '--m-outfit-shade': 'color-mix(in srgb, var(--m-outfit) 76%, var(--m-hair))',
    '--m-trim': c.trim ?? 'color-mix(in srgb, var(--color-accent) 52%, var(--m-line))',
    '--m-pop': c.ribbon ?? 'var(--color-pop)',
    '--m-pop-shade': 'color-mix(in srgb, var(--m-pop) 70%, var(--m-line))',
    stroke: V.line,
    strokeWidth: W,
    strokeLinejoin: 'round',
    strokeLinecap: 'round',
    fill: 'none',
  } as CSSProperties
}

const fill = (f: string, extra?: CSSProperties): CSSProperties => ({ fill: f, ...extra })
const flat = (f: string, extra?: CSSProperties): CSSProperties => ({ fill: f, stroke: 'none', ...extra })
const ORIGIN_TOP: CSSProperties = { transformBox: 'fill-box', transformOrigin: '50% 0%' }

/* ───────────── Shapes (bust space: 200 × 220, face centred on x = 100) ───────────── */

const FACE = 'M51 82C50.5 104 60.5 121 79 133C89 139.6 96 142.2 100 142.2C104 142.2 111 139.6 121 133C139.5 121 149.5 104 149 82C148 44 52 44 51 82Z'
const BANGS =
  'M44 100C38 56 64 24 100 24C136 24 162 56 156 100Q151 86 145 74Q144 84 139 90Q134 77 128 64Q124 79 117 86Q113 72 110 60Q106 74 100 82Q97 70 93 58Q88 74 82 85Q80 73 76 63Q71 76 63 84Q61 75 58 70Q52 84 44 100Z'
const BACK_HAIR =
  'M100 22C56 22 32 54 32 98C32 128 30 150 25 172C35 170 43 166 50 160C50 168 52 174 56 178L144 178C148 174 150 168 150 160C157 166 165 170 175 172C170 150 168 128 168 98C168 54 144 22 100 22Z'
const LOCK = 'M54 72C45 88 41 108 42.5 130C44 152 38 174 31 196C41 192 46.5 185 50 176C51 185 54.5 191 59.5 195C57.5 174 62 150 59.5 126C57.5 110 56 96 60 80Z'
const AHOGE = 'M101 27C97.5 14 105 3 119.5 4.5C110 8.5 106 15 106.5 26Z'
const SPARKLE = (x: number, y: number, r: number) => {
  const k = r * 0.16
  return `M${x} ${y - r}Q${x + k} ${y - k} ${x + r} ${y}Q${x + k} ${y + k} ${x} ${y + r}Q${x - k} ${y + k} ${x - r} ${y}Q${x - k} ${y - k} ${x} ${y - r}Z`
}

/* eye, in its own space: centre 0,0, outer corner toward -x (mirrored for the right eye) */
const SCLERA_D = 'M-15 -4C-11 -11 2 -14 13 -9C15 -3 14 6 9 11C3 15 -6 15 -11 10C-14 6 -16 1 -15 -4Z'
const LASH =
  'M-19 0.5C-16 -8.5 -6 -14.5 5 -14C10.5 -13.6 14.6 -11.2 16.8 -7.6C17.4 -6.4 16.2 -5.2 14.8 -6C9.6 -10.4 0 -11.6 -7.4 -8.8C-11.6 -7 -14.4 -4 -15.6 0.2Z'
const FLICK = 'M-15.2 -2.6C-18 -3.4 -20.4 -5.6 -22 -8.6C-21.4 -4.6 -19.8 -1.4 -17.6 1.2Z'

type EyeKind = 'open' | 'wide' | 'glare' | 'lidded' | 'arc' | 'squeeze'

type Look = {
  eyes: [EyeKind, EyeKind]
  /** brow paths in eye space: [viewer's left, viewer's right] */
  brows: [string, string]
  /** iris shift in px (positive = toward the viewer's right) */
  gaze?: number
  blush: number
}

const BROW = {
  calm: 'M-12 -21Q-1 -25.5 11 -21.5',
  up: 'M-12 -23.5Q-1 -29 11 -24.5',
  high: 'M-12 -27.5Q-1 -33 11 -28.5',
  cross: 'M-12.5 -26Q0 -24.5 11 -17.5',
  worry: 'M-12 -19Q0 -21 11 -27',
  flat: 'M-12 -20.5Q-1 -22 11 -19.5',
}

const LOOKS: Record<MascotExpression, Look> = {
  neutral: { eyes: ['open', 'open'], brows: [BROW.calm, BROW.calm], blush: 0.4 },
  happy: { eyes: ['arc', 'arc'], brows: [BROW.up, BROW.up], blush: 0.62 },
  surprised: { eyes: ['wide', 'wide'], brows: [BROW.high, BROW.high], blush: 0.3 },
  angry: { eyes: ['glare', 'glare'], brows: [BROW.cross, BROW.cross], blush: 0.5 },
  hurt: { eyes: ['squeeze', 'squeeze'], brows: [BROW.worry, BROW.worry], blush: 0.55 },
  wink: { eyes: ['open', 'arc'], brows: [BROW.calm, BROW.up], blush: 0.6 },
  smug: { eyes: ['lidded', 'lidded'], brows: [BROW.flat, BROW.up], gaze: 2.4, blush: 0.5 },
}

const EYE_L = { x: 80, y: 101 }
const EYE_R = { x: 120, y: 101 }

function Eye({ x, y, side, kind, gaze = 0, uid }: { x: number; y: number; side: 1 | -1; kind: EyeKind; gaze?: number; uid: string }) {
  const t = `translate(${x} ${y}) scale(${side} 1)`
  if (kind === 'arc') {
    return (
      <g transform={t}>
        <path d="M-14.5 4Q-1 -10.5 13.5 3" style={{ strokeWidth: thick(1.2) }} />
        <path d="M-14.5 4L-19 1.5" />
      </g>
    )
  }
  if (kind === 'squeeze') {
    return (
      <g transform={t}>
        <path d="M-11.5 -7.5L8.5 0L-11.5 7.5" style={{ strokeWidth: thick(1.25) }} />
      </g>
    )
  }
  const r = kind === 'wide' ? 0.7 : kind === 'glare' ? 0.84 : 1
  const gx = gaze * side
  const cx = 1 + gx
  return (
    <g data-blink="" style={{ transformBox: 'fill-box', transformOrigin: '50% 62%' }}>
      <g transform={t}>
        <path d={SCLERA_D} style={flat(SCLERA)} />
        <g clipPath={`url(#${uid}-eye)`} style={{ stroke: 'none' }}>
          <ellipse cx={cx} cy={1.5} rx={10.2 * r} ry={12.6 * r} style={{ fill: `url(#${uid}-iris)` }} />
          <ellipse cx={cx} cy={0.6} rx={4.8 * r} ry={6.6 * r} style={fill(V.eyeDark, { opacity: 0.9 })} />
          <ellipse cx={cx} cy={1.5 + 8.2 * r} rx={6.8 * r} ry={3.4 * r} style={fill(V.eyeLight, { opacity: 0.9 })} />
          <ellipse cx={cx} cy={1.5} rx={10.2 * r} ry={12.6 * r} style={{ fill: 'none', stroke: V.eyeDark, strokeWidth: W2 }} />
          <path d="M-18 -17H18V-5C6 -10.5 -6 -10.5 -18 -2.5Z" style={fill(V.line, { opacity: 0.28 })} />
        </g>
        {kind === 'glare' && (
          <>
            <path d="M-22 -18H19V-1.5C8 -6.5 -7 -9.5 -22 -5.5Z" style={flat(SKIN)} />
            <path d="M-18.5 -5C-7 -9.5 6 -7 16.5 -1.5" style={{ strokeWidth: thick(1.25) }} />
            <path d="M-17.5 -5.5L-22 -9" />
          </>
        )}
        {kind === 'lidded' && (
          <>
            <path d="M-22 -18H19V-3.2C8 -4.6 -8 -4.6 -22 -2Z" style={flat(SKIN)} />
            <path d="M-18.5 -2C-8 -4.8 6 -4.8 16.5 -2.8" style={{ strokeWidth: thick(1.25) }} />
            <path d="M-17.5 -2.4L-22 -5.6" />
          </>
        )}
        {(kind === 'open' || kind === 'wide') && (
          <>
            <path d={LASH} style={flat(V.line)} />
            <path d={FLICK} style={flat(V.line)} />
          </>
        )}
        <path d="M-9.5 12.8Q0 15.6 7.5 11.6" style={{ strokeWidth: W2, opacity: 0.7 }} />
      </g>
      {/* highlights stay on the same side for both eyes: one light source */}
      {kind !== 'lidded' && (
        <ellipse cx={x - 4 + gaze} cy={y - 3.5 * r} rx={3.4 * r} ry={4.5 * r} transform={`rotate(-24 ${x - 4 + gaze} ${y - 3.5 * r})`} style={flat(SHINE)} />
      )}
      <circle cx={x + 4.2 + gaze} cy={y + 6 * r} r={1.8 * r} style={flat(SHINE)} />
      {kind === 'wide' && <circle cx={x - 6 + gaze} cy={y + 4} r={1} style={flat(SHINE)} />}
    </g>
  )
}

type MouthSet = { closed: ReactNode; open: ReactNode }

const OPEN_SMALL = (
  <>
    <path d="M94.5 124.6Q100 123.8 105.5 124.6Q104.5 131.4 100 131.8Q95.5 131.4 94.5 124.6Z" style={fill(MOUTH, { strokeWidth: W2 })} />
    <path d="M96.4 129.6Q100 127.6 103.6 129.6Q100 132 96.4 129.6Z" style={flat(TONGUE)} />
  </>
)
const OPEN_SMILE = (
  <>
    <path d="M91.5 123.2Q100 125.4 108.5 123.2Q107 133.6 100 134.2Q93 133.6 91.5 123.2Z" style={fill(MOUTH, { strokeWidth: W2 })} />
    <path d="M94.6 130.6Q100 127.4 105.4 130.6Q103 133.8 100 134Q97 133.8 94.6 130.6Z" style={flat(TONGUE)} />
    <path d="M93 124.4Q100 126.2 107 124.4L106.6 126Q100 127.6 93.4 126Z" style={flat(SCLERA)} />
  </>
)

const MOUTHS: Record<MascotExpression, MouthSet> = {
  neutral: { closed: <path d="M95.5 126Q100 128.8 104.5 126" style={{ strokeWidth: W2 }} />, open: OPEN_SMALL },
  happy: { closed: OPEN_SMILE, open: OPEN_SMILE },
  surprised: {
    closed: (
      <>
        <ellipse cx={100} cy={128.4} rx={4.2} ry={5.4} style={fill(MOUTH, { strokeWidth: W2 })} />
        <path d="M97.2 131Q100 129.4 102.8 131Q100 133.4 97.2 131Z" style={flat(TONGUE)} />
      </>
    ),
    open: (
      <>
        <ellipse cx={100} cy={128.4} rx={5} ry={6.4} style={fill(MOUTH, { strokeWidth: W2 })} />
        <path d="M96.6 131.4Q100 129.6 103.4 131.4Q100 134.4 96.6 131.4Z" style={flat(TONGUE)} />
      </>
    ),
  },
  angry: {
    closed: <path d="M94.5 129.2Q100 123.4 105.5 129.2" style={{ strokeWidth: W2 }} />,
    open: (
      <>
        <path d="M91 123Q100 121.4 109 123Q106.6 134 100 134.6Q93.4 134 91 123Z" style={fill(MOUTH, { strokeWidth: W2 })} />
        <path d="M95 130.8Q100 128.4 105 130.8Q102.6 134 100 134.2Q97.4 134 95 130.8Z" style={flat(TONGUE)} />
        <path d="M93.4 123.2L95.2 127.4L97 122.8Z" style={flat(SCLERA)} />
        <path d="M106.6 123.2L104.8 127.4L103 122.8Z" style={flat(SCLERA)} />
      </>
    ),
  },
  hurt: {
    closed: <path d="M92.5 128Q95 125.4 97.5 128Q100 130.6 102.5 128Q105 125.4 107.5 128" style={{ strokeWidth: W2 }} />,
    open: (
      <>
        <path d="M92.5 126Q96 123.4 100 125Q104 123.4 107.5 126Q106.4 132.6 100 132.8Q93.6 132.6 92.5 126Z" style={fill(MOUTH, { strokeWidth: W2 })} />
        <path d="M94 126.6Q97 125 100 126.2Q103 125 106 126.6L105.6 128Q100 129.2 94.4 128Z" style={flat(SCLERA)} />
      </>
    ),
  },
  wink: {
    closed: (
      <>
        <path d="M100.6 127.8Q104.8 127.2 104.4 131Q102.4 133 100.8 130.6Z" style={fill(TONGUE, { strokeWidth: W2 })} />
        <path d="M94 125.4Q100 129.6 106 125.4" style={{ strokeWidth: W2 }} />
      </>
    ),
    open: OPEN_SMILE,
  },
  smug: {
    closed: <path d="M93.5 126Q96.8 129.8 100 126.4Q103.2 129.8 106.5 126" style={{ strokeWidth: W2 }} />,
    open: OPEN_SMALL,
  },
}

function Defs({ uid }: { uid: string }) {
  return (
    <defs>
      <linearGradient id={`${uid}-iris`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style={{ stopColor: V.eyeDark }} />
        <stop offset="0.55" style={{ stopColor: V.eye }} />
        <stop offset="1" style={{ stopColor: V.eyeLight }} />
      </linearGradient>
      <clipPath id={`${uid}-eye`}>
        <path d={SCLERA_D} />
      </clipPath>
      <clipPath id={`${uid}-face`}>
        <path d={FACE} />
      </clipPath>
    </defs>
  )
}

/* ───────────── Head parts (shared by the bust and the chibi) ───────────── */

function HairBack() {
  return (
    <g data-sway="0.9" style={ORIGIN_TOP}>
      <path d={BACK_HAIR} style={fill(V.hairShade)} />
      <path d="M48 120Q46 146 40 164M152 120Q154 146 160 164" style={{ stroke: V.hairDeep, strokeWidth: W2, opacity: 0.6 }} />
    </g>
  )
}

/* the eyes blink-swap a beat behind the rest of the face, so they can take their own expression */
const EYE_BOX: CSSProperties = { transformBox: 'fill-box', transformOrigin: '50% 60%' }

function Face({ expression, eyes, talking, uid }: { expression: MascotExpression; eyes?: MascotExpression; talking: boolean; uid: string }) {
  const look = LOOKS[expression]
  const eyeLook = LOOKS[eyes ?? expression]
  const mouth = MOUTHS[expression]
  return (
    <g>
      <path d={FACE} style={fill(SKIN)} />
      {/* bangs cast a soft cel shadow on the forehead */}
      <g clipPath={`url(#${uid}-face)`}>
        <path d={BANGS} transform="translate(0 6)" style={flat(SKIN_SHADE)} />
        <path d="M60 132Q100 150 140 132L140 150L60 150Z" style={flat(SKIN_SHADE, { opacity: 0.5 })} />
      </g>
      {/* blush */}
      <g style={{ opacity: look.blush }}>
        <ellipse cx={70} cy={119} rx={9} ry={4.4} style={flat(BLUSH, { opacity: 0.75 })} />
        <ellipse cx={130} cy={119} rx={9} ry={4.4} style={flat(BLUSH, { opacity: 0.75 })} />
        <path d="M66 116.8l-2 4.4M71 116.8l-2 4.4M76 116.8l-2 4.4M126 116.8l-2 4.4M131 116.8l-2 4.4M136 116.8l-2 4.4" style={{ stroke: BLUSH, strokeWidth: W2 }} />
      </g>
      <g data-eye="" style={EYE_BOX}>
        <Eye {...EYE_L} side={1} kind={eyeLook.eyes[0]} gaze={eyeLook.gaze} uid={uid} />
      </g>
      <g data-eye="" style={EYE_BOX}>
        <Eye {...EYE_R} side={-1} kind={eyeLook.eyes[1]} gaze={eyeLook.gaze} uid={uid} />
      </g>
      <path d="M100.8 116.4l-1.4 2.4" style={{ strokeWidth: W2, opacity: 0.55 }} />
      <g data-mouth="" style={{ transformBox: 'fill-box', transformOrigin: '50% 15%' }}>
        {talking ? mouth.open : mouth.closed}
      </g>
    </g>
  )
}

function HairFront() {
  return (
    <g>
      <g data-sway="7" style={{ transformBox: 'fill-box', transformOrigin: '15% 100%' }}>
        <path d={AHOGE} style={fill(V.hair)} />
      </g>
      <g data-sway="2.4" style={ORIGIN_TOP}>
        <path d={LOCK} style={fill(V.hair)} />
        <path d="M51 90Q45.5 116 47.5 142M55 160Q53 176 47 186" style={{ stroke: V.hairShade, strokeWidth: W2 }} />
          <path d="M47.5 98Q46 108 46.2 116" style={{ stroke: V.hairLight, strokeWidth: thick(0.9) }} />
        <path d="M41.6 146Q51 150.6 59.6 146.4L59.4 154.6Q51 158.6 41.4 154Z" style={fill(V.pop, { strokeWidth: W2 })} />
      </g>
      <g data-sway="-2.4" style={ORIGIN_TOP}>
        <g transform="translate(200 0) scale(-1 1)">
          <path d={LOCK} style={fill(V.hair)} />
          <path d="M51 90Q45.5 116 47.5 142M55 160Q53 176 47 186" style={{ stroke: V.hairShade, strokeWidth: W2 }} />
          <path d="M47.5 98Q46 108 46.2 116" style={{ stroke: V.hairLight, strokeWidth: thick(0.9) }} />
          <path d="M41.6 146Q51 150.6 59.6 146.4L59.4 154.6Q51 158.6 41.4 154Z" style={fill(V.pop, { strokeWidth: W2 })} />
        </g>
      </g>
      <path d={BANGS} style={fill(V.hair)} />
      {/* angel ring highlight + clump separations */}
      <path
        d="M62 52Q80 36 100 34Q120 36 138 52L133 54L128 47L122 53L114 45L107 51L100 44L93 51L86 45L78 53L72 47L67 55Z"
        style={flat(V.hairLight, { opacity: 0.85 })}
      />
      <path d="M110 60Q108.6 50 112 42M93 58Q92 50 95.4 42M128 64Q126.4 56 123 48M76 63Q77 55 81.4 49M145 74Q142 64 137 57" style={{ stroke: V.hairShade, strokeWidth: W2 }} />
      {/* star clip */}
      <path d={SPARKLE(139, 59, 9.5)} style={fill(V.pop, { strokeWidth: W2 })} />
      <path d={SPARKLE(149.5, 70, 4.6)} style={fill(V.pop, { strokeWidth: W2 })} />
    </g>
  )
}

function Brows({ expression }: { expression: MascotExpression }) {
  const [l, r] = LOOKS[expression].brows
  const s: CSSProperties = { stroke: V.hairDeep, strokeWidth: thick(0.95) }
  return (
    <g>
      <path d={l} transform={`translate(${EYE_L.x} ${EYE_L.y})`} style={s} />
      <path d={r} transform={`translate(${EYE_R.x} ${EYE_R.y}) scale(-1 1)`} style={s} />
    </g>
  )
}

const DROP = (x: number, y: number, s: number) => `M${x} ${y - 6 * s}C${x + 3.6 * s} ${y - 1 * s} ${x + 4.2 * s} ${y + 2 * s} ${x + 4.2 * s} ${y + 3 * s}A${4.2 * s} ${4.2 * s} 0 0 1 ${x - 4.2 * s} ${y + 3 * s}C${x - 4.2 * s} ${y + 2 * s} ${x - 3.6 * s} ${y - 1 * s} ${x} ${y - 6 * s}Z`

const MARK_BOX: CSSProperties = { transformBox: 'fill-box', transformOrigin: '50% 50%' }

/**
 * Manga marks: anger cross, sweat, tears, plus a sparkle that only flashes when she
 * turns happy or winks. Each pops when the expression changes (see useSwap).
 */
function Marks({ expression }: { expression: MascotExpression }) {
  return (
    <g>
      <g data-mark="" style={MARK_BOX}>
        <MarkShape expression={expression} />
      </g>
      <g data-sparkle="" style={{ ...MARK_BOX, opacity: 0 }}>
        <path d={SPARKLE(156, 42, 9)} style={fill(V.pop, { strokeWidth: W2 })} />
        <path d={SPARKLE(167, 58, 4.4)} style={fill(V.pop, { strokeWidth: W2 })} />
        <path d={SPARKLE(146, 30, 3.4)} style={flat(V.pop)} />
      </g>
    </g>
  )
}

function MarkShape({ expression }: { expression: MascotExpression }) {
  if (expression === 'angry') {
    const arc = 'M-8 -2.6Q-2.6 -2.6 -2.6 -8'
    return (
      <g transform="translate(150 40)" style={{ stroke: V.pop, strokeWidth: thick(1.1) }}>
        {[0, 90, 180, 270].map((a) => (
          <path key={a} d={arc} transform={`rotate(${a})`} />
        ))}
      </g>
    )
  }
  if (expression === 'surprised') return <path d={DROP(152, 76, 1.3)} style={fill(TEAR, { strokeWidth: W2 })} />
  if (expression === 'hurt') {
    return (
      <g style={{ strokeWidth: W2 }}>
        <path d={DROP(62, 112, 0.9)} style={fill(TEAR)} />
        <path d={DROP(139, 113, 0.75)} style={fill(TEAR)} />
        <path d={DROP(153, 74, 1.2)} style={fill(TEAR)} />
      </g>
    )
  }
  return null
}

/* ───────────── Idle life: blink, breathe, sway, talk ───────────── */

function useLife(ref: RefObject<SVGGElement | null>, animated: boolean, talking: boolean, expression: MascotExpression) {
  useEffect(() => {
    const el = ref.current
    if (!el || !animated || prefersReducedMotion()) return
    const anims: Animation[] = []
    const loop = { direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' } as const
    el.querySelectorAll<SVGGElement>('[data-sway]').forEach((n, i) => {
      const a = Number(n.dataset.sway) || 1
      anims.push(n.animate([{ transform: `rotate(${-a}deg)` }, { transform: `rotate(${a}deg)` }], { ...loop, duration: 2300 + i * 330, delay: -i * 470 }))
    })
    el.querySelectorAll<SVGGElement>('[data-breathe]').forEach((n) => {
      const head = n.dataset.breathe === 'head'
      anims.push(n.animate([{ transform: 'translateY(0px)' }, { transform: `translateY(${head ? -1.8 : -0.9}px)` }], { ...loop, duration: 1800, delay: head ? 160 : 0 }))
    })
    el.querySelectorAll<SVGGElement>('[data-bob]').forEach((n) => {
      anims.push(n.animate([{ transform: 'translateY(0px) scale(1.025, 0.975)' }, { transform: 'translateY(-2.5px) scale(0.985, 1.015)' }], { ...loop, duration: 640 }))
    })
    let timer = 0
    const blink = () => {
      const twice = Math.random() < 0.22
      const shut = { transform: 'scaleY(0.08)' }
      const open = { transform: 'scaleY(1)' }
      el.querySelectorAll<SVGGElement>('[data-blink]').forEach((n) =>
        n.animate(twice ? [open, shut, open, shut, open] : [open, shut, open], { duration: twice ? 380 : 170, easing: 'ease-in-out' }),
      )
      timer = window.setTimeout(blink, 2200 + Math.random() * 3400)
    }
    timer = window.setTimeout(blink, 900 + Math.random() * 2200)
    return () => {
      window.clearTimeout(timer)
      anims.forEach((a) => a.cancel())
    }
  }, [ref, animated])

  useEffect(() => {
    const m = ref.current?.querySelector<SVGGElement>('[data-mouth]')
    if (!m || !talking || prefersReducedMotion()) return
    const a = m.animate([{ transform: 'scaleY(0.3)' }, { transform: 'scaleY(1.05)' }], { duration: 135, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' })
    return () => a.cancel()
  }, [ref, talking, expression])
}

/* ───────────── Expression change: squash-and-pop, blink-swap, mark pop ───────────── */

const POP = 'cubic-bezier(.2,1.6,.4,1)'
const SHUT_MS = 90
/** The head pivots around the chin, in head (bust) space. */
const HEAD_POP: CSSProperties = { transformOrigin: '100px 142px' }

/**
 * Returns the expression the eyes should draw. On a change the head squashes and pops,
 * the old eyes shut, the new ones open with an overshoot, and the mark for the new face
 * (sparkle, sweat, anger cross) pops in. Reduced motion or `animated={false}`: instant.
 */
const openEyes = (root: SVGGElement | null) =>
  root?.querySelectorAll<SVGGElement>('[data-eye]').forEach((n) => {
    n.getAnimations().forEach((a) => a.cancel())
    n.animate([{ transform: 'scaleY(.08)' }, { transform: 'scaleY(1.15)', offset: 0.6 }, { transform: 'scaleY(1)' }], { duration: 200, easing: POP })
  })

function useSwap(ref: RefObject<SVGGElement | null>, expression: MascotExpression, animated: boolean): MascotExpression {
  const [eyes, setEyes] = useState(expression)
  const shownEyes = useRef(expression)
  const prev = useRef(expression)
  const reopen = useRef(false)
  const still = !animated || prefersReducedMotion()

  useEffect(() => {
    if (prev.current === expression) return
    prev.current = expression
    const el = ref.current
    if (!el || still) {
      setEyes(expression)
      return
    }
    el.querySelectorAll<SVGGElement>('[data-pop]').forEach((n) =>
      n.animate(
        [
          { transform: 'scale(1)' },
          { transform: 'scale(1.09, .88)', offset: 0.22 },
          { transform: 'scale(.95, 1.07)', offset: 0.55 },
          { transform: 'scale(1.015, .99)', offset: 0.8 },
          { transform: 'scale(1)' },
        ],
        { duration: 440, easing: 'ease-out' },
      ),
    )
    el.querySelectorAll<SVGGElement>('[data-eye]').forEach((n) =>
      n.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(.08)' }], { duration: SHUT_MS, easing: 'ease-in', fill: 'forwards' }),
    )
    el.querySelectorAll<SVGGElement>('[data-mark]').forEach((n) =>
      n.animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.35)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)', opacity: 1 }], {
        duration: 380,
        delay: 120,
        easing: POP,
        fill: 'backwards',
      }),
    )
    if (expression === 'happy' || expression === 'wink') {
      el.querySelectorAll<SVGGElement>('[data-sparkle]').forEach((n) =>
        n.animate(
          [
            { transform: 'scale(0) rotate(-30deg)', opacity: 0 },
            { transform: 'scale(1.3) rotate(8deg)', opacity: 1, offset: 0.35 },
            { transform: 'scale(1) rotate(0deg)', opacity: 1, offset: 0.7 },
            { transform: 'scale(.6)', opacity: 0 },
          ],
          { duration: 760, delay: 100, easing: 'ease-out' },
        ),
      )
    }
    const t = window.setTimeout(() => {
      // changed back before the swap landed: same eyes, just open them again
      if (shownEyes.current === expression) return openEyes(el)
      reopen.current = true
      setEyes(expression)
    }, SHUT_MS)
    return () => window.clearTimeout(t)
  }, [ref, expression, still])

  // the new eyes open with a little overshoot
  useLayoutEffect(() => {
    shownEyes.current = eyes
    if (!reopen.current) return
    reopen.current = false
    openEyes(ref.current)
  }, [ref, eyes])

  return still ? expression : eyes
}

const useUid = () => 'm' + useId().replace(/[^\w-]/g, '')

const a11y = (label?: string) =>
  label ? ({ role: 'img', 'aria-label': label } as const) : ({ 'aria-hidden': true, focusable: false } as const)

/* ───────────── Mascot: the bust portrait ───────────── */

export type MascotProps = Omit<SVGProps<SVGSVGElement>, 'children'> &
  MascotColors & {
    expression?: MascotExpression
    /** Flap the mouth (a dialogue line is typing). */
    talking?: boolean
    /** Idle life: blinking, breathing and hair sway. Always off under reduced motion. */
    animated?: boolean
    /** `bust` = head and shoulders (200 × 220), `face` = a square crop for avatars. */
    crop?: 'bust' | 'face'
    /** Accessible name. Without it the art is decorative (aria-hidden). */
    label?: string
  }

/**
 * Koma, the kit's mascot, as a cel-shaded bust portrait in inline SVG.
 * Seven expressions, a talking mouth, and idle life (blink, breath, hair sway).
 * Changing `expression` animates: the head squashes and pops, the eyes blink-swap into
 * the new face and its mark (sparkle, sweat, anger cross) pops in.
 * She is drawn in theme colours, so she recolours with `data-theme` and her line
 * weight follows `data-style`.
 */
export function Mascot({ expression = 'neutral', talking = false, animated = true, crop = 'bust', label, hair, eyes, outfit, trim, ribbon, className, style, ...rest }: MascotProps) {
  const uid = useUid()
  const life = useRef<SVGGElement>(null)
  useLife(life, animated, talking, expression)
  const eyesOf = useSwap(life, expression, animated)
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={crop === 'face' ? '34 14 132 132' : '0 0 200 220'}
      {...a11y(label)}
      data-mascot={expression}
      className={cn('block h-auto w-full select-none', className)}
      style={{ ...paint({ hair, eyes, outfit, trim, ribbon }), ...style }}
      {...rest}
    >
      {label && <title>{label}</title>}
      <Defs uid={uid} />
      <g ref={life}>
        <g data-breathe="head">
          <g data-pop="" style={HEAD_POP}>
            <HairBack />
          </g>
        </g>
        <g data-breathe="body">
          <Body />
        </g>
        <g data-breathe="head">
          <g data-pop="" style={HEAD_POP}>
            <Face expression={expression} eyes={eyesOf} talking={talking} uid={uid} />
            <HairFront />
            <Brows expression={expression} />
            <Marks expression={expression} />
          </g>
        </g>
      </g>
    </svg>
  )
}

function Body() {
  return (
    <g>
      {/* hood bunched behind the neck */}
      <path d="M62 170C58 150 72 138 90 145L110 145C128 138 142 150 138 170Z" style={fill(V.outfitShade)} />
      <path d="M70 163Q69 152 81 148M130 163Q131 152 119 148" style={{ strokeWidth: W2, opacity: 0.55 }} />
      {/* neck + the skin inside the collar's V */}
      <path d="M89 124L89 156L100 186L111 156L111 124Z" style={flat(SKIN)} />
      <path d="M89 128Q100 146 111 128L111 148Q100 154 89 148Z" style={flat(SKIN_SHADE)} />
      <path d="M89 124L89 157M111 124L111 157" />
      {/* hoodie */}
      <path d="M12 222C14 192 32 174 64 166C76 163 88 160 100 160C112 160 124 163 136 166C168 174 186 192 188 222Z" style={fill(V.outfit)} />
      <path d="M13 222C15 198 26 184 42 176C38 192 38 208 40 222ZM187 222C185 198 174 184 158 176C162 192 162 208 160 222Z" style={flat(V.outfitShade)} />
      <path d="M42 176C38 192 38 208 40 222M158 176C162 192 162 208 160 222" style={{ strokeWidth: W2, opacity: 0.7 }} />
      {/* sailor collar */}
      <path d="M82 158C70 161 56 165 44 172C58 188 78 202 100 216C122 202 142 188 156 172C144 165 130 161 118 158L100 188Z" style={fill(V.trim)} />
      <path d="M51.5 175.5C64 188 82 200 100 209.5C118 200 136 188 148.5 175.5" style={{ stroke: V.outfit, strokeWidth: thick(0.8) }} />
      {/* ribbon */}
      <path d="M97 193C94 201 91 208 87.5 216L94 213L97 219C99 210 100 202 100 195ZM103 193C106 201 109 208 112.5 216L106 213L103 219C101 210 100 202 100 195Z" style={fill(V.popShade, { strokeWidth: W2 })} />
      <path d="M100 190C92 181 80 181 79 189C78 197 90 199 100 193ZM100 190C108 181 120 181 121 189C122 197 110 199 100 193Z" style={fill(V.pop)} />
      <path d="M84 190Q86 186 92 187M116 190Q114 186 108 187" style={{ stroke: V.popShade, strokeWidth: W2 }} />
      <rect x={95.5} y={186.5} width={9} height={9} rx={3.5} style={fill(V.pop)} />
    </g>
  )
}

/* ───────────── Chibi: full body, big head, for game targets ───────────── */

export type ChibiPose = 'idle' | 'hurt' | 'cheer' | 'dodge'

export type ChibiProps = Omit<SVGProps<SVGSVGElement>, 'children'> &
  MascotColors & {
    /** Defaults to the pose's own face (hurt → hurt, cheer → happy, dodge → smug). */
    expression?: MascotExpression
    /** hurt = squashed flinch with a guard, cheer = arms up, dodge = a lean with arms flung out. */
    pose?: ChibiPose
    /** Idle bounce, blink and hair sway. Always off under reduced motion. */
    animated?: boolean
    label?: string
  }

const POSE_FACE: Record<ChibiPose, MascotExpression> = { idle: 'neutral', hurt: 'hurt', cheer: 'happy', dodge: 'smug' }
const POSES: Record<ChibiPose, { body: string; arm: number }> = {
  idle: { body: 'rotate(0deg) scale(1, 1)', arm: 0 },
  hurt: { body: 'rotate(-7deg) scale(1.12, 0.86)', arm: -95 },
  cheer: { body: 'rotate(0deg) scale(0.95, 1.06)', arm: 125 },
  dodge: { body: 'rotate(-13deg) scale(1, 1)', arm: 38 },
}
const SPRINGY = 'transform .24s cubic-bezier(.2,1.6,.4,1)'
/* the head is the bust's head scaled down; its line is thickened back up */
const HEAD_T = 'translate(8 2) scale(0.62)'
const HEAD_LINE = { '--m-w': 'calc(var(--ui-bw, 3px) * 1.3)', '--m-w2': 'calc(var(--ui-bw-thin, 2px) * 1.1)', strokeWidth: 'var(--m-w)' } as CSSProperties

function Arm({ angle }: { angle: number }) {
  return (
    <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '57px 94px', transition: SPRINGY }}>
      <path d="M59 91.5C50.5 94.5 46 102.5 45 112.5C44.6 116.8 50.2 118.4 51.2 114.4C52.6 106 55.6 101 60.5 97.5Z" style={fill(V.outfit)} />
      <circle cx={47.8} cy={118.4} r={4.6} style={fill(SKIN)} />
    </g>
  )
}

/**
 * Koma as a chibi: big head, tiny body, for game targets and sprites.
 * Pose changes spring between shapes; `hurt` squashes her into a flinch.
 */
export function Chibi({ expression, pose = 'idle', animated = true, label, hair, eyes, outfit, trim, ribbon, className, style, ...rest }: ChibiProps) {
  const uid = useUid()
  const life = useRef<SVGGElement>(null)
  const face = expression ?? POSE_FACE[pose]
  const p = POSES[pose]
  useLife(life, animated, false, face)
  const eyesOf = useSwap(life, face, animated)
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 140 176"
      {...a11y(label)}
      data-mascot={face}
      data-pose={pose}
      className={cn('block h-auto w-full overflow-visible select-none', className)}
      style={{ ...paint({ hair, eyes, outfit, trim, ribbon }), ...style }}
      {...rest}
    >
      {label && <title>{label}</title>}
      <Defs uid={uid} />
      <ellipse cx={70} cy={165} rx={27} ry={4.6} style={flat(V.line, { opacity: 0.14 })} />
      <g ref={life}>
        <g data-bob="" style={{ transformOrigin: '70px 165px' }}>
          <g style={{ transform: p.body, transformOrigin: '70px 165px', transition: SPRINGY }}>
            <g transform={HEAD_T} style={HEAD_LINE}>
              <g data-pop="" style={HEAD_POP}>
                <HairBack />
              </g>
            </g>
            {/* legs, socks, shoes */}
            <g>
              <path d="M55 138L55 154Q55 157 58 157L62 157Q65 157 65 154L65 138ZM75 138L75 154Q75 157 78 157L82 157Q85 157 85 154L85 138Z" style={fill(SKIN)} />
              <path d="M55 148.5L65 148.5L65 154Q65 157 62 157L58 157Q55 157 55 154ZM75 148.5L85 148.5L85 154Q85 157 82 157L78 157Q75 157 75 154Z" style={fill(V.outfit, { strokeWidth: W2 })} />
              <path d="M52.5 158.6Q52.5 153 59 153Q66 153 66.5 158.6Q66.5 162 59.5 162Q52.5 162 52.5 158.6ZM87.5 158.6Q87.5 153 81 153Q74 153 73.5 158.6Q73.5 162 80.5 162Q87.5 162 87.5 158.6Z" style={fill(V.trim)} />
            </g>
            {/* hoodie, skirt, collar, ribbon */}
            <path d="M55 90C60 87.5 65 87 70 87C75 87 80 87.5 85 90L91 123C82 127 58 127 49 123Z" style={fill(V.outfit)} />
            <path d="M55.5 91C52.5 101 50.5 112 49.5 122.6C52.5 124 55.5 124.8 58.5 125.3C57.5 113 57.6 101 59.5 92Z" style={flat(V.outfitShade)} />
            <path d="M49 120.5L91 120.5L98.5 139C86 144.5 54 144.5 41.5 139Z" style={fill(V.trim)} />
            <path d="M59 122L56 142M70 122L70 143.6M81 122L84 142" style={{ stroke: V.outfit, strokeWidth: W2, opacity: 0.55 }} />
            <path d="M59 89L70 104L81 89C85 90.5 88 93 89.5 96.5L70 115L50.5 96.5C52 93 55 90.5 59 89Z" style={fill(V.trim)} />
            <path d="M53.6 98.4L70 111.4L86.4 98.4" style={{ stroke: V.outfit, strokeWidth: W2 }} />
            <path d="M70 105C66 100 60 100 60 104.5C60 109 66 109 70 106.5ZM70 105C74 100 80 100 80 104.5C80 109 74 109 70 106.5Z" style={fill(V.pop, { strokeWidth: W2 })} />
            <circle cx={70} cy={105.6} r={2.6} style={fill(V.pop, { strokeWidth: W2 })} />
            <g transform={HEAD_T} style={HEAD_LINE}>
              <g data-pop="" style={HEAD_POP}>
                <Face expression={face} eyes={eyesOf} talking={false} uid={uid} />
                <HairFront />
                <Brows expression={face} />
                <Marks expression={face} />
              </g>
            </g>
            <Arm angle={p.arm} />
            <g transform="translate(140 0) scale(-1 1)">
              <Arm angle={p.arm} />
            </g>
          </g>
        </g>
      </g>
    </svg>
  )
}
