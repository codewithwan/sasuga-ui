import { useState } from 'react'
import { Chibi } from '@/components/art/mascot'
import { Icon } from '@/components/ui/icon'
import { Timeline, TimelineScrubber, at, useTimeline } from '@/components/ui/timeline'
import { ToggleGroup } from '@/components/ui/toggle-group'
import type { DocEntry } from '../types'

/** The sequence, as windows in seconds. The track rows under the stage draw the same list. */
const TRACKS = [
  { name: 'Run in', start: 0.2, end: 1.6 },
  { name: 'Title', start: 1.2, end: 2.4 },
  { name: 'Star', start: 2.2, end: 2.8 },
  { name: 'Bar', start: 2.6, end: 4.6 },
] as const
const LENGTH = 5

const easeOut = (p: number) => 1 - (1 - p) ** 3
const back = (p: number) => 1 + 2.7 * (p - 1) ** 3 + 1.7 * (p - 1) ** 2

/** A stand-in for a <video>: dragging its position drives the timeline through `time`. */
function ExternalClockDemo() {
  const LEN = 6
  const [time, setTime] = useState(1.8)
  const tl = useTimeline({ duration: LEN, time })
  const bar = at(tl.time, 0, LEN)
  const star = at(tl.time, 2, 2.6)
  const title = at(tl.time, 1, 1.8)
  return (
    <div className="grid w-[min(100%,440px)] gap-4">
      <div className="ui-card relative grid h-36 place-items-center overflow-hidden bg-canvas">
        <span className="ui-head text-2xl" style={{ opacity: title, transform: `translateY(${(1 - easeOut(title)) * 16}px)` }}>
          Chapter one
        </span>
        <span className="absolute top-4 right-5 text-pop" style={{ transform: `scale(${star ? back(star) : 0})` }}>
          <Icon name="star" size={28} tone="solid" />
        </span>
        <span className="absolute inset-x-0 bottom-0 h-1.5 origin-left bg-accent" style={{ transform: `scaleX(${bar})` }} />
      </div>
      <label className="grid gap-1.5">
        <span className="flex items-center justify-between text-sm text-mute">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="play" size={14} tone="line" /> Video position
          </span>
          <span className="font-mono tabular-nums">{time.toFixed(1)}s</span>
        </span>
        <input
          type="range"
          min={0}
          max={LEN}
          step={0.05}
          value={time}
          onChange={(e) => setTime(Number(e.target.value))}
          className="w-full accent-[var(--color-accent)]"
        />
      </label>
    </div>
  )
}

function SequenceDemo() {
  const tl = useTimeline({ duration: LENGTH })
  const t = tl.time
  const [run, title, star, bar] = TRACKS.map((k) => at(t, k.start, k.end))
  return (
    <div className="grid w-full max-w-[640px] gap-4">
      <div className="ui-card ui-tone relative h-48 overflow-hidden bg-canvas sm:h-56">
        <Chibi pose={run > 0 && run < 1 ? 'dodge' : bar >= 1 ? 'cheer' : 'idle'} className="absolute bottom-2 h-[72%] w-auto" style={{ left: `calc(${easeOut(run) * 26}% - 22%)` }} />
        <p className="ui-head absolute top-[20%] right-[8%] m-0 text-[clamp(22px,6vw,40px)] leading-none text-ink" style={{ opacity: title, transform: `translateY(${(1 - easeOut(title)) * 0.6}em)` }}>
          Stage <span className="text-accent">clear</span>
        </p>
        <span className="absolute top-[8%] left-[38%] text-pop" style={{ transform: `scale(${star ? back(star) : 0})` }}>
          <Icon name="star" size={44} tone="solid" />
        </span>
        <span className="ui-pill ui-border-thin absolute right-[8%] bottom-[12%] h-3 w-[38%] overflow-hidden bg-paper">
          <span className="block h-full origin-left bg-accent" style={{ transform: `scaleX(${easeOut(bar)})` }} />
        </span>
      </div>
      <TimelineScrubber timeline={tl} label="Sequence" />
      {/* the motion graph: each window on the same time axis, with the playhead */}
      <div className="ui-card relative grid gap-1.5 p-3" aria-hidden="true">
        {TRACKS.map((k, i) => {
          const p = at(t, k.start, k.end)
          return (
            <div key={k.name} className="grid grid-cols-[52px_1fr] items-center gap-2 text-[11px] leading-none font-bold text-mute">
              <span className={p > 0 && p < 1 ? 'text-ink' : ''}>{k.name}</span>
              <span className="relative h-4 rounded-full bg-canvas">
                <span
                  className="ui-pill absolute inset-y-0 border-[length:var(--ui-bw-thin)] border-solid border-accent bg-accent-soft"
                  style={{ left: `${(k.start / LENGTH) * 100}%`, width: `${((k.end - k.start) / LENGTH) * 100}%` }}
                >
                  <span className="ui-pill block h-full origin-left bg-accent" style={{ transform: `scaleX(${[run, title, star, bar][i]})` }} />
                </span>
              </span>
            </div>
          )
        })}
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-2 left-[calc(12px+52px+8px)] right-3">
          <span className="absolute inset-y-0 w-0.5 -translate-x-1/2 rounded-full bg-pop" style={{ left: `${tl.progress * 100}%` }} />
        </span>
      </div>
    </div>
  )
}

function RateDemo() {
  const [rate, setRate] = useState('1')
  return (
    <Timeline duration={3} loop rate={Number(rate)}>
      {(tl) => (
        <div className="grid w-full max-w-[420px] justify-items-center gap-4">
          <div className="ui-card relative h-16 w-full overflow-hidden bg-canvas">
            <span className="absolute top-1/2 -translate-y-1/2 text-accent" style={{ left: `calc(${Math.sin(tl.progress * Math.PI) * 100}% * 0.85 + 4%)` }}>
              <Icon name="bolt" size={32} tone="solid" />
            </span>
          </div>
          <TimelineScrubber timeline={tl} label="Loop" className="w-full" />
          <ToggleGroup
            label="Rate"
            size="sm"
            sfx={false}
            value={rate}
            onValueChange={setRate}
            items={[
              { value: '0.5', label: '0.5x' },
              { value: '1', label: '1x' },
              { value: '2', label: '2x' },
            ]}
          />
        </div>
      )}
    </Timeline>
  )
}

export default {
  slug: 'timeline',
  name: 'Timeline',
  jp: 'タイムライン',
  category: 'Motion',
  description:
    'The shared motion-graph clock. useTimeline is a requestAnimationFrame clock with play, pause, seek and loop that stops in hidden tabs; at(t, start, end) turns it into 0..1 progress for each window of a sequence; TimelineScrubber is the transport (play button, seek slider, mm:ss), fully keyboard accessible. Give it an external time (a video) and it follows that instead.',
  preview: <SequenceDemo />,
  usage: `import { TimelineScrubber, at, useTimeline } from '@/components/ui/timeline'

const tl = useTimeline({ duration: 5 })
const title = at(tl.time, 1.2, 2.4) // 0 → 1 while t runs from 1.2 s to 2.4 s

<h2 style={{ opacity: title, transform: \`translateY(\${(1 - title) * 20}px)\` }}>Stage clear</h2>
<TimelineScrubber timeline={tl} />`,
  examples: [
    {
      title: 'Render prop, looping, playback rate',
      preview: <RateDemo />,
      code: `<Timeline duration={3} loop rate={2}>
  {(tl) => (
    <>
      <Bolt style={{ left: \`\${Math.sin(tl.progress * Math.PI) * 85}%\` }} />
      <TimelineScrubber timeline={tl} label="Loop" />
    </>
  )}
</Timeline>`,
    },
    {
      title: 'Following a video',
      preview: <ExternalClockDemo />,
      code: `import { useMediaTime } from '@/components/ui/use-media-time'

const time = useMediaTime(videoRef)
const tl = useTimeline({ duration: 30, time })
const intro = at(tl.time, 0, 1.5)`,
    },
  ],
  props: [
    { name: 'duration', type: 'number', description: 'Length in seconds.' },
    { name: 'autoplay', type: 'boolean', default: 'false', description: 'Start playing on mount.' },
    { name: 'loop', type: 'boolean', default: 'false', description: 'Wrap to 0 at the end instead of stopping.' },
    { name: 'rate', type: 'number', default: '1', description: 'Playback speed.' },
    { name: 'time', type: 'number', description: 'External clock (e.g. a video currentTime). When set the timeline follows it.' },
    { name: 'returns', type: '{ time; duration; playing; progress; play(); pause(); toggle(); seek(t); restart() }', description: 'A stable object: the methods never change, the fields always read the latest value. The caller re-renders every frame while it plays.' },
    { name: 'at(t, start, end)', type: '(t, start, end) => number', description: '0..1 linear progress of t through the window, clamped. Ease it however you like.' },
    { name: 'TimelineScrubber', type: '{ timeline; label?; className? }', description: 'Play / pause button, seek slider (arrows, Page Up/Down, Home/End) and elapsed / total time. Dragging pauses and resumes.' },
    { name: 'Timeline', type: 'TimelineOptions & { children: (t) => ReactNode }', description: 'Render-prop form of useTimeline.' },
  ],
} satisfies DocEntry
