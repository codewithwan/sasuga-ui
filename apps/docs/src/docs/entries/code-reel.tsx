import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { CodeReel, codeReelLength } from '@/components/ui/code-reel'
import type { CodeReelChrome, CodeReelLine, CodeReelLog, CodeReelSkin, CodeReelSounds, CodeReelTone } from '@/components/ui/code-reel'
import { unlockReelSound } from '@/components/ui/code-reel-sound'
import { Icon } from '@/components/ui/icon'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup } from '@/components/ui/toggle-group'
import { useMediaTime } from '@/components/ui/use-media-time'
import { TimelineScrubber, useTimeline } from '@/components/ui/timeline'
import { FrameControls } from '@/components/site/FrameControls'
import { withBase } from '@/data/site'
import type { DocEntry } from '../types'

const SCRIPT: CodeReelLine[] = [
  { code: 'async function stageClear(koma) {' },
  { code: '  koma.take.aBreath("one more try");', suggest: { word: 'aBreath', options: ['aBreak', 'aBow'] } },
  { code: '  const combo = koma.hits.untilThe(' },
  { code: '    "screen shakes");', diagnostic: { text: 'hp still low', tone: 'warn', squiggle: '"screen shakes"' } },
  { code: '  if (combo.breaks) koma.respawn();', diagnostic: { text: 'fell 3 times', tone: 'error', squiggle: 'respawn' } },
  { code: '' },
  { code: '  // no save point, no problem' },
  { code: '  return koma.smile.anyway("ドン!");', suggest: { word: 'anyway', options: ['anyhow', 'again'] }, diagnostic: { text: 'stage cleared', tone: 'ok' } },
  { code: '}' },
]

const LOGS: CodeReelLog[] = [
  { tone: 'warn', text: 'hp at 12%, kept going' },
  { tone: 'info', text: 'combo x42, the screen shook' },
  { tone: 'ok', text: 'stage cleared in 3 tries' },
]

/** Real mechanical keyboard recordings (CC0), trimmed in public/assets/sfx/keys: Cherry KC 1000 keys by
 *  unicaegames (OpenGameArt "Keyboard Soundpack 1") and an Enter key by alpinemesh (Freesound). */
const SFX: CodeReelSounds = {
  key: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => withBase(`/assets/sfx/keys/key-${n}.wav`)),
  enter: withBase('/assets/sfx/keys/enter.wav'),
}

const SKIN_ITEMS = [
  { value: 'neon', label: 'Neon' },
  { value: 'paper', label: 'Paper' },
  { value: 'phosphor', label: 'CRT' },
  { value: 'ink', label: 'Ink' },
]
const FRAME_ITEMS = (['editor', 'window', 'none'] as const).map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }))

function Menu({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3">{children}</div>
}

function ReelDemo() {
  const [skin, setSkin] = useState<CodeReelSkin>('neon')
  const [chrome, setChrome] = useState<CodeReelChrome>('editor')
  const [camera, setCamera] = useState<'follow' | 'static'>('follow')
  const [sound, setSound] = useState(false)
  const tl = useTimeline({ duration: codeReelLength({ lines: SCRIPT, terminal: LOGS }), autoplay: true, loop: true })
  return (
    <div className="grid w-full max-w-[760px] gap-4">
      <FrameControls initial="16:9" maxHeight="min(62svh, 560px)">
        {() => (
          <CodeReel
            lines={SCRIPT}
            terminal={LOGS}
            file="stageClear.ts"
            command="bun run stageClear.ts"
            skin={skin}
            chrome={chrome}
            camera={camera}
            sound={sound}
            sounds={SFX}
            time={tl.time}
            className="aspect-auto h-full rounded-none"
          />
        )}
      </FrameControls>
      <TimelineScrubber timeline={tl} label="Code reel" />
      <Menu>
        <ToggleGroup label="Skin" size="sm" sfx={false} value={skin} onValueChange={(v) => setSkin(v as CodeReelSkin)} items={SKIN_ITEMS} />
        <ToggleGroup label="Frame" size="sm" sfx={false} value={chrome} onValueChange={(v) => setChrome(v as CodeReelChrome)} items={FRAME_ITEMS} />
      </Menu>
      <Menu>
        <ToggleGroup
          label="Camera"
          size="sm"
          sfx={false}
          value={camera}
          onValueChange={(v) => setCamera(v as 'follow' | 'static')}
          items={[
            { value: 'follow', label: 'Follow' },
            { value: 'static', label: 'Static' },
          ]}
        />
        <span className="inline-flex items-center gap-2 text-sm font-bold text-mute">
          Sound
          <Switch
            label="Sound"
            checked={sound}
            onChange={(on) => {
              if (on) unlockReelSound()
              setSound(on)
            }}
          />
        </span>
      </Menu>
    </div>
  )
}

/* ── synced to a real song: "Snow Drift" by HoliznaCC0 (CC0), 84.85 bpm ── */

const TRACK = withBase('/assets/music/holizna-snow-drift.mp3')
const BEAT = 60 / 84.85
const BAR = BEAT * 4
const DOWNBEAT = 0.685 // the first beat in the file
const LENGTH = 36.2
const bar = (n: number) => DOWNBEAT + n * BAR
const fit = (code: string, extra = 0) => code.length / (BAR * 0.62 - extra)
const SONG: CodeReelLine[] = (
  [
    { code: '// snow drift, 85 bpm', at: bar(0) },
    { code: 'const night = await city.lights();', at: bar(1) },
    { code: 'koma.walk(night, { tempo: 85 });', at: bar(2) },
    { code: 'while (snow.falls) heart.keep("time");', at: bar(3), diagnostic: { text: 'on beat', tone: 'info', squiggle: '"time"' } },
    { code: 'const chorus = koma.sing("ドン!");', at: bar(4), suggest: { word: 'sing', options: ['sign', 'sigh'] } },
    { code: 'chorus.loop(forever);', at: bar(5), diagnostic: { text: 'infinite loop', tone: 'warn', squiggle: 'forever' } },
    { code: 'if (lost) koma.find("the bassline");', at: bar(6) },
    { code: 'const warmth = cocoa.pour(2);', at: bar(7) },
    { code: 'koma.stay.up(until.morning);', at: bar(8), suggest: { word: 'until', options: ['unless'] } },
    { code: '// every step lands on the beat', at: bar(9) },
    { code: 'return morning;', at: bar(10), diagnostic: { text: 'track ended', tone: 'ok' } },
  ] satisfies CodeReelLine[]
).map((l: CodeReelLine) => ({ ...l, speed: fit(l.code, l.suggest ? 0.7 : 0) }))

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

function SyncedDemo() {
  const audio = useRef<HTMLAudioElement>(null)
  const time = useMediaTime(audio)
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'paused'>('idle')
  const [clicks, setClicks] = useState(true)

  const toggle = () => {
    unlockReelSound()
    const el = audio.current
    if (!el) return
    if (el.paused) {
      if (el.readyState < 3) setState('loading')
      el.play().catch(() => setState('paused'))
    } else el.pause()
  }

  return (
    <div className="grid w-full max-w-[720px] gap-4">
      <CodeReel
        lines={SONG}
        time={time}
        file="snowDrift.ts"
        sound={clicks ? 0.45 : 0}
        sounds={SFX}
        terminal={[{ tone: 'ok', text: '"Snow Drift" by HoliznaCC0, public domain (CC0)' }]}
        command="play snowDrift.ts"
      />
      <div className="ui-card flex flex-wrap items-center gap-x-4 gap-y-3 p-3">
        <Button
          size="sm"
          variant="accent"
          sfx={false}
          onClick={toggle}
          disabled={state === 'loading'}
          icon={<Icon name={state === 'playing' ? 'pause' : 'music'} tone="line" size={16} />}
        >
          {state === 'loading' ? 'Loading…' : state === 'playing' ? 'Pause' : state === 'paused' ? 'Play' : 'Play the song'}
        </Button>
        <input
          type="range"
          aria-label="Song position"
          min={0}
          max={LENGTH}
          step={0.01}
          value={Math.min(time, LENGTH)}
          onChange={(e) => {
            if (audio.current) audio.current.currentTime = Number(e.target.value)
          }}
          className="min-w-[120px] flex-1 accent-[var(--color-accent)]"
        />
        <span className="font-mono text-sm tabular-nums text-mute">
          {mmss(time)} / {mmss(LENGTH)}
        </span>
        <span className="inline-flex items-center gap-2 text-sm font-bold text-mute">
          Key clicks
          <Switch label="Key clicks" checked={clicks} onChange={setClicks} />
        </span>
      </div>
      <p className="m-0 text-center text-xs text-mute">
        Music: "Snow Drift" by{' '}
        <a href="https://freemusicarchive.org/music/holiznacc0/winter-lofi" target="_blank" rel="noreferrer" className="font-bold text-accent">
          HoliznaCC0
        </a>{' '}
        (CC0). Keys: real Cherry KC 1000 recordings (CC0). Each line starts on a bar.
      </p>
      <audio
        ref={audio}
        src={TRACK}
        preload="none"
        onPlaying={() => setState('playing')}
        onPause={() => setState('paused')}
        onEnded={() => setState('paused')}
      />
    </div>
  )
}

/* ── write your own ── */

const TONES: Record<string, CodeReelTone> = { '!': 'error', '?': 'warn', '+': 'ok', i: 'info' }

/** One line per line. `#! text` error, `#? text` warning, `#+ text` ok, `#i text` info; `~word` gets the autocomplete. */
function parseScript(src: string): CodeReelLine[] {
  return src.split('\n').map((raw) => {
    let code = raw
    const line: CodeReelLine = { code }
    const d = /\s+#([!?+i])\s*(.*)$/.exec(code)
    if (d) {
      code = code.slice(0, d.index)
      line.diagnostic = { text: d[2] || d[1], tone: TONES[d[1]] }
    }
    const s = /~([A-Za-z_$][\w$]*)/.exec(code)
    if (s) {
      code = code.replace(`~${s[1]}`, s[1])
      line.suggest = { word: s[1] }
    }
    line.code = code
    return line
  })
}

const STARTER = `function hello(world) {
  world.~greet("from sasuga/ui"); #+ it works
  const mood = koma.check("today"); #? a bit sleepy
  // write anything here, then press Run
  return mood.reboot(); #! needs coffee
}`

function Playground() {
  const [draft, setDraft] = useState(STARTER)
  const [run, setRun] = useState({ n: 0, lines: parseScript(STARTER) })
  const [skin, setSkin] = useState<CodeReelSkin>('paper')
  return (
    <div className="grid w-full max-w-[720px] gap-4">
      <CodeReel key={run.n} lines={run.lines} skin={skin} chrome="window" file="playground.ts" loop={false} sound={0.45} sounds={SFX} controls />
      <label className="grid gap-1.5">
        <span className="text-sm font-bold text-mute">Your script</span>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
          rows={6}
          className="ui-card resize-y bg-paper p-3 font-mono text-[13px] leading-relaxed text-ink focus-visible:ui-focus"
        />
        <span className="text-xs leading-relaxed text-mute">
          <code className="font-mono">#!</code> error, <code className="font-mono">#?</code> warning, <code className="font-mono">#+</code> ok, <code className="font-mono">#i</code> info at
          the end of a line; <code className="font-mono">~word</code> opens the autocomplete on that word.
        </span>
      </label>
      <Menu>
        <ToggleGroup label="Skin" size="sm" sfx={false} value={skin} onValueChange={(v) => setSkin(v as CodeReelSkin)} items={SKIN_ITEMS} />
        <Button size="sm" variant="accent" sfx="Run!" icon={<Icon name="play" tone="line" size={14} />} onClick={() => setRun((r) => ({ n: r.n + 1, lines: parseScript(draft) }))}>
          Run
        </Button>
      </Menu>
    </div>
  )
}

const SHORT: CodeReelLine[] = [
  { code: 'const today = await koma.wake();' },
  { code: 'today.plan(["code", "coffee"]);', diagnostic: { text: 'coffee first', tone: 'info', squiggle: '"code"' } },
  { code: 'today.ship();', suggest: { word: 'ship', options: ['sleep', 'skip'] }, diagnostic: { text: 'shipped', tone: 'ok' } },
]

export default {
  slug: 'code-reel',
  name: 'Code Reel',
  jp: 'コードリール',
  category: 'Motion',
  description:
    'Code as kinetic typography, for intros, shorts and lyric videos. Lines of code type themselves into an editor while a 3D camera rides the cursor: the screen tilts in perspective, the active line sits on a band with a faint reflection, and the lines around it fall out of focus. A word can stop on an autocomplete menu before it is accepted, a finished line can raise a wavy underline and an inline diagnostic, and a terminal prints its logs at the end while the camera pulls back to the whole file. Four skins (neon, paper that follows your theme, phosphor CRT, manga ink), three frames, and optional keyboard and cue sounds from your own recordings. It is all a function of time, so it scrubs, loops and follows a song or a video through time. Reduced motion shows each line whole, with a still camera.',
  preview: <ReelDemo />,
  usage: `import { CodeReel } from '@/components/ui/code-reel'

<CodeReel
  file="stageClear.ts"
  skin="neon"            // paper | phosphor | ink
  chrome="editor"        // window | none
  lines={[
    { code: 'async function stageClear(koma) {' },
    { code: '  koma.take.aBreath("one more try");', suggest: { word: 'aBreath', options: ['aBreak'] } },
    { code: '  if (combo.breaks) koma.respawn();', diagnostic: { text: 'fell 3 times', tone: 'error', squiggle: 'respawn' } },
    { code: '}' },
  ]}
  terminal={[{ tone: 'ok', text: 'stage cleared in 3 tries' }]}
  sound
  sounds={{
    key: ['/sfx/keys/key-1.wav', '/sfx/keys/key-2.wav', '/sfx/keys/key-3.wav'],
    enter: '/sfx/keys/enter.wav',
  }}
  controls
/>`,
  examples: [
    {
      title: 'Synced to a real song',
      preview: <SyncedDemo />,
      code: `import { useMediaTime } from '@/components/ui/use-media-time'

const BAR = (60 / 84.85) * 4 // the song's tempo, 4 beats
const bar = (n: number) => 0.685 + n * BAR // 0.685 s: the first downbeat in the file
const audio = useRef<HTMLAudioElement>(null)
const time = useMediaTime(audio)

const lines = [
  { code: 'const night = await city.lights();', at: bar(1) },
  { code: 'koma.walk(night, { tempo: 85 });', at: bar(2) },
  { code: 'chorus.loop(forever);', at: bar(5), diagnostic: { text: 'infinite loop', tone: 'warn', squiggle: 'forever' } },
]

<audio ref={audio} src="/snow-drift.mp3" controls />
<CodeReel lines={lines} time={time} sound={0.45} sounds={sfx} />

// from captions: parseCaptions(srt).map((cue) => ({ code: cue.text, at: cue.start }))`,
    },
    {
      title: 'Write your own',
      preview: <Playground />,
      code: `<CodeReel
  lines={[
    { code: 'function hello(world) {' },
    { code: '  world.greet("from sasuga/ui");', suggest: { word: 'greet' }, diagnostic: { text: 'it works', tone: 'ok' } },
    { code: '}' },
  ]}
  skin="paper"
  chrome="window"
  loop={false}
  controls
/>`,
    },
    {
      title: 'Vertical, for shorts',
      preview: (
        <div className="w-[min(100%,300px)]">
          <CodeReel lines={SHORT} file="today.ts" skin="phosphor" chrome="none" className="aspect-[9/16]" zoom={1.15} />
        </div>
      ),
      code: `<CodeReel lines={lines} skin="phosphor" chrome="none" className="aspect-[9/16]" zoom={1.15} />`,
    },
  ],
  props: [
    { name: 'lines', type: 'CodeReelLine[]', description: '{ code, at?, speed?, suggest?: { word, options? }, diagnostic?: { text, tone?, squiggle? } }. Leading spaces indent; the highlighter colours keywords, calls, properties, strings, numbers and comments.' },
    { name: 'skin', type: "'neon' | 'paper' | 'phosphor' | 'ink'", default: "'neon'", description: 'neon: dark IDE with glow and an LCD grid. paper: follows your theme colours and light / dark mode. phosphor: green CRT with scanlines. ink: manga black on paper with screentone.' },
    { name: 'chrome', type: "'editor' | 'window' | 'none'", default: "'editor'", description: 'Frame: an editor tab with a breadcrumb, a plain window bar, or bare code.' },
    { name: 'file', type: 'string', default: "'scene.ts'", description: 'Name on the tab or window. The breadcrumb picks up the first function name.' },
    { name: 'terminal', type: '(string | { text; tone? })[]', description: 'Logs printed after the last line, one by one, while the camera pulls back to the whole file.' },
    { name: 'command', type: 'string', description: 'The command on the terminal prompt.' },
    { name: 'speed / hold', type: 'number', default: '16 / 0.45', description: 'Characters per second, and the pause after each line in seconds.' },
    { name: 'time', type: 'number', description: 'External clock in seconds (useMediaTime, a Timeline). The reel follows it and its own clock stops.' },
    { name: 'autoplay / loop / controls', type: 'boolean', default: 'true / true / false', description: 'Own clock options; controls adds a play and seek bar under the screen.' },
    { name: 'camera', type: "'follow' | 'static'", default: "'follow'", description: 'follow rides the cursor in 3D with a slow drift; static holds a three-quarter view of the whole file.' },
    { name: 'zoom / depth', type: 'number', default: '1 / 0.6', description: 'How close the follow camera sits, and how much lines away from the cursor blur and dim (0..1).' },
    { name: 'glow / texture', type: 'boolean', description: 'Text glow (default on for neon and phosphor) and the screen texture (LCD grid, scanlines or screentone).' },
    { name: 'sound', type: 'boolean | number', default: 'false', description: 'Play the sounds: true = 0.5 or a volume 0..1. Browsers start audio after the first click on the page.' },
    { name: 'sounds', type: '{ key?: string | string[]; enter?; accept?; error?; warn?; ok?; info?; tick? }', description: 'Audio file per event: several key files are picked at random and barely detuned, enter plays on each new line and on an accepted autocomplete. Events without a file stay silent. The docs use real mechanical keyboard recordings (CC0).' },
    { name: 'className', type: 'string', description: 'Sizes the screen (default aspect-video, full width). aspect-[9/16] for a vertical reel.' },
    { name: 'label', type: 'string', description: 'Accessible name; defaults to the code itself.' },
  ],
} satisfies DocEntry
