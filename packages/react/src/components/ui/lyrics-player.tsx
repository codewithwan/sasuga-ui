import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { prefersReducedMotion, uiStyle } from '@/fx'
import { cn } from '@/lib/utils'
import { Icon } from './icon'
import { Slider } from './slider'
import { ToggleGroup } from './toggle-group'
import { useMediaTime } from './use-media-time'

/* ───────────── API ───────────── */

export type LyricLine = { at: number; text: string }
export type LyricsMode = 'lines' | 'motion'

export type LyricsPlayerProps = {
  /** Timed lines, or an LRC text ("[00:12.34] a line"). */
  lyrics: LyricLine[] | string
  title: string
  artist?: string
  /** Cover image URL. */
  cover?: string
  /** Audio file: the player owns an <audio> element and its controls. */
  src?: string
  /** Or follow an external clock in seconds (then pass `duration`, and `playing` / `onPlayingChange` for the button). */
  time?: number
  duration?: number
  playing?: boolean
  onPlayingChange?: (playing: boolean) => void
  onSeek?: (time: number) => void
  /** 'lines': the scrolling lyric sheet; 'motion': one line at a time, as kinetic type. */
  mode?: LyricsMode
  defaultMode?: LyricsMode
  /** Show the mode switch in the open view. */
  modes?: boolean
  /** false: only the lyric view (no now-playing screen, header or controls), for videos and overlays. */
  chrome?: boolean
  /** The lyric view is open (controlled) / open at first (uncontrolled). */
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Classes for the player box. It fills it: give it a size (e.g. h-[560px], or h-full in a FrameStage). */
  className?: string
}

/** "[mm:ss.xx] text" lines (several stamps per line allowed); metadata tags and blank lines are skipped. */
// oxlint-disable-next-line react/only-export-components -- the parser belongs with the player
export function parseLRC(src: string): LyricLine[] {
  const out: LyricLine[] = []
  for (const raw of src.split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)]
    if (!stamps.length) continue
    const text = raw.replace(/\[[^\]]*\]/g, '').trim()
    for (const m of stamps) out.push({ at: Number(m[1]) * 60 + Number(m[2]), text })
  }
  return out.sort((a, b) => a.at - b.at)
}

const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`

/* ───────────── Pieces ───────────── */

function Cover({ src, className }: { src?: string; className?: string }) {
  return src ? (
    <img src={src} alt="" draggable={false} className={cn('ui-r-sm shrink-0 bg-accent-soft object-cover', className)} />
  ) : (
    <span aria-hidden="true" className={cn('ui-r-sm grid shrink-0 place-items-center bg-accent-soft text-accent', className)}>
      <Icon name="music" tone="solid" size="45%" />
    </span>
  )
}

function PlayButton({ playing, onClick, size = 'md' }: { playing: boolean; onClick: () => void; size?: 'md' | 'lg' }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-label={playing ? 'Pause' : 'Play'}
      className={cn(
        'ui-pill ui-border-thin ui-shadow-sm grid shrink-0 cursor-pointer place-items-center bg-paper p-0 text-ink transition-transform duration-150 ease-snap hover:-translate-y-px active:translate-y-px focus-visible:ui-focus',
        size === 'lg' ? 'size-[clamp(44px,11cqmin,72px)]' : 'size-10',
      )}
    >
      <Icon name={playing ? 'pause' : 'play'} tone="solid" size="45%" />
    </button>
  )
}

/** Where the current line is, and how far through it the song is (0..1). */
function locate(lines: LyricLine[], t: number, end: number) {
  let i = -1
  for (let k = 0; k < lines.length; k++) if (t >= lines[k].at) i = k
  if (i < 0) return { i, k: 0 }
  const next = lines[i + 1]?.at ?? Math.min(end, lines[i].at + 5)
  return { i, k: Math.min(1, Math.max(0, (t - lines[i].at) / Math.max(0.3, (next - lines[i].at) * 0.85))) }
}

/* ───────────── Lines view ───────────── */

function LinesView({ lines, t, end, onSeek }: { lines: LyricLine[]; t: number; end: number; onSeek: (t: number) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLOListElement>(null)
  const { i, k } = locate(lines, t, end)
  const target = useRef(0)

  // the list rides a critically damped spring so the active line glides to a third of the way down
  useLayoutEffect(() => {
    const el = list.current?.children[Math.max(0, i)] as HTMLElement | undefined
    const h = box.current?.clientHeight ?? 0
    if (el) target.current = -(el.offsetTop - h * 0.3)
  })
  useEffect(() => {
    const ul = list.current
    if (!ul) return
    let raf = 0
    let last = performance.now()
    let y = target.current
    let v = 0
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (prefersReducedMotion()) y = target.current
      else {
        const w = uiStyle() === 'flat' ? 6 : 4.6
        v += (w * w * (target.current - y) - 2 * w * v) * dt
        y += v * dt
      }
      ul.style.transform = `translateY(${y.toFixed(2)}px)`
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div ref={box} className="relative min-h-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_78%,transparent)]">
      <ol ref={list} className="m-0 grid list-none gap-[0.55em] p-0 px-[clamp(16px,6cqw,56px)] py-[30cqh] text-[clamp(20px,6.4cqw,64px)] leading-[1.18] font-extrabold tracking-[-0.01em] will-change-transform">
        {lines.map((l, n) => {
          const state = n < i ? 'past' : n === i ? 'now' : 'next'
          // the line being sung fills white over a half-white base; sung lines stay soft white, upcoming ones sit in the darker tone
          const paint =
            state === 'now'
              ? `linear-gradient(90deg, var(--lp-on) ${(k * 100).toFixed(1)}%, color-mix(in srgb, var(--lp-on) 50%, transparent) ${(k * 100).toFixed(1)}%)`
              : state === 'past'
                ? 'linear-gradient(var(--lp-on), var(--lp-on))'
                : 'linear-gradient(var(--lp-off), var(--lp-off))'
          return (
            <li key={n} aria-current={state === 'now' ? 'true' : undefined}>
              <button
                type="button"
                onClick={() => onSeek(l.at + 0.01)}
                className={cn(
                  'w-full cursor-pointer border-0 bg-transparent p-0 text-left text-inherit transition-[opacity,scale] duration-500 ease-[cubic-bezier(.22,1,.36,1)] origin-left focus-visible:ui-focus',
                  state === 'now' ? 'scale-100 opacity-100' : state === 'past' ? 'scale-[.97] opacity-45 hover:opacity-75' : 'scale-[.97] opacity-90 hover:opacity-100',
                )}
              >
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: paint } as CSSProperties}
                >
                  {l.text || <Icon name="music" tone="line" size="0.8em" className="text-white" />}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/* ───────────── Motion view ───────────── */

function MotionView({ lines, t, end }: { lines: LyricLine[]; t: number; end: number }) {
  const { i, k } = locate(lines, t, end)
  const line = lines[i]
  const words = useMemo(() => (line?.text ?? '').split(/\s+/).filter(Boolean), [line])
  const lit = Math.ceil(k * words.length * 1.15)
  const stage = useRef<HTMLDivElement>(null)

  // the line enters word by word: rise, unblur, settle; the old one leaves upwards
  useLayoutEffect(() => {
    const el = stage.current
    if (!el || prefersReducedMotion()) return
    const flat = uiStyle() === 'flat'
    Array.from(el.children).forEach((w, n) =>
      w.animate(
        flat
          ? [{ opacity: 0, translate: '0 0.25em' }, { opacity: 1, translate: '0 0' }]
          : [
              { opacity: 0, translate: '0 0.55em', scale: '0.86', filter: 'blur(0.12em)' },
              { opacity: 1, translate: '0 -0.04em', scale: '1.04', filter: 'blur(0)', offset: 0.7 },
              { opacity: 1, translate: '0 0', scale: '1', filter: 'blur(0)' },
            ],
        { duration: flat ? 320 : 520, delay: n * (flat ? 40 : 70), easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' },
      ),
    )
  }, [i])

  return (
    <div className="relative grid min-h-0 flex-1 place-items-center overflow-hidden px-[clamp(16px,7cqw,72px)]">
      {/* slow drifting light behind the words */}
      <span aria-hidden="true" className="pointer-events-none absolute -inset-1/4 animate-[lp-drift_14s_ease-in-out_infinite_alternate] opacity-60 motion-reduce:animate-none" style={{ background: 'radial-gradient(40% 35% at 30% 35%, var(--lp-glow), transparent 70%), radial-gradient(35% 30% at 72% 68%, var(--lp-glow2), transparent 70%)' }} />
      <p
        key={i}
        ref={stage}
        aria-live="polite"
        className="relative m-0 flex max-w-full flex-wrap justify-center gap-x-[0.28em] gap-y-[0.08em] text-center text-[clamp(28px,min(11cqw,8cqh),160px)] leading-[1.02] font-black tracking-[-0.02em]"
      >
        {words.map((w, n) => (
          <span
            key={n}
            className={cn('inline-block transition-[color,opacity,scale] duration-300 ease-[cubic-bezier(.22,1,.36,1)]', n < lit ? 'scale-100 opacity-100' : 'scale-[.96] opacity-35')}
            style={{ color: n < lit ? 'var(--lp-on)' : 'var(--lp-off)' }}
          >
            {w}
          </span>
        ))}
        {!words.length && i >= 0 && <Icon name="music" tone="line" size="1em" className="opacity-60" />}
      </p>
    </div>
  )
}

/* ───────────── Player ───────────── */

/**
 * A now-playing screen with synced lyrics. It shows the cover, title, a seek bar and play, with a
 * lyrics card at the bottom that always carries the current line; tap the card and it unfolds over
 * the screen into the lyric view: either a sheet of big lines where the current one fills in as it is
 * sung and glides into place on a spring (tap a line to jump there), or a motion view that sets one
 * line at a time as kinetic type, words rising in and lighting up with the song. `chrome={false}`
 * keeps only the lyric view, for videos and overlays. Plays its own audio file or follows any clock
 * through `time`; reads LRC. Colours come from the theme accent.
 */
export function LyricsPlayer({
  lyrics,
  title,
  artist,
  cover,
  src,
  time: external,
  duration: durationProp,
  playing: playingProp,
  onPlayingChange,
  onSeek,
  mode: modeProp,
  defaultMode = 'lines',
  modes = true,
  chrome = true,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  className,
}: LyricsPlayerProps) {
  const lines = useMemo(() => (typeof lyrics === 'string' ? parseLRC(lyrics) : [...lyrics].sort((a, b) => a.at - b.at)), [lyrics])
  const audio = useRef<HTMLAudioElement>(null)
  const mediaTime = useMediaTime(audio)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [audioDuration, setAudioDuration] = useState(0)
  const t = external ?? mediaTime
  const playing = playingProp ?? audioPlaying
  const end = durationProp ?? (audioDuration || (lines.at(-1)?.at ?? 0) + 4)

  const [openState, setOpenState] = useState(defaultOpen)
  const open = !chrome || (openProp ?? openState)
  const setOpen = (v: boolean) => {
    setOpenState(v)
    onOpenChange?.(v)
  }
  const [modeState, setModeState] = useState<LyricsMode>(defaultMode)
  const mode = modeProp ?? modeState

  const toggle = () => {
    const el = audio.current
    if (src && el) {
      if (el.paused) void el.play().catch(() => {})
      else el.pause()
    }
    onPlayingChange?.(!playing)
  }
  const seek = (s: number) => {
    if (src && audio.current) audio.current.currentTime = s
    onSeek?.(s)
  }

  // open / close: the sheet unfolds out of the lyrics card (clip-path from the card's box), then the content settles
  const box = useRef<HTMLDivElement>(null)
  const sheet = useRef<HTMLDivElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const first = useRef(true)
  const cardClip = () => {
    const b = box.current
    const c = card.current
    if (!b || !c) return 'inset(60% 10px 10px 10px round 18px)'
    const top = c.offsetTop
    const left = c.offsetLeft
    return `inset(${top}px ${b.clientWidth - left - c.offsetWidth}px ${b.clientHeight - top - c.offsetHeight}px ${left}px round 18px)`
  }
  // visibility is owned here (not by React) so the sheet stays visible while it folds back into the card
  useLayoutEffect(() => {
    const el = sheet.current
    if (!el) return
    if (first.current) {
      first.current = false
      el.style.visibility = open ? '' : 'hidden'
      return
    }
    el.getAnimations().forEach((a) => a.cancel())
    if (open) el.style.visibility = ''
    if (!chrome || prefersReducedMotion()) {
      el.style.visibility = open ? '' : 'hidden'
      return
    }
    const from = cardClip()
    const full = 'inset(0px 0px 0px 0px round 0px)'
    const anim = el.animate([{ clipPath: open ? from : full }, { clipPath: open ? full : from }], { duration: open ? 560 : 420, easing: 'cubic-bezier(.22,1,.36,1)' })
    if (!open)
      anim.finished.then(
        () => {
          el.style.visibility = 'hidden'
        },
        () => {},
      )
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- runs when the sheet opens or closes
  }, [open])

  const { i } = locate(lines, t, end)
  const vars = {
    '--lp-on': '#fff',
    '--lp-off': 'color-mix(in oklab, var(--color-ink) 55%, var(--color-accent))',
    '--lp-glow': 'color-mix(in oklab, var(--color-pop) 70%, transparent)',
    '--lp-glow2': 'color-mix(in oklab, white 35%, transparent)',
  } as CSSProperties
  const seekBar = (tone: 'light' | 'dark') => (
    <div className="flex w-full items-center gap-3">
      <Slider
        label="Song position"
        min={0}
        max={Math.max(0.01, end)}
        step={0.01}
        value={Math.min(t, end)}
        onChange={seek}
        format={mmss}
        ticks={false}
        maxSfx={false}
        minSfx={false}
        className="-mt-5 min-w-0 flex-1"
      />
      <span className={cn('shrink-0 font-mono text-xs tabular-nums', tone === 'light' ? 'text-white/75' : 'text-mute')}>{mmss(end)}</span>
    </div>
  )

  return (
    <div ref={box} className={cn('@container-size relative isolate h-[560px] w-full min-w-0 overflow-hidden bg-canvas', className)} style={vars}>
      <style>{'@keyframes lp-drift{from{transform:translate(-4%,-3%) rotate(-4deg)}to{transform:translate(4%,3%) rotate(4deg)}}'}</style>
      {src && (
        <audio
          ref={audio}
          src={src}
          preload="metadata"
          onPlay={() => setAudioPlaying(true)}
          onPause={() => setAudioPlaying(false)}
          onEnded={() => setAudioPlaying(false)}
          onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration || 0)}
        />
      )}

      {/* the now-playing screen */}
      {chrome && (
        <div aria-hidden={open} inert={open} className="absolute inset-0 flex flex-col items-center px-[clamp(16px,6cqw,48px)] pt-[clamp(16px,5cqh,48px)]">
          {cover && <img src={cover} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 size-full scale-125 object-cover opacity-25 blur-3xl" />}
          <Cover src={cover} className="ui-shadow relative aspect-square w-[min(64cqw,40cqh)]" />
          <div className="relative mt-[clamp(10px,3cqh,28px)] grid w-full justify-items-center gap-0.5 text-center leading-tight">
            <span className="ui-head max-w-full truncate text-[clamp(18px,5.4cqmin,40px)] text-ink">{title}</span>
            {artist && <span className="max-w-full truncate text-[clamp(12px,3.4cqmin,24px)] font-bold text-mute">{artist}</span>}
          </div>
          <div className="relative mt-[clamp(6px,2cqh,20px)] grid w-full justify-items-center gap-1">
            {seekBar('dark')}
            <PlayButton playing={playing} onClick={toggle} size="lg" />
          </div>
        </div>
      )}

      {/* the lyrics card: always the current line; tap to open */}
      {chrome && (
        <div
          ref={card}
          role="button"
          tabIndex={open ? -1 : 0}
          aria-label={`Open lyrics: ${title}`}
          aria-hidden={open}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setOpen(true)
            }
          }}
          className="ui-card absolute inset-x-[10px] bottom-[10px] grid min-h-[22cqh] cursor-pointer content-start gap-[0.4em] overflow-hidden bg-accent px-[clamp(14px,4cqw,28px)] py-[clamp(12px,3cqh,22px)] text-white transition-transform duration-200 ease-snap hover:-translate-y-0.5 focus-visible:ui-focus"
        >
          <span className="flex items-center justify-between text-[clamp(11px,2.6cqmin,16px)] font-bold tracking-[0.08em] text-white/80 uppercase">
            Lyrics
            <Icon name="arrow-right" tone="line" size="1.1em" className="-rotate-90" />
          </span>
          <span key={i} className="line-clamp-2 animate-[lp-in_.4s_cubic-bezier(.22,1,.36,1)_both] text-[clamp(17px,5cqmin,34px)] leading-tight font-extrabold">
            {i >= 0 ? lines[i].text : (lines[0]?.text ?? '')}
          </span>
          <style>{'@keyframes lp-in{from{opacity:0;translate:0 .4em}}'}</style>
        </div>
      )}

      {/* the lyric view (always mounted so it can unfold) */}
      <div
        ref={sheet}
        aria-hidden={!open}
        inert={!open}
        className="absolute inset-0 flex flex-col bg-accent text-white"
      >
        {chrome && (
          <div className="flex items-center gap-3 px-[clamp(14px,4cqw,40px)] pt-[clamp(12px,3cqh,32px)] pb-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close lyrics"
              className="ui-pill grid size-9 shrink-0 cursor-pointer place-items-center border-0 bg-white/15 p-0 text-white transition-colors hover:bg-white/25 focus-visible:ui-focus"
            >
              <Icon name="chevron-down" tone="line" size={20} />
            </button>
            <span className="grid min-w-0 flex-1 text-center leading-tight">
              <span className="truncate text-[clamp(13px,2.6cqw,22px)] font-bold">{title}</span>
              {artist && <span className="truncate text-[clamp(11px,2.1cqw,17px)] font-semibold text-white/70">{artist}</span>}
            </span>
            <span className="size-9 shrink-0" />
          </div>
        )}

        {mode === 'lines' ? <LinesView lines={lines} t={t} end={end} onSeek={seek} /> : <MotionView lines={lines} t={t} end={end} />}

        {chrome && (
          <div className="grid gap-1 px-[clamp(14px,4cqw,40px)] pb-[clamp(12px,3cqh,32px)]">
            {seekBar('light')}
            <div className="flex items-center justify-between gap-3">
              {modes ? (
                <ToggleGroup
                  label="Lyrics view"
                  size="sm"
                  sfx={false}
                  value={mode}
                  onValueChange={(v) => setModeState(v as LyricsMode)}
                  items={[
                    { value: 'lines', label: 'Lines' },
                    { value: 'motion', label: 'Motion' },
                  ]}
                />
              ) : (
                <span />
              )}
              <PlayButton playing={playing} onClick={toggle} size="lg" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
