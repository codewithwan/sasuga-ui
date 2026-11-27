import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Icon } from '@/components/ui/icon'
import type { IconName } from '@/components/ui/icon'
import { StreamAlert, StreamGoal, StreamScene } from '@/components/ui/stream-overlay'
import type { StreamAlertEvent, StreamAlertHandle, StreamAlertKind, StreamAlertPosition, StreamSceneKind } from '@/components/ui/stream-overlay'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup } from '@/components/ui/toggle-group'
import { FrameControls } from '@/components/site/FrameControls'
import { ART } from '@/data/art'
import type { ArtName } from '@/data/art'
import { withBase } from '@/data/site'
import { useTheme } from '@/lib/theme'
import { CodeBlock } from '@/pages/docs/CodeBlock'
import { OVERLAY_DEFAULTS, overlayQuery } from '@/pages/embed/overlay-params'
import type { DocEntry } from '../types'

/* ── Koma's channel ── */

const CHANNEL = 'Koma ch.'
const TICKER = ['Mon 20:00  Cozy dungeon run', 'Wed 20:00  Sketch and chat', 'Fri 20:00  Boss rush night', 'Clips every Sunday']

/** One pose per scene: a wink before, walking off on a break, cheering at the end. */
const POSE: Record<StreamSceneKind, ArtName> = {
  starting: 'mascot/koma-wink',
  brb: 'mascot/koma-side',
  ending: 'mascot/koma-happy',
}
const art = (scene: StreamSceneKind) => ART[POSE[scene]].src

const SCENES = [
  { value: 'starting', label: 'Starting' },
  { value: 'brb', label: 'BRB' },
  { value: 'ending', label: 'Ending' },
]

const PEOPLE: Record<StreamAlertKind, StreamAlertEvent[]> = {
  follow: [
    { kind: 'follow', name: 'mochi_rider' },
    { kind: 'follow', name: 'TanukiTea', message: 'found you from the clip!' },
    { kind: 'follow', name: 'lanternfish' },
    { kind: 'follow', name: 'yuzu_kid', message: 'hi Koma' },
  ],
  sub: [
    { kind: 'sub', name: 'PixelSprout', amount: 3, message: 'three months of cozy runs' },
    { kind: 'sub', name: 'BentoBandit', amount: 12, message: 'a whole year already?' },
    { kind: 'sub', name: 'hoshi_noodle', amount: 1 },
  ],
  raid: [
    { kind: 'raid', name: 'Captain Kettle', amount: 42, message: 'we brought snacks' },
    { kind: 'raid', name: 'NightOwlCrew', amount: 128 },
  ],
  donation: [
    { kind: 'donation', name: 'ramen_rascal', amount: '5.00', message: 'for the coffee fund' },
    { kind: 'donation', name: 'quietfox', amount: '20.00', message: 'that boss fight was unreal' },
  ],
}

/** Cycles through each kind's people, so repeated presses show different names. */
function usePeople() {
  const turn = useRef<Record<StreamAlertKind, number>>({ follow: 0, sub: 0, raid: 0, donation: 0 })
  return (kind: StreamAlertKind) => {
    const list = PEOPLE[kind]
    const e = list[turn.current[kind] % list.length]
    turn.current[kind]++
    return e
  }
}

const KIND_BUTTONS: { kind: StreamAlertKind; label: string; icon: IconName; variant: 'accent' | 'pop' | 'ink' | 'paper' }[] = [
  { kind: 'follow', label: 'Follow', icon: 'heart', variant: 'accent' },
  { kind: 'sub', label: 'Sub', icon: 'star', variant: 'pop' },
  { kind: 'raid', label: 'Raid', icon: 'flag', variant: 'ink' },
  { kind: 'donation', label: 'Tip', icon: 'coin', variant: 'paper' },
]

/** What a transparent overlay sits on: a checkerboard from the theme tokens. */
const checker = (size: string): CSSProperties => ({
  backgroundImage: 'repeating-conic-gradient(color-mix(in srgb, var(--color-ink) 9%, var(--color-paper)) 0 25%, var(--color-paper) 0 50%)',
  backgroundSize: `${size} ${size}`,
})

function Menu({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-3">{children}</div>
}

function Caption({ children }: { children: ReactNode }) {
  return <span className="ui-head text-sm text-mute">{children}</span>
}

/* ── the preview: scene + goal + alerts as one overlay ── */

function OverlayDemo() {
  const [scene, setScene] = useState<StreamSceneKind>('starting')
  const [clear, setClear] = useState(false)
  const [count, setCount] = useState(472)
  const alerts = useRef<StreamAlertHandle>(null)
  const pick = usePeople()
  return (
    <div className="grid w-full max-w-[760px] gap-4">
      <FrameControls initial="16:9" maxHeight="min(62svh, 560px)">
        {() => (
          <div className="relative h-full [container-type:size]" style={clear ? checker('3cqmin') : undefined}>
            <StreamScene
              scene={scene}
              channel={CHANNEL}
              countdown={scene === 'brb' ? 180 : 300}
              next="FRI 20:00"
              ticker={TICKER}
              art={art(scene)}
              background={clear ? 'transparent' : 'solid'}
              className="h-full"
            />
            <div className="pointer-events-none absolute top-[4.6cqmin] right-[4.6cqmin] w-[29cqw]">
              <StreamGoal value={count} goal={500} />
            </div>
            <StreamAlert ref={alerts} position="top" />
          </div>
        )}
      </FrameControls>
      <div className="ui-card grid gap-4 px-4 py-4">
        <Menu>
          <ToggleGroup label="Scene" size="sm" sfx={false} value={scene} onValueChange={(v) => setScene(v as StreamSceneKind)} items={SCENES} />
          <span className="inline-flex items-center gap-2 text-sm font-bold text-mute">
            Transparent
            <Switch label="Transparent background" checked={clear} onChange={setClear} sfxOn={false} sfxOff={false} />
          </span>
        </Menu>
        <Menu>
          <Caption>Alerts</Caption>
          {KIND_BUTTONS.slice(0, 3).map((b) => (
            <Button
              key={b.kind}
              size="sm"
              variant={b.variant}
              sfx={false}
              power={0.6}
              icon={<Icon name={b.icon} tone="line" size={16} />}
              onClick={() => alerts.current?.push(pick(b.kind))}
            >
              {b.label}
            </Button>
          ))}
        </Menu>
        <Menu>
          <Caption>Goal</Caption>
          <Button size="sm" sfx={false} power={0.5} icon={<Icon name="plus" tone="line" size={16} />} onClick={() => setCount((c) => c + 1)}>
            1
          </Button>
          <Button size="sm" sfx={false} power={0.5} icon={<Icon name="plus" tone="line" size={16} />} onClick={() => setCount((c) => c + 10)}>
            10
          </Button>
          <Button size="sm" variant="outline" sfx={false} power={0.4} onClick={() => setCount(472)}>
            Reset
          </Button>
        </Menu>
      </div>
    </div>
  )
}

/* ── alerts alone, on a transparent background ── */

const POSITIONS = [
  { value: 'top', label: 'Top' },
  { value: 'center', label: 'Center' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-right', label: 'Bottom right' },
]

function AlertsDemo() {
  const [position, setPosition] = useState<StreamAlertPosition>('center')
  const alerts = useRef<StreamAlertHandle>(null)
  const pick = usePeople()
  return (
    <div className="grid w-full max-w-[720px] gap-4">
      <div className="ui-border ui-r-lg relative aspect-video w-full overflow-hidden" style={checker('22px')}>
        <StreamAlert ref={alerts} position={position} />
      </div>
      <Menu>
        <ToggleGroup label="Position" size="sm" sfx={false} value={position} onValueChange={(v) => setPosition(v as StreamAlertPosition)} items={POSITIONS} />
      </Menu>
      <Menu>
        {KIND_BUTTONS.map((b) => (
          <Button
            key={b.kind}
            size="sm"
            variant={b.variant}
            sfx={false}
            power={0.6}
            icon={<Icon name={b.icon} tone="line" size={16} />}
            onClick={() => alerts.current?.push(pick(b.kind))}
          >
            {b.label}
          </Button>
        ))}
        <Button
          size="sm"
          variant="outline"
          sfx={false}
          power={0.5}
          icon={<Icon name="bolt" tone="line" size={16} />}
          onClick={() => (['follow', 'sub', 'follow', 'raid'] as const).forEach((k) => alerts.current?.push(pick(k)))}
        >
          Four at once
        </Button>
      </Menu>
    </div>
  )
}

/* ── the goal bar ── */

function GoalDemo() {
  const [follows, setFollows] = useState(412)
  const [subs, setSubs] = useState(18)
  return (
    <div className="grid w-full max-w-[560px] justify-items-center gap-6">
      <StreamGoal value={follows} goal={500} />
      <div className="flex flex-wrap justify-center gap-3">
        <Button size="sm" sfx={false} power={0.5} icon={<Icon name="plus" tone="line" size={16} />} onClick={() => setFollows((v) => v + 1)}>
          1
        </Button>
        <Button size="sm" sfx={false} power={0.5} icon={<Icon name="plus" tone="line" size={16} />} onClick={() => setFollows((v) => v + 10)}>
          10
        </Button>
        <Button size="sm" variant="accent" sfx={false} power={0.5} icon={<Icon name="plus" tone="line" size={16} />} onClick={() => setFollows((v) => v + 50)}>
          50
        </Button>
        <Button size="sm" variant="outline" sfx={false} power={0.4} onClick={() => setFollows(412)}>
          Reset
        </Button>
      </div>
      <div className="grid w-full max-w-[300px] justify-items-center gap-3">
        <StreamGoal value={subs} goal={25} label="Sub goal" icon="star" milestones={[0.2, 0.4, 0.6, 0.8]} reachedLabel="Subs unlocked!" />
        <div className="flex gap-3">
          <Button size="sm" variant="pop" sfx={false} power={0.5} icon={<Icon name="plus" tone="line" size={16} />} onClick={() => setSubs((v) => v + 1)}>
            Sub
          </Button>
          <Button size="sm" variant="outline" sfx={false} power={0.4} onClick={() => setSubs(18)}>
            Reset
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ── use it in OBS: the embed URL, built live ── */

const EMBED_PATH = '/embed/overlay/'
const absolute = (path: string) => (typeof window === 'undefined' ? path : `${window.location.origin}${withBase(path)}`)
const DEFAULT_TITLE: Record<StreamSceneKind, string> = { starting: 'Starting *soon*', brb: 'Be right *back*', ending: 'Thanks for *watching*' }

function ObsDemo() {
  const current = useTheme()
  const [scene, setScene] = useState<StreamSceneKind>('starting')
  const [title, setTitle] = useState('')
  const [clear, setClear] = useState(false)
  const config = {
    ...OVERLAY_DEFAULTS,
    scene,
    title,
    countdown: scene === 'ending' ? 0 : 300,
    ticker: TICKER,
    background: clear ? ('transparent' as const) : ('solid' as const),
    channel: CHANNEL,
    next: scene === 'ending' ? 'FRI 20:00' : '',
  }
  const query = overlayQuery(config, { style: current.style, theme: current.theme, mode: current.mode })
  const url = `${absolute(EMBED_PATH)}?${query}`

  // typing settles before the frame reloads
  const [src, setSrc] = useState(`${withBase(EMBED_PATH)}?${query}`)
  useEffect(() => {
    const id = window.setTimeout(() => setSrc(`${withBase(EMBED_PATH)}?${query}`), 320)
    return () => window.clearTimeout(id)
  }, [query])

  // the embed route answers with a scene; anything else (not deployed here): draw the same scene in place
  const frame = useRef<HTMLIFrameElement>(null)
  const [routed, setRouted] = useState<boolean | null>(null)
  const probe = useRef(0)
  useEffect(() => () => window.clearTimeout(probe.current), [])
  const check = () => {
    try {
      return !!frame.current?.contentDocument?.querySelector('[data-stream-scene]')
    } catch {
      return false
    }
  }

  return (
    <div className="grid w-full max-w-[720px] gap-5">
      <div className="ui-border ui-r-lg relative aspect-video w-full overflow-hidden" style={clear ? checker('18px') : undefined}>
        {routed === false ? (
          <StreamScene
            scene={scene}
            title={title.trim() || undefined}
            channel={CHANNEL}
            countdown={config.countdown || undefined}
            next={config.next || undefined}
            ticker={TICKER}
            art={art(scene)}
            background={config.background}
          />
        ) : (
          <iframe
            ref={frame}
            src={src}
            title="Stream overlay preview"
            sandbox="allow-scripts allow-same-origin"
            className="absolute inset-0 block size-full border-0 bg-transparent [color-scheme:normal]"
            onLoad={() => {
              window.clearTimeout(probe.current)
              if (check()) setRouted(true)
              else probe.current = window.setTimeout(() => setRouted(check()), 1200)
            }}
          />
        )}
      </div>
      <div className="grid gap-x-6 gap-y-4 min-[640px]:grid-cols-[minmax(0,1fr)_auto] min-[640px]:items-end">
        <Field label="Headline" value={title} onChange={(v) => setTitle(v.slice(0, 60))} placeholder={DEFAULT_TITLE[scene]} />
        <span className="inline-flex items-center gap-2 pb-2 text-sm font-bold text-mute">
          Transparent
          <Switch label="Transparent background" checked={clear} onChange={setClear} sfxOn={false} sfxOff={false} />
        </span>
      </div>
      <Menu>
        <ToggleGroup label="Scene" size="sm" sfx={false} value={scene} onValueChange={(v) => setScene(v as StreamSceneKind)} items={SCENES} />
        <a
          href={`${withBase(EMBED_PATH)}?${query}`}
          target="_blank"
          rel="noreferrer"
          className="ui-head inline-flex items-center gap-1.5 text-sm text-accent underline-offset-4 hover:underline focus-visible:ui-focus"
        >
          Open full screen
          <Icon name="arrow-right" tone="line" size="1em" />
        </a>
      </Menu>
      <CodeBlock code={url} title="Browser source URL" lang="url" lineNumbers={false} />
      <p className="m-0 text-sm leading-relaxed text-mute">
        In OBS add a <strong className="text-ink">Browser</strong> source, paste the URL and set it to 1920 × 1080. With a transparent background only the
        panels show, keyed over your scene. Wrap emphasis in <code className="font-mono">*stars*</code>, separate ticker items with{' '}
        <code className="font-mono">|</code>, and add <code className="font-mono">until=2026-12-01T20:00</code> to count down to a time.
      </p>
    </div>
  )
}

export default {
  slug: 'stream-overlay',
  name: 'Stream Overlay',
  jp: 'オーバーレイ',
  category: 'Motion',
  description:
    'A broadcast package for live streams. StreamScene is the starting soon, be right back and end screen, each with its own layout, countdown, character and ticker. StreamAlert queues follow, sub, raid and tip pop-ups that land with a hit, and StreamGoal is a goal bar that bursts at milestones. All of it scales with its frame and works on a transparent background in OBS.',
  preview: <OverlayDemo />,
  usage: `import { StreamAlert, StreamGoal, StreamScene } from '@/components/ui/stream-overlay'
import type { StreamAlertHandle } from '@/components/ui/stream-overlay'

const alerts = useRef<StreamAlertHandle>(null)

<div className="relative aspect-video">
  <StreamScene
    scene="starting"           // brb | ending
    channel="Koma ch."
    countdown={300}            // or countdownTo={Date.parse('2026-12-01T20:00')}
    ticker={['Mon 20:00  Cozy dungeon run', 'Fri 20:00  Boss rush night']}
    art="/koma-wink.webp"
  />
  <div className="absolute top-6 right-6 w-[30%]">
    <StreamGoal value={412} goal={500} label="Follower goal" />
  </div>
  <StreamAlert ref={alerts} position="top" />
</div>

// from your chat bot or event socket
alerts.current?.push({ kind: 'follow', name: 'mochi_rider' })
alerts.current?.push({ kind: 'raid', name: 'Captain Kettle', amount: 42, message: 'we brought snacks' })`,
  examples: [
    {
      title: 'Alerts on a transparent background',
      preview: <AlertsDemo />,
      code: `const alerts = useRef<StreamAlertHandle>(null)

// fills its positioned parent and never takes the pointer
<div className="relative aspect-video">
  <StreamAlert ref={alerts} position="center" duration={4600} />
</div>

alerts.current?.push({ kind: 'sub', name: 'PixelSprout', amount: 3, message: 'three months of cozy runs' })
alerts.current?.push({ kind: 'donation', name: 'ramen_rascal', amount: '5.00' })
// pushed together, they play one after another`,
    },
    {
      title: 'Goal bar',
      preview: <GoalDemo />,
      code: `<StreamGoal value={follows} goal={500} />

<StreamGoal
  value={subs}
  goal={25}
  label="Sub goal"
  icon="star"
  milestones={[0.2, 0.4, 0.6, 0.8]}
  reachedLabel="Subs unlocked!"
/>`,
    },
    {
      title: 'Use it in OBS',
      preview: <ObsDemo />,
      code: `// a Browser source in OBS, 1920 × 1080
https://your-site.example/embed/overlay/?scene=starting&title=Starting+*soon*&countdown=300&ticker=Mon+20:00+Cozy+run|Fri+20:00+Boss+rush&bg=transparent&channel=Koma+ch.

// parameters: scene (starting | brb | ending), title, sub, countdown (seconds),
// until (a date or ms timestamp), ticker (a|b|c), bg (solid | transparent),
// channel, next (the end card's "FRI 20:00"), art=0, style, theme, mode`,
    },
  ],
  props: [
    {
      name: 'StreamScene scene',
      type: "'starting' | 'brb' | 'ending'",
      description:
        'Which screen. Each has its own layout: headline and flap countdown beside the character, a taped card with rolling digits, or the end card with the next stream.',
    },
    {
      name: 'title / subtitle / kicker',
      type: 'string',
      description: 'Headline (`*word*` is emphasis, \\n breaks a line), the line under it and the small label over it. Each scene has its own defaults.',
    },
    {
      name: 'countdown / countdownTo',
      type: 'number',
      description: 'Seconds from when the scene starts, or a timestamp in ms. countdownLabel and doneLabel name it; onCountdownEnd fires at zero.',
    },
    { name: 'next', type: 'string', description: "The end card's next stream on a split-flap board, e.g. 'FRI 20:00'." },
    {
      name: 'ticker / tickerLabel',
      type: 'string[] / string',
      description: 'Items crawling along the bottom (schedule, socials) and the label on its tab. No items, no ticker.',
    },
    { name: 'art', type: 'string | ReactNode', description: 'The character: an image URL or a node, anchored to the bottom.' },
    { name: 'channel', type: 'string', description: 'Name on the corner bug and on the band that sweeps across on a scene change.' },
    {
      name: 'background',
      type: "'solid' | 'transparent'",
      default: "'solid'",
      description: 'transparent drops the backdrop and keeps the panels, for an OBS browser source.',
    },
    { name: 'intro', type: 'boolean', default: 'false', description: 'Play the entrance on mount too. Otherwise only a scene change plays it.' },
    {
      name: 'StreamAlert ref',
      type: 'StreamAlertHandle',
      description: 'push({ kind, name, message?, amount? }) queues an alert; clear() drops the waiting ones. kind: follow | sub | raid | donation.',
    },
    {
      name: 'position',
      type: "'top' | 'center' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'",
      default: "'top'",
      description: 'Where the card sits; it comes in from that side.',
    },
    { name: 'duration', type: 'number', default: '4600', description: 'Milliseconds each alert holds on screen.' },
    {
      name: 'labels / sfx',
      type: 'Partial<Record<kind, string>>',
      description: "The kicker per kind ('New follower'…) and the sound-effect word per kind (false for none).",
    },
    { name: 'onShow / onDone', type: '(event) => void', description: 'An alert landed / left.' },
    { name: 'StreamGoal value / goal', type: 'number', description: 'The count and the target. Changes animate the fill and roll the count.' },
    {
      name: 'label / icon / reachedLabel',
      type: 'string / IconName / string',
      default: "'Follower goal' / 'heart' / 'Goal reached!'",
      description: 'What is counted, its icon, and the label once the goal is reached (the icon turns into a crown).',
    },
    { name: 'milestones', type: 'number[]', default: '[0.25, 0.5, 0.75]', description: 'Fractions of the goal with a notch and a burst when passed.' },
    { name: 'sfx', type: 'string | false', default: "'達成!'", description: 'Lettering on the goal celebration (cel and manga).' },
  ],
} satisfies DocEntry
