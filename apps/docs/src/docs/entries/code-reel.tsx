import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { CodeReel } from '@/components/ui/code-reel'
import type { CodeReelChrome, CodeReelLine, CodeReelLog, CodeReelSkin, CodeReelTone } from '@/components/ui/code-reel'
import { unlockReelSound } from '@/components/ui/code-reel-sound'
import { Icon } from '@/components/ui/icon'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup } from '@/components/ui/toggle-group'
import { useMediaTime } from '@/components/ui/use-media-time'
import { BAR, BARS, trackUrl } from '../synth-track'
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
  return (
    <div className="grid w-full max-w-[720px] gap-4">
      <CodeReel lines={SCRIPT} terminal={LOGS} file="stageClear.ts" command="bun run stageClear.ts" skin={skin} chrome={chrome} camera={camera} sound={sound} controls />
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

/* ── synced to an original track ── */

const fit = (code: string, extra = 0) => code.length / (BAR * 0.62 - extra)
const SONG: CodeReelLine[] = ([
  { code: 'const night = await city.lights();', at: 0.25 },
  { code: 'koma.walk(night, { tempo: 100 });', at: BAR },
  { code: 'while (rain.falls) heart.keep("time");', at: BAR * 2, diagnostic: { text: 'on beat', tone: 'info', squiggle: '"time"' } },
  { code: '// every step lands on the beat', at: BAR * 3 },
  { code: 'const chorus = koma.sing("ドン!");', at: BAR * 4, suggest: { word: 'sing', options: ['sign', 'sigh'] } },
  { code: 'chorus.loop(forever);', at: BAR * 5, diagnostic: { text: 'infinite loop', tone: 'warn', squiggle: 'forever' } },
  { code: 'if (lost) koma.find("the bassline");', at: BAR * 6 },
  { code: 'return morning;', at: BAR * 7, diagnostic: { text: 'track ended', tone: 'ok' } },
] satisfies CodeReelLine[]).map((l: CodeReelLine) => ({ ...l, speed: fit(l.code, l.suggest ? 0.7 : 0) }))

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

function SyncedDemo() {
  const audio = useRef<HTMLAudioElement>(null)
  const time = useMediaTime(audio)
  const [state, setState] = useState<'idle' | 'composing' | 'playing' | 'paused'>('idle')
  const [clicks, setClicks] = useState(true)
  const length = BARS * BAR

  const toggle = async () => {
    unlockReelSound()
    const el = audio.current
    if (!el) return
    if (!el.src) {
      setState('composing')
      el.src = await trackUrl()
    }
    if (el.paused) await el.play().catch(() => setState('paused'))
    else el.pause()
  }

  return (
    <div className="grid w-full max-w-[720px] gap-4">
      <CodeReel lines={SONG} time={time} file="nightRun.ts" skin="neon" sound={clicks ? 0.3 : 0} terminal={[{ tone: 'ok', text: 'night run, 100 bpm, made in the browser' }]} command="play nightRun.ts" />
      <div className="ui-card flex flex-wrap items-center gap-x-4 gap-y-3 p-3">
        <Button
          size="sm"
          variant="accent"
          sfx={false}
          onClick={toggle}
          disabled={state === 'composing'}
          icon={<Icon name={state === 'playing' ? 'pause' : 'music'} tone="line" size={16} />}
        >
          {state === 'composing' ? 'Composing…' : state === 'playing' ? 'Pause' : state === 'paused' ? 'Play' : 'Play the track'}
        </Button>
        <input
          type="range"
          aria-label="Track position"
          min={0}
          max={length}
          step={0.01}
          value={Math.min(time, length)}
          onChange={(e) => {
            if (audio.current?.src) audio.current.currentTime = Number(e.target.value)
          }}
          className="min-w-[120px] flex-1 accent-[var(--color-accent)]"
        />
        <span className="font-mono text-sm tabular-nums text-mute">
          {mmss(time)} / {mmss(length)}
        </span>
        <span className="inline-flex items-center gap-2 text-sm font-bold text-mute">
          Key clicks
          <Switch label="Key clicks" checked={clicks} onChange={setClicks} />
        </span>
      </div>
      <p className="m-0 text-center text-xs text-mute">"Night Run": an original loop, synthesized in your browser (no samples). Each line starts on a bar.</p>
      <audio ref={audio} preload="none" onPlay={() => setState('playing')} onPause={() => setState('paused')} onEnded={() => setState('paused')} />
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
      <CodeReel key={run.n} lines={run.lines} skin={skin} chrome="window" file="playground.ts" loop={false} controls />
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
    'Code as kinetic typography, for intros, shorts and lyric videos. Lines of code type themselves into an editor while a 3D camera rides the cursor: the screen tilts in perspective, the active line sits on a band with a faint reflection, and the lines around it fall out of focus. A word can stop on an autocomplete menu before it is accepted, a finished line can raise a wavy underline and an inline diagnostic, and a terminal prints its logs at the end while the camera pulls back to the whole file. Four skins (neon, paper that follows your theme, phosphor CRT, manga ink), three frames, and optional synthesized key clicks. It is all a function of time, so it scrubs, loops and follows a song or a video through time. Reduced motion shows each line whole, with a still camera.',
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
  controls
/>`,
  examples: [
    {
      title: 'Synced to a song',
      preview: <SyncedDemo />,
      code: `import { useMediaTime } from '@/components/ui/use-media-time'

const BAR = 2.4 // 100 bpm, 4 beats
const audio = useRef<HTMLAudioElement>(null)
const time = useMediaTime(audio)

const lines = [
  { code: 'const night = await city.lights();', at: 0.25 },
  { code: 'koma.walk(night, { tempo: 100 });', at: BAR },
  { code: 'chorus.loop(forever);', at: BAR * 5, diagnostic: { text: 'infinite loop', tone: 'warn', squiggle: 'forever' } },
]

<audio ref={audio} src="/night-run.wav" controls />
<CodeReel lines={lines} time={time} sound={0.3} />

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
    { name: 'sound', type: 'boolean | number', default: 'false', description: 'Synthesized key clicks, an accept pop, diagnostic blips and terminal ticks. true = 0.5 or a volume 0..1. Browsers start audio after the first click on the page.' },
    { name: 'className', type: 'string', description: 'Sizes the screen (default aspect-video, full width). aspect-[9/16] for a vertical reel.' },
    { name: 'label', type: 'string', description: 'Accessible name; defaults to the code itself.' },
  ],
} satisfies DocEntry
