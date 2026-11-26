import { useRef } from 'react'
import type { HTMLAttributes, MouseEvent, PointerEvent } from 'react'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { burst, delayed, prefersReducedMotion, rays, shards, sparkle, spawn, uiStyle, useSprings } from '@/fx'
import { C } from '@/fx/palette'
import { cn } from '@/lib/utils'

/* Shape (line, radius, depth, screentone) comes from the style tokens; variants only pick colour. */
const face = cva(
  'ui-border ui-r-lg ui-shadow ui-tone relative isolate grid h-full content-start gap-4 overflow-hidden px-7 pt-6 pb-7 transition-shadow duration-200 ease-snap',
  {
    variants: {
      variant: {
        paper: 'bg-paper text-ink [--shine:color-mix(in_srgb,var(--color-accent-soft)_60%,transparent)]',
        ink: 'ui-fill bg-ink text-paper [--shine:rgb(255_255_255/0.2)]',
        accent: 'ui-fill bg-accent text-white [--shine:rgb(255_255_255/0.42)]',
      },
    },
    defaultVariants: { variant: 'paper' },
  },
)

export type CardProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof face> & {
    /** Tilts toward the pointer in 3D, lifts with a glint sweep, and lands a hit when clicked. */
    interactive?: boolean
    /** Max tilt in degrees for interactive cards. */
    tilt?: number
  }

const INTERACTIVE = 'a,button,input,select,textarea,label,summary,[role=button],[role=menuitem],[role=option],[role=switch],[role=tab]'

/** Sticker panel: outlined surface with the style's offset shadow. */
export function Card({
  variant,
  interactive,
  tilt = 9,
  className,
  children,
  onPointerEnter,
  onPointerLeave,
  onPointerMove,
  onPointerDown,
  onClick,
  ...props
}: CardProps) {
  const body = useRef<HTMLDivElement>(null)
  const glint = useRef<HTMLSpanElement>(null)
  const spring = useSprings(
    body,
    { y: 0, s: 1, rx: 0, ry: 0, q: 0 },
    (v, el) => {
      el.style.transform = `perspective(900px) translateY(${v.y}px) rotateX(${v.rx}deg) rotateY(${v.ry}deg) scale(${v.s * (1 + v.q * 0.02)}, ${v.s * (1 - v.q * 0.03)})`
    },
    { stiffness: 380, damping: 16 },
  )

  const still = () => !interactive || prefersReducedMotion()

  const aim = (e: PointerEvent<HTMLDivElement>) => {
    const el = body.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    const k = uiStyle() === 'flat' ? 0.5 : 1
    spring.set({ rx: (0.5 - py) * tilt * 2 * k, ry: (px - 0.5) * tilt * 2 * k })
    el.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`)
    el.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`)
  }

  return (
    <div
      className={cn('group/card relative', className)}
      onPointerEnter={(e) => {
        if (!still()) {
          spring.set({ y: -8, s: 1.015 })
          spring.kick({ y: -60 })
          if (e.pointerType === 'mouse') aim(e)
          glint.current?.animate([{ translate: '-120% 0', opacity: 1 }, { translate: '120% 0', opacity: 1 }], {
            duration: 700,
            easing: 'cubic-bezier(.4,0,.2,1)',
          })
        }
        onPointerEnter?.(e)
      }}
      onPointerMove={(e) => {
        if (!still() && e.pointerType === 'mouse') aim(e)
        onPointerMove?.(e)
      }}
      onPointerLeave={(e) => {
        if (interactive) spring.set({ y: 0, s: 1, rx: 0, ry: 0, q: 0 })
        onPointerLeave?.(e)
      }}
      onPointerDown={(e) => {
        if (!still() && !(e.target as Element).closest(INTERACTIVE)) spring.set({ q: 1, y: -2 })
        onPointerDown?.(e)
      }}
      onClick={(e: MouseEvent<HTMLDivElement>) => {
        // controls inside the card bring their own hit
        if (!still() && !(e.target as Element).closest(INTERACTIVE)) {
          spring.set({ q: 0, y: -8 })
          spring.kick({ q: -14, y: -50, s: 0.6 })
          const x = e.clientX || e.currentTarget.getBoundingClientRect().left + 40
          const y = e.clientY || e.currentTarget.getBoundingClientRect().top + 40
          spawn(
            rays(x, y, { inner: 18, outer: 90, count: 12, width: 5 }),
            burst(x, y, { radius: 26, spikes: 10 }),
            shards(x, y, { count: 7, speed: 340, size: 7 }),
            delayed(0.1, sparkle(x + 26, y - 22, { size: 11, color: C.pop })),
          )
        }
        onClick?.(e)
      }}
      {...props}
    >
      <div ref={body} className="grid h-full">
        <div className={cn(face({ variant }), interactive && 'group-hover/card:ui-shadow-lg')}>
          {children}
          {interactive && (
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
              {/* glare that follows the pointer */}
              <span className="absolute inset-0 bg-[radial-gradient(circle_at_var(--gx,50%)_var(--gy,0%),var(--shine),transparent_55%)] opacity-0 transition-opacity duration-300 group-hover/card:opacity-100" />
              {/* glint swept across once per hover */}
              <span
                ref={glint}
                className="absolute inset-0 translate-x-[-120%] bg-[linear-gradient(110deg,transparent_35%,var(--shine)_47%,var(--shine)_53%,transparent_65%)] opacity-0"
              />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid gap-1.5', className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('ui-head m-0 text-[clamp(22px,2.4vw,28px)] leading-tight', className)} {...props} />
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('m-0 text-[15px] leading-relaxed opacity-75', className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('text-[15px] leading-relaxed', className)} {...props} />
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-1 flex flex-wrap items-center gap-3', className)} {...props} />
}
