import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { prefersReducedMotion } from '@/fx'
import { cn } from '@/lib/utils'
import { playReelSound, preloadReelSounds, unlockReelSound } from './code-reel-sound'
import type { CodeReelSounds } from './code-reel-sound'

export type { CodeReelSounds } from './code-reel-sound'
import { Icon } from './icon'
import { TimelineScrubber, useTimeline } from './timeline'

/* ───────────── API ───────────── */

export type CodeReelTone = 'error' | 'warn' | 'ok' | 'info'
export type CodeReelSkin = 'neon' | 'paper' | 'phosphor' | 'ink'
export type CodeReelChrome = 'editor' | 'window' | 'none'

export type CodeReelLine = {
  /** The line as it ends up. Leading spaces indent it. */
  code: string
  /** Second the typing starts. Default: right after the previous line (plus `hold`). */
  at?: number
  /** Characters per second for this line. */
  speed?: number
  /** Autocomplete moment: typing stops a few letters into `word`, the menu opens, then the word is accepted. */
  suggest?: { word: string; options?: string[] }
  /** Shown once the line is typed: an inline chip, and a wavy underline under `squiggle`. */
  diagnostic?: { text: string; tone?: CodeReelTone; squiggle?: string }
}

export type CodeReelLog = { text: string; tone?: CodeReelTone }

export type CodeReelProps = {
  lines: CodeReelLine[]
  /** File name on the editor tab or window title. */
  file?: string
  /** Logs printed in the terminal after the last line; the camera pulls back to show it. */
  terminal?: (string | CodeReelLog)[]
  /** The command on the terminal prompt. */
  command?: string
  /** The look: neon (dark IDE, glow, LCD grid), paper (follows the kit theme and mode), phosphor (green CRT), ink (manga, black on paper with screentone). */
  skin?: CodeReelSkin
  /** Frame around the code: an editor tab with a breadcrumb, a plain window bar, or nothing. */
  chrome?: CodeReelChrome
  /** Characters per second. */
  speed?: number
  /** Pause after each line, in seconds. */
  hold?: number
  /** External clock in seconds (a video, an audio track, a Timeline). When set the reel follows it. */
  time?: number
  autoplay?: boolean
  loop?: boolean
  /** Show a play / seek bar under the screen. */
  controls?: boolean
  /** 'follow' rides the cursor in 3D; 'static' keeps a calm three-quarter view of the whole file. */
  camera?: 'follow' | 'static'
  /** How close the follow camera sits. */
  zoom?: number
  /** Depth of field, 0..1: lines away from the cursor blur and dim. */
  depth?: number
  /** Text glow. Default: on for neon and phosphor. */
  glow?: boolean
  /** The screen texture (LCD grid, scanlines or screentone, by skin). */
  texture?: boolean
  /** Play `sounds`: true = 0.5, or a volume 0..1. Starts after the first click on the page. */
  sound?: boolean | number
  /** Audio files per event: key (one or several), enter (new line; also used for accept), accept, error, warn, ok, info, tick. Events without a file stay silent. */
  sounds?: CodeReelSounds
  /** Accessible name. Defaults to the code itself. */
  label?: string
  /** Classes for the screen: size it here (default aspect-video, full width; e.g. aspect-[9/16] for a vertical reel). */
  className?: string
}

/* ───────────── Skins ───────────── */

type Kind = 'kw' | 'fn' | 'prop' | 'id' | 'str' | 'num' | 'com' | 'pun' | 'sp'

type Skin = {
  bg: string
  fg: string
  /** Hairlines, gutter, chrome text. */
  line: string
  mute: string
  band: string
  bandEdge: string
  cursor: string
  menu: { bg: string; fg: string; sel: string; selFg: string }
  ink: Record<Kind, string>
  tone: Record<CodeReelTone, string>
  glow: boolean
  bold?: Partial<Record<Kind, number>>
  texture: 'lcd' | 'scan' | 'tone' | 'none'
  vignette: string
}

const mix = (c: string, k: number, to = 'transparent') => `color-mix(in oklab, ${c} ${k}%, ${to})`

const SKINS: Record<CodeReelSkin, Skin> = {
  neon: {
    bg: '#05060b',
    fg: '#a9b1d6',
    line: 'rgb(255 255 255 / 0.1)',
    mute: 'rgb(255 255 255 / 0.4)',
    band: 'rgb(255 255 255 / 0.045)',
    bandEdge: 'rgb(255 255 255 / 0.07)',
    cursor: '#d9e6ff',
    menu: { bg: 'rgb(13 16 32 / 0.95)', fg: 'rgb(255 255 255 / 0.6)', sel: 'rgb(42 78 168 / 0.7)', selFg: '#fff' },
    ink: {
      kw: 'var(--color-pop)',
      fn: mix('var(--color-accent)', 70, 'white'),
      prop: '#5fd4e0',
      id: '#ff7088',
      str: '#f2b25c',
      num: '#c9a2ff',
      com: '#6f7799',
      pun: '#a9b1d6',
      sp: 'inherit',
    },
    tone: { error: '#ff5c7a', warn: '#f2b25c', ok: '#5fe0a0', info: '#7aa2ff' },
    glow: true,
    texture: 'lcd',
    vignette: 'rgb(0 0 0 / 0.78)',
  },
  paper: {
    bg: 'var(--color-paper)',
    fg: 'var(--color-ink)',
    line: mix('var(--color-ink)', 14),
    mute: mix('var(--color-ink)', 45),
    band: mix('var(--color-accent)', 10),
    bandEdge: mix('var(--color-accent)', 28),
    cursor: 'var(--color-accent)',
    menu: { bg: 'var(--color-paper)', fg: mix('var(--color-ink)', 70), sel: 'var(--color-accent)', selFg: '#fff' },
    ink: {
      kw: 'var(--color-pop)',
      fn: 'var(--color-accent)',
      prop: mix('var(--color-accent)', 55, 'var(--color-ink)'),
      id: mix('var(--color-pop)', 65, 'var(--color-ink)'),
      str: mix('#e0911f', 85, 'var(--color-ink)'),
      num: mix('var(--color-accent)', 60, 'var(--color-pop)'),
      com: 'var(--color-mute)',
      pun: mix('var(--color-ink)', 70),
      sp: 'inherit',
    },
    tone: { error: '#e5484d', warn: '#d98a00', ok: '#18a058', info: 'var(--color-accent)' },
    glow: false,
    texture: 'none',
    vignette: mix('var(--color-ink)', 10),
  },
  phosphor: {
    bg: '#020b05',
    fg: '#3dff8a',
    line: 'rgb(61 255 138 / 0.16)',
    mute: 'rgb(61 255 138 / 0.45)',
    band: 'rgb(61 255 138 / 0.07)',
    bandEdge: 'rgb(61 255 138 / 0.14)',
    cursor: '#7dffb0',
    menu: { bg: 'rgb(3 24 11 / 0.95)', fg: 'rgb(61 255 138 / 0.65)', sel: 'rgb(61 255 138 / 0.25)', selFg: '#c8ffd9' },
    ink: { kw: '#b4ffcf', fn: '#5cff9d', prop: '#36d97a', id: '#7dffb0', str: '#d8ffe5', num: '#b4ffcf', com: '#1f8f4c', pun: '#2fcf70', sp: 'inherit' },
    tone: { error: '#ffb347', warn: '#e4ff5c', ok: '#5cff9d', info: '#7dffb0' },
    glow: true,
    texture: 'scan',
    vignette: 'rgb(0 10 4 / 0.9)',
  },
  ink: {
    bg: '#fbfaf5',
    fg: '#141414',
    line: 'rgb(20 20 20 / 0.18)',
    mute: 'rgb(20 20 20 / 0.45)',
    band: 'rgb(20 20 20 / 0.06)',
    bandEdge: 'rgb(20 20 20 / 0.7)',
    cursor: '#141414',
    menu: { bg: '#fbfaf5', fg: '#141414', sel: '#141414', selFg: '#fbfaf5' },
    ink: { kw: '#141414', fn: '#141414', prop: '#3a3a3a', id: '#141414', str: '#141414', num: '#141414', com: '#8a8a8a', pun: '#5a5a5a', sp: 'inherit' },
    tone: { error: '#d4202c', warn: '#141414', ok: '#141414', info: '#141414' },
    glow: false,
    bold: { kw: 800, fn: 700, str: 600 },
    texture: 'tone',
    vignette: 'rgb(20 20 20 / 0.12)',
  },
}

const TEXTURE: Record<Skin['texture'], CSSProperties | null> = {
  lcd: {
    backgroundImage: 'repeating-linear-gradient(0deg, rgb(0 0 0/.5) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgb(0 0 0/.4) 0 1px, transparent 1px 3px)',
    opacity: 0.55,
  },
  scan: { backgroundImage: 'repeating-linear-gradient(0deg, rgb(0 0 0/.55) 0 1px, transparent 1px 3px)', opacity: 0.7 },
  tone: { backgroundImage: 'radial-gradient(rgb(20 20 20/.16) 0.9px, transparent 1.3px)', backgroundSize: '6px 6px', opacity: 1 },
  none: null,
}

const TONE_ICON = { error: 'danger', warn: 'warning', ok: 'check', info: 'info' } as const

/* ───────────── Syntax ───────────── */

const KW = new Set(
  'async await function const let var return if else for while do new class extends import from export default true false null undefined this typeof of in try catch finally throw yield break continue switch case void'.split(
    ' ',
  ),
)

type Seg = { text: string; kind: Kind; start: number; sq: boolean }

/** A small TypeScript-ish highlighter: enough for code that reads like prose. */
function tokenize(code: string): { text: string; kind: Kind; start: number }[] {
  const re = /(\/\/.*)|("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?|`(?:[^`\\]|\\.)*`?)|(\d+(?:\.\d+)?)|([A-Za-z_$][\w$]*)|(\s+)|([^\s\w$"'`])/g
  const out: { text: string; kind: Kind; start: number }[] = []
  let prev = ''
  for (let m = re.exec(code); m; m = re.exec(code)) {
    const [text, com, str, num, word, sp] = m
    let kind: Kind = 'pun'
    if (com) kind = 'com'
    else if (str) kind = 'str'
    else if (num) kind = 'num'
    else if (sp) kind = 'sp'
    else if (word) {
      const call = /^\s*\(/.test(code.slice(re.lastIndex))
      kind = prev === '.' ? (call ? 'fn' : 'prop') : KW.has(word) ? 'kw' : call ? 'fn' : 'id'
    }
    out.push({ text, kind, start: m.index })
    if (kind !== 'sp') prev = text
  }
  return out
}

function segments(code: string, squiggle?: string): Seg[] {
  const a = squiggle ? code.indexOf(squiggle) : -1
  const b = a < 0 ? -1 : a + (squiggle?.length ?? 0)
  const cuts = a < 0 ? [] : [a, b]
  const out: Seg[] = []
  for (const t of tokenize(code)) {
    let s = t.start
    const end = t.start + t.text.length
    for (const c of [...cuts.filter((c) => c > s && c < end), end]) {
      out.push({ text: code.slice(s, c), kind: t.kind, start: s, sq: a >= 0 && s >= a && c <= b })
      s = c
    }
  }
  return out
}

/* ───────────── Schedule ───────────── */

type Plan = {
  start: number
  dur: number
  /** Characters typed `lt` seconds into the line. */
  typed: (lt: number) => number
  /** Autocomplete window in line-local seconds. */
  menu?: [number, number]
}

const ACCEPT_PAUSE = 0.7

function plan(lines: CodeReelLine[], speed: number, hold: number, instant: boolean) {
  let t = 0.4
  const plans: Plan[] = lines.map((line) => {
    const len = line.code.length
    const cps = Math.max(1, line.speed ?? speed)
    const start = line.at ?? t
    const i = line.suggest ? line.code.indexOf(line.suggest.word) : -1
    let p: Plan
    if (instant) p = { start, dur: 0.05, typed: (lt) => (lt >= 0 ? len : 0) }
    else if (i >= 0 && line.suggest) {
      const w = line.suggest.word.length
      const pre = i + Math.min(3, w)
      const t1 = pre / cps
      const t2 = t1 + ACCEPT_PAUSE
      const after = i + w
      p = {
        start,
        dur: t2 + (len - after) / cps,
        typed: (lt) => (lt < t1 ? lt * cps : lt < t2 ? pre : after + (lt - t2) * cps),
        menu: [(i + 1) / cps, t2],
      }
    } else p = { start, dur: len / cps, typed: (lt) => lt * cps }
    t = start + p.dur + hold
    return p
  })
  return { plans, end: t }
}

/* ───────────── Pieces ───────────── */

const LINE_H = 1.65 // em

function Code({ segs, n, showSq, tone, skin }: { segs: Seg[]; n: number; showSq: boolean; tone: string; skin: Skin }): ReactNode {
  return segs.map((s, k) => {
    if (s.start >= n) return null
    const style: CSSProperties = { color: skin.ink[s.kind], fontStyle: s.kind === 'com' ? 'italic' : undefined, fontWeight: skin.bold?.[s.kind] }
    if (s.sq && showSq) Object.assign(style, { textDecoration: `underline wavy ${tone}`, textDecorationThickness: '0.07em', textUnderlineOffset: '0.22em' })
    return (
      <span key={k} style={style}>
        {s.text.slice(0, n - s.start)}
      </span>
    )
  })
}

function Chip({ text, tone = 'error', skin }: { text: string; tone?: CodeReelTone; skin: Skin }) {
  const c = skin.tone[tone]
  return (
    <span
      className="ml-[1.6ch] inline-flex animate-[cr-chip_.35s_cubic-bezier(.2,.9,.3,1.2)_both] items-center gap-[0.6ch] rounded-[0.3em] border px-[0.7ch] py-[0.2em] align-middle text-[0.62em] leading-none"
      style={{ color: c, borderColor: mix(c, 55), background: mix(c, 14), textShadow: 'none' }}
    >
      <Icon name={TONE_ICON[tone]} tone="line" size="1em" />
      {text}
    </span>
  )
}

function Chrome({ kind, file, fn, skin }: { kind: CodeReelChrome; file: string; fn?: string; skin: Skin }) {
  if (kind === 'none') return <div className="h-[0.6em]" />
  if (kind === 'window')
    return (
      <div className="relative flex items-center border-b px-[1.2ch] py-[0.55em] text-[0.62em]" style={{ borderColor: skin.line, color: skin.mute, textShadow: 'none' }}>
        <span className="flex gap-[0.7ch]">
          {(['error', 'warn', 'ok'] as const).map((t) => (
            <span key={t} className="size-[0.85em] rounded-full" style={{ background: mix(skin.tone[t], 85) }} />
          ))}
        </span>
        <span className="absolute inset-x-0 text-center">{file}</span>
      </div>
    )
  return (
    <>
      <div className="flex items-end gap-[1ch] border-b px-[1ch] pt-[0.6em] text-[0.68em]" style={{ borderColor: skin.line, background: mix(skin.fg, 4) }}>
        <span className="flex items-center gap-[0.8ch] rounded-t-[0.3em] border border-b-0 px-[1.2ch] py-[0.55em]" style={{ borderColor: skin.line, background: skin.bg, color: skin.fg }}>
          <span className="rounded-[0.2em] px-[0.4ch] text-[0.75em] leading-[1.2]" style={{ background: skin.ink.fn, color: skin.bg, textShadow: 'none' }}>
            TS
          </span>
          {file}
          <Icon name="close" tone="line" size="0.85em" style={{ color: skin.mute }} />
        </span>
      </div>
      <div className="flex items-center gap-[0.8ch] px-[1.6ch] py-[0.5em] text-[0.62em]" style={{ color: skin.mute }}>
        <span>src</span>
        <Icon name="chevron-down" tone="line" size="0.9em" className="-rotate-90" />
        <span>{file}</span>
        {fn && (
          <>
            <Icon name="chevron-down" tone="line" size="0.9em" className="-rotate-90" />
            <span style={{ color: skin.ink.fn }}>{fn}</span>
          </>
        )}
      </div>
    </>
  )
}

/* ───────────── Component ───────────── */

/**
 * Code as kinetic typography. Lines of code type themselves into an editor while a 3D camera
 * rides the cursor: the screen tilts in perspective, the active line sits on a band with a faint
 * reflection, and the lines around it fall out of focus. Words can pause on an autocomplete menu
 * before they are accepted, finished lines can raise a wavy underline and an inline diagnostic,
 * and a terminal prints its logs at the end while the camera pulls back to the whole file. Four
 * skins (neon, paper, phosphor, ink), three frames, optional sounds from your own files. Everything is a
 * function of time, so it scrubs, loops, and follows a video, a song or a Timeline through `time`.
 * Reduced motion shows each line whole, with a still camera.
 */
export function CodeReel({
  lines,
  file = 'scene.ts',
  terminal,
  command,
  skin: skinName = 'neon',
  chrome = 'editor',
  speed = 16,
  hold = 0.45,
  time,
  autoplay = true,
  loop = true,
  controls = false,
  camera = 'follow',
  zoom = 1,
  depth = 0.6,
  glow,
  texture = true,
  sound = false,
  sounds,
  label,
  className,
}: CodeReelProps) {
  const skin = SKINS[skinName]
  const [reduced] = useState(() => prefersReducedMotion())
  const { plans, end } = useMemo(() => plan(lines, speed, hold, reduced), [lines, speed, hold, reduced])
  const logs = useMemo(() => (terminal ?? []).map((l) => (typeof l === 'string' ? { text: l } : l)), [terminal])
  const termAt = end + 0.2
  const total = logs.length ? termAt + 0.6 + logs.length * 0.45 + 2.4 : end + 1.6
  const segs = useMemo(() => lines.map((l) => segments(l.code, l.diagnostic?.squiggle)), [lines])
  const fn = useMemo(() => lines.map((l) => /function\s+([\w$]+)/.exec(l.code)?.[1]).find(Boolean), [lines])

  const tl = useTimeline({ duration: total, autoplay, loop, time })
  const t = tl.time

  let active = 0
  plans.forEach((p, i) => {
    if (t >= p.start) active = i
  })
  const started = t >= (plans[0]?.start ?? 0)
  const ap = plans[active]
  const lt = t - (ap?.start ?? 0)
  const typing = started && !!ap && lt < ap.dur
  const menuOpen = started && !!ap?.menu && lt >= ap.menu[0] && lt < ap.menu[1]
  const showTerm = logs.length > 0 && t >= termAt
  const overview = camera === 'static' || reduced || showTerm
  const shown = started ? active + 1 : 0
  const caret = started && ap ? Math.min(lines[active]?.code.length ?? 0, ap.typed(lt)) : 0
  const typedActive = Math.floor(caret)
  const diagsShown = lines.slice(0, shown).filter((l, i) => l.diagnostic && t - plans[i].start >= plans[i].dur + 0.15)
  const logsShown = showTerm ? logs.filter((_, k) => t >= termAt + 0.6 + k * 0.45).length : 0

  // the camera: a damped follow written straight to the DOM, outside React
  const stage = useRef<HTMLDivElement>(null)
  const plane = useRef<HTMLDivElement>(null)
  const cursor = useRef<HTMLSpanElement>(null)
  /** Start of the active line's text: with the caret count it gives a camera target that never steps. */
  const lineStart = useRef<HTMLSpanElement>(null)
  const code = useRef<HTMLDivElement>(null)
  const want = useRef({ overview, zoom, reduced, caret: 0, line: -1 })
  useEffect(() => {
    want.current = { overview, zoom, reduced, caret, line: started ? active : -1 }
  })

  // sound follows what changed since the last frame; jumps (seeking) stay silent
  const heard = useRef({ active: -1, typed: 0, menu: false, diags: 0, logs: 0 })
  const volume = sounds && (sound === true ? 0.5 : typeof sound === 'number' ? sound : 0)
  const set = sounds ?? {}
  useEffect(() => {
    if (volume && sounds) preloadReelSounds(sounds)
  }, [volume, sounds])
  useEffect(() => {
    const h = heard.current
    const next = { active, typed: typedActive, menu: menuOpen, diags: diagsShown.length, logs: logsShown }
    if (volume) {
      const sameLine = active === h.active
      const step = typedActive - h.typed
      if (active === h.active + 1 && h.active >= 0) playReelSound('enter', volume, set)
      if (sameLine && h.menu && !menuOpen && step > 0) playReelSound('accept', volume, set)
      else if (sameLine && step > 0 && step <= 3) playReelSound('key', volume, set)
      if (next.diags === h.diags + 1) playReelSound(diagsShown[diagsShown.length - 1]?.diagnostic?.tone ?? 'error', volume, set)
      if (next.logs === h.logs + 1) {
        const tone = logs[next.logs - 1]?.tone
        playReelSound(tone === 'ok' || tone === 'error' || tone === 'warn' ? tone : 'tick', volume, set)
      }
    }
    heard.current = next
  })

  useEffect(() => {
    const st = stage.current
    const pl = plane.current
    if (!st || !pl) return
    let raf = 0
    let last = performance.now()
    let visible = true
    let resumed = false
    // x / y ride a critically damped spring (continuous speed, eases between lines); the rest settle exponentially
    const cam = { x: 0, y: 0, vx: 0, vy: 0, z: 0, rx: 0, ry: 0, rz: 0, ready: false }
    const fontPx = parseFloat(getComputedStyle(pl).fontSize) || 22
    const probe = document.createElement('span')
    probe.textContent = '0000000000'
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre'
    pl.appendChild(probe)
    const chW = probe.offsetWidth / 10 || fontPx * 0.6
    probe.remove()

    const offsetIn = (el: HTMLElement | null) => {
      let x = 0
      let y = 0
      while (el && el !== pl) {
        x += el.offsetLeft
        y += el.offsetTop
        el = el.offsetParent as HTMLElement | null
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
      const { overview: wide, zoom: z0, reduced: still, caret: at, line } = want.current
      const s = now / 1000
      const target = { x: 0, y: 0, z: 1, rx: 0, ry: 0, rz: 0 }
      if (wide) {
        const cw = pl.offsetWidth
        const ch = pl.offsetHeight
        const fit = Math.min(W / cw, H / ch) * 0.92
        Object.assign(target, { x: cw / 2, y: ch / 2, z: fit, rx: still ? 0 : 9, ry: still ? 0 : -9, rz: still ? 0 : -2.5 })
      } else {
        const base = lineStart.current
        const onLine = base && Number(base.dataset.line) === line
        const p = onLine ? offsetIn(base) : offsetIn(code.current)
        const z = (Math.min(W, H * 1.1) / 9.5 / fontPx) * z0
        Object.assign(target, {
          // line start + the caret as a fraction of characters: the camera glides instead of stepping per letter
          x: p.x + (onLine ? at * chW : 0),
          y: p.y + fontPx * 0.55,
          z,
          rx: 17 + 3 * Math.sin(s * 0.31),
          ry: -15 + 6 * Math.sin(s * 0.19),
          rz: -5 + 2 * Math.sin(s * 0.23),
        })
      }
      const kz = cam.ready ? 1 - Math.exp(-dt * (wide ? 1.5 : 2.2)) : 1
      if (!cam.ready) {
        cam.x = target.x
        cam.y = target.y
      } else {
        const w = wide ? 3 : 5.2
        cam.vx += (w * w * (target.x - cam.x) - 2 * w * cam.vx) * dt
        cam.vy += (w * w * (target.y - cam.y) - 2 * w * cam.vy) * dt
        cam.x += cam.vx * dt
        cam.y += cam.vy * dt
      }
      cam.ready = true
      cam.z += (target.z - cam.z) * kz
      cam.rx += (target.rx - cam.rx) * kz
      cam.ry += (target.ry - cam.ry) * kz
      cam.rz += (target.rz - cam.rz) * kz
      pl.style.transform = `translate(${W * (wide ? 0.5 : 0.6)}px, ${H * 0.47}px) scale(${cam.z}) rotateX(${cam.rx}deg) rotateY(${cam.ry}deg) rotateZ(${cam.rz}deg) translate(${-cam.x}px, ${-cam.y}px)`
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

  const text = label ?? lines.map((l) => l.code.trim()).join('\n')
  const blurOf = (i: number) => (reduced || overview ? 0 : Math.min(6, Math.abs(i - active) * 1.5 * depth))
  const glowOn = glow ?? skin.glow
  const tex = texture ? TEXTURE[skin.texture] : null

  return (
    <div className="grid w-full gap-3">
      <div
        ref={stage}
        role="img"
        aria-label={text}
        onPointerDown={volume ? unlockReelSound : undefined}
        className={cn('ui-r relative isolate aspect-video w-full overflow-hidden [perspective:1100px] [perspective-origin:50%_47%]', className)}
        style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', background: skin.bg }}
      >
        <style>{'@keyframes cr-chip{from{opacity:0;transform:translateX(-0.6em) scale(.9)}to{opacity:1;transform:none}}@keyframes cr-in{from{opacity:0;transform:translateY(.4em)}to{opacity:1;transform:none}}@keyframes cr-line{from{opacity:0;translate:0 .35em}}'}</style>
        <div
          ref={plane}
          aria-hidden="true"
          className="absolute top-0 left-0 w-max min-w-[46em] origin-top-left text-[22px] leading-none will-change-transform [transform-style:preserve-3d]"
          style={{
            color: skin.fg,
            background: skin.bg,
            textShadow: glowOn ? '0 0 0.3em color-mix(in srgb, currentColor 60%, transparent)' : undefined,
          }}
        >
          <Chrome kind={chrome} file={file} fn={fn} skin={skin} />

          {/* the code */}
          <div ref={code} className="relative px-[1ch] pt-[0.6em] pb-[1.2em]">
            {started && (
              <div
                className="absolute inset-x-0 border-y transition-[top] duration-300 ease-out"
                style={{ top: `calc(0.6em + ${active * LINE_H}em)`, height: `${LINE_H}em`, background: skin.band, borderColor: skin.bandEdge }}
              />
            )}
            {started && !overview && (
              <div
                className="pointer-events-none absolute inset-x-0 flex items-center whitespace-pre opacity-25 blur-[1px] [mask-image:linear-gradient(to_top,black,transparent_85%)]"
                style={{ top: `calc(0.6em + ${(active + 1) * LINE_H}em)`, height: `${LINE_H}em`, transform: 'scaleY(-1)' }}
              >
                <span className="w-[4ch] shrink-0" />
                <Code segs={segs[active] ?? []} n={typedActive} showSq={false} tone="" skin={skin} />
              </div>
            )}
            {lines.slice(0, shown).map((line, i) => {
              const p = plans[i]
              const local = t - p.start
              const n = Math.floor(Math.min(line.code.length, p.typed(local)))
              const done = local >= p.dur + 0.15
              const d = line.diagnostic
              const b = blurOf(i)
              return (
                <div
                  key={i}
                  className="relative flex animate-[cr-line_.35s_ease-out_both] items-center whitespace-pre transition-[filter,opacity] duration-500"
                  style={{ height: `${LINE_H}em`, filter: b ? `blur(${b}px)` : undefined, opacity: overview ? 1 : Math.max(0.35, 1 - Math.abs(i - active) * 0.12 * depth) }}
                >
                  <span className="w-[4ch] shrink-0 pr-[1.4ch] text-right text-[0.7em]" style={{ color: skin.mute, opacity: i === active ? 1 : 0.5, textShadow: 'none' }}>
                    {i + 1}
                  </span>
                  <span ref={i === active ? lineStart : undefined} data-line={i} className="relative">
                    <Code segs={segs[i]} n={n} showSq={done} tone={skin.tone[d?.tone ?? 'error']} skin={skin} />
                    {i === active && (
                      <span ref={cursor} className="relative inline-block h-[1.15em] w-0 align-[-0.2em]">
                        <span
                          className={cn('absolute top-0 left-[0.05em] h-full rounded-[0.05em]', skinName === 'phosphor' ? 'w-[0.55em] opacity-70' : 'w-[0.14em]', !typing && !reduced && 'animate-blink')}
                          style={{ background: skin.cursor, boxShadow: glowOn ? `0 0 0.5em ${skin.cursor}` : undefined }}
                        />
                        {menuOpen && line.suggest && (
                          <span
                            className="absolute top-[1.45em] left-[-0.6ch] z-10 grid min-w-[16ch] animate-[cr-in_.18s_ease-out_both] gap-[0.1em] rounded-[0.3em] border p-[0.25em] text-[0.6em] shadow-[0_0.6em_1.6em_rgb(0_0_0/0.35)]"
                            style={{ textShadow: 'none', background: skin.menu.bg, color: skin.menu.fg, borderColor: skin.line }}
                          >
                            {[line.suggest.word, ...(line.suggest.options ?? []).filter((o) => o !== line.suggest?.word)].slice(0, 4).map((o, k) => (
                              <span
                                key={o}
                                className="flex items-center gap-[1ch] rounded-[0.2em] px-[0.8ch] py-[0.35em]"
                                style={k === 0 ? { background: skin.menu.sel, color: skin.menu.selFg } : undefined}
                              >
                                <span className="grid size-[1.2em] place-items-center rounded-[0.2em] border text-[0.75em]" style={{ color: k === 0 ? 'inherit' : skin.ink.fn, borderColor: 'currentColor' }}>
                                  f
                                </span>
                                {o}
                              </span>
                            ))}
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                  {d && done && <Chip text={d.text} tone={d.tone} skin={skin} />}
                </div>
              )
            })}
          </div>

          {/* the terminal */}
          {logs.length > 0 && (
            <div className={cn('border-t px-[1.6ch] pt-[0.5em] pb-[1em] text-[0.62em] transition-opacity duration-500', showTerm ? 'opacity-100' : 'opacity-0')} style={{ borderColor: skin.line }}>
              <div className="mb-[0.7em] flex gap-[2.4ch] text-[0.85em] tracking-[0.08em]" style={{ color: skin.mute }}>
                <span>PROBLEMS</span>
                <span>OUTPUT</span>
                <span className="border-b border-current" style={{ color: skin.fg }}>
                  TERMINAL
                </span>
              </div>
              {showTerm && (
                <div className="grid gap-[0.45em]">
                  <span>
                    <span style={{ color: skin.tone.ok }}>~/{fn ?? 'reel'}</span> $ {command ?? `run ${file}`}
                  </span>
                  {logs.slice(0, logsShown).map((l, k) => (
                    <span key={k} className="animate-[cr-in_.25s_ease-out_both]">
                      <span className="inline-block w-[6ch]" style={{ color: skin.tone[l.tone ?? 'info'] }}>
                        {l.tone ?? 'info'}
                      </span>
                      {l.text}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {tex && <div className="pointer-events-none absolute inset-0" style={tex} />}
        </div>
        {/* lens: vignette */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(120% 90% at 50% 47%, transparent 45%, ${skin.vignette} 100%)` }} />
      </div>
      {controls && time === undefined && <TimelineScrubber timeline={tl} label="Code reel" />}
    </div>
  )
}
