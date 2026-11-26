import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { cva } from 'class-variance-authority'
import { prefersReducedMotion, uiStyle } from '@/fx'
import { cn } from '@/lib/utils'
import { Icon } from './icon'

export type SheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  side?: 'left' | 'right'
  children?: ReactNode
  className?: string
}

const WHIP = 'cubic-bezier(.7,0,.2,1)'
const POP = 'cubic-bezier(.2,1.4,.4,1)'
const LINES = 7

/* A floating ui-card along one edge. Motion is Web Animations (see the effect below). */
const panel = cva('ui-card ui-shadow-lg absolute inset-y-3 flex w-[min(420px,calc(100vw-24px))] flex-col overflow-hidden', {
  variants: {
    side: {
      right: 'right-3 origin-right',
      left: 'left-3 origin-left',
    },
  },
})

/**
 * Side drawer on the native <dialog>, the same language as Dialog. The panel
 * whips in from its edge trailing two afterimages and speed lines, overshoots and
 * settles, then deals its children in one by one. Closing flings it back out.
 * Flat keeps the slide and a gentle stagger, without the afterimages.
 * Effects are DOM + Web Animations because a modal dialog renders above the FX canvas.
 */
export function Sheet({ open, onOpenChange, title, side = 'right', children, className }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const ghosts = useRef<(HTMLDivElement | null)[]>([])
  const lines = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const anims = useRef<Animation[]>([])
  const titleId = useId()
  const changeRef = useRef(onOpenChange)

  useEffect(() => {
    changeRef.current = onOpenChange
  })

  useEffect(() => {
    const d = ref.current
    if (!d) return
    const style = uiStyle()
    const flat = style === 'flat'
    const still = prefersReducedMotion()
    const dir = side === 'right' ? 1 : -1
    const off = `calc(${dir} * (100% + 24px))`
    const run = (el: Element | null | undefined, kf: Keyframe[], opts: KeyframeAnimationOptions) => {
      const a = el?.animate(kf, opts)
      if (a) anims.current.push(a)
      return a
    }
    anims.current.forEach((a) => a.cancel())
    anims.current = []

    if (open) {
      if (!d.open) d.showModal()
      d.dataset.state = 'enter'
      document.documentElement.style.overflow = 'hidden'
      const raf = requestAnimationFrame(() => {
        d.dataset.state = 'open'
      })
      if (still) return () => cancelAnimationFrame(raf)

      const ms = flat ? 360 : 560
      const enter: Keyframe[] = flat
        ? [{ transform: `translateX(${off})` }, { transform: `translateX(${-dir * 4}px)`, offset: 0.75 }, { transform: 'none' }]
        : [
            { transform: `translateX(${off}) scale(1.08, .96)` },
            { transform: `translateX(${-dir * 22}px) scale(.97, 1.02)`, offset: 0.5 },
            { transform: `translateX(${dir * 6}px) scale(1.005, .995)`, offset: 0.75 },
            { transform: 'none' },
          ]
      run(panelRef.current, enter, { duration: ms, easing: flat ? 'cubic-bezier(.2,.8,.2,1)' : WHIP, fill: 'backwards' })

      if (!flat) {
        // afterimages: hollow copies of the panel that lag behind and fade
        ghosts.current.forEach((g, i) =>
          run(
            g,
            [
              { transform: `translateX(${off})`, opacity: 0.7 - i * 0.2 },
              { transform: `translateX(${dir * (40 + i * 30)}px)`, opacity: 0.55 - i * 0.15, offset: 0.55 },
              { transform: `translateX(${dir * (70 + i * 40)}px)`, opacity: 0 },
            ],
            { duration: ms, delay: 40 + i * 50, easing: WHIP, fill: 'backwards' },
          ),
        )
        // speed lines streaking toward the edge the panel came from
        Array.from(lines.current?.children ?? []).forEach((ln, i) =>
          run(
            ln,
            [
              { transform: `translateX(${dir * 60}%) scaleX(0)`, opacity: 1 },
              { transform: `translateX(${dir * 10}%) scaleX(1)`, opacity: 1, offset: 0.4 },
              { transform: `translateX(${dir * -30}%) scaleX(.2)`, opacity: 0 },
            ],
            { duration: 420 + (i % 3) * 60, delay: 80 + ((i * 37) % 5) * 22, easing: 'cubic-bezier(.3,0,.2,1)', fill: 'both' },
          ),
        )
      }

      // deal the content in
      const dist = style === 'manga' ? 64 : flat ? 16 : 44
      Array.from(body.current?.children ?? []).forEach((child, i) =>
        run(
          child,
          flat
            ? [{ transform: `translateX(${dir * dist}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }]
            : [
                { transform: `translateX(${dir * dist}px) scale(.9)`, opacity: 0 },
                { transform: `translateX(${-dir * 6}px) scale(1.03)`, opacity: 1, offset: 0.6 },
                { transform: 'none', opacity: 1 },
              ],
          {
            duration: flat ? 260 : style === 'manga' ? 380 : 520,
            delay: (flat ? 120 : 240) + i * (flat ? 35 : 65),
            easing: style === 'manga' ? WHIP : POP,
            fill: 'backwards',
          },
        ),
      )
      return () => cancelAnimationFrame(raf)
    }

    if (d.open) {
      d.dataset.state = 'leave'
      const finish = () => {
        d.close()
        delete d.dataset.state
        document.documentElement.style.overflow = ''
      }
      if (still) {
        finish()
        return
      }
      const ms = flat ? 200 : 320
      run(
        panelRef.current,
        flat
          ? [{ transform: 'none' }, { transform: `translateX(${off})` }]
          : [
              { transform: 'none' },
              { transform: `translateX(${-dir * 18}px) scale(.98, 1.02)`, offset: 0.25 },
              { transform: `translateX(${off}) scale(1.06, .96)` },
            ],
        { duration: ms, easing: WHIP, fill: 'forwards' },
      )
      const t = window.setTimeout(finish, ms)
      return () => clearTimeout(t)
    }
  }, [open, side])

  useEffect(
    () => () => {
      document.documentElement.style.overflow = ''
    },
    [],
  )

  const close = () => changeRef.current(false)

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClose={() => open && close()}
      className="group/sheet fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-hidden bg-transparent p-0 text-ink backdrop:bg-transparent"
    >
      <div
        aria-hidden="true"
        onClick={close}
        className="absolute inset-0 bg-ink/40 opacity-0 backdrop-blur-[3px] transition-opacity duration-300 group-data-[state=open]/sheet:opacity-100"
      />
      {/* speed lines near the edge the sheet enters from */}
      <div ref={lines} aria-hidden="true" className={cn('fx-only pointer-events-none absolute inset-y-0 w-[min(520px,100vw)]', side === 'right' ? 'right-0' : 'left-0')}>
        {Array.from({ length: LINES }, (_, i) => (
          <span
            key={i}
            className="ui-pill absolute h-1 bg-paper opacity-0"
            style={{ top: `${8 + ((i * 53) % 84)}%`, left: `${(i * 29) % 30}%`, width: `${40 + ((i * 17) % 35)}%` }}
          />
        ))}
      </div>
      {[0, 1].map((i) => (
        <div
          key={i}
          ref={(el) => {
            ghosts.current[i] = el
          }}
          aria-hidden="true"
          className={cn(panel({ side }), className, 'fx-only pointer-events-none bg-accent-soft/60 opacity-0 shadow-none')}
        />
      ))}
      <div ref={panelRef} className={cn(panel({ side }), className)}>
        <div className="ui-tone flex items-center justify-between gap-4 border-b-[length:var(--ui-bw-thin)] border-b-[color:var(--ui-line)] bg-canvas px-6 py-5">
          <h2 id={titleId} className="ui-head m-0 text-[clamp(26px,4vw,34px)] leading-none">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="ui-border ui-shadow-sm grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-paper p-0 leading-none text-ink transition-[translate,background-color,color,box-shadow,scale] duration-200 ease-snap hover:-translate-y-0.5 hover:scale-110 hover:bg-accent hover:text-white active:translate-y-px active:scale-95 active:ui-shadow-press"
          >
            <Icon name="close" tone="line" size={18} />
          </button>
        </div>
        <div ref={body} className="grid content-start gap-2 overflow-auto px-6 py-6">
          {children}
        </div>
      </div>
    </dialog>
  )
}
