import { Children, useRef, useState } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { prefersReducedMotion, smoke, spawn, useSprings } from '@/fx'
import { cn } from '@/lib/utils'

const avatar = cva('relative inline-grid shrink-0 align-middle', {
  variants: {
    size: {
      sm: 'size-10 text-sm',
      md: 'size-14 text-lg',
      lg: 'size-20 text-2xl',
    },
  },
  defaultVariants: { size: 'md' },
})

export type AvatarProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> &
  VariantProps<typeof avatar> & {
    src?: string
    alt: string
    /** Shown when there is no image or it fails to load. Up to two characters are used. */
    fallback?: string
    status?: 'online' | 'away'
    /** Hop on hover. On by default. */
    hop?: boolean
  }

/** Round outlined sticker with the style's shadow; initials as fallback. Hops when hovered; an online dot pings. */
export function Avatar({ src, alt, fallback, size, status, hop = true, className, onPointerEnter, ...props }: AvatarProps) {
  const [failed, setFailed] = useState(false)
  const showImg = src && !failed
  const initials = [...(fallback ?? alt.trim().split(/\s+/).map((w) => w[0]).join(''))].slice(0, 2).join('').toUpperCase()
  const body = useRef<HTMLSpanElement>(null)
  const landed = useRef(0)
  const spring = useSprings(
    body,
    { y: 0, q: 0 },
    (v, el, vel) => {
      // stretch while rising, squash when it comes down
      const stretch = Math.max(-0.18, Math.min(0.18, -vel.y / 2200))
      el.style.transform = `translateY(${v.y}px) scale(${1 - stretch * 0.6 + v.q * 0.08}, ${1 + stretch - v.q * 0.12})`
    },
    { stiffness: 420, damping: 13 },
  )

  return (
    <span
      className={cn(avatar({ size }), className)}
      role={showImg ? undefined : 'img'}
      aria-label={showImg ? undefined : alt}
      onPointerEnter={(e) => {
        if (hop && !prefersReducedMotion()) {
          spring.set({ y: 0, q: 0 })
          spring.kick({ y: -260, q: 6 })
          window.clearTimeout(landed.current)
          landed.current = window.setTimeout(() => {
            const r = body.current?.getBoundingClientRect()
            if (r) spawn(smoke(r.left + r.width / 2, r.bottom, { count: 3, spread: r.width * 0.45, size: Math.max(5, r.width * 0.1) }))
          }, 260)
        }
        onPointerEnter?.(e)
      }}
      {...props}
    >
      <span ref={body} className="grid origin-bottom">
        <span className="ui-border ui-pill ui-shadow-sm grid place-items-center overflow-hidden bg-accent-soft text-ink">
          {showImg ? (
            <img src={src} alt={alt} className="size-full object-cover" onError={() => setFailed(true)} />
          ) : (
            <span aria-hidden="true" className="ui-head leading-none">
              {initials}
            </span>
          )}
        </span>
      </span>
      {status && (
        <span className="absolute right-0 bottom-0 grid size-[30%]">
          {status === 'online' && <span aria-hidden="true" className="ui-pill col-start-1 row-start-1 animate-[ping_1.6s_cubic-bezier(0,0,.2,1)_infinite] bg-pop" />}
          <span className={cn('ui-border-thin ui-pill col-start-1 row-start-1', status === 'online' ? 'bg-pop' : 'bg-mute')}>
            <span className="sr-only">{status === 'online' ? 'Online' : 'Away'}</span>
          </span>
        </span>
      )}
    </span>
  )
}

const group = cva('group/av inline-flex items-center', {
  variants: {
    size: {
      sm: '[--av-ov:-14px] text-sm',
      md: '[--av-ov:-20px] text-lg',
      lg: '[--av-ov:-28px] text-2xl',
    },
  },
  defaultVariants: { size: 'md' },
})

const bubble = cva('ui-head ui-border ui-pill ui-shadow-sm ui-fill inline-grid shrink-0 place-items-center bg-ink leading-none text-paper', {
  variants: { size: { sm: 'size-10 text-xs', md: 'size-14 text-sm', lg: 'size-20 text-lg' } },
  defaultVariants: { size: 'md' },
})

export type AvatarGroupProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof group> & {
    /** Avatars (use the same size as the group). */
    children: ReactNode
    /** Show at most this many; the rest collapse into a +N sticker. */
    max?: number
  }

/** A stack of overlapping avatars that fans out on hover or focus, each one landing on a spring. */
export function AvatarGroup({ children, size, max, className, ...props }: AvatarGroupProps) {
  const all = Children.toArray(children)
  const shown = max === undefined ? all : all.slice(0, max)
  const rest = all.length - shown.length
  const items = rest > 0 ? [...shown, <span key="rest" className={bubble({ size })} aria-label={`${rest} more`} role="img">+{rest}</span>] : shown
  return (
    <div role="group" className={cn(group({ size }), className)} {...props}>
      {items.map((child, i) => (
        <span
          key={i}
          className="relative inline-grid transition-[margin,translate] duration-500 ease-snap not-first:ml-(--av-ov) group-hover/av:not-first:ml-1.5 group-focus-within/av:not-first:ml-1.5 hover:-translate-y-1"
          style={{ zIndex: items.length - i, transitionDelay: `${i * 35}ms` }}
        >
          {child}
        </span>
      ))}
    </div>
  )
}
