import { useRef, useState } from 'react'
import { FrameControls } from '@/components/site/FrameControls'
import { LyricsPlayer, parseLRC } from '@/components/ui/lyrics-player'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Slider } from '@/components/ui/slider'
import { useMediaTime } from '@/components/ui/use-media-time'
import { ART } from '@/data/art'
import { withBase } from '@/data/site'
import type { DocEntry } from '../types'

/** Words written for these docs, timed to the bars of "Snow Drift" (84.85 bpm, first downbeat 0.685 s). The track is instrumental. */
const LRC = `[ti:Snow Drift]
[00:00.69] snow on the station lights
[00:03.51] the last train hums goodnight
[00:06.34] I count the steps back home
[00:09.17] my breath writes words in white
[00:12.00] and every flake that falls
[00:14.83] lands right on the beat
[00:17.66] the city slows to listen
[00:20.49] to the sound beneath my feet
[00:23.31] keep the window warm for me
[00:26.14] I'll be there by morning
[00:28.97] snow drift, slow drift
[00:31.80] carry me home`

const TRACK = withBase('/assets/music/holizna-snow-drift.mp3')
const COVER = ART['mascot/koma-happy'].src
const LINES = parseLRC(LRC)

function Credit() {
  return (
    <p className="m-0 text-center text-xs text-mute">
      Music: "Snow Drift" by{' '}
      <a href="https://freemusicarchive.org/music/holiznacc0/winter-lofi" target="_blank" rel="noreferrer" className="font-bold text-accent">
        HoliznaCC0
      </a>{' '}
      (CC0). The track is instrumental; the words are written for this demo.
    </p>
  )
}

const LENGTH = 36.2
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** Lyrics only inside the frame (chrome off); the song and its controls sit outside, so the shot stays clean. */
function MotionFrameDemo() {
  const audio = useRef<HTMLAudioElement>(null)
  const time = useMediaTime(audio)
  const [playing, setPlaying] = useState(false)
  const toggle = () => {
    const el = audio.current
    if (!el) return
    if (el.paused) void el.play().catch(() => {})
    else el.pause()
  }
  return (
    <div className="grid w-full max-w-[760px] gap-3">
      <FrameControls initial="9:16" maxHeight="min(64svh, 600px)">
        {() => <LyricsPlayer lyrics={LINES} title="Snow Drift" time={time} duration={LENGTH} chrome={false} defaultMode="motion" className="h-full" />}
      </FrameControls>
      <div className="ui-card flex items-center gap-3 px-2.5 pt-7 pb-2.5">
        <Button size="sm" variant="accent" sfx={false} onClick={toggle} icon={<Icon name={playing ? 'pause' : 'play'} tone="solid" size={16} />}>
          {playing ? 'Pause' : 'Play'}
        </Button>
        <Slider
          label="Song position"
          min={0}
          max={LENGTH}
          step={0.01}
          value={Math.min(time, LENGTH)}
          onChange={(v) => {
            if (audio.current) audio.current.currentTime = v
          }}
          format={mmss}
          ticks={false}
          maxSfx={false}
          minSfx={false}
          className="-mt-5 min-w-0 flex-1"
        />
        <span className="font-mono text-xs text-mute tabular-nums">{mmss(LENGTH)}</span>
      </div>
      <Credit />
      <audio ref={audio} src={TRACK} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
    </div>
  )
}

function ClockDemo() {
  const [t, setT] = useState(13)
  return (
    <div className="grid w-full max-w-[420px] gap-2">
      <LyricsPlayer lyrics={LINES} title="Snow Drift" artist="Scrub to sing" cover={COVER} time={t} duration={36.2} onSeek={setT} defaultOpen modes={false} className="ui-r h-[380px]" />
      <span className="text-sm font-bold text-mute">Your clock</span>
      <Slider label="Clock" min={0} max={36.2} step={0.01} value={t} onChange={setT} format={(v) => `${v.toFixed(1)}s`} ticks={12} maxSfx={false} minSfx={false} className="w-full" />
    </div>
  )
}

export default {
  slug: 'lyrics-player',
  name: 'Lyrics Player',
  jp: '歌詞プレイヤー',
  category: 'Motion',
  description:
    'A now-playing screen with synced lyrics. It shows the cover, title, a seek bar and play, with a lyrics card at the bottom that always carries the current line; tap the card and it unfolds into the lyric view. Lines mode is a sheet of big lyrics where the current line fills in from left to right as it is sung and glides into place on a spring (tap any line to jump there). Motion mode sets one line at a time as kinetic type, words rising in and lighting up with the song, for videos and stream overlays. It plays its own audio file or follows any clock through time, reads LRC, follows the theme accent, and uses the kit Slider for seeking.',
  preview: (
    <div className="grid w-full max-w-[420px] gap-2">
      <LyricsPlayer lyrics={LRC} src={TRACK} title="Snow Drift" artist="HoliznaCC0" cover={COVER} className="ui-r h-[min(68svh,600px)]" />
      <Credit />
    </div>
  ),
  usage: `import { LyricsPlayer } from '@/components/ui/lyrics-player'

<LyricsPlayer
  src="/music/snow-drift.mp3"
  title="Snow Drift"
  artist="HoliznaCC0"
  cover="/covers/snow-drift.webp"
  lyrics={\`[00:00.69] snow on the station lights
[00:03.51] the last train hums goodnight\`}
  className="h-[600px]"
/>`,
  examples: [
    {
      title: 'Motion lyrics in any frame',
      preview: <MotionFrameDemo />,
      code: `const time = useMediaTime(audioRef)

<FrameStage width={1080} height={1920}>
  <LyricsPlayer lyrics={lrc} title="Snow Drift" time={time} duration={36.2} chrome={false} defaultMode="motion" className="h-full" />
</FrameStage>
<audio ref={audioRef} src="/snow-drift.mp3" controls />`,
    },
    {
      title: 'Following your own clock',
      preview: <ClockDemo />,
      code: `const [t, setT] = useState(0)

<LyricsPlayer lyrics={lines} title="Snow Drift" time={t} duration={36.2} onSeek={setT} defaultOpen />
<Slider label="Clock" min={0} max={36.2} step={0.01} value={t} onChange={setT} />`,
    },
  ],
  props: [
    { name: 'lyrics', type: 'LyricLine[] | string', description: '{ at, text }[] in seconds, or LRC text ("[00:12.34] a line"). parseLRC is exported too.' },
    { name: 'title / artist / cover', type: 'string', description: 'Shown on the bar and the lyric view; cover is an image URL.' },
    { name: 'src', type: 'string', description: 'An audio file: the player owns an <audio> element, the play button and seeking.' },
    { name: 'time / duration', type: 'number', description: 'Follow an external clock instead (a video, a Timeline, your own state).' },
    { name: 'playing / onPlayingChange / onSeek', type: 'boolean / (playing) => void / (t) => void', description: 'With an external clock: the play button and the seek bar report here.' },
    { name: 'mode / defaultMode', type: "'lines' | 'motion'", default: "'lines'", description: 'Lyric sheet, or one kinetic line at a time.' },
    { name: 'modes', type: 'boolean', default: 'true', description: 'Show the Lines / Motion switch in the open view.' },
    { name: 'chrome', type: 'boolean', default: 'true', description: 'false keeps only the lyric view (no now-playing screen, header or controls): for videos and overlays.' },
    { name: 'open / defaultOpen / onOpenChange', type: 'boolean / boolean / (open) => void', default: 'false', description: 'The lyric view, controlled or not. Closed, the now-playing screen shows with the lyrics card.' },
    { name: 'className', type: 'string', description: 'Size the player box (default 560px tall, full width); h-full inside a FrameStage.' },
  ],
} satisfies DocEntry
