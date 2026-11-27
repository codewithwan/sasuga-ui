import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { burst, delayed, prefersReducedMotion, rand, sfx, shards, slash, sparkle, spawn, uiStyle, useSprings } from '@/fx'
import { C } from '@/fx/palette'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url'
  placeholder?: string
  name?: string
  required?: boolean
  /** Marks the field invalid: the box shakes and hits with lettering. A string/node is shown as the message. */
  error?: ReactNode
  /** Shows a check that pops into the box. */
  success?: boolean
  /** Lettering when it turns invalid. `false` = none. */
  errorSfx?: string | false
}

let measurer: CanvasRenderingContext2D | null = null

/** Rough on-screen position of the caret, so typing sparks fly from it. */
function caretPoint(el: HTMLInputElement | HTMLTextAreaElement) {
  measurer ??= document.createElement('canvas').getContext('2d')
  const cs = getComputedStyle(el)
  const r = el.getBoundingClientRect()
  const pl = parseFloat(cs.paddingLeft)
  const pt = parseFloat(cs.paddingTop)
  const before = el.value.slice(0, el.selectionStart ?? el.value.length)
  const lines = before.split('\n')
  const lineText = lines[lines.length - 1]
  let w = 0
  if (measurer) {
    measurer.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
    w = measurer.measureText(el.type === 'password' ? '•'.repeat(lineText.length) : lineText).width
  }
  const x = r.left + pl + Math.min(Math.max(w - el.scrollLeft, 0), r.width - pl * 2)
  if (el instanceof HTMLTextAreaElement) {
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4
    const y = r.top + pt + (lines.length - 0.5) * lh - el.scrollTop
    return { x, y: Math.min(Math.max(y, r.top + pt), r.bottom - pt) }
  }
  return { x, y: r.top + r.height / 2 }
}

const INPUT =
  'block w-full resize-y border-0 bg-transparent px-4 py-3.5 text-[17px] leading-snug font-semibold text-ink outline-0 placeholder:text-mute'
const POP = 'cubic-bezier(.2,1.6,.4,1)'

/**
 * Label + input (or textarea) in a sticker box. Focus makes the label hop and the border
 * charge up; typing jolts the box and throws sparks from the caret now and then. Turning
 * invalid shakes it with lettering; success pops a self-drawing check.
 */
export function Field({ label, value, onChange, multiline, type = 'text', placeholder, name, required, error, success, errorSfx = 'ダメ!' }: Props) {
  const id = useId()
  const box = useRef<HTMLSpanElement>(null)
  const labelEl = useRef<HTMLLabelElement>(null)
  const charge = useRef<HTMLSpanElement>(null)
  const check = useRef<HTMLSpanElement>(null)
  const typed = useRef(0)
  const [nativeBad, setNativeBad] = useState(false)
  const invalid = Boolean(error) || nativeBad
  const message = error && error !== true ? error : null
  const prevError = useRef(error)
  const prevSuccess = useRef(success)

  const spring = useSprings(
    box,
    { r: 0, x: 0, y: 0, s: 1 },
    (v, el) => {
      el.style.transform = `translate(${v.x}px, ${v.y}px) rotate(${v.r}deg) scale(${v.s})`
    },
    { stiffness: 700, damping: 16 },
  )

  const fail = () => {
    const b = box.current
    if (!b || prefersReducedMotion()) return
    spring.kick({ x: 620, r: -10 })
    window.setTimeout(() => spring.kick({ x: -520 }), 70)
    const r = b.getBoundingClientRect()
    spawn(burst(r.right - 16, r.top + 4, { radius: 22, spikes: 8, color: C.pop }))
    if (errorSfx) spawn(delayed(0.04, sfx(r.right - 34, r.top - 22, errorSfx, { size: 26, color: C.pop })))
  }

  useEffect(() => {
    const was = prevError.current
    prevError.current = error
    if (error && error !== was) fail()
    // only react to the error itself changing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error])

  useEffect(() => {
    const was = prevSuccess.current
    prevSuccess.current = success
    const c = check.current
    if (!success || was || !c || prefersReducedMotion()) return
    c.animate(
      [
        { transform: 'scale(0) rotate(-40deg)', opacity: 0 },
        { transform: 'scale(1.35) rotate(8deg)', opacity: 1, offset: 0.55 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 480, easing: POP, fill: 'backwards' },
    )
    c.querySelectorAll('path').forEach((p) =>
      p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 280, delay: 140, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'backwards' }),
    )
    const r = c.getBoundingClientRect()
    const x = r.left + r.width / 2
    const y = r.top + r.height / 2
    spawn(delayed(0.3, burst(x, y, { radius: 22, spikes: 9 })), delayed(0.36, sparkle(x + 16, y - 16, { size: 11, color: C.pop })))
    spring.kick({ s: 1.2 })
  }, [success, spring])

  const onType = (el: HTMLInputElement | HTMLTextAreaElement, next: string) => {
    const grew = next.length > value.length
    onChange(next)
    if (nativeBad) setNativeBad(false)
    spring.kick({ r: rand(-1, 1) * (grew ? 8 : 4), x: grew ? 40 : -40 })
    if (!grew) return
    const n = ++typed.current
    // sparks only now and then, so a long sentence doesn't turn into fireworks
    if (Math.random() > 0.35 && n % 6 !== 0) return
    const { x, y } = caretPoint(el)
    spawn(shards(x, y, { count: 3, speed: 200, size: 5, colors: [C.accent, C.ink, C.pop] }))
    if (n % 6 === 0) spawn(sparkle(x + rand(-4, 8), y - rand(14, 22), { size: 8, color: C.pop }))
    if (n % 14 === 0) spawn(sfx(x, y - 30, 'カッ', { size: 20 }))
  }

  const onFocus = () => {
    const b = box.current
    if (!b || prefersReducedMotion()) return
    const flat = uiStyle() === 'flat'
    // the label hops, the border charges up, a swipe runs under the box
    labelEl.current?.animate(
      [
        { transform: 'none' },
        { transform: `translateY(${flat ? -4 : -9}px) scale(1.06, .96)`, offset: 0.35 },
        { transform: 'translateY(1px) scale(1.03, .95)', offset: 0.7 },
        { transform: 'none' },
      ],
      { duration: 420, easing: 'ease-out' },
    )
    charge.current?.animate(
      [
        { opacity: 0, transform: `scale(${flat ? 1.04 : 1.12})` },
        { opacity: 1, transform: 'scale(1)', offset: 0.45 },
        { opacity: 0.9, transform: 'scale(1)', offset: 0.6 },
        { opacity: 0, transform: 'scale(1.04)' },
      ],
      { duration: 560, easing: 'ease-out' },
    )
    spring.kick({ y: -120, s: 0.6 })
    const r = b.getBoundingClientRect()
    spawn(delayed(0.02, slash(r.left, r.bottom + 4, r.right, r.bottom - 6, { width: 8, bend: 0.05 })))
  }

  const common = {
    id,
    name,
    value,
    placeholder,
    required,
    onFocus,
    'aria-invalid': invalid || undefined,
    'aria-describedby': message ? `${id}-msg` : undefined,
    onInvalid: () => {
      setNativeBad(true)
      fail()
    },
    className: cn(INPUT, success && 'pr-12'),
  }

  return (
    <div className="group/field grid gap-2">
      <label
        ref={labelEl}
        htmlFor={id}
        className="ui-head origin-bottom-left justify-self-start text-[15px] leading-none text-ink transition-colors duration-200 group-focus-within/field:text-accent"
      >
        {label}
      </label>
      <span
        ref={box}
        data-invalid={invalid || undefined}
        className="ui-border ui-r ui-shadow-sm relative block origin-[20%_50%] bg-paper transition-[box-shadow,border-color] duration-200 focus-within:ui-shadow has-[:focus-visible]:outline-[2.5px] has-[:focus-visible]:outline-offset-[3px] has-[:focus-visible]:outline-accent has-[:focus-visible]:outline-solid data-invalid:border-pop data-invalid:has-[:focus-visible]:outline-pop"
      >
        <span ref={charge} aria-hidden="true" className="ui-r pointer-events-none absolute -inset-[3px] opacity-0 ring-[3px] ring-accent" />
        {multiline ? (
          <textarea rows={4} {...common} onChange={(e) => onType(e.currentTarget, e.target.value)} />
        ) : (
          <input type={type} {...common} onChange={(e) => onType(e.currentTarget, e.target.value)} />
        )}
        {success && (
          <span
            ref={check}
            aria-hidden="true"
            className={cn('ui-border-thin ui-pill ui-fill absolute right-3 grid size-7 place-items-center bg-accent text-white', multiline ? 'top-3' : 'top-1/2 -mt-3.5')}
          >
            <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-[4] [stroke-linecap:round] [stroke-linejoin:round]">
              <path d="M5 12.5 9.5 17 19 7" pathLength={1} strokeDasharray="1" />
            </svg>
          </span>
        )}
      </span>
      {message && (
        <p id={`${id}-msg`} className="m-0 flex animate-pop items-center gap-1.5 text-sm leading-tight font-bold text-pop">
          <span aria-hidden="true" className="ui-head ui-pill ui-fill grid size-5 place-items-center bg-pop text-[12px] leading-none text-white">
            !
          </span>
          {message}
        </p>
      )}
    </div>
  )
}
