import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { prefersReducedMotion, uiStyle } from '@/fx'
import type { UiStyle } from '@/fx'
import { cn } from '@/lib/utils'
import { ICON_NAMES, Icon } from './icon'
import type { IconName } from './icon'
import { TimelineScrubber, at as within, useTimeline } from './timeline'

/* ───────────── API ───────────── */

export type ChatReplayMessage = {
  /** Who sends it. The `me` participant sits on the right in accent bubbles. */
  from: string
  /** The message, as real text. */
  text: string
  /** Second the message lands. Default: after the previous one has been read (`speed`) plus `gap`. */
  at?: number
  /** Seconds of lead-in before it lands: the typing dots for the other side, a short beat for mine. Default: from the length. */
  typing?: number
  /** A reaction chip that pops onto the bubble corner a moment after it lands: a short word ('lol'), an icon name ('heart') or any node. */
  reaction?: ReactNode
}

export type ChatReplaySkin = 'night' | 'paper' | 'ink'

export type ChatReplayProps = {
  messages: ChatReplayMessage[]
  /** The participant that is "me" (right side). */
  me?: string
  /** Name on the top bar. Default: the other participant(s). */
  title?: string
  /** The look: night (dark cinematic stage, glow), paper (follows the kit theme and mode), ink (manga, black on paper with screentone). */
  skin?: ChatReplaySkin
  /** Reading pace in characters per second: how long a message stays before the next one starts. */
  speed?: number
  /** Extra pause between messages, in seconds. */
  gap?: number
  /** Seconds on the whole thread at the end (the camera pulls back), before the end or the loop. */
  hold?: number
  /** Show "Read" under my last message once the other side starts typing. */
  receipts?: boolean
  /** How close the camera sits. */
  zoom?: number
  /** Depth of field, 0..1: bubbles away from the newest blur and dim. */
  depth?: number
  /** External clock in seconds (a video, an audio track, a Timeline). When set the chat follows it. */
  time?: number
  autoplay?: boolean
  loop?: boolean
  /** Show a play / seek bar under the stage. */
  controls?: boolean
  /** Accessible name of the message log. */
  label?: string
  /** Classes for the stage: size it here (default aspect-[9/16], full width; aspect-video for 16:9). */
  className?: string
}

/* ───────────── Schedule ───────────── */

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const START = 0.8
const REACT_DELAY = 0.85

type Beat = { start: number; arrive: number; react: number }
type ScheduleOptions = { me?: string; speed?: number; gap?: number; hold?: number }

function schedule(messages: ChatReplayMessage[], { me = 'me', speed = 22, gap = 0.5, hold = 3.2 }: ScheduleOptions) {
  let cursor = START
  let prev = 0
  const beats: Beat[] = messages.map((m) => {
    const len = m.text.length
    const lead = Math.max(0, m.typing ?? (m.from === me ? 0.25 : clamp(0.6 + len * 0.024, 0.9, 2.3)))
    // arrivals never go backwards, so the list order is the time order
    const arrive = Math.max(prev, m.at ?? cursor + lead)
    const start = Math.max(prev, arrive - lead)
    prev = arrive
    cursor = arrive + Math.max(0.9, len / Math.max(1, speed)) + gap
    return { start, arrive, react: arrive + REACT_DELAY }
  })
  const last = beats[beats.length - 1]
  /** When the camera pulls back to the whole thread. */
  const wide = last ? Math.max(cursor, last.react + 0.7) : START
  return { beats, wide, end: wide + hold }
}

/** Length of a replay in seconds, for syncing it to a video or sizing your own timeline. */
// oxlint-disable-next-line react/only-export-components -- timing helper, part of the API
export function chatReplayDuration(messages: ChatReplayMessage[], options: ScheduleOptions = {}): number {
  return schedule(messages, options).end
}

/* ───────────── Skins ───────────── */

type Skin = {
  /** Stage background. */
  bg: string
  /** Solid colour behind the top bar fade. */
  base: string
  fg: string
  mute: string
  /** Status text while typing. */
  live: string
  their: CSSProperties
  mine: CSSProperties
  /** Kit classes on my bubbles (paper: the style's fill treatment). */
  mineClass?: string
  chip: CSSProperties
  dot: string
  avatar: (k: number) => CSSProperties
  /** Bubble corners: big, and the small tail / joined corner. */
  big: string
  small: string
  /** Extra shadow on the newest bubble. */
  glow?: string
  /** Opacity of the newest bubble's reflection (0 = none). */
  reflect: number
  texture: CSSProperties | null
  vignette: string
  /** Kit classes on the stage. */
  border?: string
}

const mix = (c: string, k: number, to = 'transparent') => `color-mix(in oklab, ${c} ${k}%, ${to})`
const AV = ['var(--color-pop)', 'var(--color-accent)', '#14b8a6', '#f59e0b']

const SKINS: Record<ChatReplaySkin, Skin> = {
  night: {
    bg: `radial-gradient(90% 60% at 50% 62%, ${mix('var(--color-accent)', 24)}, transparent 70%), radial-gradient(60% 40% at 20% 10%, ${mix('var(--color-pop)', 12)}, transparent 70%), #07080f`,
    base: '#07080f',
    fg: '#eeecff',
    mute: 'rgb(238 236 255 / 0.5)',
    live: mix('var(--color-accent)', 55, 'white'),
    their: { background: 'rgb(255 255 255 / 0.08)', color: '#eeecff', border: '1px solid rgb(255 255 255 / 0.14)', boxShadow: '0 0.4em 1.2em rgb(0 0 0 / 0.35)' },
    mine: {
      background: `linear-gradient(180deg, ${mix('var(--color-accent)', 82, 'white')}, var(--color-accent))`,
      color: '#fff',
      border: `1px solid ${mix('var(--color-accent)', 55, 'white')}`,
      boxShadow: '0 0.4em 1.2em rgb(0 0 0 / 0.35)',
    },
    chip: { background: '#171a2c', color: '#fff', border: '1px solid rgb(255 255 255 / 0.2)', boxShadow: '0 0.3em 0.8em rgb(0 0 0 / 0.4)' },
    dot: 'rgb(238 236 255 / 0.85)',
    avatar: (k) => ({ background: AV[k % AV.length], color: '#fff' }),
    big: '0.9em',
    small: '0.22em',
    glow: `0 0 1.4em ${mix('var(--color-accent)', 45)}, 0 0.5em 1.6em rgb(0 0 0 / 0.5)`,
    reflect: 0.2,
    texture: { backgroundImage: 'radial-gradient(rgb(255 255 255 / 0.07) 1px, transparent 1.4px)', backgroundSize: '18px 18px' },
    vignette: 'rgb(0 0 0 / 0.75)',
  },
  paper: {
    bg: 'var(--color-canvas)',
    base: 'var(--color-canvas)',
    fg: 'var(--color-ink)',
    mute: 'var(--color-mute)',
    live: 'var(--color-accent)',
    their: { background: 'var(--color-paper)', color: 'var(--color-ink)', border: 'var(--ui-bw-thin) solid var(--ui-line)', boxShadow: 'var(--ui-shadow-sm)' },
    mine: { background: 'var(--color-accent)', color: '#fff', border: 'var(--ui-bw-thin) solid var(--ui-line)', boxShadow: 'var(--ui-shadow-sm)' },
    mineClass: 'ui-fill',
    chip: { background: 'var(--color-paper)', color: 'var(--color-ink)', border: 'var(--ui-bw-thin) solid var(--ui-line)', boxShadow: 'var(--ui-shadow-sm)' },
    dot: 'var(--color-mute)',
    avatar: (k) => ({ background: AV[k % AV.length], color: '#fff', border: 'var(--ui-bw-thin) solid var(--ui-line)' }),
    big: 'calc(var(--ui-r-lg) * 1.1)',
    small: 'calc(var(--ui-r-sm) * 0.45)',
    glow: 'var(--ui-shadow)',
    reflect: 0.1,
    texture: null,
    vignette: mix('var(--color-ink)', 9),
    border: 'ui-border-thin',
  },
  ink: {
    bg: '#fbfaf5',
    base: '#fbfaf5',
    fg: '#141414',
    mute: 'rgb(20 20 20 / 0.55)',
    live: '#141414',
    their: { background: '#fff', color: '#141414', border: '0.11em solid #141414', boxShadow: '0.14em 0.14em 0 #141414' },
    mine: { background: '#141414', color: '#fbfaf5', border: '0.11em solid #141414', boxShadow: '0.14em 0.14em 0 rgb(20 20 20 / 0.3)' },
    chip: { background: '#fff', color: '#141414', border: '0.12em solid #141414' },
    dot: '#141414',
    avatar: () => ({ background: '#fff', color: '#141414', border: '0.1em solid #141414' }),
    big: '1.05em',
    small: '0.12em',
    reflect: 0,
    texture: { backgroundImage: 'radial-gradient(rgb(20 20 20 / 0.16) 0.9px, transparent 1.3px)', backgroundSize: '6px 6px' },
    vignette: 'rgb(20 20 20 / 0.14)',
  },
}

/* ───────────── Motion (pure functions of time) ───────────── */

type Feel = { z: number; w: number; from: number; slide: number; tilt: number; pz: number; pw: number; cam: number }
/** Damped springs per style: cel and manga overshoot a few percent, flat settles without and its camera moves slower. */
const FEEL: Record<UiStyle, Feel> = {
  cel: { z: 9, w: 12, from: 0.5, slide: 0.7, tilt: 28, pz: 9, pw: 14, cam: 4.4 },
  manga: { z: 12, w: 16, from: 0.55, slide: 0.6, tilt: 24, pz: 11, pw: 18, cam: 5 },
  flat: { z: 12, w: 8.5, from: 0.78, slide: 0.4, tilt: 14, pz: 12, pw: 10, cam: 3.4 },
}
const SETTLE = 0.8

/** 0 → 1 along a damped spring, `age` seconds after it started. */
const spring = (age: number, z: number, w: number) => 1 - Math.exp(-z * age) * Math.cos(w * age)

type Look = { transform: string; opacity: string }
const REST: Look = { transform: '', opacity: '' }
const n3 = (v: number) => v.toFixed(3)

/** A bubble landing: scales out of its tail corner, slides in from its own side and tips up from the floor. */
function enter(age: number, side: 1 | -1, f: Feel, still: boolean): Look {
  if (still || age >= SETTLE) return REST
  const k = spring(Math.max(0, age), f.z, f.w)
  const q = 1 - k
  const s = f.from + (1 - f.from) * k
  return {
    transform: `translate3d(${n3(side * f.slide * q)}em, ${n3(0.6 * q)}em, 0) rotateX(${n3(f.tilt * q)}deg) rotateY(${n3(-side * f.tilt * 0.5 * q)}deg) scale(${n3(s)})`,
    opacity: n3(clamp(age / 0.14, 0, 1)),
  }
}

/** A reaction chip popping on. */
function pop(age: number, f: Feel, still: boolean): Look {
  if (age < 0) return { transform: 'scale(0)', opacity: '0' }
  if (still || age >= SETTLE) return REST
  const k = spring(age, f.pz, f.pw)
  return { transform: `scale(${n3(k)}) rotate(${n3(-14 * (1 - k))}deg)`, opacity: n3(clamp(age / 0.08, 0, 1)) }
}

const written = new WeakMap<HTMLElement, string>()
/** Write a look to an element, skipping it when nothing changed. */
function paint(el: HTMLElement, look: Look) {
  const key = `${look.transform}|${look.opacity}`
  if (written.get(el) === key) return
  written.set(el, key)
  el.style.transform = look.transform
  el.style.opacity = look.opacity
}

/* ───────────── Pieces ───────────── */

const isIcon = (v: unknown): v is IconName => typeof v === 'string' && (ICON_NAMES as string[]).includes(v)

function Avatar({ name, style, className }: { name: string; style: CSSProperties; className?: string }) {
  return (
    <span aria-hidden="true" className={cn('grid shrink-0 place-items-center rounded-full font-bold leading-none uppercase', className)} style={style}>
      <span className="text-[0.6em]">{name.trim().charAt(0) || '?'}</span>
    </span>
  )
}

/** Corner radii: the sender's side gets small corners where a run's bubbles touch, and a small tail corner at the bottom. */
function corners(skin: Skin, mine: boolean, joined: boolean) {
  const top = joined ? skin.small : skin.big
  return mine ? `${skin.big} ${top} ${skin.small} ${skin.big}` : `${top} ${skin.big} ${skin.big} ${skin.small}`
}

type BodyProps = {
  messages: ChatReplayMessage[]
  me: string
  skin: Skin
  avatars: Map<string, number>
  /** How many messages have landed. */
  shown: number
  /** Who is typing right now (the next message's sender), or null. */
  typing: string | null
  /** One flag per landed message: '1' when its reaction is out. */
  reacted: string
  /** Index of my message that shows "Read", or -1. */
  readIdx: number
  /** The camera pulled back to the whole thread. */
  wide: boolean
  depth: number
  reduced: boolean
}

/** The thread. It only re-renders when something lands or leaves; the motion is written to the DOM per frame. */
const Body = memo(function Body({ messages, me, skin, avatars, shown, typing, reacted, readIdx, wide, depth, reduced }: BodyProps) {
  const lastFrom = shown > 0 ? messages[shown - 1].from : null
  const active = typing !== null ? shown : shown - 1
  // depth of field by distance from the newest bubble (off in the wide shot and for reduced motion)
  const focus = (i: number): CSSProperties => {
    if (wide || reduced) return {}
    const d = Math.abs(i - active)
    const b = Math.min(5, d * 1.3 * depth)
    return { filter: b ? `blur(${b.toFixed(2)}px)` : undefined, opacity: Math.max(0.3, 1 - d * 0.16 * depth) }
  }
  const avatarOf = (name: string) => skin.avatar(avatars.get(name) ?? 0)

  return (
    <>
      {messages.slice(0, shown).map((m, i) => {
        const mine = m.from === me
        const joined = i > 0 && messages[i - 1].from === m.from
        const hasReaction = m.reaction != null && m.reaction !== false
        const r = m.reaction
        const hot = i === active && !wide
        const look: CSSProperties = { ...(mine ? skin.mine : skin.their), borderRadius: corners(skin, mine, joined) }
        if (hot && skin.glow) look.boxShadow = skin.glow
        return (
          <div
            key={i}
            data-cr="row"
            className={cn(joined ? 'mt-[0.24em]' : 'mt-[0.75em]', hasReaction && 'mb-[0.55em]', '[transform-style:preserve-3d]')}
            style={{ transformOrigin: mine ? 'right bottom' : 'left bottom' }}
          >
            <div className={cn('flex items-end gap-[0.4em] transition-[filter,opacity] duration-500', mine ? 'justify-end pl-[16%]' : 'pr-[16%]')} style={focus(i)}>
              {!mine && <span className="w-[1.55em] shrink-0">{!joined && <Avatar name={m.from} style={avatarOf(m.from)} className="size-[1.55em]" />}</span>}
              <div className={cn('grid min-w-0', mine ? 'justify-items-end' : 'justify-items-start')}>
                {!mine && !joined && (
                  <span className="mb-[0.4em] ml-[0.5em] text-[0.5em] leading-none font-bold tracking-[0.04em]" style={{ color: skin.mute }}>
                    {m.from}
                  </span>
                )}
                <p
                  data-cam={hot || undefined}
                  className={cn('relative m-0 w-fit max-w-full px-[0.62em] py-[0.34em] leading-[1.3] font-semibold [overflow-wrap:anywhere] transition-shadow duration-500', mine && skin.mineClass)}
                  style={look}
                >
                  <span className="sr-only">{m.from}: </span>
                  {m.text}
                  {hot && typing === null && skin.reflect > 0 && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 top-full mt-[0.18em] block px-[0.62em] py-[0.34em] blur-[1px] [mask-image:linear-gradient(to_top,black,transparent_75%)]"
                      style={{ ...look, boxShadow: 'none', transform: 'scaleY(-1)', opacity: skin.reflect }}
                    >
                      {m.text}
                    </span>
                  )}
                  {hasReaction && reacted[i] === '1' && (
                    <span
                      data-cr="chip"
                      className={cn('absolute -bottom-[0.62em] flex items-center gap-[0.25em] rounded-full px-[0.5em] py-[0.22em] text-[0.48em] leading-none font-bold', mine ? 'left-[0.9em]' : 'right-[0.9em]')}
                      style={skin.chip}
                    >
                      <span className="sr-only">reaction: </span>
                      {isIcon(r) ? <Icon name={r} tone="line" size="1.15em" title={r} /> : r}
                    </span>
                  )}
                </p>
                {i === readIdx && (
                  <span data-cr="read" className="mt-[0.45em] mr-[0.3em] flex items-center gap-[0.25em] text-[0.45em] leading-none font-semibold" style={{ color: skin.mute }}>
                    <Icon name="check" tone="line" size="1.1em" />
                    Read
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
      {typing !== null && (
        <div
          aria-hidden="true"
          data-cr="typing"
          className={cn('[transform-style:preserve-3d]', lastFrom === typing ? 'mt-[0.24em]' : 'mt-[0.75em]')}
          style={{ transformOrigin: 'left bottom' }}
        >
          <div className="flex items-end gap-[0.4em] pr-[16%]">
            <span className="w-[1.55em] shrink-0">{lastFrom !== typing && <Avatar name={typing} style={avatarOf(typing)} className="size-[1.55em]" />}</span>
            <span
              data-cam
              className="flex h-[1.95em] items-center gap-[0.28em] px-[0.7em]"
              style={{ ...skin.their, borderRadius: corners(skin, false, lastFrom === typing), boxShadow: skin.glow ?? skin.their.boxShadow }}
            >
              {[0, 1, 2].map((j) => (
                <span key={j} data-cr="dot" className="size-[0.34em] rounded-full" style={{ background: skin.dot }} />
              ))}
            </span>
          </div>
        </div>
      )}
    </>
  )
})

/* ───────────── Component ───────────── */

/**
 * A text conversation as a motion graphic, for texting stories in shorts, explainers and product
 * demos. The thread sits on a plane in 3D and a camera rides the newest message: it drifts and
 * tilts toward whoever is talking, holds on the typing dots, zooms in as each bubble lands and
 * pulls back to the whole thread at the end. Bubbles spring out of their tail corner, runs from
 * one sender group, reactions pop onto the corner, a Read receipt shows once the reply starts,
 * and bubbles away from the newest fall out of focus. Three skins (night, paper that follows your
 * theme, manga ink). Everything is a function of time, so it scrubs both ways, loops and follows a
 * video through `time`. Reduced motion: a still camera, no blur, bubbles just appear.
 */
export function ChatReplay({
  messages,
  me = 'me',
  title,
  skin: skinName = 'night',
  speed = 22,
  gap = 0.5,
  hold = 3.2,
  receipts = true,
  zoom = 1,
  depth = 0.6,
  time,
  autoplay = true,
  loop = true,
  controls = false,
  label,
  className,
}: ChatReplayProps) {
  const skin = SKINS[skinName] ?? SKINS.night
  const [reduced] = useState(() => prefersReducedMotion())
  const { beats, wide: wideAt, end } = useMemo(() => schedule(messages, { me, speed, gap, hold }), [messages, me, speed, gap, hold])
  const others = useMemo(() => [...new Set(messages.map((m) => m.from).filter((f) => f !== me))], [messages, me])
  const avatars = useMemo(() => new Map(others.map((o, i) => [o, i])), [others])
  const name = title ?? (others.length ? others.join(', ') : 'Chat')
  const group = others.length > 1

  const tl = useTimeline({ duration: end, autoplay, loop, time })
  const t = tl.time

  // what is on screen at t (all discrete: the thread re-renders only when one of these changes)
  let shown = 0
  while (shown < messages.length && t >= beats[shown].arrive) shown++
  const next = messages[shown]
  const nb = beats[shown]
  const typing = next && next.from !== me && t >= nb.start ? next.from : null
  const wide = messages.length > 0 && t >= wideAt
  let reacted = ''
  for (let i = 0; i < shown; i++) reacted += messages[i].reaction != null && t >= beats[i].react ? '1' : '0'
  let readIdx = -1
  let readAt = 0
  if (receipts) {
    let lastMine = -1
    for (let i = shown - 1; i >= 0 && lastMine < 0; i--) if (messages[i].from === me) lastMine = i
    const reply = lastMine >= 0 ? messages.findIndex((m, j) => j > lastMine && m.from !== me) : -1
    if (reply >= 0 && t >= beats[reply].start) {
      readIdx = lastMine
      readAt = beats[reply].start
    }
  }
  const activeFrom = typing ?? (shown > 0 ? messages[shown - 1].from : null)
  const side: 1 | -1 = activeFrom === me ? 1 : -1

  const stage = useRef<HTMLDivElement>(null)
  const plane = useRef<HTMLDivElement>(null)
  const thread = useRef<HTMLDivElement>(null)

  // per render (every frame while playing): entrances, chips, dots and the loop fade, written to the DOM
  useLayoutEffect(() => {
    const root = thread.current
    if (!root) return
    const f = FEEL[uiStyle()] ?? FEEL.cel
    let row = 0
    let dot = 0
    for (const el of root.querySelectorAll<HTMLElement>('[data-cr]')) {
      const kind = el.dataset.cr
      if (kind === 'row') {
        const i = row++
        paint(el, enter(t - beats[i].arrive, messages[i].from === me ? 1 : -1, f, reduced))
      } else if (kind === 'chip') paint(el, pop(t - beats[row - 1].react, f, reduced))
      else if (kind === 'read') paint(el, { transform: '', opacity: reduced ? '' : n3(clamp((t - readAt) / 0.3, 0, 1)) })
      else if (kind === 'typing' && nb) {
        const age = t - nb.start
        const look = enter(age, -1, f, reduced)
        // once in, the typing bubble breathes
        paint(el, look !== REST || reduced ? look : { transform: `scale(${n3(1 + 0.025 * Math.sin(age * Math.PI * 2 * 0.9))})`, opacity: '' })
      } else if (kind === 'dot' && nb) {
        const v = reduced ? 0.5 : Math.max(0, Math.sin((t - nb.start) * Math.PI * 2 * 1.4 - dot++ * 0.85))
        paint(el, { transform: reduced ? '' : `translateY(${n3(-0.22 * v)}em)`, opacity: n3(0.35 + 0.65 * v) })
      }
    }
    // a looping replay fades out over its last half second, so the wrap to the top is soft
    const fade = loop && time === undefined && !reduced ? 1 - within(t, end - 0.5, end) : 1
    paint(root, { transform: '', opacity: fade < 1 ? n3(fade) : '' })
  })

  // the camera: a damped follow written straight to the DOM, outside React
  const want = useRef({ wide, zoom, reduced, side })
  useEffect(() => {
    want.current = { wide, zoom, reduced, side }
  })

  useEffect(() => {
    const st = stage.current
    const pl = plane.current
    if (!st || !pl) return
    let raf = 0
    let last = performance.now()
    let visible = true
    let resumed = false
    // ay: where the target sits on screen, as a fraction of the height (a bit low while following)
    const cam = { x: 0, y: 0, vx: 0, vy: 0, z: 1, rx: 0, ry: 0, rz: 0, ay: 0.6, ready: false }
    const fontPx = parseFloat(getComputedStyle(pl).fontSize) || 24

    const offsetIn = (el: HTMLElement) => {
      let x = 0
      let y = 0
      let n: HTMLElement | null = el
      while (n && n !== pl) {
        x += n.offsetLeft
        y += n.offsetTop
        n = n.offsetParent as HTMLElement | null
      }
      return { x, y }
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const W = st.clientWidth
      const H = st.clientHeight
      if (!W || !H) return
      const { wide: pulled, zoom: z0, reduced: still, side: s0 } = want.current
      const f = FEEL[uiStyle()] ?? FEEL.cel
      const s = now / 1000
      const cw = pl.offsetWidth
      const ch = pl.offsetHeight
      const target = { x: cw / 2, y: fontPx * 2, z: 1, rx: 0, ry: 0, rz: 0, ay: 0.6 }
      if (pulled) {
        const fit = Math.min(W / cw, H / ch, 1.4) * 0.88
        Object.assign(target, { y: ch / 2, z: fit, rx: still ? 0 : 7, ry: still ? 0 : -6, rz: still ? 0 : -1.5, ay: 0.52 })
      } else {
        // the stage size sets the zoom: the short side, softened on square-ish stages so type never outgrows them
        target.z = (Math.min(W, H * 1.15, Math.sqrt(W * H) * 0.78) / (fontPx * 16.5)) * z0
        const el = pl.querySelector<HTMLElement>('[data-cam]')
        if (el) {
          const p = offsetIn(el)
          // the bubble plus its avatar; a narrow stage centres on it, a wide one only leans toward its side
          const cx = p.x + el.offsetWidth / 2 - (s0 < 0 ? fontPx * 0.9 : 0)
          const lean = clamp(((cw * target.z) / W - 0.6) * 1.5, 0.4, 1)
          target.x = cw / 2 + (cx - cw / 2) * lean
          // its middle sits a little below centre, the older messages above
          target.y = p.y + el.offsetHeight / 2
        }
        if (!still) Object.assign(target, { rx: 13 + 2.5 * Math.sin(s * 0.31), ry: -7 * s0 + 3 * Math.sin(s * 0.19), rz: -1.6 * s0 + 1.2 * Math.sin(s * 0.23) })
      }
      if (still || !cam.ready) {
        Object.assign(cam, { x: target.x, y: target.y, vx: 0, vy: 0, z: target.z, rx: target.rx, ry: target.ry, rz: target.rz, ay: target.ay, ready: true })
      } else {
        // x / y ride a critically damped spring (continuous speed); zoom, angles and framing settle exponentially
        const w = pulled ? f.cam * 0.65 : f.cam
        cam.vx += (w * w * (target.x - cam.x) - 2 * w * cam.vx) * dt
        cam.vy += (w * w * (target.y - cam.y) - 2 * w * cam.vy) * dt
        cam.x += cam.vx * dt
        cam.y += cam.vy * dt
        const k = 1 - Math.exp(-dt * (pulled ? 1.4 : 2.2))
        cam.z += (target.z - cam.z) * k
        cam.rx += (target.rx - cam.rx) * k
        cam.ry += (target.ry - cam.ry) * k
        cam.rz += (target.rz - cam.rz) * k
        cam.ay += (target.ay - cam.ay) * k
      }
      pl.style.transform = `translate(${(W * 0.5).toFixed(2)}px, ${(H * cam.ay).toFixed(2)}px) scale(${cam.z.toFixed(4)}) rotateX(${cam.rx.toFixed(3)}deg) rotateY(${cam.ry.toFixed(3)}deg) rotateZ(${cam.rz.toFixed(3)}deg) translate(${(-cam.x).toFixed(2)}px, ${(-cam.y).toFixed(2)}px)`
    }

    const io = new IntersectionObserver(([e]) => {
      const was = visible
      visible = e.isIntersecting
      if (visible && !was) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
        if (resumed) tl.play()
        resumed = false
      } else if (!visible && was) {
        cancelAnimationFrame(raf)
        if (tl.playing && time === undefined) {
          tl.pause()
          resumed = true
        }
      }
    })
    io.observe(st)
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
    }
  }, [tl, time])

  const status = typing !== null ? (group ? `${typing} is typing…` : 'typing…') : group ? `${others.length + 1} members` : 'online'

  return (
    <div className="grid h-full w-full min-w-0 grid-rows-[minmax(0,1fr)] gap-3 has-[>:nth-child(2)]:grid-rows-[minmax(0,1fr)_auto]">
      <div
        ref={stage}
        className={cn('ui-r @container-size relative isolate aspect-[9/16] w-full min-w-0 overflow-hidden [perspective:1100px] [perspective-origin:50%_55%]', skin.border, className)}
        style={{ background: skin.bg, color: skin.fg }}
      >
        {skin.texture && <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={skin.texture} />}
        <div ref={plane} className="absolute top-0 left-0 w-[19em] origin-top-left px-[0.6em] pt-[2.4em] pb-[1.6em] text-[24px] leading-none will-change-transform [transform-style:preserve-3d]">
          <div ref={thread} role="log" aria-label={label ?? `Chat with ${name}`} className="[transform-style:preserve-3d]">
            <Body
              messages={messages}
              me={me}
              skin={skin}
              avatars={avatars}
              shown={shown}
              typing={typing}
              reacted={reacted}
              readIdx={readIdx}
              wide={wide}
              depth={depth}
              reduced={reduced}
            />
          </div>
        </div>
        {/* lens: vignette */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(120% 90% at 50% 55%, transparent 50%, ${skin.vignette} 100%)` }} />
        {/* top bar: who you are talking to, and whether they are typing */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-[clamp(10px,2.4cqmin,32px)] px-[clamp(14px,3.4cqmin,48px)] pt-[clamp(12px,3cqmin,44px)] pb-[clamp(28px,6cqmin,80px)]"
          style={{ background: `linear-gradient(to bottom, ${skin.base} 35%, transparent)` }}
        >
          <Avatar name={name} style={skin.avatar(0)} className="size-[clamp(32px,7cqmin,104px)] text-[clamp(22px,4.8cqmin,72px)]" />
          <span className="grid min-w-0 leading-tight">
            <span className="truncate text-[clamp(13px,3.2cqmin,44px)] font-bold">{name}</span>
            <span className="flex min-w-0 items-center gap-[0.5em] text-[clamp(11px,2.5cqmin,34px)] font-semibold" style={{ color: typing !== null ? skin.live : skin.mute }}>
              {typing === null && !group && <span className="size-[0.5em] shrink-0 rounded-full" style={{ background: skin.live }} />}
              <span className="truncate">{status}</span>
            </span>
          </span>
        </div>
      </div>
      {controls && time === undefined && <TimelineScrubber timeline={tl} label="Chat replay" />}
    </div>
  )
}
