import { useEffect, useRef } from 'react'
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, MouseEvent, ReactNode, RefObject } from 'react'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { KICK, impactOn, prefersReducedMotion, rand, uiStyle, useSprings } from '@/fx'
import { cn } from '@/lib/utils'

/* ui-shadow sorts after shadow-none in the CSS, so depth is opted into per variant instead of overridden. */
const DEPTH = 'ui-shadow group-hover:ui-shadow-hover group-active:ui-shadow-press'

/* Face = the visible sticker. Every shape value (radius, line, shadow, type)
   comes from the active style's tokens, so one class list serves cel, manga and flat.
   --shine is the colour of the hover sweep (white on fills, a soft tint on paper). */
const face = cva(
  'ui-head ui-border ui-r relative isolate inline-flex items-center justify-center gap-2 overflow-hidden leading-none transition-[translate,box-shadow,background-color,color] duration-200 ease-snap group-hover:-translate-x-px group-hover:-translate-y-0.5 group-active:translate-x-[3px] group-active:translate-y-[3px]',
  {
    variants: {
      variant: {
        paper: `${DEPTH} bg-paper text-ink group-hover:bg-canvas [--shine:color-mix(in_srgb,var(--color-accent-soft)_75%,transparent)]`,
        accent: `${DEPTH} ui-fill bg-accent text-white [--shine:rgb(255_255_255/0.5)]`,
        ink: `${DEPTH} ui-fill bg-ink text-paper [--shine:rgb(255_255_255/0.28)]`,
        pop: `${DEPTH} ui-fill bg-pop text-white [--shine:rgb(255_255_255/0.5)]`,
        outline: 'bg-transparent text-current group-hover:bg-ink/5 [--shine:color-mix(in_srgb,var(--color-accent-soft)_60%,transparent)]',
      },
      size: {
        sm: 'px-4 py-2.5 text-[15px]',
        md: 'px-[30px] py-3.5 text-[19px]',
        lg: 'px-10 py-[18px] text-[clamp(21px,2.4vw,26px)]',
        /** Square, for a lone icon. Give it an aria-label. */
        icon: 'size-12 p-0 text-[20px]',
      },
    },
    defaultVariants: { variant: 'paper', size: 'md' },
  },
)

type FxProps = VariantProps<typeof face> & {
  /** Sound-effect lettering drawn on click. `false` = no lettering. */
  sfx?: string | false
  /** Scales the impact effect. */
  power?: number
  /** Busy state: dots replace the icon, lines drift across the face, clicks are blocked. */
  loading?: boolean
  /** Leading icon (an inline svg or glyph). It hops on every hit. */
  icon?: ReactNode
  /** Trailing icon. */
  iconEnd?: ReactNode
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & FxProps
export type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & FxProps & { href: string }

const ROOT =
  'group relative inline-grid cursor-pointer touch-manipulation border-0 bg-transparent p-0 text-inherit no-underline focus-visible:outline-none disabled:pointer-events-none [&:disabled:not([data-loading])]:opacity-50 data-loading:cursor-wait aria-disabled:pointer-events-none [&:focus-visible>span>span]:outline-[2.5px] [&:focus-visible>span>span]:outline-offset-4 [&:focus-visible>span>span]:outline-solid [&:focus-visible>span>span]:outline-accent'

const POP = 'cubic-bezier(.2,1.6,.4,1)'

/**
 * The hit language shared by Button and ButtonLink:
 *   hover   — charge: the sticker inflates a touch and a shine sweeps across
 *   press   — squash down into the shadow
 *   click   — release overshoot, a one-frame flash, the icon hops, burst + lettering
 */
function useHit({ size, sfx = 'ドン!', power = 1, loading }: FxProps) {
  const body = useRef<HTMLSpanElement>(null)
  const faceRef = useRef<HTMLSpanElement>(null)
  const shine = useRef<HTMLSpanElement>(null)
  const iconRef = useRef<HTMLSpanElement>(null)
  const wasLoading = useRef(loading)
  const spring = useSprings(
    body,
    { sx: 1, sy: 1, r: 0, y: 0 },
    (v, el) => {
      el.style.transform = `translateY(${v.y}px) rotate(${v.r}deg) scale(${v.sx}, ${v.sy})`
    },
    { stiffness: 620, damping: 15 },
  )

  // done loading: a little "ta-da" stretch
  useEffect(() => {
    if (wasLoading.current && !loading) spring.kick({ sy: 7, sx: -4, y: -30 })
    wasLoading.current = loading
  }, [loading, spring])

  const scale = size === 'sm' ? 0.7 : size === 'lg' ? 1.25 : size === 'icon' ? 0.8 : 1
  return {
    body,
    faceRef,
    shine,
    iconRef,
    hit(el: HTMLElement) {
      if (loading) return
      spring.set({ sx: 1, sy: 1, y: 0, r: 0 })
      spring.kick({ sx: -7, sy: 10, y: -70, r: (Math.random() < 0.5 ? -1 : 1) * rand(40, 80) })
      impactOn(el, { text: sfx, size: power * scale })
      if (prefersReducedMotion()) return
      const flat = uiStyle() === 'flat'
      // impact frame: the face blows out for a beat
      faceRef.current?.animate([{ filter: flat ? 'brightness(1.15)' : 'brightness(1.7) saturate(1.3)' }, { filter: 'none' }], {
        duration: flat ? 180 : 240,
        easing: 'ease-out',
      })
      iconRef.current?.animate(
        [
          { transform: 'none' },
          { transform: `translateY(-0.45em) rotate(${rand(-25, 25)}deg) scale(1.35)`, offset: 0.35 },
          { transform: 'translateY(0.05em) scale(1.1, .85)', offset: 0.7 },
          { transform: 'none' },
        ],
        { duration: 460, easing: POP },
      )
    },
    charge() {
      if (loading) return
      const k = KICK[uiStyle()]
      spring.set({ sx: 1 + 0.035 * k, sy: 1 + 0.035 * k })
      spring.kick({ sy: 3, y: -16 })
      if (prefersReducedMotion()) return
      shine.current?.animate([{ translate: '-130% 0' }, { translate: '130% 0' }], { duration: 620, easing: 'cubic-bezier(.4,0,.2,1)' })
    },
    press: () => {
      if (loading) return
      const k = KICK[uiStyle()]
      spring.set({ sx: 1 + 0.12 * k, sy: 1 - 0.18 * k, y: 4 * k })
    },
    release: () => spring.set({ sx: 1, sy: 1, y: 0 }),
    leave: () => spring.set({ sx: 1, sy: 1, y: 0 }),
  }
}

function Dots() {
  return (
    <span aria-hidden="true" className="inline-flex items-center gap-[0.18em]">
      {[0, 1, 2].map((i) => (
        <span key={i} className="ui-pill size-[0.3em] animate-[bob_.42s_ease-in-out_infinite_alternate] bg-current" style={{ animationDelay: `${i * 120 - 400}ms` }} />
      ))}
    </span>
  )
}

type LayerProps = { fx: ReturnType<typeof useHit>; children: ReactNode } & FxProps

function Layers({ fx, variant, size, loading, icon, iconEnd, children }: LayerProps) {
  const lead = loading ? <Dots /> : icon
  return (
    <span className="grid origin-[50%_90%]" ref={fx.body as RefObject<HTMLSpanElement>}>
      <span ref={fx.faceRef} className={face({ variant, size })}>
        {/* hover shine: a soft band swept across once per hover */}
        <span
          ref={fx.shine}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 translate-x-[-130%] bg-[linear-gradient(105deg,transparent_30%,var(--shine)_48%,var(--shine)_52%,transparent_70%)]"
        />
        {loading && <span aria-hidden="true" className="motion-lines pointer-events-none absolute inset-0 -z-10 animate-drift" />}
        {lead && (
          <span ref={fx.iconRef} className="relative inline-grid shrink-0 place-items-center [&>svg]:size-[1.05em]">
            {lead}
          </span>
        )}
        {children}
        {iconEnd && <span className="relative inline-grid shrink-0 place-items-center [&>svg]:size-[1.05em]">{iconEnd}</span>}
      </span>
    </span>
  )
}

export function Button({
  children,
  variant,
  size,
  sfx,
  power,
  loading,
  icon,
  iconEnd,
  disabled,
  className,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerEnter,
  ...rest
}: ButtonProps) {
  const fx = useHit({ size, sfx, power, loading })
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      className={cn(ROOT, className)}
      onClick={(e: MouseEvent<HTMLButtonElement>) => {
        fx.hit(e.currentTarget)
        onClick?.(e)
      }}
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') fx.charge()
        onPointerEnter?.(e)
      }}
      onPointerDown={(e) => {
        fx.press()
        onPointerDown?.(e)
      }}
      onPointerUp={(e) => {
        fx.release()
        onPointerUp?.(e)
      }}
      onPointerLeave={(e) => {
        fx.leave()
        onPointerLeave?.(e)
      }}
    >
      <Layers fx={fx} variant={variant} size={size} loading={loading} icon={icon} iconEnd={iconEnd}>
        {children}
      </Layers>
    </button>
  )
}

/** Same look and hit as Button, but a real link. `loading` makes it aria-disabled. */
export function ButtonLink({
  children,
  variant,
  size,
  sfx,
  power,
  loading,
  icon,
  iconEnd,
  className,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerEnter,
  ...rest
}: ButtonLinkProps) {
  const fx = useHit({ size, sfx, power, loading })
  return (
    <a
      {...rest}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      className={cn(ROOT, className)}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        if (loading) {
          e.preventDefault()
          return
        }
        fx.hit(e.currentTarget)
        onClick?.(e)
      }}
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') fx.charge()
        onPointerEnter?.(e)
      }}
      onPointerDown={(e) => {
        fx.press()
        onPointerDown?.(e)
      }}
      onPointerUp={(e) => {
        fx.release()
        onPointerUp?.(e)
      }}
      onPointerLeave={(e) => {
        fx.leave()
        onPointerLeave?.(e)
      }}
    >
      <Layers fx={fx} variant={variant} size={size} loading={loading} icon={icon} iconEnd={iconEnd}>
        {children}
      </Layers>
    </a>
  )
}
