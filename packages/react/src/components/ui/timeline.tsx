import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import { Slider } from './slider'

export type TimelineControls = {
  /** Current time, seconds. */
  time: number
  /** Length, seconds. */
  duration: number
  playing: boolean
  /** time / duration, 0..1. */
  progress: number
  play(): void
  pause(): void
  toggle(): void
  seek(t: number): void
  restart(): void
}

export type TimelineOptions = {
  /** Length in seconds. */
  duration: number
  /** Start playing on mount. */
  autoplay?: boolean
  /** Wrap to 0 at the end instead of stopping. */
  loop?: boolean
  /** Playback speed (1 = real time). */
  rate?: number
  /** external clock (e.g. video currentTime); when set the timeline follows it */
  time?: number
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/**
 * A rAF clock for motion sequences ("motion graph"). Re-renders the caller every frame while
 * playing, stops in hidden tabs and resumes where it was. The returned object is stable: its
 * methods never change identity and its fields always read the latest value.
 * With `time` set it follows that external clock (a video's currentTime) and runs no loop of its own.
 */
// oxlint-disable-next-line react/only-export-components -- the hook is the main API; Timeline wraps it
export function useTimeline({ duration, autoplay = false, loop = false, rate = 1, time: external }: TimelineOptions): TimelineControls {
  const len = Math.max(0, duration || 0)
  const [, setFrame] = useState(0)
  const [playing, setPlaying] = useState(autoplay)
  // One mutable clock per hook. The options are copied in during render on purpose: the stable
  // controls' getters must return this render's values (an external time is read right away).
  const clockRef = useRef({ time: 0, playing: autoplay, duration: len, loop, rate, external })
  /* oxlint-disable react/refs */
  const s = clockRef.current
  s.duration = len
  s.loop = loop
  s.rate = rate
  s.external = external

  const [controls] = useState<TimelineControls>(() => {
    const rerender = () => {
      setPlaying(s.playing)
      setFrame((f) => (f + 1) % 1e9)
    }
    const now = () => (s.external === undefined ? s.time : clamp(s.external, 0, s.duration))
    const c: TimelineControls = {
      get time() {
        return now()
      },
      get duration() {
        return s.duration
      },
      get playing() {
        return s.playing
      },
      get progress() {
        return s.duration > 0 ? clamp(now() / s.duration, 0, 1) : 0
      },
      play() {
        if (s.playing) return
        // at the end of a one-shot: play again from the top
        if (!s.loop && s.external === undefined && s.time >= s.duration) s.time = 0
        s.playing = true
        rerender()
      },
      pause() {
        if (!s.playing) return
        s.playing = false
        rerender()
      },
      toggle() {
        if (s.playing) c.pause()
        else c.play()
      },
      seek(t) {
        s.time = clamp(Number.isFinite(t) ? t : 0, 0, s.duration)
        rerender()
      },
      restart() {
        s.time = 0
        s.playing = true
        rerender()
      },
    }
    return c
  })

  /* oxlint-enable react/refs */
  const follows = external !== undefined

  // the clock: advance while playing (not when following an external time)
  useEffect(() => {
    if (!playing || follows) return
    const k = clockRef.current
    let raf = 0
    let last = 0
    const tick = (t: number) => {
      if (!k.playing) return
      // cap the step so a stalled frame never jumps the sequence
      const dt = last ? Math.min((t - last) / 1000, 0.1) : 0
      last = t
      let next = k.time + dt * k.rate
      if (next >= k.duration) {
        if (k.loop && k.duration > 0) next %= k.duration
        else {
          next = k.duration
          k.playing = false
          setPlaying(false)
        }
      } else if (next < 0) next = k.loop ? k.duration + (next % k.duration) : 0
      k.time = next
      setFrame((f) => (f + 1) % 1e9)
      if (k.playing) raf = requestAnimationFrame(tick)
    }
    const start = () => {
      cancelAnimationFrame(raf)
      last = 0
      raf = requestAnimationFrame(tick)
    }
    const onVis = () => {
      if (document.visibilityState === 'hidden') cancelAnimationFrame(raf)
      else if (k.playing) start()
    }
    if (document.visibilityState !== 'hidden') start()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [playing, follows])

  // keep time inside a shortened duration
  useLayoutEffect(() => {
    const k = clockRef.current
    if (k.time > len) k.time = len
  }, [len])

  return controls
}

/** Render-prop form of useTimeline: `<Timeline duration={8}>{(t) => …}</Timeline>`. */
export function Timeline({ children, ...opts }: TimelineOptions & { children: (t: TimelineControls) => ReactNode }): ReactElement {
  const t = useTimeline(opts)
  return <>{children(t)}</>
}

/** 0..1 linear progress of `t` through the window [start, end], clamped. */
// oxlint-disable-next-line react/only-export-components -- sequence helper, part of the timeline API
export function at(t: number, start: number, end: number): number {
  if (end <= start) return t >= start ? 1 : 0
  return clamp((t - start) / (end - start), 0, 1)
}

const pad = (n: number) => String(n).padStart(2, '0')
/** Seconds → m:ss. */
const mmss = (s: number) => {
  const v = Math.max(0, Math.floor(s))
  return `${pad(Math.floor(v / 60))}:${pad(v % 60)}`
}

/**
 * Transport for a timeline: play / pause, a seek slider and the elapsed / total time.
 * The seek bar is the kit's Slider (arrow keys, Page Up/Down, Home/End, the time in its bubble);
 * Space or Enter on the button toggles.
 */
export function TimelineScrubber({ timeline, label = 'Timeline', className }: { timeline: TimelineControls; label?: string; className?: string }): ReactElement {
  const { time, duration, playing } = timeline
  return (
    <div role="group" aria-label={label} className={cn('ui-card flex min-w-0 items-center gap-2.5 px-2 pt-6 pb-1.5 sm:gap-3 sm:px-2.5', className)}>
      <button
        type="button"
        onClick={() => timeline.toggle()}
        aria-label={playing ? 'Pause' : 'Play'}
        className="ui-border-thin ui-pill ui-fill ui-shadow-sm grid size-9 shrink-0 cursor-pointer place-items-center bg-accent p-0 text-white transition-transform duration-150 ease-snap hover:-translate-y-px active:translate-y-px focus-visible:ui-focus"
      >
        <Icon name={playing ? 'pause' : 'play'} tone="solid" size={18} />
      </button>
      <Slider
        label={`Seek ${label.toLowerCase()}`}
        min={0}
        max={duration || 0.01}
        step={0.01}
        value={time}
        format={mmss}
        ticks={false}
        maxSfx={false}
        minSfx={false}
        onChange={(t) => timeline.seek(t)}
        className="-mt-6 min-w-0 flex-1"
      />
      <span className="shrink-0 font-mono text-[12px] leading-none text-mute tabular-nums" aria-hidden="true">
        {mmss(duration)}
      </span>
    </div>
  )
}
