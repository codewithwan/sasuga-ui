import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Mascot } from '@/components/art/mascot'
import type { MascotExpression } from '@/components/art/mascot'
import { parseCaptions } from '@/components/ui/caption-cues'
import type { Cue } from '@/components/ui/caption-cues'
import { Field } from '@/components/ui/field'
import { KineticCaption } from '@/components/ui/kinetic-caption'
import type { KineticCaptionPreset } from '@/components/ui/kinetic-caption'
import { TimelineScrubber, useTimeline } from '@/components/ui/timeline'
import { ToggleGroup } from '@/components/ui/toggle-group'
import type { DocEntry } from '../types'

const SCRIPT: (Cue & { face: MascotExpression })[] = [
  { start: 0.2, end: 2.6, text: "Hi! I'm Koma, and these are *kinetic* captions.", face: 'happy' },
  { start: 2.8, end: 5.2, text: 'Every word lands right on the beat of the voice.', face: 'neutral' },
  { start: 5.4, end: 7.6, text: 'Shout something and it goes BIG!', face: 'surprised' },
  { start: 7.8, end: 10.4, text: 'Pick a preset, then *scrub* the timeline back and forth.', face: 'wink' },
  { start: 10.6, end: 13, text: 'They sit on top of any video. *No* assets needed!', face: 'smug' },
]
const LENGTH = 13.6

const PRESETS: { value: KineticCaptionPreset; label: string }[] = [
  { value: 'pop', label: 'Pop' },
  { value: 'karaoke', label: 'Karaoke' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'stack', label: 'Stack' },
  { value: 'slam', label: 'Slam' },
  { value: 'typewriter', label: 'Type' },
  { value: 'wave', label: 'Wave' },
]

/** A soft gradient "scene" in theme colours: stands in for a video frame. */
function Scene({ children }: { children: ReactNode }) {
  return (
    <div className="ui-card relative aspect-video w-full overflow-hidden bg-[radial-gradient(120%_90%_at_20%_10%,color-mix(in_srgb,var(--color-accent-soft)_85%,transparent),transparent_60%),radial-gradient(90%_80%_at_90%_100%,color-mix(in_srgb,var(--color-pop)_28%,transparent),transparent_65%),linear-gradient(160deg,var(--color-canvas),color-mix(in_srgb,var(--color-accent)_22%,var(--color-canvas)))]">
      {children}
    </div>
  )
}

function StageDemo() {
  const tl = useTimeline({ duration: LENGTH })
  const [preset, setPreset] = useState<KineticCaptionPreset>('pop')
  const [position, setPosition] = useState<'top' | 'center' | 'bottom'>('bottom')
  const [size, setSize] = useState<'sm' | 'md' | 'lg'>('md')
  // calm until played: park on a frame that already shows a caption
  useEffect(() => tl.seek(1.15), [tl])
  const t = tl.time
  const line = SCRIPT.find((c) => c.start <= t && t < c.end)
  return (
    <div className="grid w-full max-w-[720px] gap-4">
      <Scene>
        <Mascot
          expression={line?.face ?? 'neutral'}
          talking={tl.playing && !!line}
          className={`absolute bottom-0 h-[78%] w-auto transition-[left,translate] duration-500 ease-snap ${position === 'center' ? 'left-[4%]' : 'left-1/2 -translate-x-1/2'}`}
        />
        <KineticCaption cues={SCRIPT} time={t} preset={preset} position={position} size={size} />
      </Scene>
      <TimelineScrubber timeline={tl} label="Caption demo" />
      <div className="grid justify-items-center gap-3">
        <div className="max-w-full overflow-x-auto pr-2 pb-2">
          <ToggleGroup label="Preset" size="sm" sfx={false} items={PRESETS} value={preset} onValueChange={(v) => setPreset(v as KineticCaptionPreset)} className="max-w-none" />
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <ToggleGroup
            label="Position"
            size="sm"
            sfx={false}
            items={[
              { value: 'top', label: 'Top' },
              { value: 'center', label: 'Center' },
              { value: 'bottom', label: 'Bottom' },
            ]}
            value={position}
            onValueChange={(v) => setPosition(v as typeof position)}
          />
          <ToggleGroup
            label="Size"
            size="sm"
            sfx={false}
            items={[
              { value: 'sm', label: 'S' },
              { value: 'md', label: 'M' },
              { value: 'lg', label: 'L' },
            ]}
            value={size}
            onValueChange={(v) => setSize(v as typeof size)}
          />
        </div>
      </div>
    </div>
  )
}

const SAMPLE = `WEBVTT

00:00.300 --> 00:02.400
Paste your own <b>SRT</b> or <i>VTT</i> here.

00:02.600 --> 00:04.800
It re-parses live, so edit a line and *scrub*!

00:05.000 --> 00:07.200
Karaoke timestamps <00:05.600>work <00:06.000>too <00:06.400>WOW!
`

function PasteDemo() {
  const [src, setSrc] = useState(SAMPLE)
  const cues = useMemo(() => parseCaptions(src), [src])
  const length = Math.max(1, (cues.at(-1)?.end ?? 0) + 0.6)
  const tl = useTimeline({ duration: length, loop: true })
  useEffect(() => tl.seek(1), [tl])
  return (
    <div className="grid w-full max-w-[720px] gap-4 md:grid-cols-2 md:items-start">
      <Field label="Captions (SRT or VTT)" multiline value={src} onChange={setSrc} error={cues.length ? undefined : 'No cues found: each needs a "00:01.000 --> 00:02.000" line.'} />
      <div className="grid gap-3">
        <Scene>
          <KineticCaption cues={cues} time={tl.time} preset="karaoke" size="sm" />
        </Scene>
        <TimelineScrubber timeline={tl} label="Pasted captions" />
        <p className="m-0 text-center text-xs text-mute">
          {cues.length} cue{cues.length === 1 ? '' : 's'} parsed
        </p>
      </div>
    </div>
  )
}

const SHOUT: Cue[] = [
  { start: 0.2, end: 2.2, text: 'Three. Two. One.' },
  { start: 2.4, end: 4.4, text: 'Here comes the *BIG* one!' },
  { start: 4.6, end: 6.6, text: 'FINAL ROUND! Hit it!' },
]

function SlamDemo() {
  const tl = useTimeline({ duration: 7 })
  useEffect(() => tl.seek(3.6), [tl])
  return (
    <div className="grid w-full max-w-[520px] gap-3">
      <Scene>
        <KineticCaption cues={SHOUT} time={tl.time} preset="slam" position="center" maxWords={3} maxLines={1} uppercase size="lg" />
      </Scene>
      <TimelineScrubber timeline={tl} label="Slam demo" />
    </div>
  )
}

export default {
  slug: 'kinetic-caption',
  name: 'Kinetic Caption',
  jp: 'テロップ',
  category: 'Motion',
  description:
    'TikTok-style animated captions over a video or anything else. Feed it cues (or SRT / VTT text) and a time: the spoken word lights up in the accent colour, emphasized words pop, and seven presets (pop, karaoke, bounce, stack, slam, typewriter, wave) decide how words arrive. Every frame is a pure function of the time, so pausing and scrubbing are exact. Text sizes from the box width and never takes more than maxLines.',
  preview: <StageDemo />,
  usage: `import { useRef } from 'react'
import { KineticCaption } from '@/components/ui/kinetic-caption'
import { useMediaTime } from '@/components/ui/use-media-time'
import srt from './talk.srt?raw'

function Clip() {
  const video = useRef<HTMLVideoElement>(null)
  const time = useMediaTime(video)
  return (
    <div className="relative">
      <video ref={video} src="/talk.mp4" controls className="w-full" />
      <KineticCaption cues={srt} time={time} preset="pop" position="bottom" />
    </div>
  )
}`,
  examples: [
    {
      title: 'Paste SRT / VTT (parsed live)',
      preview: <PasteDemo />,
      code: `import { parseCaptions } from '@/components/ui/caption-cues'

const cues = useMemo(() => parseCaptions(src), [src]) // or pass the string straight in
<KineticCaption cues={cues} time={tl.time} preset="karaoke" size="sm" />`,
    },
    {
      title: 'Slam on a timeline: one line, capitals, impact frames on emphasis',
      preview: <SlamDemo />,
      code: `import { KineticCaption } from '@/components/ui/kinetic-caption'
import { TimelineScrubber, useTimeline } from '@/components/ui/timeline'

const cues = [
  { start: 0.2, end: 2.2, text: 'Three. Two. One.' },
  { start: 2.4, end: 4.4, text: 'Here comes the *BIG* one!' },
  { start: 4.6, end: 6.6, text: 'FINAL ROUND! Hit it!' },
]
const tl = useTimeline({ duration: 7 })

<div className="ui-card relative aspect-video overflow-hidden">
  <KineticCaption cues={cues} time={tl.time} preset="slam" position="center" maxWords={3} maxLines={1} uppercase size="lg" />
</div>
<TimelineScrubber timeline={tl} />`,
    },
  ],
  props: [
    { name: 'cues', type: 'Cue[] | string', description: 'Cues ({ start, end, text, words? } in seconds) or SRT / WebVTT source. Wrap words in *stars* to emphasize them.' },
    { name: 'time', type: 'number', description: 'Playback time in seconds: useMediaTime(videoRef), useTimeline().time or any clock.' },
    { name: 'preset', type: "'pop' | 'karaoke' | 'bounce' | 'stack' | 'slam' | 'typewriter' | 'wave'", default: "'pop'", description: 'How words arrive. Karaoke fills each word left to right; stack piles lines up; slam throws an impact frame on emphasized words.' },
    { name: 'position', type: "'top' | 'center' | 'bottom'", default: "'bottom'", description: 'Where the text sits in its box (it fills the nearest positioned parent).' },
    { name: 'maxWords', type: 'number', default: '4', description: 'Words shown at once; cues split into balanced chunks. For stack: words per line.' },
    { name: 'maxLines', type: '1 | 2', default: '2', description: 'Rows a chunk may take. The text shrinks to fit instead of growing a third row.' },
    { name: 'emphasis', type: "'auto' | 'markup' | 'none'", default: "'auto'", description: 'auto: *markup* plus ALL-CAPS words and words ending in "!" (pop colour, bigger, a small shake). markup: only *markup*.' },
    { name: 'uppercase', type: 'boolean', default: 'false', description: 'Set every word in capitals.' },
    { name: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'Text scale, relative to the box width.' },
    { name: 'parseCaptions / parseSRT / parseVTT', type: '(src: string) => Cue[]', description: 'caption-cues.ts. Robust to CRLF, BOM, styling tags, multi-line cues; VTT inline timestamps become per-word timing.' },
    { name: 'splitWords', type: '(cue: Cue) => CueWord[]', description: "caption-cues.ts. The cue's words, or an estimate that shares its time by character length." },
    { name: 'useMediaTime', type: '(ref: RefObject<HTMLMediaElement>) => number', description: "use-media-time.ts. A video or audio element's currentTime as state, every frame while playing." },
  ],
} satisfies DocEntry
