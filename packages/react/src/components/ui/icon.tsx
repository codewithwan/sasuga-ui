import { useId } from 'react'
import type { SVGProps } from 'react'
import { cn } from '@/lib/utils'

export type IconName =
  | 'sword'
  | 'fire'
  | 'heart'
  | 'sparkle'
  | 'shield'
  | 'star'
  | 'trophy'
  | 'coin'
  | 'potion'
  | 'gem'
  | 'bolt'
  | 'skull'
  | 'crown'
  | 'key'
  | 'scroll'
  | 'bomb'
  | 'clock'
  | 'check'
  | 'close'
  | 'plus'
  | 'minus'
  | 'arrow-right'
  | 'arrow-left'
  | 'chevron-down'
  | 'menu'
  | 'github'
  | 'sun'
  | 'moon'
  | 'search'
  | 'copy'
  | 'settings'
  | 'play'
  | 'pause'
  | 'volume'
  | 'mute'
  | 'user'
  | 'flag'
  | 'map'
  | 'chest'
  | 'info'
  | 'warning'
  | 'danger'
  | 'success'
  | 'bell'
  | 'lock'
  | 'home'
  | 'book'
  | 'puzzle'
  | 'magic'
  | 'music'

/**
 * One glyph on a 24×24 grid, in up to three layers:
 *   b — body: closed shapes. Filled with the soft tint in duo, with currentColor in solid.
 *   k — ink spots (eyes, keyholes): filled with the line colour.
 *   d — detail strokes, never filled. In solid, k and d are cut out of the body.
 */
type Glyph = { b?: string; k?: string; d?: string }

const CIRCLE = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0 ${r} ${r} 0 1 0-${r * 2} 0Z`
const SPEAKER = 'M4 9.5h3.5L12 5v14l-4.5-4.5H4Z'

const ICONS: Record<IconName, Glyph> = {
  sword: { b: 'M20.5 3.5l-4 1-9 9 3 3 9-9Z', d: 'M10.5 13.5l7-7M4.8 12.2l7 7M8.3 15.7 4 20' },
  fire: {
    b: 'M12 3c1 3 6 5.5 6 11a6 6 0 0 1-12 0c0-2.5 1.2-4 2.5-5 .2 1.7 1 2.8 2 3.2C10 9 10.5 5.5 12 3Z',
    d: 'M12 20a2.5 2.5 0 0 1-2.5-2.5c0-1.7 1.5-2.7 2.5-4.5 1 1.8 2.5 2.8 2.5 4.5A2.5 2.5 0 0 1 12 20Z',
  },
  heart: { b: 'M12 20s-8-4.8-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.2 12 20 12 20Z', d: 'M7 10.5c0-1.2.8-2 2-2' },
  sparkle: { b: 'M12 2.5c.8 5 2.5 7.7 7.5 9.5-5 1.8-6.7 4.5-7.5 9.5-.8-5-2.5-7.7-7.5-9.5 5-1.8 6.7-4.5 7.5-9.5Z', d: 'M19 3v3M17.5 4.5h3' },
  shield: { b: 'M12 2.5 4.5 5.5V11c0 4.8 3.2 8.4 7.5 10.5 4.3-2.1 7.5-5.7 7.5-10.5V5.5Z', d: 'M12 6v12' },
  star: { b: 'M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8Z' },
  trophy: {
    b: 'M7 3.5h10v5a5 5 0 0 1-10 0ZM8 20.5h8V19a1.5 1.5 0 0 0-1.5-1.5h-5A1.5 1.5 0 0 0 8 19Z',
    d: 'M7 5.5H4.5v1a3.5 3.5 0 0 0 3 3.5M17 5.5h2.5v1a3.5 3.5 0 0 1-3 3.5M12 13.5v4',
  },
  coin: { b: CIRCLE(12, 12, 8.5), k: 'M12 7.5c.5 2.5 1.5 3.6 4 4.5-2.5.9-3.5 2-4 4.5-.5-2.5-1.5-3.6-4-4.5 2.5-.9 3.5-2 4-4.5Z' },
  potion: { b: 'M10 3h4v5.5l4.3 7.2a3.5 3.5 0 0 1-3 5.3H8.7a3.5 3.5 0 0 1-3-5.3L10 8.5Z', d: 'M8.5 3h7M7.5 14.5h9M13.5 17.5h.01' },
  gem: { b: 'M7 4h10l4 5.5-9 11-9-11Z', d: 'M3 9.5h18M9.5 4 8 9.5l4 11 4-11L14.5 4' },
  bolt: { b: 'M13.5 2.5 5 13.5h6l-1 8 9-11h-6l.5-8Z' },
  skull: {
    b: 'M12 3a8 8 0 0 0-8 8c0 2.5 1.2 4.3 3 5.3V19a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 17 19v-2.7c1.8-1 3-2.8 3-5.3a8 8 0 0 0-8-8Z',
    k: `${CIRCLE(9, 11.5, 1.6)}${CIRCLE(15, 11.5, 1.6)}`,
    d: 'M10.5 17.5v3M13.5 17.5v3',
  },
  crown: { b: 'M3.5 8l4 4L12 5l4.5 7 4-4L19 19H5Z', d: 'M5.8 15.5h12.4' },
  key: { b: CIRCLE(8, 8.5, 4.5), d: `M11.2 11.7l8.3 8.3M15.5 16l2.2-2.2M18 18.5l2.2-2.2${CIRCLE(8, 8.5, 1.3)}` },
  scroll: {
    b: 'M7 3.5h11a2.5 2.5 0 0 1 0 5h-1.5V18a2.5 2.5 0 0 1-2.5 2.5H5.5a2.5 2.5 0 0 1 0-5H7Z',
    d: 'M10 8h3.5M10 11.5h3.5M7 15.5V18M16.5 6h1.5',
  },
  bomb: { b: CIRCLE(10.5, 14, 6.5), d: 'M15 9.5l2-2c.8-.8 2-.8 2.7 0M20.5 2.5v2M19.5 3.5h2M7.5 12.5a3.5 3.5 0 0 1 2.5-2.5' },
  clock: { b: CIRCLE(12, 12, 8.5), d: 'M12 7.5V12l3 2' },
  check: { d: 'M5 12.5l4.5 4.5L19 7.5' },
  close: { d: 'M6.5 6.5l11 11M17.5 6.5l-11 11' },
  plus: { d: 'M12 5v14M5 12h14' },
  minus: { d: 'M5 12h14' },
  'arrow-right': { d: 'M4.5 12h15M13.5 6l6 6-6 6' },
  'arrow-left': { d: 'M19.5 12h-15M10.5 6l-6 6 6 6' },
  'chevron-down': { d: 'M6 9.5l6 6 6-6' },
  menu: { d: 'M4 6.5h16M4 12h16M4 17.5h16' },
  github: {
    b: 'M9.4 21v-2.6c0-.8.2-1.4.6-1.9-2.8-.3-5.6-1.4-5.6-6 0-1.3.5-2.4 1.2-3.2-.2-.5-.5-1.8.1-3.3 0 0 1-.3 3.3 1.2a11 11 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.5.3 2.8.1 3.3.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.7-5.6 6 .4.4.6 1.1.6 1.9V21Z',
    d: 'M9.4 18.4c-3 .8-3.7-1.6-5.4-2',
  },
  sun: { b: CIRCLE(12, 12, 4), d: 'M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4' },
  moon: { b: 'M20 14.5A8.5 8.5 0 1 1 9.5 4a7.5 7.5 0 0 0 10.5 10.5Z', d: 'M17 3.5v2.5M15.75 4.75h2.5' },
  search: { b: CIRCLE(10.5, 10.5, 6.5), d: 'M15.3 15.3l5.2 5.2M7.5 10a3 3 0 0 1 2.5-2.5' },
  copy: {
    b: 'M4 9.5A1.5 1.5 0 0 1 5.5 8h9A1.5 1.5 0 0 1 16 9.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 18.5Z',
    d: 'M8 8V5.5A1.5 1.5 0 0 1 9.5 4h9A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H16',
  },
  settings: {
    b: 'M10.1 5.7 10.6 3.1h2.8l.5 2.6 1.2.5 2.2-1.5 2 2-1.5 2.2.5 1.2 2.6.5v2.8l-2.6.5-.5 1.2 1.5 2.2-2 2-2.2-1.5-1.2.5-.5 2.6h-2.8l-.5-2.6-1.2-.5-2.2 1.5-2-2 1.5-2.2-.5-1.2-2.6-.5v-2.8l2.6-.5.5-1.2-1.5-2.2 2-2 2.2 1.5Z',
    d: CIRCLE(12, 12, 2.8),
  },
  play: { b: 'M7.5 4.8v14.4L19.5 12Z' },
  pause: { b: 'M6.5 5H10v14H6.5ZM14 5h3.5v14H14Z' },
  volume: { b: SPEAKER, d: 'M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11' },
  mute: { b: SPEAKER, d: 'M16 9.5l5 5M21 9.5l-5 5' },
  user: { b: `${CIRCLE(12, 8, 4)}M4.5 20.5a7.5 7.5 0 0 1 15 0Z` },
  flag: { b: 'M5 4h13l-3 4.5 3 4.5H5Z', d: 'M5 21.5V3.5' },
  map: { b: 'M3.5 6 9 4l6 2 5.5-2v14L15 20l-6-2-5.5 2Z', d: 'M9 4v14M15 6v14' },
  chest: {
    b: 'M3.5 11V9a5 5 0 0 1 5-5h7a5 5 0 0 1 5 5v2ZM3.5 11h17v8a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19Z',
    k: 'M10.5 10h3v3.5h-3Z',
    d: 'M8 4.5V11M16 4.5V11',
  },
  info: { b: CIRCLE(12, 12, 9), d: 'M12 11v5.5M12 7.5h.01' },
  warning: { b: 'M10.3 4 2.8 17.5a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0Z', d: 'M12 9.5V14M12 17h.01' },
  danger: { b: 'M8.3 3h7.4L21 8.3v7.4L15.7 21H8.3L3 15.7V8.3Z', d: 'M12 7.5V13M12 16.5h.01' },
  success: { b: CIRCLE(12, 12, 9), d: 'M8 12.5l2.8 2.8 5.7-5.8' },
  bell: { b: 'M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15Z', d: 'M10 21h4M12 3.5V5' },
  lock: {
    b: 'M5 11.5A1.5 1.5 0 0 1 6.5 10h11a1.5 1.5 0 0 1 1.5 1.5V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19Z',
    d: 'M8 10V7.5a4 4 0 0 1 8 0V10M12 14v2.5',
  },
  home: { b: 'M5.5 9.5 12 4l6.5 5.5V19a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19Z', d: 'M3 11l9-7.7 9 7.7M10 20.5v-5h4v5' },
  book: { b: 'M12 6.5C10 5 7 4.5 3.5 5v13.5c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5c-3.5-.5-6.5 0-8.5 1.5Z', d: 'M12 6.5V20' },
  puzzle: { b: 'M4.5 7h4a2.5 2.5 0 1 1 5 0h4v4a2.5 2.5 0 1 1 0 5v4h-4a2.5 2.5 0 1 0-5 0h-4v-4a2.5 2.5 0 1 0 0-5Z' },
  magic: {
    b: 'M3.5 18.5l8.5-8.5 2 2-8.5 8.5ZM16.5 3.5l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5L13 7l2.5-1Z',
    d: 'M20 13v2.5M18.75 14.25h2.5M7.5 4v2.5M6.25 5.25h2.5',
  },
  music: { b: `${CIRCLE(6.5, 18, 2.5)}${CIRCLE(16.5, 16, 2.5)}`, d: 'M9 18V5.5l10-2V16M9 9l10-2' },
}

/** Every icon name, in display order (for pickers and docs). */
// oxlint-disable-next-line react/only-export-components -- part of the public API, lives next to the data
export const ICON_NAMES = Object.keys(ICONS) as IconName[]

/* Line weight follows the style (cel/manga 3px → 2.4, flat 1.5px → 1.5 units). Override with --icon-bw. */
const STROKE = 'calc(var(--icon-bw, var(--ui-bw, 2.5px)) * 0.6 + 0.6px)'

export type IconProps = {
  name: IconName
  size?: number | string
  /** duo: ink line + soft tint fill (`--icon-fill`) · line: currentColor strokes · solid: filled currentColor */
  tone?: 'duo' | 'line' | 'solid'
  className?: string
  /** Accessible name. Without it the icon is decorative (aria-hidden). */
  title?: string
} & Omit<SVGProps<SVGSVGElement>, 'name'>

/**
 * Hand-drawn sticker icons on a 24×24 grid with round joins. The line weight follows
 * the active style; `duo` is ink + `var(--icon-fill, var(--color-accent-soft))`
 * (set `--icon-stroke` to change the ink).
 */
export function Icon({ name, size = 20, tone = 'duo', className, title, style, ...svgProps }: IconProps) {
  const uid = useId().replace(/[^\w-]/g, '')
  const g = ICONS[name]
  const ink = tone === 'duo' ? 'var(--icon-stroke, var(--color-ink))' : 'currentColor'
  const fill = tone === 'duo' ? 'var(--icon-fill, var(--color-accent-soft))' : tone === 'solid' ? 'currentColor' : 'none'
  // solid: cut the details out of the filled body so they still read
  const knock = tone === 'solid' && !!g.b && !!(g.d || g.k)
  const clip = `ic${uid}c`
  const mask = `ic${uid}m`
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      data-icon={name}
      className={cn('inline-block shrink-0 align-[-0.125em]', className)}
      style={{ stroke: ink, strokeWidth: STROKE, ...style }}
      {...svgProps}
    >
      {title && <title>{title}</title>}
      {knock && (
        <defs>
          <clipPath id={clip}>
            <path d={g.b} />
          </clipPath>
          <mask id={mask} maskUnits="userSpaceOnUse" x="-2" y="-2" width="28" height="28">
            <rect x="-2" y="-2" width="28" height="28" fill="#fff" stroke="none" />
            <g clipPath={`url(#${clip})`} stroke="#000">
              {g.k && <path d={g.k} fill="#000" />}
              {g.d && <path d={g.d} />}
            </g>
          </mask>
        </defs>
      )}
      <g mask={knock ? `url(#${mask})` : undefined}>
        {g.b && <path d={g.b} style={{ fill }} />}
        {g.k && <path d={g.k} style={{ fill: ink }} />}
        {g.d && <path d={g.d} />}
      </g>
    </svg>
  )
}
