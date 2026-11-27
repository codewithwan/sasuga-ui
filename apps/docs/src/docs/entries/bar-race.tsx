import { useState } from 'react'
import { BarRace, barRaceTiming } from '@/components/ui/bar-race'
import type { BarRaceSeries } from '@/components/ui/bar-race'
import { FrameControls } from '@/components/site/FrameControls'
import { TimelineScrubber, useTimeline } from '@/components/ui/timeline'
import type { DocEntry } from '../types'

/** Weekly picks → running totals. */
const total = (weekly: number[]) => {
  let sum = 0
  return weekly.map((v) => (sum += v))
}

const WEEKS = Array.from({ length: 12 }, (_, i) => `Week ${i + 1}`)

// a few stories: early hype that fades, a mid-season buff, and a dark horse that takes it in the last week
const GUILD: BarRaceSeries[] = [
  {
    name: 'Swordsmith',
    icon: 'sword',
    values: total([120, 110, 100, 90, 80, 70, 65, 60, 60, 55, 50, 50]),
  },
  {
    name: 'Starcaller',
    icon: 'star',
    values: total([60, 70, 80, 140, 180, 170, 120, 90, 70, 60, 55, 50]),
  },
  {
    name: 'Potion Brewer',
    icon: 'potion',
    values: total([90, 85, 85, 80, 80, 75, 75, 75, 75, 75, 75, 75]),
  },
  {
    name: 'Shadow Courier',
    icon: 'scroll',
    values: total([10, 15, 20, 25, 35, 50, 90, 140, 180, 210, 230, 250]),
  },
  {
    name: 'Rune Archer',
    icon: 'bolt',
    values: total([70, 75, 70, 65, 60, 55, 50, 50, 45, 45, 40, 40]),
  },
  {
    name: 'Beast Tamer',
    icon: 'heart',
    values: total([40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95]),
  },
  {
    name: 'Gale Dancer',
    icon: 'sparkle',
    values: total([100, 60, 40, 30, 25, 20, 20, 20, 20, 20, 20, 20]),
  },
  {
    name: 'Iron Bard',
    icon: 'music',
    values: total([30, 30, 35, 35, 40, 40, 45, 45, 50, 50, 55, 55]),
  },
  {
    name: 'Moon Cleric',
    icon: 'moon',
    values: total([50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50]),
  },
  {
    name: 'Clockwork Tinker',
    icon: 'settings',
    values: total([20, 20, 25, 30, 40, 60, 90, 100, 80, 60, 50, 40]),
  },
  {
    name: 'Ember Monk',
    icon: 'fire',
    values: total([80, 70, 55, 45, 40, 35, 30, 30, 30, 30, 30, 30]),
  },
  {
    name: 'Frost Lancer',
    icon: 'shield',
    values: total([15, 20, 25, 30, 30, 35, 35, 40, 40, 45, 45, 50]),
  },
]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const BOSSES: BarRaceSeries[] = [
  {
    name: 'Slime King',
    icon: 'skull',
    values: total([42, 30, 22, 18, 15, 12, 10]),
  },
  {
    name: 'Clockwork Drake',
    icon: 'fire',
    values: total([25, 28, 30, 34, 40, 38, 30]),
  },
  {
    name: 'Moon Witch',
    icon: 'moon',
    values: total([30, 26, 24, 22, 28, 45, 60]),
  },
  {
    name: 'Treasure Mimic',
    icon: 'chest',
    values: total([12, 20, 34, 40, 30, 22, 18]),
  },
  {
    name: 'Thunder Golem',
    icon: 'bolt',
    values: total([20, 18, 16, 15, 14, 14, 12]),
  },
  {
    name: 'Crown Wraith',
    icon: 'crown',
    values: total([8, 10, 12, 20, 26, 30, 34]),
  },
  { name: 'Gem Hydra', icon: 'gem', values: total([15, 14, 12, 10, 10, 9, 8]) },
]

function SliderDemo() {
  const timing = barRaceTiming(WEEKS.length, 1.6, 0, false)
  const [time, setTime] = useState(timing.at(5))
  const week = Math.min(WEEKS.length - 1, Math.max(0, Math.round((time - timing.lead) / timing.step)))
  return (
    <div className="grid w-full max-w-[640px] gap-3">
      <BarRace data={GUILD} periods={WEEKS} top={6} time={time} loop={false} hold={0} title="Guild classes, by hand" unit="picks" />
      <label className="ui-card grid gap-2 p-3">
        <span className="flex items-center justify-between text-sm font-bold text-mute">
          <span>Drag through the season</span>
          <span className="font-mono text-ink tabular-nums">{WEEKS[week]}</span>
        </span>
        <input
          type="range"
          min={0}
          max={timing.duration}
          step={0.01}
          value={time}
          aria-valuetext={WEEKS[week]}
          onChange={(e) => setTime(Number(e.target.value))}
          className="w-full accent-[var(--color-accent)]"
        />
      </label>
    </div>
  )
}

/** The guild race in a video frame you size: the clock lives outside so the scrubber is not in the shot. */
function FramedDemo() {
  const tl = useTimeline({ duration: barRaceTiming(WEEKS.length).duration, autoplay: true, loop: true })
  return (
    <div className="grid w-full max-w-[760px] gap-4">
      <FrameControls initial="16:9" maxHeight="min(62svh, 560px)">
        {() => (
          <div className="h-full w-full bg-paper p-[3.5%]">
            <BarRace data={GUILD} periods={WEEKS} title="Most-picked classes in Koma's guild" unit="picks" time={tl.time} className="h-full" />
          </div>
        )}
      </FrameControls>
      <TimelineScrubber timeline={tl} label="Bar race" />
    </div>
  )
}

export default {
  slug: 'bar-race',
  name: 'Bar Race',
  jp: 'バーレース',
  category: 'Motion',
  description:
    'A bar chart race for recap videos, dashboards, launch posts and streams. Every series is interpolated between periods on one clock and sorted by its value of the moment; each bar glides to its new rank, so an overtake is a smooth pass, never a jump. Bars past the top slide in from below when they climb, widths follow the leader, the value rides the bar end and counts, and the period rolls in big in the corner. It follows your theme colours, light / dark and the cel, manga and flat styles, and it is a function of time: it scrubs both ways, loops, and follows a slider, a song or a video through time. Reduced motion parks on the final standings.',
  preview: <FramedDemo />,
  usage: `import { BarRace } from '@/components/ui/bar-race'

<BarRace
  title="Most-picked classes in Koma's guild"
  unit="picks"
  periods={['Week 1', 'Week 2', 'Week 3', 'Week 4']}
  data={[
    { name: 'Swordsmith', icon: 'sword', values: [120, 230, 330, 420] },
    { name: 'Starcaller', icon: 'star', values: [60, 130, 210, 350] },
    { name: 'Shadow Courier', icon: 'scroll', values: [10, 25, 45, 70] },
    { name: 'Potion Brewer', icon: 'potion', values: [90, 175, 260, 340], color: 'var(--color-pop)' },
  ]}
  top={8}
  controls
/>`,
  examples: [
    {
      title: 'Top 5, compact, with icons',
      preview: (
        <div className="w-full max-w-[360px]">
          <BarRace data={BOSSES} periods={DAYS} top={5} stepDuration={1.3} title="Next raid boss, votes" unit="votes" />
        </div>
      ),
      code: `<div className="max-w-[360px]">
  <BarRace
    data={bosses}            // { name, icon, values }[]
    periods={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
    top={5}
    stepDuration={1.3}
    title="Next raid boss, votes"
    unit="votes"
  />
</div>`,
    },
    {
      title: 'Vertical, for shorts',
      preview: (
        <div className="w-[min(100%,320px)]">
          <BarRace data={GUILD} periods={WEEKS} title="Most-picked classes" unit="picks" className="aspect-[9/16]" />
        </div>
      ),
      code: `// give the wrapper a size and the race fills it: rows, bars and type scale with the frame.
// A tall frame shows 6 bars unless you set top.
<BarRace data={guild} periods={weeks} title="Most-picked classes" unit="picks" className="aspect-[9/16] w-[320px]" />`,
    },
    {
      title: 'Driven by your own slider',
      preview: <SliderDemo />,
      code: `import { BarRace, barRaceTiming } from '@/components/ui/bar-race'

const timing = barRaceTiming(weeks.length, 1.6, 0, false) // period i lands at timing.at(i)
const [time, setTime] = useState(timing.at(5))

<BarRace data={guild} periods={weeks} top={6} time={time} loop={false} hold={0} />
<input type="range" min={0} max={timing.duration} step={0.01} value={time} onChange={(e) => setTime(Number(e.target.value))} />`,
    },
  ],
  props: [
    {
      name: 'data',
      type: '{ name: string; values: number[]; color?: string; icon?: IconName }[]',
      description:
        'One series per bar, one value per period (missing values repeat the last one). color is any CSS colour; icon sits on the bar tip, or next to the name when the chart is narrow.',
    },
    {
      name: 'periods',
      type: 'string[]',
      description: 'One label per value index. The big corner label switches halfway through each step with a short roll.',
    },
    {
      name: 'top',
      type: 'number',
      default: '8 (6 in a tall frame)',
      description: 'Bars on screen. The others wait below and slide in when they climb.',
    },
    {
      name: 'format',
      type: '(n: number) => string',
      default: 'compact (980, 1.2K)',
      description: 'The value label, called every frame with the interpolated value.',
    },
    {
      name: 'title / unit',
      type: 'string',
      description: 'Heading and what the values count. Both are read to screen readers with the standings.',
    },
    {
      name: 'stepDuration',
      type: 'number',
      default: '1.6',
      description: 'Seconds from one period to the next. Values ease within each step; a rank change glides over about 40% of a step.',
    },
    {
      name: 'hold',
      type: 'number',
      default: '1.6',
      description: 'Seconds on the last period before the loop starts over (the bars grow in again from zero).',
    },
    {
      name: 'time',
      type: 'number',
      description:
        'External clock in seconds (a slider, useMediaTime, a Timeline). The race follows it and its own clock stops. barRaceTiming(periods, stepDuration, hold, loop) gives the length and when each period lands.',
    },
    {
      name: 'autoplay / loop / controls',
      type: 'boolean',
      default: 'true / true / false',
      description: 'Own clock options; controls adds a play and seek bar under the chart. It pauses off screen.',
    },
    {
      name: 'progress',
      type: 'boolean',
      default: 'true',
      description: 'The thin progress line under the bars.',
    },
    {
      name: 'className',
      type: 'string',
      description:
        'Classes for the outer element. Without a height it takes its natural height; give it one (h-[480px], aspect-video, aspect-[9/16]) and the race fills that frame, with rows, bars, type and the period label scaled to it.',
    },
  ],
} satisfies DocEntry
