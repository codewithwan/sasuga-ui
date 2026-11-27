import { useState } from 'react'
import { CodeReel } from '@/components/ui/code-reel'
import type { CodeReelLine, CodeReelLog } from '@/components/ui/code-reel'
import { ToggleGroup } from '@/components/ui/toggle-group'
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

function ReelDemo() {
  const [camera, setCamera] = useState<'follow' | 'static'>('follow')
  return (
    <div className="grid w-full max-w-[720px] justify-items-center gap-4">
      <CodeReel key={camera} lines={SCRIPT} terminal={LOGS} file="stageClear.ts" command="bun run stageClear.ts" camera={camera} controls />
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
    'Code as kinetic typography, for intros, shorts and lyric videos. Lines of code type themselves into a dark editor while a 3D camera rides the cursor: the screen tilts in perspective, the active line glows on a band with a faint reflection, and the lines around it fall out of focus over an LCD pixel grid. A word can stop on an autocomplete menu before it is accepted, a finished line can raise a wavy underline and an inline diagnostic, and a terminal prints its logs at the end while the camera pulls back to the whole file. It is all a function of time, so it scrubs, loops and follows a video or a Timeline through time. Reduced motion shows each line whole, with a still camera.',
  preview: <ReelDemo />,
  usage: `import { CodeReel } from '@/components/ui/code-reel'

<CodeReel
  file="stageClear.ts"
  lines={[
    { code: 'async function stageClear(koma) {' },
    { code: '  koma.take.aBreath("one more try");', suggest: { word: 'aBreath', options: ['aBreak'] } },
    { code: '  if (combo.breaks) koma.respawn();', diagnostic: { text: 'fell 3 times', tone: 'error', squiggle: 'respawn' } },
    { code: '}' },
  ]}
  terminal={[{ tone: 'ok', text: 'stage cleared in 3 tries' }]}
  controls
/>`,
  examples: [
    {
      title: 'Vertical, for shorts',
      preview: (
        <div className="w-[min(100%,300px)]">
          <CodeReel lines={SHORT} file="today.ts" className="aspect-[9/16]" zoom={1.15} />
        </div>
      ),
      code: `<CodeReel lines={lines} file="today.ts" className="aspect-[9/16]" zoom={1.15} />`,
    },
    {
      title: 'Synced to a song or a video',
      preview: (
        <p className="m-0 max-w-[60ch] text-center text-sm leading-relaxed text-mute">
          Give each line an <code className="font-mono text-ink">at</code> (seconds) and pass the media clock as <code className="font-mono text-ink">time</code>. Captions
          from an SRT or VTT file map straight onto lines. Use words you wrote or have the rights to.
        </p>
      ),
      code: `import { parseCaptions } from '@/components/ui/caption-cues'
import { useMediaTime } from '@/components/ui/use-media-time'

const time = useMediaTime(audioRef)
const lines = parseCaptions(srt).map((cue) => ({ code: cue.text, at: cue.start }))

<audio ref={audioRef} src="/track.mp3" controls />
<CodeReel lines={lines} time={time} speed={22} />`,
    },
  ],
  props: [
    { name: 'lines', type: 'CodeReelLine[]', description: '{ code, at?, speed?, suggest?: { word, options? }, diagnostic?: { text, tone?, squiggle? } }. Leading spaces indent; the highlighter colours keywords, calls, properties, strings, numbers and comments.' },
    { name: 'file', type: 'string', default: "'scene.ts'", description: 'Name on the editor tab. The breadcrumb picks up the first function name.' },
    { name: 'terminal', type: '(string | { text; tone? })[]', description: 'Logs printed after the last line, one by one, while the camera pulls back to the whole file.' },
    { name: 'command', type: 'string', description: 'The command on the terminal prompt.' },
    { name: 'speed / hold', type: 'number', default: '16 / 0.45', description: 'Characters per second, and the pause after each line in seconds.' },
    { name: 'time', type: 'number', description: 'External clock in seconds (useMediaTime, a Timeline). The reel follows it and its own clock stops.' },
    { name: 'autoplay / loop / controls', type: 'boolean', default: 'true / true / false', description: 'Own clock options; controls adds a play and seek bar under the screen.' },
    { name: 'camera', type: "'follow' | 'static'", default: "'follow'", description: 'follow rides the cursor in 3D with a slow drift; static holds a three-quarter view of the whole file.' },
    { name: 'zoom', type: 'number', default: '1', description: 'How close the follow camera sits.' },
    { name: 'depth', type: 'number', default: '0.6', description: 'Depth of field, 0..1: how much lines away from the cursor blur and dim.' },
    { name: 'glow / lcd', type: 'boolean', default: 'true / true', description: 'Neon text glow, and the pixel grid over the screen.' },
    { name: 'className', type: 'string', description: 'Sizes the screen (default aspect-video, full width). aspect-[9/16] for a vertical reel.' },
    { name: 'label', type: 'string', description: 'Accessible name; defaults to the code itself.' },
  ],
} satisfies DocEntry
