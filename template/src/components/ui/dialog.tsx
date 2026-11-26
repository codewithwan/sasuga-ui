import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { prefersReducedMotion, uiStyle } from '@/fx'
import type { UiStyle } from '@/fx'
import { cn } from '@/lib/utils'
import { Icon } from './icon'

export type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  /** Lettering stamped on the panel corner when it lands (cel and manga). `false` = none. */
  sfx?: string | false
  className?: string
}

type Kf = Keyframe[]
type Motion = { kf: Kf; ms: number; easing: string }

const WHIP = 'cubic-bezier(.7,0,.2,1)'
const POP = 'cubic-bezier(.2,1.5,.4,1)'

/** Panel entrance / exit per style. Transforms only: no skew. */
const PANEL: Record<UiStyle, { enter: Motion; leave: Motion; impact: number }> = {
  cel: {
    enter: {
      kf: [
        { transform: 'translateY(40px) scale(.4, .3)', opacity: 0 },
        { transform: 'translateY(-10px) scale(1.1, .92)', opacity: 1, offset: 0.45 },
        { transform: 'translateY(4px) scale(.96, 1.05)', offset: 0.7 },
        { transform: 'scale(1.01, .99)', offset: 0.86 },
        { transform: 'none', opacity: 1 },
      ],
      ms: 600,
      easing: 'cubic-bezier(.2,.9,.3,1)',
    },
    leave: {
      kf: [
        { transform: 'none', opacity: 1 },
        { transform: 'translateY(-16px) scale(1.04, .97)', opacity: 1, offset: 0.3 },
        { transform: 'translateY(110px) rotate(-8deg) scale(.6)', opacity: 0 },
      ],
      ms: 320,
      easing: WHIP,
    },
    impact: 260,
  },
  manga: {
    enter: {
      kf: [
        { transform: 'translateY(-90px) scale(1.3)', opacity: 0 },
        { transform: 'translateY(8px) scale(.98, 1.02)', opacity: 1, offset: 0.42 },
        { transform: 'translateY(-3px)', offset: 0.7 },
        { transform: 'none', opacity: 1 },
      ],
      ms: 460,
      easing: WHIP,
    },
    leave: {
      kf: [
        { transform: 'none', opacity: 1 },
        { transform: 'translateX(-24px) scale(1.02)', opacity: 1, offset: 0.25 },
        { transform: 'translateX(105vw) rotate(9deg)', opacity: 1 },
      ],
      ms: 340,
      easing: WHIP,
    },
    impact: 200,
  },
  flat: {
    enter: {
      kf: [
        { transform: 'translateY(10px) scale(.96)', opacity: 0 },
        { transform: 'translateY(-2px) scale(1.01)', opacity: 1, offset: 0.65 },
        { transform: 'none', opacity: 1 },
      ],
      ms: 260,
      easing: 'cubic-bezier(.2,.8,.2,1)',
    },
    leave: { kf: [{ transform: 'none', opacity: 1 }, { transform: 'translateY(6px) scale(.97)', opacity: 0 }], ms: 160, easing: 'ease-in' },
    impact: 0,
  },
}

/* A spiky cel "impact" burst, as SVG (deterministic, no clip-path). */
const BURST = Array.from({ length: 28 }, (_, i) => {
  const a = (i / 28) * Math.PI * 2
  const r = i % 2 ? 26 + ((i * 7) % 5) : 46 + ((i * 13) % 7)
  return `${(50 + Math.cos(a) * r).toFixed(1)},${(50 + Math.sin(a) * r).toFixed(1)}`
}).join(' ')

/* Manga focus lines: tapered wedges converging on the panel (viewBox -100..100). */
const FOCUS = Array.from({ length: 52 }, (_, i) => {
  const a = (i / 52) * Math.PI * 2 + (((i * 31) % 7) - 3) * 0.012
  const inner = 46 + ((i * 37) % 19)
  const outer = 190
  const w = 0.012 + ((i * 13) % 5) * 0.006
  const p = (ang: number, r: number) => `${(Math.cos(ang) * r).toFixed(1)},${(Math.sin(ang) * r).toFixed(1)}`
  return `${p(a, inner)} ${p(a - w, outer)} ${p(a + w, outer)}`
})

const DEBRIS = 12

/**
 * Modal on the native <dialog> (top layer, focus trap and Esc for free).
 * A modal dialog sits above the page-wide FX canvas, so its effects are DOM
 * elements animated with the Web Animations API, per `uiStyle()`:
 *   cel   — squash-and-stretch pop, a spiky burst with flying debris, a sparkle and stamped lettering
 *   manga — slam down through focus lines, the panel shakes on contact, a slash cuts across, big lettering
 *   flat  — a calm lift-in with a soft settle
 * Leaving, the panel is flung away (down and spinning in cel, off to the side in manga).
 */
export function Dialog({ open, onOpenChange, title, description, children, footer, sfx = 'バン!', className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const burstRef = useRef<SVGSVGElement>(null)
  const linesRef = useRef<SVGSVGElement>(null)
  const twinkleRef = useRef<SVGSVGElement>(null)
  const debrisRef = useRef<HTMLSpanElement>(null)
  const slashRef = useRef<HTMLSpanElement>(null)
  const stampRef = useRef<HTMLSpanElement>(null)
  const anims = useRef<Animation[]>([])
  const titleId = useId()
  const descId = useId()
  const changeRef = useRef(onOpenChange)

  useEffect(() => {
    changeRef.current = onOpenChange
  })

  useEffect(() => {
    const d = ref.current
    if (!d) return
    const style = uiStyle()
    const still = prefersReducedMotion()
    const run = (el: Element | null | undefined, kf: Kf, opts: KeyframeAnimationOptions) => {
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
      if (!still) {
        const { enter, impact } = PANEL[style]
        run(panelRef.current, enter.kf, { duration: enter.ms, easing: enter.easing, fill: 'backwards' })

        if (style !== 'flat') {
          // debris thrown out of the corner the lettering lands on
          Array.from(debrisRef.current?.children ?? []).forEach((child, i) => {
            const bit = child as HTMLElement
            const a = Math.PI * 0.8 + (i / DEBRIS) * Math.PI + (Math.random() - 0.5) * 0.35
            const dist = 70 + Math.random() * 110
            const x = Math.cos(a) * dist
            const y = Math.sin(a) * dist
            const spin = (Math.random() - 0.5) * 720
            bit.style.borderRadius = style === 'manga' ? '1px' : '999px'
            run(
              bit,
              [
                { transform: 'translate(0,0) scale(0) rotate(0deg)', opacity: 1 },
                { transform: `translate(${x * 0.7}px, ${y * 0.7}px) scale(1.2) rotate(${spin * 0.6}deg)`, opacity: 1, offset: 0.45 },
                { transform: `translate(${x}px, ${y + 50}px) scale(0) rotate(${spin}deg)`, opacity: 0 },
              ],
              { duration: 620 + Math.random() * 200, delay: impact, easing: 'cubic-bezier(.15,.7,.4,1)', fill: 'both' },
            )
          })
        }

        if (style === 'cel') {
          run(
            burstRef.current,
            [
              { transform: 'scale(.2) rotate(0deg)', opacity: 0 },
              { transform: 'scale(1.25) rotate(10deg)', opacity: 1, offset: 0.35 },
              { transform: 'scale(1.1) rotate(14deg)', opacity: 1, offset: 0.6 },
              { transform: 'scale(1.4) rotate(18deg)', opacity: 0 },
            ],
            { duration: 680, delay: impact - 40, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'both' },
          )
          run(
            twinkleRef.current,
            [
              { transform: 'scale(0) rotate(-40deg)', opacity: 0 },
              { transform: 'scale(1.3) rotate(10deg)', opacity: 1, offset: 0.4 },
              { transform: 'scale(1) rotate(30deg)', opacity: 1, offset: 0.7 },
              { transform: 'scale(0) rotate(60deg)', opacity: 0 },
            ],
            { duration: 700, delay: impact + 160, easing: POP, fill: 'both' },
          )
        } else if (style === 'manga') {
          run(
            linesRef.current,
            [
              { transform: 'scale(1.35)', opacity: 0 },
              { transform: 'scale(1)', opacity: 1, offset: 0.2 },
              { transform: 'scale(1.02)', opacity: 1, offset: 0.6 },
              { transform: 'scale(1.1)', opacity: 0 },
            ],
            { duration: 640, delay: 60, easing: 'cubic-bezier(.3,0,.2,1)', fill: 'both' },
          )
          run(
            cardRef.current,
            [{ translate: '0 0' }, { translate: '-9px 4px' }, { translate: '8px -5px' }, { translate: '-6px 3px' }, { translate: '4px -2px' }, { translate: '0 0' }],
            { duration: 300, delay: impact, easing: 'linear' },
          )
          run(
            slashRef.current,
            [
              { transform: 'rotate(-9deg) scaleX(0)', opacity: 1 },
              { transform: 'rotate(-9deg) scaleX(1)', opacity: 1, offset: 0.45 },
              { transform: 'rotate(-9deg) scaleX(1) translateX(30%)', opacity: 0 },
            ],
            { duration: 460, delay: impact, easing: WHIP, fill: 'both' },
          )
        }

        if (style !== 'flat' && stampRef.current) {
          const big = style === 'manga' ? 1.45 : 1.1
          stampRef.current.style.fontFamily = style === 'cel' ? 'var(--font-display)' : ''
          run(
            stampRef.current,
            [
              { transform: `scale(${2.6 * big}) rotate(-14deg)`, opacity: 0 },
              { transform: `scale(${0.9 * big}) rotate(-8deg)`, opacity: 1, offset: 0.22 },
              { transform: `scale(${1.12 * big}) rotate(-6deg)`, opacity: 1, offset: 0.36 },
              { transform: `scale(${big}) rotate(-7deg)`, opacity: 1, offset: 0.5 },
              { transform: `scale(${big}) rotate(-7deg)`, opacity: 1, offset: 0.82 },
              { transform: `scale(${big}) rotate(-7deg) translateY(-14px)`, opacity: 0 },
            ],
            { duration: 1300, delay: impact + 20, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'both' },
          )
        }
      }
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
      const { leave } = PANEL[style]
      run(panelRef.current, leave.kf, { duration: leave.ms, easing: leave.easing, fill: 'forwards' })
      const t = window.setTimeout(finish, leave.ms)
      return () => clearTimeout(t)
    }
  }, [open])

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
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClose={() => open && close()}
      // `hidden … open:grid`: a bare `grid` would override the UA display:none of a closed <dialog>
      className="group/dlg fixed inset-0 m-0 hidden h-full max-h-none w-full max-w-none place-items-center overflow-hidden bg-transparent p-4 text-ink backdrop:bg-transparent open:grid"
    >
      <div
        aria-hidden="true"
        onClick={close}
        className="absolute inset-0 bg-ink/40 opacity-0 backdrop-blur-[3px] transition-opacity duration-300 group-data-[state=open]/dlg:opacity-100"
      />

      {/* manga focus lines around the panel (DOM: the canvas FX layer can't draw above the top layer) */}
      <svg
        ref={linesRef}
        aria-hidden="true"
        viewBox="-100 -100 200 200"
        preserveAspectRatio="xMidYMid slice"
        className="fx-only pointer-events-none absolute inset-0 size-full opacity-0"
      >
        {FOCUS.map((pts, i) => (
          <polygon key={i} points={pts} className="fill-ink" />
        ))}
      </svg>

      <div ref={panelRef} className={cn('relative isolate w-[min(560px,100%)]', className)}>
        <div ref={cardRef} className="ui-card ui-shadow-lg relative grid max-h-[calc(100svh-64px)] gap-4 overflow-auto px-[clamp(20px,4vw,36px)] pt-8 pb-7">
          <h2 id={titleId} className="ui-head m-0 pr-8 text-[clamp(24px,3.6vw,34px)] leading-[1.05]">
            {title}
          </h2>
          {description && (
            <p id={descId} className="m-0 max-w-[52ch] text-[15px] leading-relaxed text-mute">
              {description}
            </p>
          )}
          {children}
          {footer && <div className="mt-2 flex flex-wrap items-center justify-end gap-x-4 gap-y-3">{footer}</div>}
        </div>

        {/* DOM FX, hidden in flat */}
        <svg ref={burstRef} aria-hidden="true" viewBox="0 0 100 100" className="fx-only pointer-events-none absolute -top-16 -left-16 -z-10 size-40 opacity-0">
          <polygon points={BURST} className="fill-accent-soft stroke-ink" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="50" cy="50" r="16" className="fill-paper" />
        </svg>
        <svg ref={twinkleRef} aria-hidden="true" viewBox="0 0 20 20" className="fx-only pointer-events-none absolute -right-5 -bottom-5 size-10 opacity-0">
          <path d="M10 0 Q11.6 8.4 20 10 Q11.6 11.6 10 20 Q8.4 11.6 0 10 Q8.4 8.4 10 0Z" className="fill-paper stroke-ink" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        <span ref={debrisRef} aria-hidden="true" className="fx-only pointer-events-none absolute top-2 left-4">
          {Array.from({ length: DEBRIS }, (_, i) => (
            <span
              key={i}
              className={cn('ui-border-thin absolute size-3 opacity-0', ['bg-accent', 'bg-pop', 'bg-paper', 'bg-ink'][i % 4], i % 3 === 0 && 'size-2')}
            />
          ))}
        </span>
        <span
          ref={slashRef}
          aria-hidden="true"
          className="fx-only ui-border-thin pointer-events-none absolute top-1/2 -left-[8%] h-3 w-[116%] origin-left bg-paper opacity-0"
        />
        {sfx && (
          <span
            ref={stampRef}
            aria-hidden="true"
            className="fx-only ui-lettering pointer-events-none absolute -top-8 -left-4 origin-bottom-left text-[clamp(30px,4.8vw,44px)] opacity-0"
          >
            {sfx}
          </span>
        )}

        <button
          type="button"
          aria-label="Close"
          onClick={close}
          className="ui-border ui-shadow-sm absolute -top-4 -right-4 grid size-11 cursor-pointer place-items-center rounded-full bg-paper p-0 leading-none text-ink transition-[translate,background-color,color,box-shadow,scale] duration-200 ease-snap hover:-translate-y-0.5 hover:scale-110 hover:bg-accent hover:text-white active:translate-y-px active:scale-95 active:ui-shadow-press"
        >
          <Icon name="close" tone="line" size={20} />
        </button>
      </div>
    </dialog>
  )
}
