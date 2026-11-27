import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { LowerThird } from '@/components/ui/lower-third'
import { TimelineScrubber, useTimeline } from '@/components/ui/timeline'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Chibi, MASCOT_NAME } from '@/components/art/mascot'
import type { DocEntry } from '../types'
import { PlayGate } from '../play-gate'

/** A little 16:9 "broadcast" frame for the demos. */
function Stage({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="ui-border ui-r-lg ui-tone relative aspect-video w-full max-w-xl overflow-hidden bg-canvas">
      <Chibi animated={false} className="absolute right-[10%] bottom-0 h-[82%] w-auto" />
      {hint && <span className="ui-head absolute top-3 left-3 text-xs text-mute">{hint}</span>}
      {children}
    </div>
  )
}

const POS = 'absolute bottom-[7%] left-[4%] max-w-[92%]'

function TimelineDemo() {
  const tl = useTimeline({ duration: 9, loop: true })
  // open on a frame where the first strip is up
  useEffect(() => tl.seek(2.2), [tl])
  return (
    <div className="grid w-full max-w-xl gap-3">
      <Stage>
        <LowerThird time={tl.time} at={[0.3, 4.2]} tag="LIVE" title={MASCOT_NAME} subtitle="Speedrun any%, day 12" className={POS} />
        <LowerThird
          time={tl.time}
          at={[4.6, 8.4]}
          align="right"
          variant="paper"
          title="Up next"
          subtitle="Boss rush with chat"
          className="absolute top-[7%] right-[4%] max-w-[92%]"
        />
      </Stage>
      <TimelineScrubber timeline={tl} label="Broadcast" />
    </div>
  )
}

function ShowDemo() {
  const [on, setOn] = useState(false)
  return (
    <div className="grid w-full max-w-xl justify-items-center gap-4">
      <Stage hint={on ? undefined : 'Off air'}>
        <LowerThird
          show={on}
          variant="ink"
          tag={<Icon name="star" tone="solid" />}
          title="Guest of honour"
          subtitle="Pixel artist, joins at round two"
          className={POS}
        />
      </Stage>
      <Button size="sm" variant={on ? 'paper' : 'accent'} sfx={false} onClick={() => setOn((v) => !v)}>
        {on ? 'Hide' : 'Show'}
      </Button>
    </div>
  )
}

export default {
  slug: 'lower-third',
  name: 'Lower Third',
  jp: 'テロップ',
  category: 'Motion',
  description:
    'A broadcast or streamer name strip. An accent panel sweeps in, the card follows, the title words rise in sequence, the subtitle types and the tag pops; on the way out the panel sweeps back and leaves the other way. It plays itself (show, duration) or follows a clock (time + at), so a Timeline or a video can scrub it.',
  preview: (
    <PlayGate>
      {(run) => (
        <Stage>
          {run === 0 ? (
            <LowerThird time={9} tag="LIVE" title={MASCOT_NAME} subtitle="Speedrun any%, day 12" className={POS} />
          ) : (
            <LowerThird key={run} duration={3600} tag="LIVE" title={MASCOT_NAME} subtitle="Speedrun any%, day 12" className={POS} />
          )}
        </Stage>
      )}
    </PlayGate>
  ),
  usage: `import { LowerThird } from '@/components/ui/lower-third'

// in on mount, out after 4 s (place it in a relative frame)
<LowerThird tag="LIVE" title="Koma" subtitle="Speedrun any%, day 12" duration={4000} className="absolute bottom-6 left-6" />`,
  examples: [
    {
      title: 'Scrubbed by a Timeline',
      preview: <TimelineDemo />,
      code: `import { TimelineScrubber, useTimeline } from '@/components/ui/timeline'

const tl = useTimeline({ duration: 9, loop: true })

<LowerThird time={tl.time} at={[0.3, 4.2]} tag="LIVE" title="Koma" subtitle="Speedrun any%, day 12" />
<LowerThird time={tl.time} at={[4.6, 8.4]} align="right" variant="paper" title="Up next" subtitle="Boss rush with chat" />
<TimelineScrubber timeline={tl} label="Broadcast" />

// or follow a video: time={video.currentTime}`,
    },
    {
      title: 'Controlled, ink variant, icon tag',
      preview: <ShowDemo />,
      code: `const [on, setOn] = useState(false)

<LowerThird show={on} variant="ink" tag={<Icon name="star" tone="solid" />} title="Guest of honour" subtitle="Pixel artist, joins at round two" />
<Button onClick={() => setOn((v) => !v)}>{on ? 'Hide' : 'Show'}</Button>`,
    },
  ],
  props: [
    { name: 'title', type: 'string', description: 'The name on the strip. Each word rises out of its own clipped line.' },
    { name: 'subtitle', type: 'string', description: 'Second line (role, handle, place). Types in after the title.' },
    { name: 'tag', type: 'ReactNode', description: 'Small badge before the title ("LIVE", or an <Icon>). Pops in last.' },
    { name: 'align', type: "'left' | 'right'", default: "'left'", description: 'The side it sweeps in from; the stripe sits on that edge. Exit sweeps out the other way.' },
    { name: 'show', type: 'boolean', default: 'true', description: 'Controlled visibility: true sweeps it in, false sweeps it out.' },
    { name: 'duration', type: 'number', description: 'Auto-out: ms it stays on screen, counted from the start of the entrance.' },
    { name: 'time', type: 'number', description: 'Follow a clock instead (seconds): a Timeline, a video’s currentTime. Overrides show / duration and scrubs both ways.' },
    { name: 'at', type: '[in: number, out?: number]', default: '[0]', description: 'With time: when it comes in and goes out, in seconds. Without out it stays.' },
    { name: 'variant', type: "'accent' | 'paper' | 'ink'", default: "'accent'", description: 'Card colour; the sweep and stripe pick a colour that contrasts with it.' },
    { name: 'className', type: 'string', description: 'Placement (e.g. absolute bottom-6 left-6) and width limits.' },
  ],
} satisfies DocEntry
