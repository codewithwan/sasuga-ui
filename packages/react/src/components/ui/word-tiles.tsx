import type { CSSProperties, HTMLAttributes, ReactNode, Ref } from 'react'
import { cn } from '@/lib/utils'

/**
 * Word tiles: one word drawn as a block, shared by KineticType and KineticCaption.
 * Every look reads the active data-style through the ui-* tokens (cel rounded, manga square,
 * flat soft), and the colours come from the theme, so light / dark both hold.
 *
 *   plain   — no tile, just the text
 *   block   — solid accent tile, white text
 *   outline — ink-outlined tile, no fill
 *   sticker — paper tile, ink border, the style's offset shadow
 *   split   — two-tone: paper top half, accent bottom half (the text is two-tone too)
 *   stamp   — ink tile, paper text, a hard accent drop under it
 *   tape    — soft-accent strip with torn ends
 */
export type WordStyle = 'plain' | 'block' | 'outline' | 'sticker' | 'split' | 'stamp' | 'tape'

/** `base` at rest, `accent` the highlighted (spoken / active) word, `pop` emphasis. */
export type TileTone = 'base' | 'accent' | 'pop'

// oxlint-disable-next-line react/only-export-components -- picker data next to the renderer it describes
export const WORD_STYLES: { value: WordStyle; label: string }[] = [
  { value: 'plain', label: 'Plain' },
  { value: 'block', label: 'Block' },
  { value: 'outline', label: 'Outline' },
  { value: 'sticker', label: 'Sticker' },
  { value: 'split', label: 'Split' },
  { value: 'stamp', label: 'Stamp' },
  { value: 'tape', label: 'Tape' },
]

/** Pixels the look draws past its box on the right and bottom (the stamp drop, the sticker shadow) at font size `f`. */
// oxlint-disable-next-line react/only-export-components -- layout helper of the tiles
export const tileBleed = (look: WordStyle, f: number) => (look === 'stamp' ? 0.11 * f : look === 'sticker' ? 5 : 0)

// cel 15px / manga 3px / flat 14px, never rounder than the text is tall
const RADIUS = 'rounded-[min(var(--ui-r),0.3em)]'
const PAD = 'px-[0.26em] pt-[0.05em] pb-[0.09em]'

const FACE: Record<Exclude<WordStyle, 'plain'>, Record<TileTone, string>> = {
  block: {
    base: 'ui-border-thin ui-fill bg-accent text-white',
    accent: 'ui-border-thin ui-fill bg-ink text-paper',
    pop: 'ui-border-thin ui-fill bg-pop text-white',
  },
  outline: {
    base: 'ui-border border-current text-ink [[data-style=flat]_&]:border-[color-mix(in_srgb,currentColor_45%,transparent)]',
    accent: 'ui-border border-current text-accent [[data-style=flat]_&]:border-[color-mix(in_srgb,currentColor_55%,transparent)]',
    pop: 'ui-border border-current text-pop [[data-style=flat]_&]:border-[color-mix(in_srgb,currentColor_55%,transparent)]',
  },
  sticker: {
    base: 'ui-border-thin ui-shadow-sm bg-paper text-ink',
    accent: 'ui-border-thin ui-shadow-sm bg-accent-soft text-ink',
    pop: 'ui-border-thin ui-shadow-sm bg-paper text-pop',
  },
  split: {
    base: 'ui-border-thin overflow-hidden bg-paper text-ink',
    accent: 'ui-border-thin overflow-hidden bg-paper text-ink',
    pop: 'ui-border-thin overflow-hidden bg-paper text-ink',
  },
  stamp: {
    base: 'ui-fill bg-ink text-paper [[data-style=flat]_&]:ui-shadow-sm',
    accent: 'ui-fill bg-accent text-white [[data-style=flat]_&]:ui-shadow-sm',
    pop: 'ui-fill bg-pop text-white [[data-style=flat]_&]:ui-shadow-sm',
  },
  tape: {
    base: 'bg-accent-soft text-ink',
    accent: 'bg-accent text-white',
    pop: 'bg-[color-mix(in_srgb,var(--color-pop)_42%,var(--color-paper))] text-ink',
  },
}

/** Plain words only change colour. */
const PLAIN: Record<TileTone, string> = { base: '', accent: 'text-accent', pop: 'text-pop' }

/** The lower, filled half of a split tile (the text inside it turns white). */
const SPLIT_FILL: Record<TileTone, string> = { base: 'bg-accent', accent: 'bg-ink text-paper', pop: 'bg-pop' }
const SPLIT_CUT: Record<TileTone, string> = { base: '50%', accent: '50%', pop: '46%' }

/** The hard drop under a stamp (hidden in flat, which gets the soft shadow instead). */
const STAMP_DROP: Record<TileTone, string> = { base: 'bg-accent', accent: 'bg-ink', pop: 'bg-ink' }

// Two torn edges; words alternate between them so a row of tape does not repeat.
const TEAR = [
  'polygon(var(--tear) 0, calc(100% - var(--tear) * .4) 0, 100% 22%, calc(100% - var(--tear)) 41%, calc(100% - var(--tear) * .25) 60%, 100% 78%, calc(100% - var(--tear) * .7) 100%, calc(var(--tear) * .45) 100%, 0 81%, var(--tear) 62%, calc(var(--tear) * .2) 40%, var(--tear) 19%)',
  'polygon(calc(var(--tear) * .3) 0, calc(100% - var(--tear)) 0, calc(100% - var(--tear) * .15) 18%, 100% 39%, calc(100% - var(--tear) * .85) 57%, 100% 80%, calc(100% - var(--tear) * .2) 100%, var(--tear) 100%, calc(var(--tear) * .1) 77%, var(--tear) 56%, 0 35%, calc(var(--tear) * .7) 16%)',
]

export type WordTileProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  look: WordStyle
  tone?: TileTone
  /** Word index: picks one of the torn edges for tape. */
  index?: number
  children: ReactNode
  ref?: Ref<HTMLSpanElement>
}

/**
 * One word in a tile. The outer span carries no paint, so it can take transforms; the face
 * holds the fill, the line and the text. Decorative layers are aria-hidden; the text itself
 * is left to the caller to expose (both kinetic components hide their visual layer and read
 * the plain text once).
 */
export function WordTile({ look, tone = 'base', index = 0, className, style, children, ref, ...rest }: WordTileProps) {
  if (look === 'plain') {
    return (
      <span ref={ref} className={cn('relative inline-block whitespace-nowrap', PLAIN[tone], className)} style={style} {...rest}>
        {children}
      </span>
    )
  }
  const tape = look === 'tape'
  const faceStyle: CSSProperties | undefined = tape ? { clipPath: TEAR[index % 2] } : undefined
  return (
    <span ref={ref} className={cn('relative inline-block whitespace-nowrap', className)} style={style} {...rest}>
      {look === 'stamp' && (
        <span
          aria-hidden="true"
          className={cn('absolute inset-0 translate-x-[0.08em] translate-y-[0.1em] [[data-style=flat]_&]:hidden', RADIUS, STAMP_DROP[tone])}
        />
      )}
      <span
        className={cn(
          'relative block',
          tape ? 'rounded-none px-[0.36em] [--tear:0.1em] [[data-style=flat]_&]:[--tear:0.055em] [[data-style=manga]_&]:[--tear:0.12em]' : RADIUS,
          !tape && PAD,
          tape && 'pt-[0.05em] pb-[0.09em]',
          FACE[look][tone],
        )}
        style={faceStyle}
      >
        {children}
        {look === 'split' && (
          <span
            aria-hidden="true"
            className={cn('absolute inset-0 text-white', PAD, SPLIT_FILL[tone])}
            style={{ clipPath: `inset(${SPLIT_CUT[tone]} 0 0 0)` }}
          >
            {children}
          </span>
        )}
      </span>
    </span>
  )
}
