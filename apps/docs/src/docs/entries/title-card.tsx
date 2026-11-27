import type { ReactNode } from 'react'
import { TitleCard } from '@/components/ui/title-card'
import { TimelineScrubber, useTimeline } from '@/components/ui/timeline'
import { Mascot } from '@/components/art/mascot'
import type { DocEntry } from '../types'
import { PlayGate } from '../play-gate'

/** The "episode" behind a full title card: what the chapter break opens onto. */
function Scene({ children }: { children?: ReactNode }) {
  return (
    <div className="ui-border ui-r-lg ui-tone relative grid aspect-video w-full max-w-xl grid-cols-[1fr_auto] items-end overflow-hidden bg-canvas">
      <p className="ui-head m-0 self-center px-[6%] text-[clamp(14px,3.6vw,22px)] leading-tight text-ink">Previously, on the road to the guild hall…</p>
      <Mascot expression="smug" animated={false} className="h-[86%] w-auto" />
      {children}
    </div>
  )
}

function TimelineDemo() {
  const tl = useTimeline({ duration: 6 })
  return (
    <div className="grid w-full max-w-xl gap-3">
      <Scene>
        <TitleCard time={tl.time} at={[0.3, 4.8]} episode={7} title="Night Market" subtitle="Everything has a price" jp="夜市の約束" sfx="ドン" />
      </Scene>
      <TimelineScrubber timeline={tl} label="Episode intro" />
    </div>
  )
}

export default {
  slug: 'title-card',
  name: 'Title Card',
  jp: 'サブタイトル',
  category: 'Motion',
  description:
    'An anime episode title card. The field opens (an iris in cel, a stepped comic wipe in manga, a fade in flat), the episode number slams down with a style-aware burst, the title assembles letter by letter, a rule draws, it holds, then wipes out. Plays itself or follows a clock (time + at) for a Timeline or a video.',
  preview: (
    <PlayGate>
      {(run) => (
        <Scene>
          {run === 0 ? (
            <TitleCard time={3} episode={3} title="Lilac Contract" subtitle="A promise signed in ink" jp="紫の契約" />
          ) : (
            <TitleCard key={run} episode={3} title="Lilac Contract" subtitle="A promise signed in ink" jp="紫の契約" hold={1400} />
          )}
        </Scene>
      )}
    </PlayGate>
  ),
  usage: `import { TitleCard } from '@/components/ui/title-card'

// covers its relative container, plays once on mount, then wipes away
<div className="relative aspect-video">
  <TitleCard episode={3} title="Lilac Contract" subtitle="A promise signed in ink" jp="紫の契約" onDone={() => setIntro(false)} />
</div>`,
  examples: [
    {
      title: 'Inline card, string episode, held',
      preview: (
        <PlayGate className="max-w-md">
          {(run) =>
            run === 0 ? (
              <TitleCard variant="inline" time={4} episode="FINAL" title="The Last Frame" jp="最後の一枚" />
            ) : (
              <TitleCard key={run} variant="inline" episode="FINAL" title="The Last Frame" jp="最後の一枚" hold={Infinity} sfx="ドン" />
            )
          }
        </PlayGate>
      ),
      code: `<TitleCard variant="inline" episode="FINAL" title="The Last Frame" jp="最後の一枚" hold={Infinity} sfx="ドン" />`,
    },
    {
      title: 'Scrubbed by a Timeline',
      preview: <TimelineDemo />,
      code: `import { TimelineScrubber, useTimeline } from '@/components/ui/timeline'

const tl = useTimeline({ duration: 6 })

<div className="relative aspect-video">
  <TitleCard time={tl.time} at={[0.3, 4.8]} episode={7} title="Night Market" subtitle="Everything has a price" jp="夜市の約束" sfx="ドン" />
</div>
<TimelineScrubber timeline={tl} label="Episode intro" />`,
    },
  ],
  props: [
    { name: 'episode', type: 'number | string', description: 'A number becomes "EP.03"; a string ("EP.12", "FINAL") is shown as is. It stamps down with the burst.' },
    { name: 'title', type: 'string', description: 'Assembles letter by letter; words wrap as units.' },
    { name: 'subtitle', type: 'string', description: 'Line under the rule.' },
    { name: 'jp', type: 'string', description: 'Small Japanese line under the subtitle (Dela Gothic One, accent).' },
    { name: 'play', type: 'boolean', default: 'true', description: 'Plays the card once (in, hold, out) whenever it turns true; false hides it. Key the card to replay.' },
    { name: 'hold', type: 'number', default: '1800', description: 'How long it holds between in and out when it plays itself, in ms. Infinity keeps it up.' },
    { name: 'onDone', type: '() => void', description: 'Called once a played card has wiped out.' },
    { name: 'time', type: 'number', description: 'Follow a clock instead (seconds). Overrides play; scrubs both ways. The burst fires only when playing forward across the stamp.' },
    { name: 'at', type: '[in: number, out?: number]', default: '[0]', description: 'With time: when it comes in and goes out, in seconds. Without out it stays.' },
    { name: 'variant', type: "'full' | 'inline'", default: "'full'", description: 'full covers its relative container like a chapter break; inline is a bordered card in the flow.' },
    { name: 'sfx', type: 'string | false', default: 'false', description: 'Lettering drawn with the stamp burst (cel and manga; flat never letters).' },
    { name: 'className', type: 'string', description: 'Extra classes for the card.' },
  ],
} satisfies DocEntry
