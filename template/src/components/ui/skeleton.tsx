import { useLayoutEffect, useRef } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { burst, delayed, prefersReducedMotion, sparkle, spawn, uiStyle } from '@/fx'
import { C } from '@/fx/palette'
import { cn } from '@/lib/utils'

const skeleton = cva('ui-r-sm motion-lines relative block animate-drift overflow-hidden', {
  variants: {
    tone: {
      paper: 'bg-accent-soft/45 [--sheen:rgb(255_255_255/0.75)]',
      ink: 'bg-paper/10 [--sheen:rgb(255_255_255/0.16)]',
    },
  },
  defaultVariants: { tone: 'paper' },
})

export type SkeletonProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof skeleton>

/** Soft placeholder block with drifting lines and a shimmer sweep while content loads. Size it with className. */
export function Skeleton({ tone, className, ...props }: SkeletonProps) {
  return (
    <div aria-hidden="true" className={cn(skeleton({ tone }), 'h-4 w-full', className)} {...props}>
      {/* a 200%-wide strip with one sheen per half, slid by half its width: a seamless sweep */}
      <span className="absolute inset-y-0 left-0 w-[200%] animate-[marquee_1.5s_linear_infinite_reverse] bg-[linear-gradient(100deg,transparent_30%,var(--sheen)_50%,transparent_70%)] bg-[length:50%_100%]" />
    </div>
  )
}

export type SkeletonSwapProps = {
  /** While true the fallback (your skeleton layout) shows; when it flips to false the content pops in. */
  loading: boolean
  /** Skeleton layout shown while loading. */
  fallback: ReactNode
  children: ReactNode
  /** Draw a small burst and sparkle when the content lands (cel/manga burst, flat ring). */
  burst?: boolean
  className?: string
}

const POP = 'cubic-bezier(.2,1.6,.4,1)'

/**
 * Swaps a skeleton for the real content with a pop: the content squashes in from
 * a flash with an overshoot, its direct children land one after another, and a
 * small burst marks the moment.
 */
export function SkeletonSwap({ loading, fallback, children, burst: withBurst = true, className }: SkeletonSwapProps) {
  const ref = useRef<HTMLDivElement>(null)
  const was = useRef(loading)

  useLayoutEffect(() => {
    const prev = was.current
    was.current = loading
    const el = ref.current
    if (loading || !prev || !el || prefersReducedMotion()) return
    const flat = uiStyle() === 'flat'
    el.animate(
      flat
        ? [{ transform: 'scale(.97)', opacity: 0 }, { transform: 'none', opacity: 1 }]
        : [
            { transform: 'scale(.88, .8)', opacity: 0, filter: 'brightness(2)' },
            { transform: 'scale(1.04, 1.06)', opacity: 1, offset: 0.55 },
            { transform: 'scale(.99, .98)', offset: 0.8, filter: 'none' },
            { transform: 'none', opacity: 1, filter: 'none' },
          ],
      { duration: flat ? 240 : 460, easing: POP },
    )
    Array.from(el.children).forEach((child, i) =>
      child.animate([{ transform: 'translateY(10px) scale(.94)', opacity: 0 }, { transform: 'none', opacity: 1 }], {
        duration: flat ? 240 : 380,
        delay: 40 + i * (flat ? 30 : 60),
        easing: POP,
        fill: 'backwards',
      }),
    )
    if (!withBurst) return
    const r = el.getBoundingClientRect()
    spawn(
      burst(r.left + Math.min(40, r.width / 2), r.top + Math.min(30, r.height / 2), { radius: 22, spikes: 9 }),
      delayed(0.1, sparkle(r.right - 14, r.top + 6, { size: 12, color: C.pop })),
    )
  }, [loading, withBurst])

  return (
    <div ref={ref} aria-busy={loading || undefined} className={className}>
      {loading ? fallback : children}
    </div>
  )
}
