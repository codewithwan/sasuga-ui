import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { prefersReducedMotion } from '@/fx'
import { cn } from '@/lib/utils'
import { playReelSound, preloadReelSounds, unlockReelSound } from './code-reel-sound'
import type { CodeReelSounds } from './code-reel-sound'
import { Icon } from './icon'
import type { IconName } from './icon'
import { TimelineScrubber, useTimeline } from './timeline'

export type { CodeReelSounds } from './code-reel-sound'

/* ───────────── API ───────────── */

export type TerminalTone = 'info' | 'ok' | 'warn' | 'error' | 'muted'
/** Colours a piece of a line can take: the tones, plus accent (code, paths), pop and strong (bold). */
export type TerminalInk = TerminalTone | 'accent' | 'pop' | 'strong'
export type TerminalSkin = 'night' | 'paper' | 'crt'
export type TerminalChrome = 'window' | 'none'

/** A coloured piece of a line. `icon` draws a kit icon in place of a glyph such as an arrow. */
export type TerminalSpan = {
  text?: string
  tone?: TerminalInk
  icon?: IconName
}
/** One line: plain text, or pieces (`['dist/', { text: 'game.js', tone: 'accent' }]`). */
export type TerminalLine = string | (string | TerminalSpan)[]

export type TerminalPrompt = {
  user?: string
  host?: string
  /** Working directory. `cd` commands in the script move it. */
  path?: string
  /** The prompt sign. */
  symbol?: string
}

export type TerminalStep =
  /** A command: the prompt, a short think, the command typed with human timing, Enter. */
  | { cmd: string; at?: number; speed?: number }
  /**
   * Output, streamed a few milliseconds per line. A string is one line (or several, split on new lines);
   * an array of strings is several lines; an array holding `{ text, tone }` pieces is one coloured line.
   * ok / info / warn / error put the tone's icon in front (like a CLI's status glyph); `mark: false`
   * tints the text instead. muted dims it.
   */
  | {
      out: TerminalLine | TerminalLine[]
      tone?: TerminalTone
      mark?: boolean
      delay?: number
    }
  /** An ASCII spinner that resolves into a done line with an icon. `done: false` erases it instead, like npm's own spinner. */
  | {
      spinner: string
      duration: number
      done?: string | false
      tone?: Exclude<TerminalTone, 'muted'>
      delay?: number
    }
  /** A progress bar that fills over `duration` with a percentage. `width` in characters. */
  | { progress: string; duration: number; width?: number; delay?: number }
  /** Nothing happens for `pause` seconds (the shell sits at its prompt). */
  | { pause: number }
  /** Wipe the screen. */
  | { clear: true }

export type TerminalReplayProps = {
  steps: TerminalStep[]
  prompt?: TerminalPrompt
  /** The look: night (dark terminal), paper (follows the kit theme and mode), crt (green phosphor with scanlines and glow). */
  skin?: TerminalSkin
  /** A window bar with three dots and a title, or the bare screen. */
  chrome?: TerminalChrome
  /** Window title. Default: the working directory. */
  title?: string
  /** Typing speed in characters per second (before the human jitter). */
  speed?: number
  /** Text size relative to the box. The text always scales with the box (container units). */
  zoom?: number
  /** External clock in seconds (a video, an audio track, a Timeline). When set the terminal follows it. */
  time?: number
  autoplay?: boolean
  loop?: boolean
  /** Show a play / seek bar under the screen. */
  controls?: boolean
  /** Text glow. Default: on for crt. */
  glow?: boolean
  /** Play `sounds`: true = 0.5, or a volume 0..1. Starts after the first click on the page. */
  sound?: boolean | number
  /** Audio files per event: key (one or several, per typed character), enter (a command is submitted), and ok / warn / error / info for status lines. */
  sounds?: CodeReelSounds
  /** Accessible name for the log. Default: the commands. */
  label?: string
  /** Classes for the screen: size it here (default aspect-video, full width; h-full inside a FrameStage). */
  className?: string
}

/* ───────────── Skins ───────────── */

type Skin = {
  bg: string
  /** Extra layer over the background (a soft light on the glass). */
  sheen: string
  fg: string
  mute: string
  line: string
  bar: string
  cursor: string
  user: string
  path: string
  track: string
  ink: Record<Exclude<TerminalInk, 'muted' | 'strong'>, string>
  glow: boolean
  scan: boolean
  vignette: string
}

const mix = (c: string, k: number, to = 'transparent') => `color-mix(in oklab, ${c} ${k}%, ${to})`

const SKINS: Record<TerminalSkin, Skin> = {
  night: {
    bg: '#0a0c14',
    sheen: 'radial-gradient(120% 80% at 50% 0%, rgb(122 162 255 / 0.07), transparent 60%)',
    fg: '#c9d1e9',
    mute: 'rgb(201 209 233 / 0.5)',
    line: 'rgb(255 255 255 / 0.08)',
    bar: 'rgb(255 255 255 / 0.035)',
    cursor: '#d9e6ff',
    user: '#5fe0a0',
    path: '#7aa2ff',
    track: 'rgb(255 255 255 / 0.1)',
    ink: {
      ok: '#5fe0a0',
      info: '#7aa2ff',
      warn: '#f2b25c',
      error: '#ff5c7a',
      accent: '#5fd4e0',
      pop: mix('var(--color-pop)', 80, 'white'),
    },
    glow: false,
    scan: false,
    vignette: 'rgb(0 0 0 / 0.35)',
  },
  paper: {
    bg: 'var(--color-paper)',
    sheen: 'none',
    fg: 'var(--color-ink)',
    mute: 'var(--color-mute)',
    line: mix('var(--color-ink)', 14),
    bar: mix('var(--color-ink)', 4),
    cursor: 'var(--color-accent)',
    user: '#18a058',
    path: 'var(--color-accent)',
    track: mix('var(--color-ink)', 12),
    ink: {
      ok: '#18a058',
      info: 'var(--color-accent)',
      warn: '#d98a00',
      error: '#e5484d',
      accent: mix('var(--color-accent)', 80, 'var(--color-ink)'),
      pop: 'var(--color-pop)',
    },
    glow: false,
    scan: false,
    vignette: 'transparent',
  },
  crt: {
    bg: '#020b05',
    sheen: 'radial-gradient(90% 70% at 50% 45%, rgb(61 255 138 / 0.07), transparent 70%)',
    fg: '#3dff8a',
    mute: 'rgb(61 255 138 / 0.5)',
    line: 'rgb(61 255 138 / 0.16)',
    bar: 'rgb(61 255 138 / 0.05)',
    cursor: '#7dffb0',
    user: '#b4ffcf',
    path: '#7dffb0',
    track: 'rgb(61 255 138 / 0.14)',
    ink: {
      ok: '#b4ffcf',
      info: '#7dffb0',
      warn: '#e4ff5c',
      error: '#ffb347',
      accent: '#d8ffe5',
      pop: '#e4ff5c',
    },
    glow: true,
    scan: true,
    vignette: 'rgb(0 10 4 / 0.85)',
  },
}

const MARK: Record<Exclude<TerminalTone, 'muted'>, IconName> = {
  ok: 'check',
  info: 'info',
  warn: 'warning',
  error: 'danger',
}
const SPIN = ['|', '/', '-', '\\']

/* ───────────── Schedule ───────────── */

type Span = { text: string; tone?: TerminalInk; icon?: IconName }

type Row =
  | {
      kind: 'prompt'
      at: number
      gone: number
      path: string
      text: string
      keys: number[]
      enter: number
    }
  | {
      kind: 'line'
      at: number
      gone: number
      spans: Span[]
      tone?: TerminalTone
      mark: boolean
    }
  | {
      kind: 'spinner'
      at: number
      gone: number
      end: number
      label: string
      done: string | false
      tone: Exclude<TerminalTone, 'muted'>
    }
  | {
      kind: 'progress'
      at: number
      gone: number
      end: number
      label: string
      width: number
    }

/** Before the first key, before Enter, after Enter; seconds between output lines; the idle tail. */
const THINK = 0.45
const BEFORE_ENTER = 0.3
const AFTER_ENTER = 0.12
const GAP = 0.035
const TAIL = 2.4

const isSpan = (v: unknown): v is TerminalSpan => typeof v === 'object' && v !== null && !Array.isArray(v)

function toLines(out: TerminalLine | TerminalLine[]): Span[][] {
  const list: TerminalLine[] = Array.isArray(out) ? (out.some(isSpan) ? [out as TerminalLine] : (out as TerminalLine[])) : [out]
  return list.flatMap((line) =>
    typeof line === 'string' ? line.split('\n').map((text) => [{ text }]) : [line.map((p) => (typeof p === 'string' ? { text: p } : { text: p.text ?? '', tone: p.tone, icon: p.icon }))],
  )
}

/** A small seeded random (mulberry32), so the same script always types the same way. */
function random(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let x = Math.imul(a ^ (a >>> 15), 1 | a)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}
const hash = (s: string) => [...s].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619), 2166136261)

/** When each key lands: a jittered rhythm, quicker runs inside a word, a reach for symbols, a breath after some spaces. */
function keyTimes(text: string, cps: number, start: number, seed: number, instant: boolean) {
  if (instant) return Array.from(text, () => start)
  const rand = random(seed)
  const base = 1 / Math.max(1, cps)
  const out: number[] = []
  let t = start
  for (let i = 0; i < text.length; i++) {
    if (i > 0) {
      const a = text[i - 1]
      const b = text[i]
      let f = 0.6 + rand() * 0.8
      if (/\w/.test(a) && /\w/.test(b)) f *= 0.72
      else if (b === ' ') f *= 1.05
      else if (a === ' ') f *= 1.3
      else f *= 1.2
      t += base * f
      if (a === ' ' && rand() < 0.2) t += 0.08 + rand() * 0.12
    }
    out.push(t)
  }
  return out
}

/** The working directory after `cmd`, when it is a cd. */
function cd(path: string, cmd: string) {
  const m = /^\s*cd(?:\s+(\S+))?\s*$/.exec(cmd)
  if (!m) return path
  const to = m[1] ?? '~'
  if (to === '-') return path
  if (to === '~') return '~'
  const from = to.startsWith('/') ? '/' : to.startsWith('~') ? '~' : path
  return to
    .replace(/^~\/?/, '')
    .split('/')
    .reduce((p, part) => {
      if (!part || part === '.') return p
      if (part === '..') return p.includes('/') ? p.slice(0, p.lastIndexOf('/')) || '/' : p
      return `${p === '/' ? '' : p}/${part}`
    }, from)
}

function plan(steps: TerminalStep[], home: string, speed: number, instant: boolean) {
  const rows: Row[] = []
  let t = 0.3
  /** When the shell last became idle: the next prompt shows from here. */
  let idle = t
  let path = home
  const clears: number[] = []
  const wipe = (at: number) => {
    for (const r of rows) if (r.gone === Infinity) r.gone = at
    clears.push(at)
  }
  steps.forEach((s, i) => {
    if ('cmd' in s) {
      const start = s.at ?? t + THINK
      const keys = keyTimes(s.cmd, s.speed ?? speed, start, hash(s.cmd) + i, instant)
      const enter = (keys[keys.length - 1] ?? start) + (instant ? 0.05 : BEFORE_ENTER)
      rows.push({
        kind: 'prompt',
        at: Math.min(idle, start),
        gone: Infinity,
        path,
        text: s.cmd,
        keys,
        enter,
      })
      path = cd(path, s.cmd)
      t = idle = enter + AFTER_ENTER
    } else if ('out' in s) {
      const t0 = t + (s.delay ?? 0)
      const lines = toLines(s.out)
      lines.forEach((spans, k) =>
        rows.push({
          kind: 'line',
          at: t0 + k * GAP,
          gone: Infinity,
          spans,
          tone: s.tone,
          mark: s.mark ?? true,
        }),
      )
      t = idle = t0 + lines.length * GAP
    } else if ('spinner' in s) {
      const t0 = t + (s.delay ?? 0)
      const end = t0 + Math.max(0, s.duration)
      const done = s.done === undefined ? s.spinner : s.done
      rows.push({
        kind: 'spinner',
        at: t0,
        gone: Infinity,
        end,
        label: s.spinner,
        done,
        tone: s.tone ?? 'ok',
      })
      // an erased spinner hands its line to the next output in the same frame, so the scroll never dips
      t = idle = done === false ? end : end + GAP
    } else if ('progress' in s) {
      const t0 = t + (s.delay ?? 0)
      const end = t0 + Math.max(0, s.duration)
      rows.push({
        kind: 'progress',
        at: t0,
        gone: Infinity,
        end,
        label: s.progress,
        width: s.width ?? 24,
      })
      t = idle = end + 0.15
    } else if ('pause' in s) t += Math.max(0, s.pause)
    else if ('clear' in s) {
      wipe(t)
      t = idle = t + 0.05
    }
  })
  // the shell waits at a fresh prompt at the end
  rows.push({
    kind: 'prompt',
    at: idle,
    gone: Infinity,
    path,
    text: '',
    keys: [],
    enter: Infinity,
  })
  return { rows, clears, total: Math.max(t, idle) + TAIL }
}

/** Total length in seconds of a replay, for driving it from your own clock or timeline:
 *  `useTimeline({ duration: terminalReplayLength({ steps }) })`. */
// oxlint-disable-next-line react/only-export-components -- a helper that belongs with the replay it measures
export function terminalReplayLength({ steps, speed = 14, prompt }: Pick<TerminalReplayProps, 'steps' | 'speed' | 'prompt'>) {
  return plan(steps, prompt?.path ?? '~', speed, prefersReducedMotion()).total
}

/** Progress that moves like a download: uneven speed, never backwards, easing in and out. */
function fill(u: number) {
  const p = Math.min(1, Math.max(0, u))
  const w = p + (0.55 * Math.sin(2 * Math.PI * 2 * p)) / (2 * Math.PI * 2)
  return w * w * (3 - 2 * w)
}

/* ───────────── Pieces ───────────── */

function inkOf(tone: TerminalInk | undefined, skin: Skin): CSSProperties | undefined {
  if (!tone) return undefined
  if (tone === 'muted') return { color: skin.mute }
  if (tone === 'strong') return { fontWeight: 700 }
  return { color: skin.ink[tone] }
}

function Spans({ spans, skin }: { spans: Span[]; skin: Skin }): ReactNode {
  return spans.map((s, k) =>
    s.icon ? (
      <span key={k} style={inkOf(s.tone, skin)}>
        <Icon name={s.icon} tone="line" size="0.95em" className="align-[-0.14em]" />
        {s.text}
      </span>
    ) : (
      <span key={k} style={inkOf(s.tone, skin)}>
        {s.text}
      </span>
    ),
  )
}

/** The status glyph column (two cells, like a CLI's "✔ "), drawn with a kit icon. */
function Mark({ tone, skin }: { tone: Exclude<TerminalTone, 'muted'>; skin: Skin }) {
  return (
    <span className="inline-block w-[2ch]" style={{ color: skin.ink[tone] }}>
      <Icon name={MARK[tone]} tone="line" size="1em" className="align-[-0.16em]" />
    </span>
  )
}

function Prompt({ prompt, path, skin }: { prompt: TerminalPrompt; path: string; skin: Skin }) {
  const who = prompt.user ? `${prompt.user}${prompt.host ? `@${prompt.host}` : ''}` : prompt.host
  return (
    <>
      {who && (
        <span className="font-bold" style={{ color: skin.user }}>
          {who}{' '}
        </span>
      )}
      <span className="font-bold" style={{ color: skin.path }}>
        {path}
      </span>
      <span style={{ color: skin.mute }}> {prompt.symbol ?? '$'} </span>
    </>
  )
}

/** `fresh`: the newest letter eases in instead of popping. */
function Typed({ text, n, fresh }: { text: string; n: number; fresh: boolean }) {
  const shown = text.slice(0, n)
  if (!fresh || !shown.trim() || shown.endsWith(' ')) return <>{shown}</>
  return (
    <>
      {shown.slice(0, -1)}
      <span key={n} className="inline-block animate-[tr-char_.12s_ease-out_both] whitespace-pre">
        {shown.slice(-1)}
      </span>
    </>
  )
}

/* ───────────── Component ───────────── */

/**
 * A terminal session that plays itself, for install demos on landing pages, READMEs, docs and
 * videos. Commands are typed with human timing (a little jitter, quicker runs inside words) and
 * submitted with Enter; output streams in a few milliseconds per line; spinners resolve into a
 * done line and progress bars fill with a percentage. The newest line stays in view on a smooth
 * spring scroll. Three skins (night, paper that follows your theme, crt), an optional window bar,
 * keyboard sounds from your own recordings. Everything is a function of time, so it scrubs, loops,
 * and follows a video or a Timeline through `time`. Reduced motion shows each command whole.
 */
export function TerminalReplay({
  steps,
  prompt = {},
  skin: skinName = 'night',
  chrome = 'window',
  title,
  speed = 14,
  zoom = 1,
  time,
  autoplay = true,
  loop = true,
  controls = false,
  glow,
  sound = false,
  sounds,
  label,
  className,
}: TerminalReplayProps) {
  const skin = SKINS[skinName]
  const [reduced] = useState(() => prefersReducedMotion())
  const home = prompt.path ?? '~'
  const { rows, clears, total } = useMemo(() => plan(steps, home, speed, reduced), [steps, home, speed, reduced])

  const tl = useTimeline({ duration: total, autoplay, loop, time })
  const t = tl.time

  const shown = rows.map((r, i) => ({ r, i })).filter(({ r }) => t >= r.at && t < r.gone && !(r.kind === 'spinner' && r.done === false && t >= r.end))
  const screen = clears.filter((c) => c <= t).length
  const lastRow = shown[shown.length - 1]?.r
  const current = lastRow?.kind === 'prompt' && t < lastRow.enter ? lastRow : null
  const lastKey = current?.keys[current.keys.length - 1] ?? -1
  const typedNow = current ? current.keys.filter((k) => k <= t).length : 0
  const typing = !!current && typedNow > 0 && t < lastKey + 0.45
  const entered = rows.filter((r) => r.kind === 'prompt' && r.enter <= t).length
  const marks = shown.filter(({ r }) => (r.kind === 'line' && r.mark && r.tone && r.tone !== 'muted') || (r.kind === 'spinner' && r.done !== false && t >= r.end))
  const cwd = [...shown].reverse().find(({ r }) => r.kind === 'prompt')?.r
  const windowTitle = title ?? (cwd?.kind === 'prompt' ? cwd.path : home)

  // the scroll: a critically damped spring written straight to the DOM, outside React
  const root = useRef<HTMLDivElement>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const external = useRef(time !== undefined)
  const want = useRef({ t, screen, reduced })
  useEffect(() => {
    want.current = { t, screen, reduced }
    external.current = time !== undefined
  })

  // sound follows what changed since the last frame; jumps (seeking, looping) stay silent
  const heard = useRef({ t: -1, prompt: -1, typed: 0, entered: 0, marks: 0 })
  const volume = sounds && (sound === true ? 0.5 : typeof sound === 'number' ? sound : 0)
  const set = sounds ?? {}
  useEffect(() => {
    if (volume && sounds) preloadReelSounds(sounds)
  }, [volume, sounds])
  const promptIndex = current ? rows.indexOf(current) : -1
  useEffect(() => {
    const h = heard.current
    const dt = t - h.t
    if (volume && dt > 0 && dt < 0.25) {
      if (entered === h.entered + 1) playReelSound('enter', volume, set)
      else if (promptIndex === h.prompt && typedNow - h.typed > 0 && typedNow - h.typed <= 3) playReelSound('key', volume, set)
      if (marks.length > h.marks) {
        const r = marks[marks.length - 1].r
        const tone = r.kind === 'line' ? r.tone : r.kind === 'spinner' ? r.tone : undefined
        if (tone && tone !== 'muted') playReelSound(tone, volume, set)
      }
    }
    heard.current = {
      t,
      prompt: promptIndex,
      typed: typedNow,
      entered,
      marks: marks.length,
    }
  })

  useEffect(() => {
    const st = root.current
    const vp = viewport.current
    const body = content.current
    if (!st || !vp || !body) return
    let raf = 0
    let last = performance.now()
    let visible = true
    let resumed = false
    const cam = { y: 0, v: 0, t: 0, screen: 0, ready: false }
    // the text grid (line height, bottom padding), read again only when the box changes size
    const grid = { w: -1, h: -1, line: 24, pad: 12 }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const { t: at, screen: sc, reduced: still } = want.current
      // layout sizes only (offset/client): the terminal often sits inside a scaled FrameStage
      const H = vp.clientHeight
      if (grid.w !== vp.clientWidth || grid.h !== H) {
        const cs = getComputedStyle(body)
        grid.w = vp.clientWidth
        grid.h = H
        grid.line = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5 || 24
        grid.pad = parseFloat(cs.paddingBottom) || 0
      }
      // scroll whole lines, like a real terminal: the top line is never cut in half
      const over = body.offsetHeight - grid.pad + grid.line * 0.2 - H
      const target = over > 0 ? Math.ceil(over / grid.line) * grid.line : 0
      // a cleared screen, a seek or a loop lands at once; playback rides the spring
      const jump = !cam.ready || still || sc !== cam.screen || Math.abs(at - cam.t) > 0.5
      cam.t = at
      cam.screen = sc
      cam.ready = true
      if (jump) {
        cam.y = target
        cam.v = 0
      } else {
        // exact critically damped step (ω 12, settles in about a third of a second): never overshoots, stable at any frame rate
        const w = 12
        const x0 = cam.y - target
        const k = cam.v + w * x0
        const e = Math.exp(-w * dt)
        cam.y = target + (x0 + k * dt) * e
        cam.v = (cam.v - w * k * dt) * e
        if (Math.abs(cam.y - target) < 0.2 && Math.abs(cam.v) < 2) {
          cam.y = target
          cam.v = 0
        }
      }
      body.style.transform = `translate3d(0, ${-cam.y}px, 0)`
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
        if (tl.playing && !external.current) {
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
    // the loop lives for the whole mount: an external clock changes `time` every frame and must not restart it
  }, [tl])

  const glowOn = glow ?? skin.glow
  const text = label ?? `Terminal: ${steps.flatMap((s) => ('cmd' in s ? [s.cmd] : [])).join(', ')}`
  const lineIn = reduced ? undefined : 'animate-[tr-line_.16s_ease-out_both]'

  return (
    <div className="grid h-full w-full grid-rows-[minmax(0,1fr)] gap-3 has-[>:nth-child(2)]:grid-rows-[minmax(0,1fr)_auto]">
      <div
        ref={root}
        role="log"
        // it types letter by letter: announcing each one would flood a screen reader, so the log is read on demand
        aria-live="off"
        aria-label={text}
        onPointerDown={volume ? unlockReelSound : undefined}
        // paper sits on the page, so it takes the kit's own line (thin in cel, heavy in manga)
        className={cn('ui-r relative isolate aspect-video w-full overflow-hidden [container-type:size]', skinName === 'paper' && 'ui-border-thin', className)}
        style={{
          fontFamily: 'var(--font-mono, ui-monospace, monospace)',
          background: skin.bg,
          color: skin.fg,
        }}
      >
        <style>
          {
            '@keyframes tr-char{from{opacity:0;filter:blur(.06em);translate:0 .08em}}@keyframes tr-line{from{opacity:0;translate:0 .2em}}@keyframes tr-blink{0%,49%{opacity:1}50%,100%{opacity:0}}@keyframes tr-roll{from{transform:translateY(-30%)}to{transform:translateY(130%)}}'
          }
        </style>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: skin.sheen }} />
        <div
          className="relative flex h-full flex-col leading-[1.5]"
          style={{
            fontSize: `clamp(10px, calc(min(5.1cqh, max(2.1cqw, 3.7cqmin)) * ${zoom}), 120px)`,
            textShadow: glowOn ? '0 0 0.35em color-mix(in srgb, currentColor 55%, transparent)' : undefined,
          }}
        >
          {chrome === 'window' && (
            <div
              className="relative flex shrink-0 items-center border-b px-[1.2ch] py-[0.5em] text-[0.68em] leading-none"
              style={{
                borderColor: skin.line,
                background: skin.bar,
                color: skin.mute,
                textShadow: 'none',
              }}
            >
              <span aria-hidden="true" className="flex gap-[0.7ch]">
                {(['error', 'warn', 'ok'] as const).map((k) => (
                  <span
                    key={k}
                    className="size-[0.9em] rounded-full"
                    style={{
                      background: skinName === 'crt' ? mix(skin.fg, 30) : mix(SKINS.night.ink[k], 85),
                    }}
                  />
                ))}
              </span>
              <span className="absolute inset-x-[6ch] truncate text-center">{windowTitle}</span>
            </div>
          )}
          {/* the top margin sits outside the clip, so lines scroll out at a clean edge */}
          <div className="relative min-h-0 flex-1 pt-[0.6em]">
            <div ref={viewport} className="h-full overflow-hidden">
              <div ref={content} className="px-[1.4ch] pb-[0.8em] break-words whitespace-pre-wrap will-change-transform [overflow-wrap:anywhere]">
                {shown.map(({ r, i }) => {
                  if (r.kind === 'prompt') {
                    const live = r === current
                    const n = live ? typedNow : r.text.length
                    return (
                      <div key={i} className="min-h-[1.5em]">
                        <Prompt prompt={prompt} path={r.path} skin={skin} />
                        <Typed text={r.text} n={n} fresh={live && typing && !reduced} />
                        {live && (
                          <span
                            aria-hidden="true"
                            className={cn('inline-block h-[1.2em] w-[1ch] align-[-0.24em]', !typing && !reduced && 'animate-[tr-blink_1.06s_steps(1)_infinite]')}
                            style={{
                              background: skin.cursor,
                              opacity: skinName === 'crt' ? 0.8 : 0.85,
                              boxShadow: glowOn ? `0 0 0.5em ${skin.cursor}` : undefined,
                            }}
                          />
                        )}
                      </div>
                    )
                  }
                  if (r.kind === 'line') {
                    const marked = r.mark && r.tone && r.tone !== 'muted'
                    const tint = r.tone === 'muted' || (!r.mark && r.tone) ? inkOf(r.tone, skin) : undefined
                    return (
                      <div key={i} className={cn('min-h-[1.5em]', lineIn)} style={tint}>
                        {marked && r.tone && r.tone !== 'muted' && <Mark tone={r.tone} skin={skin} />}
                        <Spans spans={r.spans} skin={skin} />
                      </div>
                    )
                  }
                  if (r.kind === 'spinner') {
                    if (t >= r.end && r.done !== false)
                      return (
                        <div key={`${i}-done`} className={cn('min-h-[1.5em]', lineIn)}>
                          <Mark tone={r.tone} skin={skin} />
                          {r.done}
                        </div>
                      )
                    return (
                      <div key={i} className={cn('min-h-[1.5em]', lineIn)}>
                        <span className="inline-block w-[2ch]" style={{ color: skin.ink.accent }}>
                          {reduced ? '-' : SPIN[Math.floor((t - r.at) * 10) % SPIN.length]}
                        </span>
                        {r.label}
                        {reduced && <span style={{ color: skin.mute }}>...</span>}
                      </div>
                    )
                  }
                  const p = r.end > r.at ? fill((t - r.at) / (r.end - r.at)) : 1
                  const done = t >= r.end
                  return (
                    <div key={i} className={cn('min-h-[1.5em]', lineIn)}>
                      {r.label}{' '}
                      <span
                        className="relative inline-block h-[0.6em] overflow-hidden rounded-[0.15em] align-[-0.02em]"
                        style={{
                          width: `${r.width}ch`,
                          background: skin.track,
                        }}
                      >
                        <span
                          className="absolute inset-y-0 left-0"
                          style={{
                            width: `${p * 100}%`,
                            background: done ? skin.ink.ok : skin.ink.accent,
                            boxShadow: glowOn ? `0 0 0.6em ${skin.ink.accent}` : undefined,
                          }}
                        />
                      </span>{' '}
                      <span className="tabular-nums" style={{ color: done ? skin.ink.ok : skin.mute }}>
                        {String(Math.floor(p * 100)).padStart(3, ' ')}%
                      </span>
                      {done && (
                        <span className="ml-[1ch]" style={{ color: skin.ink.ok }}>
                          <Icon name="check" tone="line" size="1em" className="align-[-0.16em]" />
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
        {skin.scan && (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, rgb(0 0 0/.5) 0 1px, transparent 1px 3px)',
              }}
            />
            {!reduced && (
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                <div
                  className="h-1/4 w-full animate-[tr-roll_7s_linear_infinite]"
                  style={{
                    background: 'linear-gradient(to bottom, transparent, rgb(61 255 138 / 0.035), transparent)',
                  }}
                />
              </div>
            )}
          </>
        )}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(130% 100% at 50% 45%, transparent 55%, ${skin.vignette} 100%)`,
          }}
        />
      </div>
      {controls && time === undefined && <TimelineScrubber timeline={tl} label="Terminal replay" />}
    </div>
  )
}
