import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { impactOn } from '@/fx'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { parseCaptions, splitWords } from './caption-cues'
import type { Cue } from './caption-cues'
import { WordTile } from './word-tiles'
import type { TileTone, WordStyle } from './word-tiles'

export type KineticCaptionPreset = 'karaoke' | 'pop' | 'bounce' | 'stack' | 'slam' | 'typewriter' | 'wave'

export type KineticCaptionProps = {
  /** Cues, or SRT / WebVTT source text. Wrap words in `*stars*` to emphasize them. */
  cues: Cue[] | string
  /** Playback time in seconds (useMediaTime(videoRef) or useTimeline().time). */
  time: number
  preset?: KineticCaptionPreset
  position?: 'top' | 'center' | 'bottom'
  /** Words shown at once (a cue is split into balanced chunks). For `stack`: words per line. */
  maxWords?: number
  /** Lines a chunk may take; the text shrinks to fit. */
  maxLines?: 1 | 2
  /** `auto`: `*markup*` plus ALL-CAPS words and words ending in "!". `markup`: only `*markup*`. */
  emphasis?: 'auto' | 'markup' | 'none'
  uppercase?: boolean
  size?: 'sm' | 'md' | 'lg'
  /** Words as tiles (word-tiles.tsx): block, outline, sticker, split, stamp, tape. `plain` is outlined caption text. */
  wordStyle?: WordStyle
  className?: string
}

type Word = { text: string; start: number; end: number; hot: boolean }
type Prepared = { start: number; end: number; text: string; words: Word[]; chunks: number[][] }

const SIZE = {
  sm: 'clamp(13px, 4.6cqi, 40px)',
  md: 'clamp(15px, 6.2cqi, 56px)',
  lg: 'clamp(18px, 8.2cqi, 78px)',
}
const PLACE = { top: 'justify-start', center: 'justify-center', bottom: 'justify-end' }
const EXIT = 0.18

const lettersOf = (s: string) => s.replace(/[^\p{L}]/gu, '')
const isCaps = (s: string) => {
  const l = lettersOf(s)
  return l.length >= 2 && l === l.toUpperCase() && l !== l.toLowerCase()
}

/** Cue → display words (markup stripped, emphasis decided) and balanced chunks of word indices. */
function prepare(cue: Cue, emphasis: 'auto' | 'markup' | 'none', maxWords: number): Prepared {
  const raw = splitWords(cue)
  // a cue written all in caps is just loud captions: caps alone do not emphasize there
  const shouty = isCaps(cue.text)
  let open = false
  const words: Word[] = raw
    .map((w) => {
      const opens = /^\W*\*/.test(w.text)
      const stars = (w.text.match(/\*/g) ?? []).length
      if (opens) open = true
      const marked = open
      if (/\*\W*$/.test(w.text) && (!opens || stars > 1)) open = false
      const text = w.text.replace(/\*/g, '')
      const auto = emphasis === 'auto' && ((!shouty && isCaps(text)) || /!["')\]]*$/.test(text))
      return { text, start: w.start, end: w.end, hot: emphasis !== 'none' && (marked || auto) }
    })
    .filter((w) => w.text)
  const per = Math.max(1, Math.floor(maxWords))
  const n = Math.max(1, Math.ceil(words.length / per))
  const chunks: number[][] = []
  let k = 0
  for (let c = 0; c < n; c++) {
    const size = Math.floor(words.length / n) + (c < words.length % n ? 1 : 0)
    chunks.push(Array.from({ length: size }, () => k++))
  }
  return { start: cue.start, end: cue.end, text: words.map((w) => w.text).join(' '), words, chunks }
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/**
 * TikTok / CapCut-style animated captions. Give it cues (or SRT / VTT text) and a time; every
 * frame is a pure function of that time, so pausing freezes it and scrubbing lands exactly.
 * Each cue is cut into chunks of `maxWords`; the spoken word gets the accent colour and a lift,
 * emphasized words the pop colour, a bigger scale and a small shake. The visual layer is hidden
 * from screen readers; a polite live region reads each cue once.
 *
 * It fills its nearest positioned parent (absolute inset-0), so put it in a `relative` box over
 * the video. Text size follows the box width (container units).
 */
export function KineticCaption({
  cues,
  time,
  preset = 'pop',
  position = 'bottom',
  maxWords = 4,
  maxLines = 2,
  emphasis = 'auto',
  uppercase = false,
  size = 'md',
  wordStyle = 'plain',
  className,
}: KineticCaptionProps) {
  const tiles = wordStyle !== 'plain'
  const list = useMemo(() => (typeof cues === 'string' ? parseCaptions(cues) : cues), [cues])
  const prepared = useMemo(() => list.map((c) => prepare(c, emphasis, maxWords)), [list, emphasis, maxWords])
  const { style } = useTheme()
  const still = useReducedMotion()
  const flat = style === 'flat'
  const amp = flat ? 0.6 : 1

  const root = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const clock = useRef({ prev: time, now: time })

  // the cue on screen: the latest one that has started and not ended, else one that just ended (exit fade)
  let ci = -1
  for (let i = 0; i < prepared.length; i++) {
    const c = prepared[i]
    if (c.start <= time && time < c.end) ci = i
    else if (c.start > time) break
  }
  let exit = 1
  if (ci < 0) {
    for (let i = prepared.length - 1; i >= 0; i--) {
      const c = prepared[i]
      if (c.end <= time && time - c.end < EXIT) {
        ci = i
        exit = still ? 0 : 1 - (time - c.end) / EXIT
        break
      }
      if (c.end <= time) break
    }
  }
  const cue = ci >= 0 ? prepared[ci] : null
  const words = cue?.words ?? []
  let wi = -1
  for (let i = 0; i < words.length; i++) if (words[i].start <= time) wi = i
  const activeWord = exit < 1 ? -1 : wi
  const chunkOf = (i: number) => (cue ? Math.max(0, cue.chunks.findIndex((ch) => ch.includes(i))) : 0)
  const cIdx = cue ? chunkOf(Math.max(0, wi)) : 0

  // which word rows are on screen
  let rows: number[][] = []
  if (cue) {
    if (preset === 'stack') rows = cue.chunks.slice(Math.max(0, cIdx - maxLines + 1), cIdx + 1)
    else rows = [cue.chunks[cIdx] ?? []]
  }
  const rowKey = cue ? `${ci}:${rows.map((r) => r[0]).join(',')}` : ''
  const chunkStart = cue ? (cIdx === 0 ? cue.start : (words[cue.chunks[cIdx][0]]?.start ?? cue.start)) : 0
  const chunkAge = time - chunkStart

  // spring 0 → 1 with an overshoot (flat settles sooner)
  const sp = (a: number) => (a <= 0 ? 0 : 1 - Math.exp(-(flat ? 11 : 7) * a) * Math.cos((flat ? 13 : 15) * a))

  // keep the chunk within maxLines: shrink the font until the words sit on that many rows
  useLayoutEffect(() => {
    const el = box.current
    const host = root.current
    if (!el || !host) return
    const fit = () => {
      let f = 1
      el.style.setProperty('--fit', '1')
      const lines = () => {
        const tops = new Set<number>()
        el.querySelectorAll<HTMLElement>('[data-w]').forEach((w) => tops.add(Math.round(w.offsetTop)))
        return tops.size
      }
      const limit = preset === 'stack' ? Math.max(1, el.querySelectorAll('[data-row]').length) : maxLines
      for (let i = 0; i < 8 && lines() > limit && f > 0.45; i++) {
        f *= 0.88
        el.style.setProperty('--fit', String(f))
      }
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(host)
    return () => ro.disconnect()
  }, [rowKey, maxLines, preset, size, uppercase, wordStyle])

  // slam: an emphasized word that lands during playback gets an impact frame, scaled to the text
  const hitKey = preset === 'slam' && cue && activeWord >= 0 && words[activeWord].hot ? `${ci}:${activeWord}` : ''
  const hitStart = hitKey ? words[activeWord].start : 0
  // this frame's and the previous frame's time (declared before the slam effect, which reads both)
  useEffect(() => {
    clock.current = { prev: clock.current.now, now: time }
  })
  useEffect(() => {
    if (!hitKey || still) return
    const { prev, now } = clock.current
    // only when the clock ran into it, not when someone scrubbed onto it
    if (!(now - prev >= 0 && now - prev < 0.35 && hitStart >= prev - 0.02)) return
    const t = window.setTimeout(() => {
      const host = root.current
      const el = host?.querySelector<HTMLElement>('[data-hit]')
      if (!el || !host) return
      const px = parseFloat(getComputedStyle(el).fontSize) || 24
      const k = Math.min(1.1, Math.max(0.3, (px / 60) * Math.min(1, host.clientWidth / 640)))
      impactOn(el, { text: false, size: k, smoky: k > 0.5 })
    }, 60)
    return () => clearTimeout(t)
  }, [hitKey, hitStart, still])

  // the live region: one announcement per cue, after a short settle (scrubbing does not spam it)
  const cueText = cue && exit === 1 ? cue.text : ''
  const [said, setSaid] = useState('')
  useEffect(() => {
    const t = window.setTimeout(() => setSaid(cueText), 250)
    return () => clearTimeout(t)
  }, [cueText])

  let glyph = 0
  const renderWord = (i: number): ReactNode => {
    const w = words[i]
    const age = time - w.start
    const next = words[i + 1]?.start ?? cue!.end
    const active = i === activeWord
    const past = !active && age >= 0
    const future = age < 0
    const lift = still ? (active ? 1 : 0) : active ? sp(age) : past ? Math.exp(-12 * Math.max(0, time - next)) : 0
    const stagger = Math.max(0, i - (rows[0]?.[0] ?? 0)) * 0.03
    let x = 0
    let y = 0
    let s = 1
    let o = 1
    let hidden = false

    if (preset === 'pop' || preset === 'karaoke' || preset === 'wave') {
      const e = still ? 1 : sp(chunkAge - stagger)
      s *= 0.72 + 0.28 * e
      o = still ? 1 : clamp01((chunkAge - stagger) / 0.08)
    } else if (preset !== 'typewriter' || tiles) hidden = future

    if (!still && !hidden) {
      const up = (w.hot ? 1.5 : 1) * amp
      if (preset === 'pop') {
        s *= 1 + 0.09 * up * lift
        y -= 0.07 * lift
      } else if (preset === 'karaoke' || preset === 'typewriter') s *= 1 + 0.06 * up * lift
      else if (preset === 'wave') {
        s *= 1 + 0.09 * up * lift
        y -= 0.1 * lift
      } else if (preset === 'bounce') {
        y -= 0.75 * amp * Math.exp(-5.5 * age) * Math.abs(Math.cos(11 * age))
        o = clamp01(age / 0.06)
        s *= 1 + 0.1 * up * lift
      } else if (preset === 'stack') {
        y += 0.5 * (1 - sp(age))
        o = clamp01(age / 0.1)
        s *= 1 + 0.1 * up * lift
      } else if (preset === 'slam') {
        s *= Math.max(0.72, 1 + (w.hot ? 1.5 : 0.9) * amp * (1 - sp(age)))
        o = clamp01(age / 0.05)
        s *= 1 + 0.08 * up * lift
      }
      // emphasized words shake as they land
      if (active && w.hot && age < 0.6) x += Math.sin(age * 60) * 0.05 * amp * Math.exp(-age * 7)
    }
    if (still && active) s = w.hot ? 1.12 : 1.06

    // karaoke colours through its fill overlay; the rest colour the spoken word, and emphasized words stay pop once said
    const tone = preset === 'karaoke' || future ? '' : w.hot ? 'text-pop' : active ? 'text-accent' : ''
    const tileTone: TileTone = preset === 'karaoke' || future ? 'base' : w.hot ? 'pop' : active ? 'accent' : 'base'
    const motion: CSSProperties = {
      transform: x || y || s !== 1 ? `translate(${x}em, ${y}em) scale(${s})` : undefined,
      opacity: hidden ? 0 : o * exit,
    }
    let body: ReactNode = w.text
    let fill: ReactNode = null

    if (preset === 'karaoke') {
      const k = future ? 0 : active ? clamp01((time - w.start) / Math.max(0.05, w.end - w.start)) : 1
      // tiles: a second, highlighted tile wipes over the word left to right
      if (tiles)
        fill = (
          <WordTile
            aria-hidden="true"
            look={wordStyle}
            tone={w.hot ? 'pop' : 'accent'}
            index={i}
            className="absolute top-0 left-0 leading-[1.12]"
            style={{ clipPath: k >= 1 ? 'none' : `inset(-0.5em ${(1 - k) * 100}% -0.5em -0.5em)` }}
          >
            {w.text}
          </WordTile>
        )
      else
        body = (
        <>
          {w.text}
          <span
            aria-hidden="true"
            className={cn('absolute inset-0', w.hot ? 'text-pop' : 'text-accent')}
            style={{ clipPath: k >= 1 ? 'none' : `inset(-0.4em ${(1 - k) * 100}% -0.4em -0.4em)` }}
          >
            {w.text}
          </span>
        </>
      )
    } else if (preset === 'typewriter') {
      const chars = [...w.text]
      const n = future ? 0 : active && !still ? Math.ceil(clamp01(age / Math.max(0.05, (w.end - w.start) * 0.7)) * chars.length) : chars.length
      body = (
        <>
          {chars.slice(0, n).join('')}
          {active && (
            <span className="relative inline-block w-0">
              <span className="absolute bottom-[0.12em] left-[0.04em] h-[0.82em] w-[0.08em] animate-blink rounded-full bg-accent" />
            </span>
          )}
          <span className="opacity-0">{chars.slice(n).join('')}</span>
        </>
      )
    } else if (preset === 'wave') {
      body = [...w.text].map((ch, j) => {
        const g = glyph++
        const dy = still ? 0 : Math.sin(time * 5.5 - g * 0.55) * 0.07 * amp
        return (
          <span key={j} className="inline-block" style={dy ? { transform: `translateY(${dy}em)` } : undefined}>
            {ch}
          </span>
        )
      })
    }

    return (
      <span
        key={`${ci}-${i}`}
        data-w=""
        data-hit={preset === 'slam' && active && w.hot ? '' : undefined}
        className={cn('relative inline-block origin-[50%_70%] whitespace-nowrap will-change-transform', tiles ? 'mx-[0.05em] my-[0.06em]' : ['mx-[0.14em]', tone])}
        style={motion}
      >
        {tiles ? (
          <>
            <WordTile look={wordStyle} tone={tileTone} index={i} className="block leading-[1.12]">
              {body}
            </WordTile>
            {fill}
          </>
        ) : (
          body
        )}
      </span>
    )
  }

  return (
    <div ref={root} className={cn('@container pointer-events-none absolute inset-0', className)}>
      <div aria-hidden="true" className={cn('absolute inset-0 flex flex-col items-center px-[5cqi] py-[6cqi]', PLACE[position])}>
        <div
          ref={box}
          className={cn(
            'ui-head max-w-full text-center [text-wrap:balance]',
            tiles
              ? 'text-ink'
              : [
                  // the outline never thins out on small captions nor turns into a slab on big ones
                  'text-paper [paint-order:stroke_fill] [-webkit-text-stroke:clamp(3px,0.17em,11px)_var(--color-ink)] [text-shadow:0_max(1.5px,0.07em)_0_var(--color-ink)]',
                  '[[data-style=flat]_&]:[-webkit-text-stroke:clamp(2.5px,0.13em,8px)_var(--color-ink)] [[data-style=flat]_&]:[text-shadow:0_0.06em_0.18em_color-mix(in_srgb,var(--color-ink)_45%,transparent)]',
                ],
            uppercase && 'uppercase',
          )}
          style={{ fontSize: `calc(${SIZE[size]} * var(--fit, 1))`, lineHeight: tiles ? 1.5 : 1.22 }}
        >
          {cue &&
            rows.map((row, r) => (
              <div key={`${ci}-${row[0]}`} data-row="" className={preset === 'stack' ? 'block' : 'contents'}>
                {row.map((i, j) => (
                  <span key={i}>
                    {j > 0 && ' '}
                    {renderWord(i)}
                  </span>
                ))}
                {r < rows.length - 1 && preset !== 'stack' && ' '}
              </div>
            ))}
        </div>
      </div>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {said}
      </span>
    </div>
  )
}
