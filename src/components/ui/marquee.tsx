import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const strip = cva(
  'relative overflow-hidden border-y-[length:var(--ui-bw)] border-y-[color:var(--ui-line)] py-3 text-ink',
  {
    variants: {
      tone: {
        paper: 'bg-paper',
        canvas: 'bg-canvas',
        soft: 'bg-accent-soft',
        /* older names, mapped onto the new palette */
        accent: 'bg-accent-soft',
        white: 'bg-paper',
        ink: 'ui-tone bg-canvas',
        pop: 'bg-accent-soft',
      },
      /** Overhang the container edges. */
      bleed: { true: 'z-20 -mx-[5vw]', false: '' },
    },
    defaultVariants: { tone: 'soft', bleed: false },
  },
)

const isJapanese = (w: string) => /[　-鿿]/.test(w)

type Props = VariantProps<typeof strip> & {
  words: string[]
  reverse?: boolean
  /** @deprecated Ignored: the band never tilts. */
  tilt?: number
  /** Seconds per loop (lower is faster). */
  speed?: number
  /** Hovering the band pauses it and makes the word under the pointer jump. */
  interactive?: boolean
  className?: string
}

/**
 * Flat band of endlessly scrolling words between sections. Decorative (aria-hidden).
 * Interactive by default: on hover the band pauses, the word under the pointer
 * springs up in the accent colour and the dots spin.
 */
export function Marquee({ words, tone, bleed, reverse = false, speed, interactive = true, className }: Props) {
  const run = (
    <span className="flex shrink-0 items-center">
      {[...words, ...words, ...words].map((w, i) => (
        <span key={i} className="flex items-center">
          <span
            className={cn(
              'inline-block transition-[translate,scale,color] duration-300 ease-snap',
              interactive && 'hover:-translate-y-[0.12em] hover:scale-110 hover:text-accent',
              isJapanese(w) && 'font-jp text-[0.75em]',
            )}
          >
            {w}
          </span>
          <span
            className={cn(
              'ui-border-thin mx-[0.6em] inline-block size-[0.34em] shrink-0 rounded-full bg-accent transition-[scale,background-color] duration-300 ease-snap',
              interactive && 'group-hover/mq:scale-150 group-hover/mq:bg-pop',
            )}
          />
        </span>
      ))}
    </span>
  )
  return (
    <div aria-hidden="true" className={cn(strip({ tone, bleed }), interactive && 'group/mq', className)}>
      <div
        style={speed ? { animationDuration: `${speed}s` } : undefined}
        className={cn(
          'ui-head flex w-max text-[clamp(22px,3vw,38px)] leading-none',
          reverse ? 'animate-marquee-rev' : 'animate-marquee',
          interactive && 'group-hover/mq:[animation-play-state:paused]',
        )}
      >
        {run}
        {run}
      </div>
    </div>
  )
}
