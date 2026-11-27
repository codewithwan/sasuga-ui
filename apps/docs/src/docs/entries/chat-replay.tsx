import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChatReplay, chatReplayDuration } from '@/components/ui/chat-replay'
import type { ChatReplayMessage, ChatReplaySkin } from '@/components/ui/chat-replay'
import { Icon } from '@/components/ui/icon'
import { ToggleGroup } from '@/components/ui/toggle-group'
import { TimelineScrubber, useTimeline } from '@/components/ui/timeline'
import { FrameControls } from '@/components/site/FrameControls'
import type { DocEntry } from '../types'

const RAID: ChatReplayMessage[] = [
  { from: 'Tama', text: 'raid tonight? the frost dragon is back' },
  { from: 'Koma', text: 'the one that froze my whole inventory??' },
  { from: 'Koma', text: 'count me in', reaction: 'heart' },
  { from: 'Tama', text: 'bring potions. like, all of them' },
  { from: 'Koma', text: 'I have 3 potions and a sandwich', reaction: 'lol' },
  { from: 'Tama', text: 'ok the sandwich is our tank now' },
  { from: 'Tama', text: '9pm at the north gate. do not be late' },
  { from: 'Koma', text: 'I am never late' },
  { from: 'Tama', text: 'you were late to your own birthday party' },
  { from: 'Koma', text: 'that was a timezone thing', reaction: 'skull' },
  { from: 'Tama', text: 'see you at 9. bring the sandwich', reaction: 'fire' },
]

const GUILD: ChatReplayMessage[] = [
  { from: 'Riku', text: 'who took the last revive from the guild chest' },
  { from: 'Nori', text: 'not me' },
  { from: 'Koma', text: 'define "took"' },
  { from: 'Riku', text: 'Koma.', reaction: 'lol' },
  { from: 'Koma', text: 'I will put back two. with interest' },
  { from: 'Nori', text: 'interest in what, sandwiches?', reaction: 'star' },
]

const SKIN_ITEMS = [
  { value: 'night', label: 'Night' },
  { value: 'paper', label: 'Paper' },
  { value: 'ink', label: 'Ink' },
]

const RAID_LENGTH = chatReplayDuration(RAID, { me: 'Koma' })

/** The raid chat in a video frame you size; the clock lives outside so the scrubber is not in the shot. */
function RaidDemo() {
  const [skin, setSkin] = useState<ChatReplaySkin>('night')
  const tl = useTimeline({ duration: RAID_LENGTH, autoplay: true, loop: true })
  return (
    <div className="grid w-full max-w-[760px] justify-items-center gap-4">
      <FrameControls initial="9:16" maxHeight="min(66svh, 600px)">
        {() => <ChatReplay messages={RAID} me="Koma" skin={skin} time={tl.time} className="aspect-auto h-full rounded-none" />}
      </FrameControls>
      <TimelineScrubber timeline={tl} label="Chat replay" className="w-full" />
      <ToggleGroup label="Skin" size="sm" sfx={false} value={skin} onValueChange={(v) => setSkin(v as ChatReplaySkin)} items={SKIN_ITEMS} />
    </div>
  )
}
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** An outside clock (a slider and a play button standing in for a video) drives `time`. */
function ClockDemo() {
  const [time, setTime] = useState(9)
  const [playing, setPlaying] = useState(false)
  const clock = useRef(time)
  useEffect(() => {
    clock.current = time
  }, [time])
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const next = clock.current + (now - last) / 1000
      last = now
      if (next >= RAID_LENGTH) {
        setTime(RAID_LENGTH)
        setPlaying(false)
        return
      }
      setTime(next)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  return (
    <div className="grid w-full max-w-[600px] gap-4 sm:grid-cols-[minmax(0,260px)_minmax(0,1fr)] sm:items-center">
      <div className="mx-auto w-[min(100%,260px)]">
        <ChatReplay messages={RAID} me="Koma" time={time} />
      </div>
      <div className="ui-card grid min-w-0 gap-3 p-4">
        <span className="text-sm font-bold text-ink">Your clock</span>
        <input
          type="range"
          aria-label="Clock position"
          min={0}
          max={RAID_LENGTH}
          step={0.01}
          value={time}
          onChange={(e) => {
            setPlaying(false)
            setTime(Number(e.target.value))
          }}
          className="w-full min-w-0 accent-[var(--color-accent)]"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            size="sm"
            variant="accent"
            sfx={false}
            onClick={() => {
              if (!playing && time >= RAID_LENGTH) setTime(0)
              setPlaying((p) => !p)
            }}
            icon={<Icon name={playing ? 'pause' : 'play'} tone="line" size={14} />}
          >
            {playing ? 'Pause' : 'Play'}
          </Button>
          <span className="font-mono text-sm text-mute tabular-nums">
            {mmss(time)} / {mmss(RAID_LENGTH)}
          </span>
        </div>
        <span className="text-xs leading-relaxed text-mute">Drag back and the messages leave again: what you see is a function of the time you pass in.</span>
      </div>
    </div>
  )
}

export default {
  slug: 'chat-replay',
  name: 'Chat Replay',
  jp: 'チャット再生',
  category: 'Motion',
  description:
    'A text conversation as a motion graphic, for texting stories in shorts, explainer videos and product demos. The thread sits on a plane in 3D and a camera rides the newest message: it drifts and tilts toward whoever is talking, holds on the typing dots, zooms in as each bubble lands and pulls back to the whole thread at the end. Bubbles spring out of their tail corner, runs from one sender group, reactions pop onto the corner, a Read receipt shows once the reply starts, and bubbles away from the newest fall out of focus. Three skins (night, paper that follows your theme, manga ink). It is all a function of time, so it scrubs both ways, loops and follows a video through time. Reduced motion: a still camera, no blur, bubbles just appear.',
  preview: <RaidDemo />,
  usage: `import { ChatReplay } from '@/components/ui/chat-replay'

<ChatReplay
  me="Koma"
  skin="night"        // paper | ink
  messages={[
    { from: 'Tama', text: 'raid tonight? the frost dragon is back' },
    { from: 'Koma', text: 'count me in', reaction: 'heart' },  // an icon name
    { from: 'Koma', text: 'I have 3 potions and a sandwich', reaction: 'lol' },
    { from: 'Tama', text: 'ok the sandwich is our tank now', typing: 1.6 },
  ]}
  controls
/>`,
  examples: [
    {
      title: 'Synced to an external clock',
      preview: <ClockDemo />,
      code: `import { chatReplayDuration } from '@/components/ui/chat-replay'
import { useMediaTime } from '@/components/ui/use-media-time'

// any clock in seconds: a slider, a Timeline, or a video
const video = useRef<HTMLVideoElement>(null)
const time = useMediaTime(video)

<video ref={video} src="/explainer.mp4" controls />
<ChatReplay messages={messages} me="Koma" time={time} />

// pin a message to a moment with at (seconds), or measure the whole replay:
const length = chatReplayDuration(messages, { me: 'Koma' })`,
    },
    {
      title: 'Widescreen, a group chat',
      preview: (
        <div className="w-full max-w-[720px]">
          <ChatReplay messages={GUILD} me="Koma" title="Night Owls" skin="paper" className="aspect-video" />
        </div>
      ),
      code: `<ChatReplay
  title="Night Owls"
  me="Koma"
  skin="paper"
  className="aspect-video"
  messages={[
    { from: 'Riku', text: 'who took the last revive from the guild chest' },
    { from: 'Nori', text: 'not me' },
    { from: 'Koma', text: 'define "took"' },
    { from: 'Riku', text: 'Koma.', reaction: 'lol' },
  ]}
/>`,
    },
  ],
  props: [
    { name: 'messages', type: 'ChatReplayMessage[]', description: '{ from, text, at?, typing?, reaction? }. at pins the second a message lands; typing is the lead-in (the dots for the other side; 0 sends at once); reaction is a short word, an icon name or any node.' },
    { name: 'me', type: 'string', default: "'me'", description: 'The participant on the right, in accent bubbles. Everyone else sits on the left with an initial avatar and their name above each run.' },
    { name: 'skin', type: "'night' | 'paper' | 'ink'", default: "'night'", description: 'night: a dark stage with glow and a reflection under the newest bubble. paper: follows your theme colours, style and light / dark mode. ink: manga black on paper with screentone.' },
    { name: 'title', type: 'string', description: 'Name on the top bar. Default: the other participant, or all of them for a group.' },
    { name: 'speed / gap', type: 'number', default: '22 / 0.5', description: 'Reading pace in characters per second (how long a message stays before the next starts), and the extra pause between messages in seconds.' },
    { name: 'hold', type: 'number', default: '3.2', description: 'Seconds on the whole thread at the end, where the camera pulls back; a looping replay fades out over its last half second.' },
    { name: 'zoom / depth', type: 'number', default: '1 / 0.6', description: 'How close the camera sits, and how much bubbles away from the newest blur and dim (0..1).' },
    { name: 'receipts', type: 'boolean', default: 'true', description: 'Show "Read" under my last message once the other side starts typing.' },
    { name: 'time', type: 'number', description: 'External clock in seconds (useMediaTime, a Timeline, a slider). The chat follows it and its own clock stops.' },
    { name: 'autoplay / loop / controls', type: 'boolean', default: 'true / true / false', description: 'Own clock options; controls adds a play and seek bar under the stage. It pauses while scrolled out of view.' },
    { name: 'label', type: 'string', description: 'Accessible name of the message list (role="log"). Default: "Chat with" and the title.' },
    { name: 'className', type: 'string', description: 'Sizes the stage (default aspect-[9/16], full width). aspect-video, aspect-square or aspect-[4/5] work too: the camera fits its zoom to the stage.' },
    { name: 'chatReplayDuration(messages, options?)', type: '(messages, { me?, speed?, gap?, hold? }) => number', description: 'The length of a replay in seconds, for a slider or a video edit.' },
  ],
} satisfies DocEntry
