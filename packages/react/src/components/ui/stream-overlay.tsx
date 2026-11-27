import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode, Ref } from 'react'
import { C, burst, centerOf, createSpring, delayed, impactAt, prefersReducedMotion, sparkle, spawn, uiStyle } from '@/fx'
import type { Spring } from '@/fx'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { Icon } from './icon'
import type { IconName } from './icon'
import { KineticType } from './kinetic-type'
import type { WordStyle } from './kinetic-type'
import { Marquee } from './marquee'
import { RollingNumber } from './rolling-number'
import { SplitFlap } from './split-flap'

/*
 * A stream overlay pack: full-frame scenes (starting soon, be right back, ending), follow / sub /
 * raid / tip alerts with a queue, and a goal bar. Everything sizes itself from its container
 * (container query units), so the same markup is a 1920 × 1080 browser source or a small card.
 */

// The option lists, for URL / form parsers (the embed page reads these).
// oxlint-disable-next-line react/only-export-components -- option list
export const STREAM_SCENES = ['starting', 'brb', 'ending'] as const
// oxlint-disable-next-line react/only-export-components -- option list
export const STREAM_SCENE_BACKGROUNDS = ['solid', 'transparent'] as const
// oxlint-disable-next-line react/only-export-components -- option list
export const STREAM_ALERT_KINDS = ['follow', 'sub', 'raid', 'donation'] as const
// oxlint-disable-next-line react/only-export-components -- option list
export const STREAM_ALERT_POSITIONS = ['top', 'center', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right'] as const

export type StreamSceneKind = (typeof STREAM_SCENES)[number]
export type StreamSceneBackground = (typeof STREAM_SCENE_BACKGROUNDS)[number]
export type StreamAlertKind = (typeof STREAM_ALERT_KINDS)[number]
export type StreamAlertPosition = (typeof STREAM_ALERT_POSITIONS)[number]

/* ───────────── shared ───────────── */

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const plain = (text: string) => text.replace(/\*/g, '').replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim()
const pad2 = (n: number) => String(n).padStart(2, '0')

/** 754 → "12:34", 4000 → "1:06:40". */
const clockText = (s: number) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s % 60)}` : `${pad2(m)}:${pad2(s % 60)}`
}
/** For screen readers: "about 5 minutes". */
const spoken = (s: number) => (s >= 3600 ? `about ${Math.round(s / 3600)} hours` : s >= 90 ? `about ${Math.round(s / 60)} minutes` : `${s} seconds`)

/** Seconds left, ticking on the second. `restart` starts a `seconds` countdown over. */
function useCountdown(seconds: number | undefined, to: number | undefined, restart: unknown) {
  const read = (end: number) => Math.max(0, Math.ceil((end - Date.now()) / 1000))
  const [left, setLeft] = useState<number | null>(() => (to !== undefined ? read(to) : seconds !== undefined ? Math.max(0, Math.round(seconds)) : null))
  const active = to !== undefined || seconds !== undefined
  useEffect(() => {
    if (!active) return
    const end = to ?? Date.now() + Math.max(0, seconds ?? 0) * 1000
    let id = 0
    const tick = () => {
      const ms = end - Date.now()
      const s = read(end)
      setLeft(s)
      // wake just after the next whole second
      if (s > 0) id = window.setTimeout(tick, (((ms % 1000) + 1000) % 1000) + 15)
    }
    tick()
    return () => window.clearTimeout(id)
  }, [active, seconds, to, restart])
  return active ? left : null
}

/** Wide (16:9, 4:3, 1:1) or tall (4:5, 9:16): read from layout sizes, so a scaled frame reports its real resolution. */
function useShape(ref: { current: HTMLElement | null }) {
  const [tall, setTall] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const read = () => {
      const w = el.offsetWidth
      const h = el.offsetHeight
      if (w > 0 && h > 0) setTall(w / h < 0.9)
    }
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return tall
}

/** Cancel a list of animations (cleanup helper). */
const stopAll = (list: Animation[]) => {
  for (const a of list) a.cancel()
  list.length = 0
}

/* ───────────── StreamScene ───────────── */

export type StreamSceneProps = {
  /** Which screen: before the stream, a break, or the end card. Each has its own composition. */
  scene: StreamSceneKind
  /** The headline. `*word*` is emphasis, `\n` a line break. Default per scene. */
  title?: string
  /** One line under the headline. Default per scene; '' hides it. */
  subtitle?: string
  /** Small label over the headline ("Up next", "Intermission"…). Default per scene. */
  kicker?: string
  /** Channel name on the corner bug and on the scene change band. */
  channel?: string
  /** Countdown length in seconds, counted from when the scene (or this value) changes. */
  countdown?: number
  /** Countdown to a moment instead (a timestamp in ms, e.g. Date.parse('2026-12-01T20:00')). Wins over `countdown`. */
  countdownTo?: number
  /** Label over the countdown. Default per scene ("Starts in", "Back in", "Next stream in"). */
  countdownLabel?: string
  /** Label once the countdown reaches zero. */
  doneLabel?: string
  /** The end card's next stream, on a split-flap board ("FRI 20:00"). */
  next?: string
  /** Ticker items along the bottom (schedule, socials). None: no ticker. */
  ticker?: string[]
  /** Label on the ticker's tab. Default per scene. */
  tickerLabel?: string
  /** The character: an image URL or any node (it is placed bottom-anchored). */
  art?: string | ReactNode
  /** `transparent` drops the backdrop for an OBS browser source; the panels stay. */
  background?: StreamSceneBackground
  /** Play the entrance on mount too (an OBS source). Otherwise only a scene change plays it. */
  intro?: boolean
  /** Fired once when the countdown reaches zero. */
  onCountdownEnd?: () => void
  className?: string
}

type Copy = {
  title: string
  subtitle: string
  kicker: string
  state: string
  icon: IconName
  count: string
  done: string
  ticker: string
  word: WordStyle
  flapDone?: string
}

const COPY: Record<StreamSceneKind, Copy> = {
  starting: {
    title: 'Starting *soon*',
    subtitle: 'Grab a drink and get comfy',
    kicker: 'Up next',
    state: 'Pre-show',
    icon: 'clock',
    count: 'Starts in',
    done: 'Going live',
    ticker: 'Schedule',
    word: 'stamp',
    flapDone: 'LIVE',
  },
  brb: {
    title: 'Be right *back*',
    subtitle: 'Stretch, sip some water',
    kicker: 'Intermission',
    state: 'Paused',
    icon: 'pause',
    count: 'Back in',
    done: 'Back any second',
    ticker: 'Meanwhile',
    word: 'tape',
  },
  ending: {
    title: 'Thanks for *watching*',
    subtitle: 'See you at the next one',
    kicker: "That's a wrap",
    state: 'Off air',
    icon: 'star',
    count: 'Next stream in',
    done: 'Starting soon',
    ticker: 'Find us',
    word: 'block',
  },
}

/** The countdown drum runs downwards, so every second is one flip (0 wraps to 9). */
const COUNT_DRUM = '9876543210'

/** Where each kind of entrance starts (translate / scale compose with the element's own rotate). */
const ENTER_FROM: Record<string, Keyframe> = {
  down: { translate: '0 -3cqh' },
  up: { translate: '0 3cqh' },
  left: { translate: '-3cqw 0' },
  right: { translate: '3cqw 0' },
  pop: { scale: '0.92' },
  rise: { translate: '0 9cqh' },
}
const ENTER_TO: Record<string, Keyframe> = {
  down: { translate: '0 0' },
  up: { translate: '0 0' },
  left: { translate: '0 0' },
  right: { translate: '0 0' },
  pop: { scale: '1' },
  rise: { translate: '0 0' },
}

/* ── backdrops: built from the theme tokens, slow, and composited (transform only) ── */

/** Deterministic 0..1 noise, so the backdrop is the same on every load. */
const noise = (i: number, k: number) => {
  const v = Math.sin((i + 1) * k * 12.9898) * 43758.5453
  return v - Math.floor(v)
}

const STREAKS = Array.from({ length: 15 }, (_, i) => ({
  y: 3 + i * 6.6 + noise(i, 1.3) * 3,
  len: 12 + noise(i, 2.7) * 26,
  h: 0.3 + noise(i, 4.1) * 0.75,
  dur: 10 + noise(i, 5.9) * 12,
  phase: noise(i, 7.3),
  hot: i % 4 === 1,
}))

/** Slow streaks drifting across a tilted field: the "about to start" rush, kept calm. */
function Streaks() {
  const host = useRef<HTMLDivElement>(null)
  const { style } = useTheme()
  useEffect(() => {
    const el = host.current
    if (!el) return
    const anims: Animation[] = []
    const still = prefersReducedMotion()
    const slow = style === 'flat' ? 1.6 : 1
    el.querySelectorAll<HTMLElement>('[data-streak]').forEach((s, i) => {
      const d = STREAKS[i]
      if (still) {
        s.style.translate = `${150 - d.phase * 190}cqw 0`
        return
      }
      s.style.translate = ''
      const a = s.animate([{ translate: '150cqw 0' }, { translate: '-45cqw 0' }], { duration: d.dur * 1000 * slow, iterations: Infinity })
      a.currentTime = d.phase * d.dur * 1000 * slow
      anims.push(a)
    })
    return () => stopAll(anims)
  }, [style])
  return (
    <div
      ref={host}
      aria-hidden="true"
      className={cn(
        'absolute inset-[-25%] rotate-[-11deg]',
        '[--streak:color-mix(in_srgb,var(--color-ink)_9%,transparent)] [--streak-hot:color-mix(in_srgb,var(--color-accent)_38%,transparent)]',
        '[[data-style=manga]_&]:[--streak:color-mix(in_srgb,var(--color-ink)_16%,transparent)] [[data-style=manga]_&]:[--streak-hot:color-mix(in_srgb,var(--color-ink)_30%,transparent)]',
        '[[data-style=flat]_&]:rotate-0 [[data-style=flat]_&]:[--streak:color-mix(in_srgb,var(--color-ink)_5%,transparent)] [[data-style=flat]_&]:[--streak-hot:color-mix(in_srgb,var(--color-accent)_18%,transparent)]',
      )}
    >
      {STREAKS.map((d, i) => (
        <span
          key={i}
          data-streak=""
          className="absolute left-0 rounded-full"
          style={{
            top: `${d.y}%`,
            width: `${d.len}cqw`,
            height: `${d.h}cqmin`,
            background: `linear-gradient(90deg, var(${d.hot ? '--streak-hot' : '--streak'}) 0%, var(${d.hot ? '--streak-hot' : '--streak'}) 35%, transparent 100%)`,
          }}
        />
      ))}
    </div>
  )
}

/** A screentone field drifting one dot per cycle, fading out towards the middle. */
function ToneDrift() {
  const host = useRef<HTMLDivElement>(null)
  const { style } = useTheme()
  useEffect(() => {
    const el = host.current
    if (!el || prefersReducedMotion()) return
    const a = el.animate([{ translate: '0 0' }, { translate: '3.2cqmin 3.2cqmin' }], { duration: style === 'flat' ? 14000 : 9000, iterations: Infinity })
    return () => a.cancel()
  }, [style])
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden"
      style={{
        maskImage: 'radial-gradient(ellipse 60% 55% at 50% 46%, transparent 35%, #000 85%)',
        WebkitMaskImage: 'radial-gradient(ellipse 60% 55% at 50% 46%, transparent 35%, #000 85%)',
      }}
    >
      <div
        ref={host}
        className={cn(
          'absolute inset-[-4cqmin] [background-size:3.2cqmin_3.2cqmin]',
          '[--dot:color-mix(in_srgb,var(--color-accent)_26%,transparent)] [[data-style=manga]_&]:[--dot:color-mix(in_srgb,var(--color-ink)_20%,transparent)] [[data-style=flat]_&]:[--dot:color-mix(in_srgb,var(--color-ink)_7%,transparent)]',
        )}
        style={{ backgroundImage: 'radial-gradient(circle, var(--dot) 0 24%, transparent 27%)' }}
      />
    </div>
  )
}

/** Giant outlined words crawling behind the scene. */
function Watermark({ text }: { text: string }) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = host.current
    if (!el || prefersReducedMotion()) return
    const a = el.animate([{ translate: '0 0' }, { translate: '-50% 0' }], { duration: 70000, iterations: Infinity })
    return () => a.cancel()
  }, [])
  const run = `${text}  ·  ${text}  ·  `
  return (
    <div aria-hidden="true" className="absolute inset-x-0 overflow-hidden" style={{ bottom: 'calc(var(--m) + var(--tk) + 2cqh)' }}>
      <div
        ref={host}
        className="ui-head w-max text-[19cqmin] leading-[1.05] whitespace-pre text-transparent [-webkit-text-stroke:0.22cqmin_color-mix(in_srgb,var(--color-ink)_13%,transparent)] [[data-style=flat]_&]:[-webkit-text-stroke:0.16cqmin_color-mix(in_srgb,var(--color-ink)_8%,transparent)]"
      >
        {run}
        {run}
      </div>
    </div>
  )
}

/** A slowly turning sunburst behind the end card's character. */
function Sunburst({ x, y }: { x: string; y: string }) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = host.current
    if (!el || prefersReducedMotion()) return
    const a = el.animate([{ rotate: '0deg' }, { rotate: '360deg' }], { duration: 150000, iterations: Infinity })
    return () => a.cancel()
  }, [])
  return (
    <div
      ref={host}
      aria-hidden="true"
      className={cn(
        'absolute size-[230cqmax] -translate-x-1/2 -translate-y-1/2 rounded-full',
        '[--ray:color-mix(in_srgb,var(--color-accent-soft)_55%,transparent)] [[data-style=manga]_&]:[--ray:color-mix(in_srgb,var(--color-ink)_11%,transparent)] [[data-style=flat]_&]:[--ray:color-mix(in_srgb,var(--color-accent-soft)_28%,transparent)]',
      )}
      style={{
        left: x,
        top: y,
        background: 'repeating-conic-gradient(from 0deg, var(--ray) 0deg 6deg, transparent 6deg 15deg)',
        maskImage: 'radial-gradient(circle, #000 6%, transparent 34%)',
        WebkitMaskImage: 'radial-gradient(circle, #000 6%, transparent 34%)',
      }}
    />
  )
}

/** A planet behind the character, with a dashed orbit that turns and carries one moon. */
function Orbit({ style }: { style: CSSProperties }) {
  const ring = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ring.current
    if (!el || prefersReducedMotion()) return
    const a = el.animate([{ rotate: '0deg' }, { rotate: '360deg' }], { duration: 48000, iterations: Infinity })
    return () => a.cancel()
  }, [])
  return (
    <div aria-hidden="true" className="absolute" style={style}>
      <div className="ui-border ui-tone absolute inset-[9%] rounded-full bg-accent-soft [[data-style=flat]_&]:border-transparent" />
      <div ref={ring} className="absolute inset-0 rounded-full border-[0.35cqmin] border-dashed border-[color-mix(in_srgb,var(--color-ink)_30%,transparent)]">
        <span className="ui-border-thin absolute top-[12%] left-[12%] size-[5%] rounded-full bg-pop" />
      </div>
    </div>
  )
}

/* ── panels ── */

function Bug({ channel, state, icon, live }: { channel?: string; state: string; icon: IconName; live: boolean }) {
  return (
    <div
      data-enter="down"
      className="ui-border ui-r ui-shadow-sm absolute z-20 flex items-stretch overflow-hidden bg-paper text-[2.2cqmin] leading-none text-ink"
      style={{ top: 'var(--m)', left: 'var(--m)' }}
    >
      <span className="ui-fill grid place-items-center bg-accent px-[0.6em] text-white">
        <Icon name={icon} tone="solid" size="1.1em" />
      </span>
      {channel && <span className="ui-head flex items-center px-[0.75em] py-[0.6em]">{channel}</span>}
      <span
        className={cn(
          'flex items-center gap-[0.45em] px-[0.75em] font-mono text-[0.78em] font-bold tracking-[0.08em] text-mute uppercase',
          channel && 'border-l-[length:var(--ui-bw-thin)] border-l-[color:var(--color-line)]',
        )}
      >
        <span data-pulse={live ? '' : undefined} className={cn('size-[0.6em] rounded-full', live ? 'bg-pop' : 'bg-line')} />
        {state}
      </span>
    </div>
  )
}

function Kicker({ children, icon, tone = 'accent' }: { children: ReactNode; icon?: IconName; tone?: 'accent' | 'pop' | 'ink' }) {
  const fill = { accent: 'bg-accent text-white', pop: 'bg-pop text-white', ink: 'bg-ink text-paper' }[tone]
  return (
    <span
      data-enter="left"
      className={cn(
        'ui-head ui-pill ui-border-thin ui-fill inline-flex shrink-0 items-center gap-[0.45em] px-[0.8em] py-[0.45em] text-[2.3cqmin] leading-none',
        fill,
      )}
    >
      {icon && <Icon name={icon} tone="solid" size="1em" />}
      {children}
    </span>
  )
}

function Ticker({ label, items, reverse }: { label: string; items: string[]; reverse?: boolean }) {
  // about 3.3 em per second whatever the frame size: the loop is three copies of the items
  const em = items.reduce((s, w) => s + w.length * 0.56 + 1.6, 0) * 3
  return (
    <div
      data-enter="up"
      className="ui-border ui-r ui-shadow-sm absolute z-20 flex overflow-hidden bg-paper text-[2.6cqmin] leading-none"
      style={{ left: 'var(--m)', right: 'var(--m)', bottom: 'var(--m)', height: 'var(--tk)' }}
    >
      <span className="ui-head ui-fill flex shrink-0 items-center gap-[0.45em] bg-ink px-[0.85em] text-[0.86em] text-paper">
        <Icon name="bell" tone="solid" size="1em" />
        {label}
      </span>
      <Marquee
        words={items}
        tone="paper"
        reverse={reverse}
        interactive={false}
        speed={Math.max(12, em / 3.3)}
        className="grid min-w-0 flex-1 content-center border-y-0 py-0 [&>div]:text-[2.6cqmin]"
      />
      <ul className="sr-only">
        {items.map((w, i) => (
          <li key={i}>{w}</li>
        ))}
      </ul>
    </div>
  )
}

function ArtSlot({ art, style, flip }: { art: ReactNode; style: CSSProperties; flip?: boolean }) {
  if (art === undefined || art === null || art === false || art === '') return null
  return (
    <div data-enter="rise" aria-hidden="true" className="pointer-events-none absolute z-[5]" style={style}>
      <div data-bob="" className={cn('h-full w-full', flip && '-scale-x-100')}>
        {typeof art === 'string' ? <img src={art} alt="" draggable={false} className="block h-full w-full object-contain object-bottom select-none" /> : art}
      </div>
    </div>
  )
}

/** The countdown (or the next-stream line) on a split-flap board, with its label. */
function FlapCard({
  label,
  value,
  drum,
  className,
  size,
  center,
}: {
  label: string
  value: string
  drum?: string
  className?: string
  size: string
  center?: boolean
}) {
  return (
    <div data-enter="up" className={cn('grid gap-[1.4cqh]', center && 'justify-items-center', className)}>
      <span className="ui-head flex items-center gap-[0.45em] text-[2.4cqmin] leading-none text-ink">
        <Icon name="clock" size="1.15em" />
        {label}
      </span>
      <div aria-hidden="true" className="w-full">
        <SplitFlap
          value={value}
          columns={[...value].length}
          charset={drum}
          speed={drum ? 12 : 22}
          align="center"
          size={size}
          boardClassName={center ? undefined : 'mx-0'}
        />
      </div>
    </div>
  )
}

/**
 * A full-frame stream screen: starting soon, be right back, or the end card. Each scene has its
 * own composition (headline, countdown, character, a living backdrop drawn from the theme
 * tokens) and a ticker along the bottom. Switching scenes sweeps a band across the frame and
 * the new panels come in; with `intro` the entrance also plays on mount. It fills its container
 * and scales with it (container units), so a 1920 × 1080 browser source and a small card match.
 * `background="transparent"` keeps only the panels, for keying over a game or a camera.
 */
export function StreamScene({ scene, channel, background = 'solid', intro = false, onCountdownEnd, className, ...content }: StreamSceneProps) {
  const root = useRef<HTMLDivElement>(null)
  const band = useRef<HTMLDivElement>(null)
  const tall = useShape(root)
  const { style } = useTheme()
  const [shown, setShown] = useState(scene)
  const copy = COPY[shown]

  // while the band is on its way in, the old scene keeps the content it had
  const held = useRef(content)
  useLayoutEffect(() => {
    if (scene === shown) held.current = content
  })
  const {
    title,
    subtitle,
    kicker,
    countdown,
    countdownTo,
    countdownLabel,
    doneLabel,
    next,
    ticker = [],
    tickerLabel,
    art,
  } = scene === shown ? content : held.current
  const left = useCountdown(countdown, countdownTo, shown)

  // the scene change: a band sweeps over and the new scene swaps in under it
  useEffect(() => {
    if (scene === shown) return
    const el = band.current
    if (!el || prefersReducedMotion() || uiStyle() === 'flat') {
      setShown(scene)
      return
    }
    const dur = 900
    el.animate(
      [
        { translate: '-130% 0', easing: 'cubic-bezier(.7,0,.25,1)' },
        { translate: '0 0', offset: 0.44 },
        { translate: '0 0', offset: 0.56, easing: 'cubic-bezier(.75,0,.3,1)' },
        { translate: '130% 0' },
      ],
      { duration: dur },
    )
    const id = window.setTimeout(() => setShown(scene), dur * 0.5)
    return () => window.clearTimeout(id)
    // the requested scene is the only trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene])

  // panels come in after a scene change (or on mount with `intro`)
  const entered = useRef<StreamSceneKind | null>(intro ? null : scene)
  useLayoutEffect(() => {
    const el = root.current
    if (!el || entered.current === shown) return
    entered.current = shown
    const still = prefersReducedMotion()
    const flat = uiStyle() === 'flat'
    el.querySelectorAll<HTMLElement>('[data-enter]').forEach((node, i) => {
      const kind = node.dataset.enter || 'up'
      const from = still ? { opacity: 0 } : { opacity: 0, ...ENTER_FROM[kind] }
      const to = still ? { opacity: 1 } : { opacity: 1, ...ENTER_TO[kind] }
      node.animate([from, to], {
        duration: still ? 220 : flat ? 460 : 640,
        delay: 60 + i * 65,
        easing: still || flat ? 'cubic-bezier(.2,.7,.3,1)' : 'cubic-bezier(.2,1.18,.4,1)',
        fill: 'backwards',
      })
    })
    // the headline drops in word by word (individual properties: they compose with the layout transform)
    el.querySelectorAll<HTMLElement>('[data-headline] [aria-hidden="true"]:not(.invisible) > span').forEach((word, i) => {
      word.animate(
        still
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [
              { opacity: 0, translate: '0 -0.42em' },
              { opacity: 1, translate: '0 0' },
            ],
        {
          duration: still ? 220 : flat ? 460 : 620,
          delay: 140 + i * 75,
          easing: still || flat ? 'cubic-bezier(.2,.7,.3,1)' : 'cubic-bezier(.25,1.5,.45,1)',
          fill: 'backwards',
        },
      )
    })
    // no cleanup: the panels are keyed on the scene, so the next change replaces them anyway
    // the shown scene is the only trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown])

  // the character breathes, the live dot pulses: both slow, both off with reduced motion
  useEffect(() => {
    const el = root.current
    if (!el || prefersReducedMotion()) return
    const anims: Animation[] = []
    el.querySelectorAll<HTMLElement>('[data-bob]').forEach((n) => {
      anims.push(
        n.animate([{ translate: '0 0' }, { translate: '0 -1cqh' }], {
          duration: style === 'flat' ? 4200 : 3200,
          iterations: Infinity,
          direction: 'alternate',
          easing: 'ease-in-out',
        }),
      )
    })
    el.querySelectorAll<HTMLElement>('[data-pulse]').forEach((n) => {
      anims.push(n.animate([{ opacity: 1 }, { opacity: 0.3 }], { duration: 1100, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }))
    })
    return () => stopAll(anims)
  }, [shown, style, tall])

  const ended = useRef(false)
  const onEnd = useRef(onCountdownEnd)
  useLayoutEffect(() => {
    onEnd.current = onCountdownEnd
  })
  useEffect(() => {
    if (left === null || left > 0) {
      ended.current = false
      return
    }
    if (ended.current) return
    ended.current = true
    onEnd.current?.()
  }, [left])

  const solid = background !== 'transparent'
  const headline = title ?? copy.title
  const sub = subtitle ?? copy.subtitle
  const kick = kicker ?? copy.kicker
  const items = ticker.map((t) => t.trim()).filter(Boolean)
  const done = left === 0
  const countLabel = done ? (doneLabel ?? copy.done) : (countdownLabel ?? copy.count)
  const vars = {
    '--m': tall ? '5.5cqw' : '4.6cqmin',
    '--tk': items.length ? (tall ? '8.5cqw' : '7.4cqmin') : '0px',
  } as CSSProperties
  const above = 'calc(var(--m) + var(--tk))'

  const words = (props: { align: 'left' | 'center'; valign: 'top' | 'middle' | 'bottom' }) => (
    <div data-headline="" className="absolute inset-0">
      <KineticType text={headline} wordStyle={copy.word} fit="box" align={props.align} valign={props.valign} />
    </div>
  )
  const subLine = (align: 'left' | 'center') =>
    sub ? (
      <p
        data-enter={align === 'center' ? 'up' : 'left'}
        className={cn('m-0 max-w-full text-[3cqmin] leading-tight font-bold text-mute', align === 'center' && 'text-center')}
      >
        {sub}
      </p>
    ) : null

  let body: ReactNode
  if (shown === 'starting') {
    const flap = left === null ? null : done && copy.flapDone ? copy.flapDone : clockText(left)
    body = (
      <>
        {solid && (
          <>
            <Streaks />
            <Orbit
              style={
                tall
                  ? { width: '78cqw', height: '78cqw', left: '11cqw', bottom: `calc(${above} + 4cqh)` }
                  : // centred behind the character, never wider than its half of the frame
                    {
                      width: 'min(66cqh, 46cqw)',
                      height: 'min(66cqh, 46cqw)',
                      right: 'calc(25cqw - min(33cqh, 23cqw))',
                      top: 'calc(47cqh - min(33cqh, 23cqw))',
                    }
              }
            />
          </>
        )}
        <ArtSlot
          art={art}
          style={
            tall
              ? { left: '8cqw', right: '8cqw', top: 'calc(var(--m) + 9cqw + 41cqh)', bottom: `calc(${above} - 1.5cqh)` }
              : { right: '3cqw', width: '44cqw', height: '80cqh', bottom: `calc(${above} - 2.5cqh)` }
          }
        />
        <div
          className="absolute z-10 flex flex-col items-start"
          style={
            tall
              ? { left: 'var(--m)', right: 'var(--m)', top: 'calc(var(--m) + 9cqw)', height: '40cqh' }
              : { left: 'var(--m)', width: '54cqw', top: '17cqh', bottom: `calc(${above} + 5cqh)` }
          }
        >
          <Kicker icon="play">{kick}</Kicker>
          <div className="relative mt-[2cqh] mb-[1.6cqh] min-h-0 w-full flex-1">{words({ align: 'left', valign: 'bottom' })}</div>
          {subLine('left')}
          {flap !== null && (
            <FlapCard
              label={countLabel}
              value={flap}
              drum={done && copy.flapDone ? undefined : COUNT_DRUM}
              className="mt-[3.5cqh] w-full"
              size={tall ? 'text-[6.5cqw]' : 'text-[7.4cqmin]'}
            />
          )}
        </div>
      </>
    )
  } else if (shown === 'brb') {
    body = (
      <>
        {solid && (
          <>
            <ToneDrift />
            <Watermark text={plain(headline)} />
          </>
        )}
        <ArtSlot
          art={art}
          flip
          style={
            tall
              ? { left: '-10cqw', width: '72cqw', top: 'calc(var(--m) + 10cqw + 49cqh)', bottom: `calc(${above} - 1cqh)`, zIndex: 15 }
              : { left: '3cqw', width: '22cqw', height: '64cqh', bottom: `calc(${above} - 1.5cqh)`, zIndex: 15 }
          }
        />
        <div
          className="absolute z-10 grid place-items-center"
          style={
            tall
              ? { left: 'var(--m)', right: 'var(--m)', top: 'calc(var(--m) + 10cqw)', height: '46cqh' }
              : { left: '21cqw', right: '21cqw', top: '13cqh', bottom: `calc(${above} + 7cqh)` }
          }
        >
          <div data-enter="pop" className="relative w-full rotate-[-1.4deg] [[data-style=flat]_&]:rotate-0">
            {/* two strips of tape hold the card up */}
            <span
              aria-hidden="true"
              className="absolute -top-[2.2cqmin] left-[8%] z-10 h-[4.4cqmin] w-[14cqmin] rotate-[-7deg] bg-[color-mix(in_srgb,var(--color-accent-soft)_80%,transparent)] [[data-style=flat]_&]:hidden"
            />
            <span
              aria-hidden="true"
              className="absolute -top-[2.2cqmin] right-[8%] z-10 h-[4.4cqmin] w-[14cqmin] rotate-[6deg] bg-[color-mix(in_srgb,var(--color-accent-soft)_80%,transparent)] [[data-style=flat]_&]:hidden"
            />
            <div className="ui-border ui-r-lg ui-shadow-lg flex flex-col items-center bg-paper px-[4.5cqmin] pt-[4cqmin] pb-[3.6cqmin]">
              <Kicker icon={copy.icon} tone="ink">
                {kick}
              </Kicker>
              <div className="relative my-[2.2cqh] w-full" style={{ height: tall ? '15cqh' : '25cqh' }}>
                {words({ align: 'center', valign: 'middle' })}
              </div>
              {subLine('center')}
              {left !== null && (
                <div
                  data-enter="up"
                  className="ui-pill ui-border mt-[3cqh] flex items-center gap-[0.7em] bg-canvas py-[0.35em] pr-[0.9em] pl-[0.7em] text-[2.6cqmin] leading-none"
                >
                  <span className="ui-head flex items-center gap-[0.4em] text-ink">
                    <Icon name="clock" size="1.2em" />
                    {countLabel}
                  </span>
                  <RollingNumber value={left} format={clockText} aria-hidden="true" digitClassName="ui-head text-[2.4em] text-accent" />
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    )
  } else {
    const board = next ? next.toUpperCase() : left !== null ? clockText(left) : null
    body = (
      <>
        {solid && <Sunburst x={tall ? '50cqw' : '25cqw'} y={tall ? '78cqh' : '62cqh'} />}
        {solid && (
          <div
            aria-hidden="true"
            className="ui-border ui-tone absolute rounded-full bg-accent [[data-style=flat]_&]:border-transparent [[data-style=flat]_&]:bg-accent-soft"
            style={
              tall
                ? { width: '64cqw', height: '64cqw', left: '18cqw', top: 'calc(78cqh - 32cqw)' }
                : { width: '50cqh', height: '50cqh', left: 'calc(25cqw - 25cqh)', top: '37cqh' }
            }
          />
        )}
        <ArtSlot
          art={art}
          style={
            tall
              ? { left: '6cqw', right: '6cqw', top: 'calc(var(--m) + 9cqw + 40cqh)', bottom: `calc(${above} - 1.5cqh)` }
              : { left: '2cqw', width: '46cqw', height: '82cqh', bottom: `calc(${above} - 2.5cqh)` }
          }
        />
        <div
          className="absolute z-10 flex flex-col items-start"
          style={
            tall
              ? { left: 'var(--m)', right: 'var(--m)', top: 'calc(var(--m) + 9cqw)', height: '38cqh' }
              : { left: '50cqw', right: 'var(--m)', top: '20cqh', bottom: `calc(${above} + 5cqh)` }
          }
        >
          <Kicker icon={copy.icon} tone="pop">
            {kick}
          </Kicker>
          <div className="relative mt-[2cqh] mb-[1.6cqh] min-h-0 w-full flex-1">{words({ align: 'left', valign: 'middle' })}</div>
          {subLine('left')}
          {board !== null && (
            <FlapCard
              label={next ? 'Next stream' : countLabel}
              value={board}
              drum={next ? undefined : COUNT_DRUM}
              className="mt-[3.5cqh] w-full"
              size={tall ? 'text-[6cqw]' : 'text-[6.4cqmin]'}
            />
          )}
        </div>
      </>
    )
  }

  return (
    <div
      ref={root}
      data-stream-scene={shown}
      className={cn('relative isolate h-full w-full overflow-hidden text-ink [container-type:size]', solid && 'bg-canvas', className)}
      style={vars}
    >
      <h2 className="sr-only">{plain(headline)}</h2>
      {left !== null && (
        <p className="sr-only">
          {countLabel} {left > 0 ? spoken(left) : ''}
        </p>
      )}
      {/* keyed: a scene change remounts its panels, so the entrance starts clean */}
      <div key={shown} className="absolute inset-0">
        {body}
        <Bug channel={channel} state={copy.state} icon={copy.icon} live={shown === 'starting'} />
        {items.length > 0 && <Ticker label={tickerLabel ?? copy.ticker} items={items} reverse={shown === 'ending'} />}
      </div>
      {/* the scene change band (parked off-frame) */}
      <div
        ref={band}
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-[-12%] left-[-30%] z-40 flex w-[160%] -skew-x-12"
        style={{ translate: '-130% 0' }}
      >
        <span className="w-[6%] bg-pop" />
        <span className="ui-fill grid flex-1 place-items-center border-x-[length:var(--ui-bw)] border-x-[color:var(--ui-line)] bg-accent">
          {channel && <span className="ui-head skew-x-12 text-[9cqmin] leading-none text-white">{channel}</span>}
        </span>
        <span className="w-[3%] bg-ink" />
      </div>
    </div>
  )
}

/* ───────────── StreamAlert ───────────── */

export type StreamAlertEvent = {
  kind: StreamAlertKind
  /** Who did it: the big lettering. */
  name: string
  /** Their message, one or two lines. */
  message?: string
  /** Months for a sub, raiders for a raid, the amount for a tip (a string is shown as is: "5.00"). */
  amount?: number | string
}

export type StreamAlertHandle = {
  /** Queue an alert: it plays after the ones already waiting. */
  push(event: StreamAlertEvent): void
  /** Drop the waiting alerts (the one on screen finishes). */
  clear(): void
}

export type StreamAlertProps = {
  /** Where the card sits in the frame; it comes in from that side. */
  position?: StreamAlertPosition
  /** How long each alert holds on screen, in ms (entrance and exit not counted). */
  duration?: number
  /** Kicker per kind ("New follower"…). */
  labels?: Partial<Record<StreamAlertKind, string>>
  /** Sound-effect word per kind, or false for none. */
  sfx?: Partial<Record<StreamAlertKind, string | false>>
  /** Fired when an alert lands, and when it has left. */
  onShow?: (event: StreamAlertEvent) => void
  onDone?: (event: StreamAlertEvent) => void
  className?: string
  ref?: Ref<StreamAlertHandle>
}

type Kind = { icon: IconName; label: string; sfx: string; fill: string; bar: string; color: () => string }
const KINDS: Record<StreamAlertKind, Kind> = {
  follow: { icon: 'heart', label: 'New follower', sfx: 'ピコン!', fill: 'bg-accent text-white', bar: 'bg-accent', color: () => C.accent },
  sub: { icon: 'star', label: 'New sub', sfx: 'キラッ!', fill: 'bg-pop text-white', bar: 'bg-pop', color: () => C.pop },
  raid: { icon: 'flag', label: 'Raid incoming', sfx: 'ドーン!', fill: 'bg-ink text-paper', bar: 'bg-ink', color: () => C.pop },
  donation: { icon: 'coin', label: 'Tip', sfx: 'チャリン!', fill: 'bg-accent-soft text-ink', bar: 'bg-accent', color: () => C.accent },
}

const amountText = (e: StreamAlertEvent) => {
  if (e.amount === undefined || e.amount === '') return null
  if (typeof e.amount === 'string') return e.amount
  const n = e.amount
  if (e.kind === 'sub') return `${n} ${n === 1 ? 'month' : 'months'}`
  if (e.kind === 'raid') return `${n.toLocaleString()} ${n === 1 ? 'raider' : 'raiders'}`
  return n.toLocaleString()
}

/** Where a card starts, in % of its own size (and scale). */
const FROM: Record<StreamAlertPosition, { x: number; y: number; s: number }> = {
  top: { x: 0, y: -140, s: 0.92 },
  center: { x: 0, y: 0, s: 0.4 },
  bottom: { x: 0, y: 140, s: 0.92 },
  'top-left': { x: -115, y: 0, s: 0.95 },
  'bottom-left': { x: -115, y: 0, s: 0.95 },
  'top-right': { x: 115, y: 0, s: 0.95 },
  'bottom-right': { x: 115, y: 0, s: 0.95 },
}
const PLACE: Record<StreamAlertPosition, string> = {
  top: 'items-start justify-center',
  center: 'items-center justify-center',
  bottom: 'items-end justify-center',
  'top-left': 'items-start justify-start',
  'top-right': 'items-start justify-end',
  'bottom-left': 'items-end justify-start',
  'bottom-right': 'items-end justify-end',
}

const ENTER_MS = 520
const EXIT_MS = 340

type Queued = StreamAlertEvent & { id: number }

function AlertCard({
  event,
  position,
  duration,
  label,
  word,
  waiting,
  onShow,
  onDone,
}: {
  event: Queued
  position: StreamAlertPosition
  duration: number
  label: string
  word: string | false
  waiting: number
  onShow: () => void
  onDone: () => void
}) {
  const card = useRef<HTMLDivElement>(null)
  const face = useRef<HTMLDivElement>(null)
  const name = useRef<HTMLSpanElement>(null)
  const stamp = useRef<HTMLSpanElement>(null)
  const bar = useRef<HTMLSpanElement>(null)
  const cb = useRef({ onShow, onDone })
  useLayoutEffect(() => {
    cb.current = { onShow, onDone }
  })
  const k = KINDS[event.kind]
  const amount = amountText(event)
  const letters = [...event.name]

  useLayoutEffect(() => {
    const el = card.current
    const body = face.current
    if (!el || !body) return
    // a long name shrinks to the card (layout sizes: a scaled frame must not skew the ratio)
    const n = name.current
    if (n) {
      n.style.fontSize = '1.9em'
      const room = n.clientWidth
      const need = n.scrollWidth
      if (room > 0 && need > room) n.style.fontSize = `${Math.max(0.9, (1.9 * room) / need - 0.02).toFixed(3)}em`
    }
    const still = prefersReducedMotion()
    const flat = uiStyle() === 'flat'
    const from = FROM[position]
    const timers: number[] = []
    const anims: Animation[] = []
    const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))
    let spring: Spring<'x' | 'y' | 's' | 'o'> | null = null

    if (still) {
      el.style.opacity = '1'
      anims.push(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, fill: 'backwards' }))
    } else {
      // the card springs in from its side: a little overshoot in cel / manga, none in flat
      spring = createSpring({ x: from.x, y: from.y, s: from.s, o: 0 })
      spring.bind({
        el: () => card.current,
        config: () => (flat ? { stiffness: 300, damping: 34 } : { stiffness: 430, damping: 27 }),
        render: (v, node) => {
          node.style.translate = `${v.x}% ${v.y}%`
          node.style.scale = String(v.s)
          node.style.opacity = String(clamp(v.o, 0, 1))
        },
      })
      spring.draw()
      spring.set({ x: 0, y: 0, s: 1, o: 1 })

      // the hit, as it lands: burst and focus lines around the card, the face flashes
      later(150, () => {
        const box = face.current
        if (!box) return
        const { x, y, rect } = centerOf(box)
        const size = clamp(rect.width / 440, 0.4, 1.5)
        impactAt(x, y, { text: false, size, color: k.color(), smoky: false })
        spawn(delayed(0.1, sparkle(rect.right - rect.width * 0.08, rect.top, { size: 18 * size })))
        anims.push(
          box.animate([{ filter: flat ? 'brightness(1.12)' : 'brightness(1.5) saturate(1.2)' }, { filter: 'none' }], { duration: 260, easing: 'ease-out' }),
        )
      })
      // the name letters hop in one after another
      name.current?.querySelectorAll<HTMLElement>('[data-l]').forEach((l, i) => {
        anims.push(
          l.animate(
            [
              { opacity: 0, translate: '0 0.55em', scale: '0.5' },
              { opacity: 1, translate: '0 0', scale: '1' },
            ],
            { duration: flat ? 360 : 460, delay: 170 + i * 26, easing: flat ? 'cubic-bezier(.2,.7,.3,1)' : 'cubic-bezier(.2,1.45,.4,1)', fill: 'backwards' },
          ),
        )
      })
      // the sound-effect word stamps down
      const sfxEl = stamp.current
      if (sfxEl) {
        anims.push(
          sfxEl.animate(
            [
              { opacity: 0, scale: '2.1', rotate: '-22deg' },
              { opacity: 1, scale: '0.92', rotate: '-6deg', offset: 0.6 },
              { opacity: 1, scale: '1', rotate: '-8deg' },
            ],
            { duration: 420, delay: 230, easing: 'cubic-bezier(.3,.8,.4,1)', fill: 'backwards' },
          ),
        )
      }
      // the hold drains along the bottom edge
      if (bar.current) anims.push(bar.current.animate([{ scale: '1 1' }, { scale: '0 1' }], { duration, delay: ENTER_MS, fill: 'both' }))
    }

    later(ENTER_MS, () => cb.current.onShow())
    later(ENTER_MS + duration, () => {
      spring?.stop()
      const to = still ? { opacity: 0 } : { opacity: 0, translate: `${from.x * 0.3}% ${from.y * 0.3}%`, scale: String(Math.max(0.85, from.s)) }
      const out = el.animate([{ opacity: 1, translate: '0% 0%', scale: '1' }, to], {
        duration: still ? 200 : EXIT_MS,
        easing: 'cubic-bezier(.5,0,.75,0)',
        fill: 'forwards',
      })
      anims.push(out)
      out.onfinish = () => cb.current.onDone()
    })

    return () => {
      timers.forEach((t) => window.clearTimeout(t))
      spring?.stop()
      stopAll(anims)
    }
    // one run per alert (the card is keyed on its id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={card} className="relative w-[17em] max-w-full" style={{ opacity: 0 }}>
      <div ref={face} className="ui-border ui-r-lg ui-shadow relative flex items-stretch overflow-hidden bg-paper text-ink">
        <span
          className={cn('ui-fill ui-tone grid w-[3.6em] shrink-0 place-items-center border-r-[length:var(--ui-bw)] border-r-[color:var(--ui-line)]', k.fill)}
        >
          <Icon name={k.icon} tone="solid" size="1.7em" />
        </span>
        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)] content-center gap-[0.32em] px-[0.8em] pt-[0.62em] pb-[0.78em]">
          <div className="flex min-w-0 items-center justify-between gap-[0.6em]">
            <span className="ui-head truncate text-[0.62em] leading-none tracking-[0.06em] text-mute uppercase">{label}</span>
            {amount && (
              <span className="ui-head ui-pill ui-border-thin inline-flex shrink-0 items-center gap-[0.3em] bg-canvas px-[0.55em] py-[0.25em] text-[0.62em] leading-none text-ink">
                {event.kind === 'donation' && <Icon name="coin" size="1.1em" />}
                {amount}
              </span>
            )}
          </div>
          <span ref={name} className="ui-head block overflow-x-clip py-[0.06em] leading-[1.08] whitespace-pre text-ink">
            {letters.map((ch, i) => (
              <span key={i} data-l="" className="inline-block">
                {ch}
              </span>
            ))}
          </span>
          {event.message && <p className="m-0 line-clamp-2 text-[0.7em] leading-snug font-semibold text-mute">{event.message}</p>}
        </div>
        <span ref={bar} aria-hidden="true" className={cn('absolute inset-x-0 bottom-0 h-[0.2em] origin-left', k.bar)} />
      </div>
      {word && (
        <span
          ref={stamp}
          aria-hidden="true"
          className="ui-lettering pointer-events-none absolute -top-[0.75em] -right-[0.5em] rotate-[-8deg] text-[1.45em] whitespace-nowrap [[data-style=flat]_&]:hidden"
        >
          {word}
        </span>
      )}
      {waiting > 0 && (
        <span className="ui-pill ui-border-thin absolute -bottom-[0.7em] left-[3.9em] bg-ink px-[0.6em] py-[0.25em] font-mono text-[0.5em] leading-none font-bold text-paper">
          +{waiting} more
        </span>
      )}
    </div>
  )
}

/**
 * Follow, sub, raid and tip pop-ups. Push alerts through the ref and they play one after another:
 * each card springs in from its side and lands with a hit (burst and focus lines on the FX
 * canvas), the name hops in letter by letter under a small sound-effect word, the hold drains
 * along the bottom, and it leaves cleanly. It fills its positioned parent and never blocks the
 * pointer, so it layers over a StreamScene, a video, or nothing at all (an OBS source).
 * Nothing plays until something is pushed. Reduced motion: a plain fade, no effects.
 */
export function StreamAlert({ position = 'top', duration = 4600, labels, sfx, onShow, onDone, className, ref }: StreamAlertProps) {
  const queue = useRef<Queued[]>([])
  const seq = useRef(0)
  const [current, setCurrent] = useState<Queued | null>(null)
  const [waiting, setWaiting] = useState(0)
  const busy = useRef(false)
  const gap = useRef(0)
  const cbs = useRef({ onShow, onDone })
  useLayoutEffect(() => {
    cbs.current = { onShow, onDone }
  })

  const advance = () => {
    const next = queue.current.shift() ?? null
    busy.current = next !== null
    setWaiting(queue.current.length)
    setCurrent(next)
  }

  useImperativeHandle(
    ref,
    () => ({
      push(event) {
        if (!event || !STREAM_ALERT_KINDS.includes(event.kind) || !String(event.name ?? '').trim()) return
        queue.current.push({ ...event, name: String(event.name).trim(), id: ++seq.current })
        // a flood keeps the newest 30 waiting
        if (queue.current.length > 30) queue.current.splice(0, queue.current.length - 30)
        if (busy.current) setWaiting(queue.current.length)
        else advance()
      },
      clear() {
        queue.current = []
        setWaiting(0)
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(() => () => window.clearTimeout(gap.current), [])

  return (
    // the root is the size container; the frame inside reads its units from it
    <div className={cn('pointer-events-none absolute inset-0 [container-type:size]', className)}>
      <div className={cn('absolute inset-0 flex p-[5cqmin] text-[clamp(9px,min(2.1cqw,3.3cqh),46px)]', PLACE[position])}>
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {current
            ? `${labels?.[current.kind] ?? KINDS[current.kind].label}: ${current.name}${amountText(current) ? `, ${amountText(current)}` : ''}${current.message ? `. ${current.message}` : ''}`
            : ''}
        </div>
        {current && (
          <div aria-hidden="true" className="max-w-[92cqw]">
            <AlertCard
              key={current.id}
              event={current}
              position={position}
              duration={Math.max(800, duration)}
              label={labels?.[current.kind] ?? KINDS[current.kind].label}
              word={sfx?.[current.kind] === undefined ? KINDS[current.kind].sfx : (sfx[current.kind] ?? false)}
              waiting={waiting}
              onShow={() => cbs.current.onShow?.(current)}
              onDone={() => {
                cbs.current.onDone?.(current)
                setCurrent(null)
                // a beat of air between two alerts
                gap.current = window.setTimeout(advance, 220)
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

/* ───────────── StreamGoal ───────────── */

export type StreamGoalProps = {
  /** The count now. Every change animates the fill and rolls the number. */
  value: number
  /** The target. */
  goal: number
  /** What is counted. */
  label?: string
  icon?: IconName
  /** Fractions of the goal that get a notch and a burst when passed. */
  milestones?: number[]
  /** The label once the goal is reached. */
  reachedLabel?: string
  /** Lettering on the celebration (cel / manga), or false. */
  sfx?: string | false
  className?: string
}

/**
 * A goal bar for a stream ("Follower goal 412 / 500"). The fill glides on a spring and the
 * count rolls when the value changes; passing a milestone notch throws a small burst there,
 * and reaching the goal sets off a celebration (impact, lettering, the bar turns pop and the
 * label changes). It fills its container's width and sizes its type from it. Nothing fires
 * on mount, only on changes. Reduced motion: the fill moves, no effects.
 */
export function StreamGoal({
  value,
  goal,
  label = 'Follower goal',
  icon = 'heart',
  milestones = [0.25, 0.5, 0.75],
  reachedLabel = 'Goal reached!',
  sfx: word = '達成!',
  className,
}: StreamGoalProps) {
  const card = useRef<HTMLDivElement>(null)
  const face = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const fill = useRef<HTMLDivElement>(null)
  const medal = useRef<HTMLSpanElement>(null)
  const safeGoal = Math.max(1, goal)
  const pct = clamp((value / safeGoal) * 100, 0, 100)
  const reached = value >= safeGoal
  const prev = useRef(value)
  const timers = useRef<number[]>([])

  const [bar] = useState(() =>
    createSpring<'p', HTMLDivElement>(
      { p: pct },
      {
        config: () => ({ stiffness: 120, damping: 21 }),
        render: (v, el) => {
          el.style.clipPath = `inset(0 ${(100 - clamp(v.p, 0, 100)).toFixed(3)}% 0 0)`
        },
      },
    ),
  )
  const [hop] = useState(() =>
    createSpring<'y' | 's', HTMLDivElement>(
      { y: 0, s: 1 },
      {
        config: () => ({ stiffness: 520, damping: 22 }),
        render: (v, el) => {
          el.style.translate = `0 ${v.y}px`
          el.style.scale = String(v.s)
        },
      },
    ),
  )
  useLayoutEffect(() => {
    bar.bind({ el: () => fill.current })
    hop.bind({ el: () => card.current })
    bar.draw()
    return () => {
      bar.stop()
      hop.stop()
    }
  }, [bar, hop])

  useEffect(() => {
    const before = prev.current
    prev.current = value
    if (before === value) return
    const still = prefersReducedMotion()
    if (still) bar.snap({ p: pct })
    else bar.set({ p: pct })
    if (still || value < before) return

    // milestones passed on the way up: a small burst at each notch as the fill gets there
    const lo = before / safeGoal
    const hi = value / safeGoal
    milestones
      .filter((m) => m > 0 && m < 1 && lo < m && hi >= m)
      .forEach((m, i) => {
        timers.current.push(
          window.setTimeout(
            () => {
              const t = track.current
              if (!t) return
              const { rect } = centerOf(t)
              const x = rect.left + rect.width * m
              const y = rect.top + rect.height / 2
              const k = clamp(rect.height / 16, 0.6, 2.2)
              spawn(burst(x, y, { radius: 20 * k, spikes: 9, color: C.pop }), delayed(0.06, sparkle(x + 10 * k, y - 14 * k, { size: 11 * k, color: C.pop })))
            },
            180 + i * 120,
          ),
        )
      })

    // the goal: a full hit on the card, the medal flips to a crown
    if (before < safeGoal && value >= safeGoal) {
      timers.current.push(
        window.setTimeout(() => {
          const f = face.current
          if (!f) return
          const { x, y, rect } = centerOf(f)
          impactAt(x, y, { text: word, size: clamp(rect.width / 520, 0.5, 1.4), color: C.pop, smoky: false })
          hop.kick({ y: -260, s: 0.9 })
          f.animate([{ filter: uiStyle() === 'flat' ? 'brightness(1.1)' : 'brightness(1.45) saturate(1.2)' }, { filter: 'none' }], {
            duration: 320,
            easing: 'ease-out',
          })
          medal.current?.animate(
            [
              { rotate: '0deg', scale: '1' },
              { rotate: '-200deg', scale: '1.35', offset: 0.55 },
              { rotate: '-360deg', scale: '1' },
            ],
            { duration: 560, easing: 'cubic-bezier(.3,.9,.4,1)' },
          )
        }, 320),
      )
    }
    // the targets read the latest props; the value is the only trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // a new goal without a new value: just move the fill
  useEffect(() => {
    bar.set({ p: pct })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal])

  useEffect(() => {
    const list = timers.current
    return () => list.forEach((t) => window.clearTimeout(t))
  }, [])

  return (
    <div className={cn('@container w-full min-w-0', className)}>
      <div ref={card} className="relative text-[clamp(11px,4.3cqw,40px)]">
        <div ref={face} className="ui-border ui-r-lg ui-shadow relative bg-paper px-[0.75em] pt-[0.6em] pb-[0.75em] text-ink">
          <div className="flex min-w-0 items-center gap-[0.55em]">
            <span
              ref={medal}
              className={cn(
                'ui-pill ui-border-thin ui-fill grid size-[1.75em] shrink-0 place-items-center text-white transition-colors duration-300',
                reached ? 'bg-pop' : 'bg-accent',
              )}
            >
              <Icon name={reached ? 'crown' : icon} tone="solid" size="1em" />
            </span>
            <span className="ui-head min-w-0 flex-1 truncate text-[0.9em] leading-none">{reached ? reachedLabel : label}</span>
            <span className="ui-head flex shrink-0 items-baseline gap-[0.25em] leading-none tabular-nums">
              <RollingNumber value={value} separator aria-hidden="true" digitClassName="text-[1.12em] text-ink" />
              <span className="text-[0.8em] text-mute">/ {safeGoal.toLocaleString()}</span>
            </span>
          </div>
          <div
            ref={track}
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={safeGoal}
            aria-valuenow={Math.min(value, safeGoal)}
            className="ui-pill ui-border-thin relative mt-[0.55em] h-[0.9em] overflow-hidden bg-canvas"
          >
            <div
              ref={fill}
              className={cn('ui-fill absolute inset-0 transition-colors duration-500', reached ? 'bg-pop' : 'bg-accent')}
              style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
            >
              <span className="motion-lines absolute inset-0 opacity-60 [[data-style=flat]_&]:opacity-30" />
            </div>
            {milestones
              .filter((m) => m > 0 && m < 1)
              .map((m) => (
                <span
                  key={m}
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-y-[18%] w-[max(2px,0.09em)] -translate-x-1/2 rounded-full',
                    pct >= m * 100 ? 'bg-white/80' : 'bg-[color-mix(in_srgb,var(--color-ink)_28%,transparent)]',
                  )}
                  style={{ left: `${m * 100}%` }}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
