import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, HTMLAttributes, MouseEvent, ReactNode } from 'react'
import { Mascot } from '@/components/art/mascot'
import type { MascotExpression } from '@/components/art/mascot'
import { Icon } from '@/components/ui/icon'
import type { IconName } from '@/components/ui/icon'
import { centerOf, delayed, prefersReducedMotion, rand, sparkle, spawn, speedLines, uiStyle, useSprings } from '@/fx'
import { C } from '@/fx/palette'
import { cn } from '@/lib/utils'

export type DialogueChoice = { label: string; value?: string }

export type DialoguePortraitState = { expression: MascotExpression; talking: boolean }
/** A node, or a render function that gets the line's expression and whether it is still typing. */
export type DialoguePortrait = ReactNode | ((state: DialoguePortraitState) => ReactNode)

export type DialogueLine = {
  /** The line. Wrap a word in *stars* to make it hit (pop in, then shake). */
  text: string
  /** Overrides the box's `speaker` for this line. */
  speaker?: string
  /** Overrides the box's `portrait` for this line (`false` hides it). */
  portrait?: DialoguePortrait
  /** The portrait's face for this line (the default portrait is the mascot). */
  expression?: MascotExpression
  /** Which side the portrait stands on for this line. */
  side?: 'left' | 'right'
  /** Shown once the line has typed out; the reader must pick one to go on. */
  choices?: (string | DialogueChoice)[]
}

export type DialogueBoxProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** The script. Plain strings use the box defaults. Change the component's `key` to restart. */
  lines: (string | DialogueLine)[]
  /** Default name on the plate. */
  speaker?: string
  /** Default portrait. Lines with a speaker get the mascot unless this is set; `false` = none. */
  portrait?: DialoguePortrait
  /** Default expression for the mascot portrait. */
  expression?: MascotExpression
  /** Default side for the portrait. */
  side?: 'left' | 'right'
  /** Typewriter speed in characters per second. */
  speed?: number
  /**
   * Type the first line out on mount (default). `false` shows it already written and
   * waits, calm, for the reader: nothing animates until they click or press a key.
   */
  autoPlay?: boolean
  /** Show the Auto / Skip / Log buttons. */
  controls?: boolean
  /** Auto mode: how long a finished line stays before moving on (ms, plus a little per character). */
  autoDelay?: number
  /** Called with the new index each time the box moves to the next line. */
  onLineChange?: (index: number) => void
  /** Called when the reader picks a choice: its value (or label) and the line index. */
  onChoose?: (value: string, line: number) => void
  /** Called once when the reader advances past the last line. */
  onComplete?: () => void
}

type Seg = { chars: string[]; em: boolean; start: number }

/** "Hello *world*!" → plain / emphasis segments, counted in code points. */
function parse(text: string): Seg[] {
  const segs: Seg[] = []
  let pos = 0
  for (const part of text.split(/(\*[^*\n]+\*)/)) {
    if (!part) continue
    const em = part.length > 2 && part.startsWith('*') && part.endsWith('*')
    const chars = [...(em ? part.slice(1, -1) : part)]
    segs.push({ chars, em, start: pos })
    pos += chars.length
  }
  return segs
}

const LONG = /[.!?。！？…]/
const SHORT = /[,、;:]/
/** How many character-beats to hold after a character. */
const beatsAfter = (ch: string | undefined) => (ch === undefined ? 2 : LONG.test(ch) ? 7 : SHORT.test(ch) ? 3.5 : 1)
const POP = 'cubic-bezier(.2,1.6,.4,1)'

const KOMA = ({ expression, talking }: DialoguePortraitState) => <Mascot expression={expression} talking={talking} />
const draw = (p: DialoguePortrait, s: DialoguePortraitState): ReactNode => (typeof p === 'function' ? p(s) : p)
const SPARK = 'M12 1Q13.4 10.6 23 12Q13.4 13.4 12 23Q10.6 13.4 1 12Q10.6 10.6 12 1Z'

/** Typed text: one span per character (so each can pop), words kept unbreakable. */
function Typed({ segs, visible }: { segs: Seg[]; visible: number }) {
  return segs.map((s, k) => {
    const out: ReactNode[] = []
    let word: ReactNode[] = []
    const flush = (key: string) => {
      if (word.length) out.push(<span key={key} className="whitespace-nowrap">{word}</span>)
      word = []
    }
    s.chars.forEach((ch, j) => {
      const n = s.start + j
      if (/\s/.test(ch)) {
        flush(`w${j}`)
        out.push(ch)
        return
      }
      word.push(
        <span key={j} data-c={n} className={cn('inline-block', n >= visible && 'opacity-0')}>
          {ch}
        </span>,
      )
    })
    flush('end')
    return (
      <span key={k} data-seg={k} className={s.em ? 'ui-head inline-block text-accent' : undefined}>
        {out}
      </span>
    )
  })
}

function Control({ icon, label, pressed, onClick }: { icon: IconName; label: string; pressed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="ui-head ui-pill ui-border-thin inline-flex cursor-pointer items-center gap-1 bg-paper px-2 py-1 text-[11px] leading-none text-ink transition-colors duration-150 hover:bg-accent-soft focus-visible:ui-focus aria-pressed:bg-accent aria-pressed:text-white"
    >
      <Icon name={icon} tone="line" size={12} />
      <span className="@max-[17rem]:sr-only">{label}</span>
    </button>
  )
}

/**
 * A visual-novel text box. The speaker's portrait (the mascot by default) stands half out
 * of the box in a soft glow, hops on every new line, bobs and talks while the text types,
 * and changes expression per line. The name plate is a sticker that slams in on a speaker
 * change; characters pop in one by one (holding a beat on punctuation) and *emphasis*
 * words shake. Lines can end in choices. Auto / Skip / Log controls and the line counter sit in a footer row under the text.
 * Click / Enter / Space: finish the line, then advance. 1–9 pick a choice, Esc closes the log.
 */
export function DialogueBox({
  lines,
  speaker,
  portrait,
  expression,
  side: sideProp = 'left',
  speed = 40,
  autoPlay = true,
  controls = true,
  autoDelay = 1400,
  onLineChange,
  onChoose,
  onComplete,
  className,
  onClick,
  onKeyDown,
  ...rest
}: DialogueBoxProps) {
  const [index, setIndex] = useState(0)
  // autoPlay off: the first line starts fully written (clamped to its length below)
  const [shown, setShown] = useState(() => (autoPlay ? 0 : Number.POSITIVE_INFINITY))
  const [ended, setEnded] = useState(false)
  const [auto, setAuto] = useState(false)
  const [skip, setSkip] = useState(false)
  const [log, setLog] = useState(false)
  const [picks, setPicks] = useState<Record<number, string>>({})
  const last = Math.max(0, lines.length - 1)
  const i = Math.min(index, last)

  const lineAt = (k: number) => {
    const raw = lines[k] ?? ''
    const line: DialogueLine = typeof raw === 'string' ? { text: raw } : raw
    const who = line.speaker ?? speaker
    const pic: DialoguePortrait = line.portrait !== undefined ? line.portrait : portrait !== undefined ? portrait : who ? KOMA : null
    return { line, who, pic, face: line.expression ?? expression ?? 'neutral', side: line.side ?? sideProp }
  }
  const { who, pic, face, side } = lineAt(i)
  const hasPic = pic != null && pic !== false
  const raw = lines[i] ?? ''
  const text = typeof raw === 'string' ? raw : raw.text
  const rawChoices = typeof raw === 'string' ? undefined : raw.choices
  const segs = useMemo(() => parse(text), [text])
  const chars = useMemo(() => segs.flatMap((s) => s.chars), [segs])
  const total = chars.length
  // reduced motion: no typewriter, the whole line is there at once
  const visible = prefersReducedMotion() ? total : Math.min(shown, total)
  const typing = visible < total
  const choices = useMemo(
    () => rawChoices?.map((c) => (typeof c === 'string' ? { label: c, value: c } : { label: c.label, value: c.value ?? c.label })),
    [rawChoices],
  )
  const waiting = !typing && !!choices?.length && picks[i] === undefined
  const base = useId()

  const root = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const textEl = useRef<HTMLParagraphElement>(null)
  const tag = useRef<HTMLSpanElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const hop = useRef<HTMLDivElement>(null)
  const bob = useRef<HTMLDivElement>(null)
  const choiceEl = useRef<HTMLDivElement>(null)
  const logEl = useRef<HTMLOListElement>(null)
  const prevShown = useRef(autoPlay ? 0 : Number.POSITIVE_INFINITY)
  const prevLine = useRef(i)
  const prevWho = useRef(who)
  const prevFace = useRef(face)

  const squash = useSprings(
    box,
    { s: 0, y: 0 },
    (v, el) => {
      el.style.transform = `translateY(${v.y}px) scale(${1 + v.s * 0.012}, ${1 - v.s * 0.02})`
    },
    { stiffness: 520, damping: 13 },
  )
  const jump = useSprings(
    hop,
    { y: 0, s: 0 },
    (v, el) => {
      el.style.transform = `translateY(${v.y}px) scale(${1 - v.s * 0.012}, ${1 + v.s * 0.018})`
    },
    { stiffness: 380, damping: 14 },
  )

  // the typewriter: one character per beat, longer beats after punctuation
  useEffect(() => {
    if (shown >= total || prefersReducedMotion()) return
    const t = window.setTimeout(() => setShown((n) => n + 1), (1000 / Math.max(1, speed)) * beatsAfter(chars[shown - 1]))
    return () => window.clearTimeout(t)
  }, [shown, total, speed, chars])

  // each new character pops up; emphasis words pop as a unit, then shake + sparkle when they finish
  useLayoutEffect(() => {
    const from = prevShown.current
    prevShown.current = visible
    if (visible <= from || prefersReducedMotion()) return
    const flat = uiStyle() === 'flat'
    const burst = visible - from
    if (burst <= 120) {
      for (let n = from; n < visible; n++) {
        textEl.current?.querySelector<HTMLElement>(`[data-c="${n}"]`)?.animate(
          [
            { transform: 'translateY(.4em) scale(.3)', opacity: 0 },
            { transform: flat ? 'translateY(-.04em) scale(1.05)' : 'translateY(-.12em) scale(1.25)', opacity: 1, offset: 0.55 },
            { transform: 'none', opacity: 1 },
          ],
          { duration: flat ? 180 : 240, delay: burst > 1 ? (n - from) * 7 : 0, easing: POP, fill: 'backwards' },
        )
      }
    }
    segs.forEach((s, k) => {
      if (!s.em) return
      const el = textEl.current?.querySelector<HTMLElement>(`[data-seg="${k}"]`)
      if (!el) return
      const end = s.start + s.chars.length
      if (from <= s.start && visible > s.start) {
        el.animate(
          [
            { transform: 'scale(.6)' },
            { transform: flat ? 'scale(1.1)' : 'scale(1.35) rotate(-4deg)', offset: 0.55 },
            { transform: 'none' },
          ],
          { duration: flat ? 260 : 380, easing: POP },
        )
      }
      if (from < end && visible >= end) {
        const a = flat ? 1.5 : 3.5
        el.animate(
          [
            { translate: '0 0' },
            { translate: `${-a}px ${a * 0.4}px` },
            { translate: `${a}px ${-a * 0.5}px` },
            { translate: `${-a * 0.6}px ${a * 0.3}px` },
            { translate: '0 0' },
          ],
          { duration: 300, delay: 120, easing: 'linear' },
        )
        const r = el.getBoundingClientRect()
        spawn(delayed(0.12, sparkle(r.right + 2, r.top + 2, { size: 11, color: C.pop })))
        squash.kick({ s: 4 })
        jump.kick({ s: 6 })
      }
    })
  }, [visible, segs, squash, jump])

  // new line: text slides up, the portrait hops; a new speaker gets a fresh plate slam and walks in
  useLayoutEffect(() => {
    const lineChanged = prevLine.current !== i
    const whoChanged = prevWho.current !== who
    const faceChanged = prevFace.current !== face
    prevLine.current = i
    prevWho.current = who
    prevFace.current = face
    if ((!lineChanged && !whoChanged && !faceChanged) || prefersReducedMotion()) return
    const flat = uiStyle() === 'flat'
    if (lineChanged) {
      textEl.current?.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'ease-out' })
      squash.kick({ s: 5, y: -30 })
    }
    if (faceChanged || lineChanged) jump.kick({ y: flat ? -160 : -300, s: 7 })
    if (!whoChanged) return
    tag.current?.animate(
      [
        { transform: flat ? 'translateY(6px)' : 'translateX(-28px) scale(.5)', opacity: 0 },
        { transform: flat ? 'none' : 'translateX(3px) scale(1.15)', opacity: 1, offset: 0.6 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: flat ? 240 : 420, easing: POP },
    )
    stage.current?.animate(
      [
        { translate: `${side === 'left' ? -36 : 36}px 14px`, opacity: 0 },
        { translate: '0 -8px', opacity: 1, offset: 0.6 },
        { translate: '0 0', opacity: 1 },
      ],
      { duration: 460, easing: POP },
    )
    const t = tag.current
    if (t) {
      const r = t.getBoundingClientRect()
      spawn(speedLines({ left: r.left - 10, top: r.top - 4, width: r.width, height: r.height + 8 }, 1, { count: 6, length: 70 }))
    }
  }, [i, who, face, side, squash, jump])

  // talk-bob while the line types
  useEffect(() => {
    if (!typing || prefersReducedMotion()) return
    const a = bob.current?.animate([{ translate: '0 0' }, { translate: '0 -3px' }], { duration: 170, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' })
    return () => a?.cancel()
  }, [typing, i])

  // choices appear: hand keyboard focus to the first one if the box had it
  useEffect(() => {
    if (!waiting) return
    if (document.activeElement === root.current) choiceEl.current?.querySelector('button')?.focus()
  }, [waiting])

  useEffect(() => {
    if (log && logEl.current) logEl.current.scrollTop = logEl.current.scrollHeight
  }, [log])

  const next = () => {
    if (i < last) {
      setIndex(i + 1)
      setShown(0)
      onLineChange?.(i + 1)
    } else if (!ended) {
      setEnded(true)
      setAuto(false)
      setSkip(false)
      onComplete?.()
    }
  }
  const advance = () => {
    if (log) return setLog(false)
    if (typing) {
      setShown(total)
      squash.kick({ s: 3 })
      return
    }
    if (waiting) {
      choiceEl.current?.animate([{ translate: '-4px 0' }, { translate: '4px 0' }, { translate: '0 0' }], { duration: 220 })
      return
    }
    next()
  }
  const choose = (c: { label: string; value: string }, el: HTMLElement) => {
    setPicks((p) => ({ ...p, [i]: c.label }))
    setSkip(false)
    onChoose?.(c.value, i)
    if (!prefersReducedMotion()) {
      const { x, y, rect } = centerOf(el)
      for (let k = 0; k < 4; k++) spawn(delayed(k * 0.05, sparkle(x + rand(-0.5, 0.5) * rect.width, y + rand(-14, 14), { size: rand(9, 14), color: k % 2 ? C.pop : C.white })))
    }
    root.current?.focus()
    next()
  }

  // auto / skip
  const live = useRef({ advance, next })
  useLayoutEffect(() => {
    live.current = { advance, next }
  })
  const skipping = skip && !waiting && !ended
  useEffect(() => {
    if (ended || log) return
    if (skipping) {
      const t = window.setTimeout(() => live.current.advance(), typing ? 40 : 130)
      return () => window.clearTimeout(t)
    }
    if (auto && !typing && !waiting) {
      const t = window.setTimeout(() => live.current.next(), autoDelay + total * 12)
      return () => window.clearTimeout(t)
    }
  }, [skipping, auto, typing, waiting, ended, log, i, total, autoDelay])

  const stop = (e: MouseEvent) => e.stopPropagation()
  const plain = chars.join('')
  const atEnd = i >= last
  const left = side === 'left'
  const seen = Array.from({ length: i + 1 }, (_, k) => lineAt(k))

  return (
    <div
      ref={root}
      role="group"
      aria-roledescription="dialogue"
      aria-label="Dialogue"
      aria-describedby={`${base}-hint`}
      tabIndex={0}
      {...rest}
      onClick={(e) => {
        advance()
        onClick?.(e)
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e)
        if (e.key === 'Escape' && log) {
          e.preventDefault()
          setLog(false)
          root.current?.focus()
          return
        }
        if (waiting && /^[1-9]$/.test(e.key)) {
          const c = choices?.[Number(e.key) - 1]
          const btn = choiceEl.current?.querySelectorAll('button')[Number(e.key) - 1]
          if (c && btn) choose(c, btn)
          return
        }
        if (e.target !== e.currentTarget) return
        if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
          e.preventDefault()
          advance()
        }
      }}
      className={cn(
        'group relative w-[min(100%,640px)] cursor-pointer touch-manipulation text-left text-ink select-none focus-visible:outline-none',
        hasPic ? 'pt-14' : 'pt-5',
        className,
      )}
      style={{ '--pw': 'clamp(92px, 26%, 156px)' } as CSSProperties}
    >
      <div
        ref={box}
        className={cn(
          'ui-card ui-tone relative min-h-[148px] origin-bottom px-5 pt-9 pb-4 group-focus-visible:ui-focus',
          'bg-[linear-gradient(180deg,var(--color-paper)_45%,color-mix(in_srgb,var(--color-accent-soft)_26%,var(--color-paper)))]',
          hasPic && (left ? 'pl-[calc(var(--pw)+22px)]' : 'pr-[calc(var(--pw)+22px)]'),
        )}
      >
        {/* portrait: stands in front of the box's top edge, fading into the box at the feet */}
        {hasPic && (
          <div
            ref={stage}
            aria-hidden="true"
            className={cn('pointer-events-none absolute bottom-(--ui-bw) z-10 w-(--pw)', left ? 'left-3' : 'right-3')}
          >
            <span className="absolute inset-x-[6%] top-[8%] bottom-0 rounded-full bg-accent opacity-35 blur-2xl" />
            <div ref={hop} className="relative origin-bottom">
              <div ref={bob} className={cn('[mask-image:linear-gradient(to_top,transparent,#000_20%)]', !left && '-scale-x-100')}>
                {draw(pic, { expression: face, talking: typing })}
              </div>
            </div>
          </div>
        )}

        {who && (
          <span
            ref={tag}
            aria-hidden="true"
            className={cn(
              'ui-head ui-border-thin ui-pill ui-shadow-sm ui-fill absolute top-0 z-20 inline-flex origin-[20%_100%] -translate-y-1/2 items-center gap-1.5 bg-accent px-4 py-1.5 text-[15px] leading-none text-white',
              hasPic && left ? 'left-[calc(var(--pw)+18px)]' : 'left-5',
            )}
          >
            <Icon name="sparkle" size={13} tone="line" />
            {who}
          </span>
        )}

        <div className="@container relative min-w-0">
          <p ref={textEl} aria-hidden="true" className="m-0 min-h-[4.6em] text-[17px] leading-relaxed">
            <Typed segs={segs} visible={visible} />
          </p>

          {waiting && choices && (
            <div ref={choiceEl} role="group" aria-label="Choices" className="mt-3 grid gap-2 sm:grid-cols-2" onClick={stop}>
              {choices.map((c, k) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={(e) => choose(c, e.currentTarget)}
                  className="ui-head ui-border-thin ui-r ui-shadow-sm flex animate-pop cursor-pointer items-center gap-2.5 bg-paper px-3 py-2.5 text-left text-[15px] leading-tight text-ink transition-[translate,box-shadow,background-color] duration-200 ease-snap hover:-translate-y-0.5 hover:bg-accent-soft hover:ui-shadow-hover focus-visible:ui-focus active:translate-y-px active:ui-shadow-press"
                  style={{ animationDelay: `${k * 70}ms` }}
                >
                  <span aria-hidden="true" className="ui-pill ui-fill grid size-6 shrink-0 place-items-center bg-accent text-[12px] leading-none text-white">
                    {k + 1}
                  </span>
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {/* footer row inside the text column: next/end mark, counter and controls, never over the plate or portrait */}
          <div className="mt-3 flex min-h-6 flex-wrap items-center justify-end gap-x-1.5 gap-y-2">
            <span aria-hidden="true" className="pointer-events-none mr-auto grid min-h-6 place-items-center">
              {!typing && !waiting && !atEnd && <Icon name="chevron-down" tone="line" size={20} className="block animate-bob text-accent" />}
              {!typing && !waiting && atEnd && (
                <span className="ui-head ui-pill block animate-blink bg-ink px-2 py-1 text-[11px] leading-none text-paper">{ended ? 'Fin' : 'End'}</span>
              )}
            </span>
            {controls && (
              <div role="group" aria-label="Dialogue controls" className="flex flex-wrap items-center justify-end gap-1.5" onClick={stop}>
                {lines.length > 1 && (
                  <span aria-hidden="true" className="mr-1 font-mono text-[11px] leading-none text-mute tabular-nums">
                    {i + 1}/{lines.length}
                  </span>
                )}
                <Control icon="play" label="Auto" pressed={auto} onClick={() => setAuto((a) => !a)} />
                <Control icon="arrow-right" label="Skip" pressed={skip} onClick={() => setSkip((s) => !s)} />
                <Control icon="scroll" label="Log" pressed={log} onClick={() => setLog((l) => !l)} />
              </div>
            )}
          </div>
        </div>

        {/* corner flourish */}
        <svg aria-hidden="true" viewBox="0 0 48 32" className="fx-only pointer-events-none absolute top-2 right-2.5 w-10 opacity-80">
          <path d={SPARK} transform="translate(22 4) scale(.95)" className="fill-accent-soft" />
          <path d={SPARK} transform="translate(8 14) scale(.55)" className="fill-pop" />
          <path d={SPARK} transform="translate(2 4) scale(.32)" className="fill-accent" />
        </svg>

        {log && (
          <div
            role="region"
            aria-label="Dialogue history"
            className="ui-card absolute inset-x-0 bottom-[calc(100%+12px)] z-30 animate-panel-in cursor-default p-3"
            onClick={stop}
            onKeyDown={(e) => e.key !== 'Escape' && e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <span className="ui-head text-sm leading-none">History</span>
              <button
                type="button"
                aria-label="Close history"
                onClick={() => {
                  setLog(false)
                  root.current?.focus()
                }}
                className="ui-pill grid size-7 cursor-pointer place-items-center text-mute hover:bg-canvas hover:text-ink focus-visible:ui-focus"
              >
                <Icon name="close" tone="line" size={14} />
              </button>
            </div>
            <ol ref={logEl} role="log" className="m-0 grid max-h-60 list-none gap-2 overflow-y-auto p-1 select-text">
              {seen.map((s, k) => {
                const art = s.pic != null && s.pic !== false
                return (
                  <li key={k} className="grid grid-cols-[auto_1fr] items-start gap-2.5">
                    <span aria-hidden="true" className="ui-border-thin ui-pill grid size-9 place-items-center overflow-hidden bg-accent-soft">
                      {art && s.pic === KOMA ? <Mascot crop="face" expression={s.face} animated={false} /> : art ? <span className="block w-[160%]">{draw(s.pic, { expression: s.face, talking: false })}</span> : null}
                    </span>
                    <span className="grid gap-0.5 text-sm leading-snug">
                      {s.who && <span className="ui-head text-[12px] leading-none text-accent">{s.who}</span>}
                      <span>{s.line.text.replace(/\*([^*\n]+)\*/g, '$1')}</span>
                      {picks[k] !== undefined && (
                        <span className="inline-flex items-center gap-1 text-[12px] text-mute">
                          <Icon name="arrow-right" tone="line" size={12} /> {picks[k]}
                        </span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {who ? `${who}: ` : ''}
        {plain}
        {waiting && choices ? ` Choices: ${choices.map((c, k) => `${k + 1}, ${c.label}`).join('; ')}.` : ''}
      </p>
      <span id={`${base}-hint`} className="sr-only">
        {ended ? 'End of dialogue.' : 'Press Enter or Space to continue. Number keys pick a choice.'}
      </span>
    </div>
  )
}
