import { useLayoutEffect, useRef, useState } from 'react'
import type { HTMLAttributes } from 'react'
import { burst, delayed, prefersReducedMotion, shards, smoke, spawn, speedLines, uiStyle } from '@/fx'
import { C } from '@/fx/palette'
import { cn } from '@/lib/utils'
import { Icon } from './icon'
import type { IconName } from './icon'

const TONES = {
  info: { icon: 'bg-accent-soft text-ink', glyph: 'bell', sfx: '注意' },
  success: { icon: 'ui-fill bg-accent text-white', glyph: 'check', sfx: '成功' },
  danger: { icon: 'ui-fill bg-pop text-white', glyph: 'warning', sfx: '危険' },
} as const satisfies Record<string, { icon: string; glyph: IconName; sfx: string }>

export type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: keyof typeof TONES
  /** Small Japanese tag in the corner; defaults to 注意 / 成功 / 危険 by variant. `false` hides it. */
  sfx?: string | false
  /** Side it slams in from. */
  from?: 'left' | 'right'
  /** Shows a close button that flings the alert out; called once it has left. Without it the alert just hides itself. */
  onDismiss?: () => void
  /** Show the close button even without onDismiss. */
  dismissible?: boolean
  /**
   * Slam in when it mounts (an alert shown in response to an action).
   * Off by default: the alert is simply there, with no entrance and no effects.
   */
  animate?: boolean
  /** Deprecated alias of `animate`. */
  animateOnMount?: boolean
}

const POP = 'cubic-bezier(.2,1.6,.4,1)'
const WHIP = 'cubic-bezier(.7,0,.2,1)'
const onScreen = (r: DOMRect) => r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth

/**
 * Callout card with a round icon sticker. Static by default. With `animate` it slams in
 * from the side on mount, trailing speed lines, the icon sticker pops with a burst and
 * danger alerts shake on contact. The close button flings it off the other way.
 */
export function Alert({ variant = 'info', sfx, from = 'left', onDismiss, dismissible, animate, animateOnMount, className, children, ...props }: AlertProps) {
  const slam = animate ?? animateOnMount ?? false
  const t = TONES[variant]
  const tag = sfx === undefined ? t.sfx : sfx
  const root = useRef<HTMLDivElement>(null)
  const icon = useRef<HTMLSpanElement>(null)
  const tagRef = useRef<HTMLSpanElement>(null)
  const [gone, setGone] = useState(false)
  const leaving = useRef(false)
  const dir = from === 'left' ? 1 : -1

  useLayoutEffect(() => {
    const el = root.current
    if (!slam || !el || prefersReducedMotion()) return
    let timers: number[] = []

    const enter = () => {
      const style = uiStyle()
      const flat = style === 'flat'
      const d = flat ? 24 : style === 'manga' ? 160 : 120
      const dur = flat ? 320 : 460
      el.animate(
        flat
          ? [{ transform: `translateX(${-dir * d}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }]
          : [
              { transform: `translateX(${-dir * d}px) scale(1.12, .9)`, opacity: 0 },
              { transform: `translateX(${dir * 10}px) scale(.96, 1.05)`, opacity: 1, offset: 0.5 },
              { transform: `translateX(${-dir * 4}px) scale(1.01, .99)`, offset: 0.75 },
              { transform: 'none', opacity: 1 },
            ],
        { duration: dur, easing: flat ? 'cubic-bezier(.2,.9,.3,1)' : WHIP, fill: 'backwards' },
      )
      icon.current?.animate(
        [
          { transform: 'scale(0) rotate(-40deg)', opacity: 0 },
          { transform: 'scale(1.4) rotate(8deg)', opacity: 1, offset: 0.55 },
          { transform: 'scale(.9)', offset: 0.8 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 520, delay: dur * 0.55, easing: POP, fill: 'backwards' },
      )
      tagRef.current?.animate(
        [
          { transform: 'translateY(-14px) scale(2)', opacity: 0 },
          { transform: 'scale(.9)', opacity: 1, offset: 0.6 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 380, delay: dur * 0.8, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'backwards' },
      )
      timers = [
        window.setTimeout(() => {
          const r = el.getBoundingClientRect()
          // canvas effects only when someone can see them
          if (onScreen(r)) {
            const edge = dir > 0 ? r.left : r.right
            spawn(
              speedLines({ left: r.left, top: r.top, width: r.width, height: r.height }, dir as 1 | -1, { count: 9, length: 140, color: C.ink }),
              delayed(0.04, smoke(edge, r.bottom - 6, { count: 5, spread: 44, size: 11 })),
            )
          }
          if (variant === 'danger' && !flat) {
            el.animate(
              [
                { translate: '0 0' },
                { translate: '-7px 1px' },
                { translate: '6px -2px' },
                { translate: '-5px 2px' },
                { translate: '3px -1px' },
                { translate: '0 0' },
              ],
              { duration: 360, easing: 'linear' },
            )
          }
        }, dur * 0.45),
        window.setTimeout(() => {
          const r = icon.current?.getBoundingClientRect()
          if (!r || !onScreen(r)) return
          const x = r.left + r.width / 2
          const y = r.top + r.height / 2
          spawn(
            burst(x, y, { radius: 30, spikes: 10, color: variant === 'danger' ? C.pop : C.accent }),
            shards(x, y, { count: 5, speed: 280, size: 6 }),
          )
        }, dur * 0.55 + 240),
      ]
    }

    enter()
    return () => timers.forEach(clearTimeout)
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dismiss = () => {
    const el = root.current
    if (!el || leaving.current) return
    leaving.current = true
    const done = () => {
      setGone(true)
      onDismiss?.()
    }
    if (prefersReducedMotion()) return done()
    const flat = uiStyle() === 'flat'
    const r = el.getBoundingClientRect()
    spawn(speedLines({ left: r.left, top: r.top, width: r.width, height: r.height }, dir as 1 | -1, { count: 10, length: 160 }))
    el.animate(
      flat
        ? [{ transform: 'none', opacity: 1 }, { transform: `translateX(${dir * 40}px)`, opacity: 0 }]
        : [
            { transform: 'none', opacity: 1 },
            { transform: `translateX(${-dir * 14}px) scale(.96, 1.04)`, opacity: 1, offset: 0.25 },
            { transform: `translateX(${dir * 115}%) translateY(-30px) rotate(${dir * 9}deg) scale(1.08, .92)`, opacity: 0 },
          ],
      { duration: flat ? 200 : 380, easing: WHIP, fill: 'forwards' },
    ).finished.then(done, done)
  }

  if (gone) return null
  const canDismiss = dismissible || onDismiss

  return (
    <div
      ref={root}
      role={variant === 'danger' ? 'alert' : 'status'}
      className={cn(
        'ui-card ui-tone relative grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-1 py-4 pr-6 pl-4 text-ink',
        canDismiss && 'pr-14',
        className,
      )}
      {...props}
    >
      <span ref={icon} aria-hidden="true" className={cn('ui-border-thin ui-pill row-span-2 grid size-10 place-items-center', t.icon)}>
        <Icon name={t.glyph} tone="line" size={22} />
      </span>
      {children}
      {tag && (
        <span
          ref={tagRef}
          aria-hidden="true"
          className={cn('fx-only ui-border-thin ui-pill absolute -top-3 right-4 px-2.5 pt-1 pb-0.5 font-jp text-xs leading-none', canDismiss && 'right-14', t.icon)}
        >
          {tag}
        </span>
      )}
      {canDismiss && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          className="ui-border-thin ui-pill absolute top-3 right-3 grid size-8 cursor-pointer place-items-center bg-paper p-0 leading-none text-ink transition-[translate,background-color,color,scale] duration-200 ease-snap hover:scale-110 hover:bg-ink hover:text-paper focus-visible:ui-focus active:scale-90"
        >
          <Icon name="close" tone="line" size={16} />
        </button>
      )}
    </div>
  )
}

export function AlertTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn('ui-head col-start-2 m-0 pt-1 text-lg leading-tight', className)} {...props} />
}

export function AlertDescription({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('col-start-2 text-[15px] leading-relaxed text-mute', className)} {...props} />
}
