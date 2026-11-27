import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { prefersReducedMotion } from '@/fx'
import { cn } from '@/lib/utils'
import { Icon } from './icon'
import { TimelineScrubber, useTimeline } from './timeline'

/* ───────────── API ───────────── */

export type CodeReelTone = 'error' | 'warn' | 'ok' | 'info'

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
  /** File name on the editor tab. */
  file?: string
  /** Logs printed in the terminal after the last line; the camera pulls back to show it. */
  terminal?: (string | CodeReelLog)[]
  /** The command on the terminal prompt. */
  command?: string
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
  /** Neon glow on the text. */
  glow?: boolean
  /** The LCD pixel grid over the screen. */
  lcd?: boolean
  /** Accessible name. Defaults to the code itself. */
  label?: string
  /** Classes for the screen: size it here (default aspect-video, full width; e.g. aspect-[9/16] for a vertical reel). */
  className?: string
}

/* ───────────── Syntax ───────────── */

type Kind = 'kw' | 'fn' | 'prop' | 'id' | 'str' | 'num' | 'com' | 'pun' | 'sp'

const KW = new Set(
  'async await function const let var return if else for while do new class extends import from export default true false null undefined this typeof of in try catch finally throw yield break continue switch case void'.split(
    ' ',
  ),
)
const INK: Record<Kind, string> = {
  kw: 'var(--color-pop)',
  fn: 'color-mix(in oklab, var(--color-accent) 70%, white)',
  prop: '#5fd4e0',
  id: '#ff7088',
  str: '#f2b25c',
  num: '#c9a2ff',
  com: '#6f7799',
  pun: '#a9b1d6',
  sp: 'inherit',
}
const TONE: Record<CodeReelTone, string> = { error: '#ff5c7a', warn: '#f2b25c', ok: '#5fe0a0', info: '#7aa2ff' }
const TONE_ICON = { error: 'danger', warn: 'warning', ok: 'check', info: 'info' } as const

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

function Code({ segs, n, showSq, tone }: { segs: Seg[]; n: number; showSq: boolean; tone: string }): ReactNode {
  return segs.map((s, k) => {
    if (s.start >= n) return null
    const text = s.text.slice(0, n - s.start)
    const style: CSSProperties = { color: INK[s.kind], fontStyle: s.kind === 'com' ? 'italic' : undefined }
    if (s.sq && showSq) Object.assign(style, { textDecoration: `underline wavy ${tone}`, textDecorationThickness: '0.07em', textUnderlineOffset: '0.22em' })
    return (
      <span key={k} style={style}>
        {text}
      </span>
    )
  })
}

function Chip({ text, tone = 'error' }: { text: string; tone?: CodeReelTone }) {
  const c = TONE[tone]
  return (
    <span
      className="ml-[1.6ch] inline-flex animate-[cr-chip_.35s_cubic-bezier(.2,.9,.3,1.2)_both] items-center gap-[0.6ch] rounded-[0.3em] border px-[0.7ch] py-[0.2em] align-middle text-[0.62em] leading-none"
      style={{ color: c, borderColor: `color-mix(in srgb, ${c} 50%, transparent)`, background: `color-mix(in srgb, ${c} 16%, transparent)` }}
    >
      <Icon name={TONE_ICON[tone]} tone="line" size="1em" />
      {text}
    </span>
  )
}

/* ───────────── Component ───────────── */

/**
 * Code as kinetic typography. Lines of code type themselves into a dark editor while a 3D
 * camera rides the cursor: the screen tilts in perspective, the active line glows on a band
 * with a faint reflection, and the lines around it fall out of focus. Words can pause on an
 * autocomplete menu before they are accepted, finished lines can raise a wavy underline and an
 * inline diagnostic, and a terminal prints its logs at the end while the camera pulls back to the
 * whole file. Everything is a function of time, so it scrubs, loops, and follows a video or a
 * Timeline through `time`. Reduced motion shows each line whole, with a still camera.
 */
export function CodeReel({
  lines,
  file = 'scene.ts',
  terminal,
  command,
  speed = 16,
  hold = 0.45,
  time,
  autoplay = true,
  loop = true,
  controls = false,
  camera = 'follow',
  zoom = 1,
  depth = 0.6,
  glow = true,
  lcd = true,
  label,
  className,
}: CodeReelProps) {
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
  const menuOpen = !!ap?.menu && lt >= ap.menu[0] && lt < ap.menu[1]
  const showTerm = logs.length > 0 && t >= termAt
  const overview = camera === 'static' || reduced || showTerm

  // the camera: a damped follow written straight to the DOM, outside React
  const stage = useRef<HTMLDivElement>(null)
  const plane = useRef<HTMLDivElement>(null)
  const cursor = useRef<HTMLSpanElement>(null)
  const code = useRef<HTMLDivElement>(null)
  const want = useRef({ overview, zoom, reduced })
  useEffect(() => {
    want.current = { overview, zoom, reduced }
  })

  useEffect(() => {
    const st = stage.current
    const pl = plane.current
    if (!st || !pl) return
    let raf = 0
    let last = performance.now()
    let visible = true
    let resumed = false
    const cam = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, ready: false }

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
      const { overview: wide, zoom: z0, reduced: still } = want.current
      const s = now / 1000
      const target = { x: 0, y: 0, z: 1, rx: 0, ry: 0, rz: 0 }
      if (wide) {
        const cw = pl.offsetWidth
        const ch = pl.offsetHeight
        const fit = Math.min(W / cw, H / ch) * 0.92
        Object.assign(target, { x: cw / 2, y: ch / 2, z: fit, rx: still ? 0 : 9, ry: still ? 0 : -9, rz: still ? 0 : -2.5 })
      } else {
        const c = cursor.current
        const p = c ? offsetIn(c) : offsetIn(code.current)
        const fontPx = parseFloat(getComputedStyle(pl).fontSize) || 22
        const z = ((Math.min(W, H * 1.1) / 9.5) / fontPx) * z0
        Object.assign(target, {
          x: p.x,
          y: p.y + fontPx * 0.55,
          z,
          rx: 17 + 3 * Math.sin(s * 0.31),
          ry: -15 + 6 * Math.sin(s * 0.19),
          rz: -5 + 2 * Math.sin(s * 0.23),
        })
      }
      const k = cam.ready ? 1 - Math.exp(-dt * (wide ? 1.8 : 3.4)) : 1
      const kz = cam.ready ? 1 - Math.exp(-dt * (wide ? 1.5 : 2.2)) : 1
      cam.ready = true
      cam.x += (target.x - cam.x) * k
      cam.y += (target.y - cam.y) * k
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
  const shown = started ? active + 1 : 0
  const blurOf = (i: number) => (reduced || overview ? 0 : Math.min(6, Math.abs(i - active) * 1.5 * depth))
  const activeSegs = segs[active] ?? []
  const typedActive = Math.floor(Math.min(lines[active]?.code.length ?? 0, ap ? ap.typed(lt) : 0))

  return (
    <div className="grid w-full gap-3">
      <div
        ref={stage}
        role="img"
        aria-label={text}
        className={cn('ui-r relative isolate aspect-video w-full overflow-hidden bg-[#05060b] [perspective:1100px] [perspective-origin:50%_47%]', className)}
        style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)' }}
      >
        <style>{'@keyframes cr-chip{from{opacity:0;transform:translateX(-0.6em) scale(.9)}to{opacity:1;transform:none}}@keyframes cr-in{from{opacity:0;transform:translateY(.4em)}to{opacity:1;transform:none}}'}</style>
        <div
          ref={plane}
          aria-hidden="true"
          className="absolute top-0 left-0 w-max min-w-[46em] origin-top-left text-[22px] leading-none text-[#a9b1d6] will-change-transform [transform-style:preserve-3d]"
          style={glow ? { textShadow: '0 0 0.32em color-mix(in srgb, currentColor 55%, transparent), 0 0 0.08em currentColor' } : undefined}
        >
          {/* chrome: tab and breadcrumb */}
          <div className="flex items-end gap-[1ch] border-b border-white/10 bg-white/[0.03] px-[1ch] pt-[0.6em] text-[0.68em]">
            <span className="flex items-center gap-[0.8ch] rounded-t-[0.3em] border border-b-0 border-white/10 bg-[#05060b] px-[1.2ch] py-[0.55em] text-[#d6dcff]">
              <span className="rounded-[0.2em] bg-[#3178c6]/80 px-[0.4ch] text-[0.75em] leading-[1.2] text-white">TS</span>
              {file}
              <Icon name="close" tone="line" size="0.85em" className="text-white/35" />
            </span>
          </div>
          <div className="flex items-center gap-[0.8ch] px-[1.6ch] py-[0.5em] text-[0.62em] text-white/40">
            <span>src</span>
            <Icon name="chevron-down" tone="line" size="0.9em" className="-rotate-90" />
            <span>{file}</span>
            {fn && (
              <>
                <Icon name="chevron-down" tone="line" size="0.9em" className="-rotate-90" />
                <span style={{ color: INK.fn }}>{fn}</span>
              </>
            )}
          </div>

          {/* the code */}
          <div ref={code} className="relative px-[1ch] pt-[0.6em] pb-[1.2em]">
            {started && (
              <div
                className="absolute inset-x-0 border-y border-white/[0.07] bg-white/[0.045] transition-[top] duration-300 ease-out"
                style={{ top: `calc(0.6em + ${active * LINE_H}em)`, height: `${LINE_H}em` }}
              />
            )}
            {started && !overview && (
              <div
                className="pointer-events-none absolute inset-x-0 flex items-center whitespace-pre opacity-25 blur-[1px] [mask-image:linear-gradient(to_top,black,transparent_85%)]"
                style={{ top: `calc(0.6em + ${(active + 1) * LINE_H}em)`, height: `${LINE_H}em`, transform: 'scaleY(-1)' }}
              >
                <span className="w-[4ch] shrink-0" />
                <Code segs={activeSegs} n={typedActive} showSq={false} tone="" />
              </div>
            )}
            {lines.slice(0, shown).map((line, i) => {
              const p = plans[i]
              const local = t - p.start
              const n = Math.floor(Math.min(line.code.length, p.typed(local)))
              const done = local >= p.dur + 0.15
              const d = line.diagnostic
              const tone = TONE[d?.tone ?? 'error']
              const b = blurOf(i)
              return (
                <div
                  key={i}
                  className="relative flex items-center whitespace-pre transition-[filter,opacity] duration-500"
                  style={{ height: `${LINE_H}em`, filter: b ? `blur(${b}px)` : undefined, opacity: overview ? 1 : Math.max(0.35, 1 - Math.abs(i - active) * 0.12 * depth) }}
                >
                  <span className={cn('w-[4ch] shrink-0 pr-[1.4ch] text-right text-[0.7em]', i === active ? 'text-white/55' : 'text-white/20')} style={{ textShadow: 'none' }}>
                    {i + 1}
                  </span>
                  <span className="relative">
                    <Code segs={segs[i]} n={n} showSq={done} tone={tone} />
                    {i === active && (
                      <span ref={cursor} className="relative inline-block h-[1.15em] w-0 align-[-0.2em]">
                        <span
                          className={cn('absolute top-0 left-[0.05em] h-full w-[0.14em] rounded-[0.05em] bg-[#d9e6ff] shadow-[0_0_0.5em_#9cc0ff]', !typing && !reduced && 'animate-blink')}
                        />
                        {menuOpen && line.suggest && (
                          <span className="absolute top-[1.45em] left-[-0.6ch] z-10 grid min-w-[16ch] animate-[cr-in_.18s_ease-out_both] gap-[0.1em] rounded-[0.3em] border border-white/12 bg-[#0d1020]/95 p-[0.25em] text-[0.6em] shadow-[0_0.6em_1.6em_rgb(0_0_0/0.5)]" style={{ textShadow: 'none' }}>
                            {[line.suggest.word, ...(line.suggest.options ?? []).filter((o) => o !== line.suggest?.word)].slice(0, 4).map((o, k) => (
                              <span key={o} className={cn('flex items-center gap-[1ch] rounded-[0.2em] px-[0.8ch] py-[0.35em]', k === 0 ? 'bg-[#2a4ea8]/70 text-white' : 'text-white/60')}>
                                <span className="grid size-[1.2em] place-items-center rounded-[0.2em] border border-current/40 text-[0.75em]" style={{ color: INK.fn }}>
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
                  {d && done && <Chip text={d.text} tone={d.tone} />}
                </div>
              )
            })}
          </div>

          {/* the terminal */}
          {logs.length > 0 && (
            <div className={cn('border-t border-white/10 px-[1.6ch] pt-[0.5em] pb-[1em] text-[0.62em] transition-opacity duration-500', showTerm ? 'opacity-100' : 'opacity-0')}>
              <div className="mb-[0.7em] flex gap-[2.4ch] text-[0.85em] tracking-[0.08em] text-white/35">
                <span>PROBLEMS</span>
                <span>OUTPUT</span>
                <span className="border-b border-current text-white/80">TERMINAL</span>
              </div>
              {showTerm && (
                <div className="grid gap-[0.45em]">
                  <span className="text-white/70">
                    <span style={{ color: TONE.ok }}>~/{fn ?? 'reel'}</span> $ {command ?? `run ${file}`}
                  </span>
                  {logs.map((l, k) =>
                    t >= termAt + 0.6 + k * 0.45 ? (
                      <span key={k} className="animate-[cr-in_.25s_ease-out_both] text-white/75">
                        <span className="inline-block w-[6ch]" style={{ color: TONE[l.tone ?? 'info'] }}>
                          {l.tone ?? 'info'}
                        </span>
                        {l.text}
                      </span>
                    ) : null,
                  )}
                </div>
              )}
            </div>
          )}

          {lcd && (
            <div
              className="pointer-events-none absolute inset-0 opacity-60 mix-blend-multiply"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, rgb(0 0 0/.55) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgb(0 0 0/.45) 0 1px, transparent 1px 3px)',
              }}
            />
          )}
        </div>
        {/* lens: vignette and a soft bloom from the middle */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(120% 90% at 50% 47%, transparent 45%, rgb(0 0 0/.78) 100%)' }}
        />
      </div>
      {controls && time === undefined && <TimelineScrubber timeline={tl} label="Code reel" />}
    </div>
  )
}
