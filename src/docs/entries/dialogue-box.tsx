import { useState } from 'react'
import { MASCOT_NAME, Mascot } from '@/components/art/mascot'
import { Button } from '@/components/ui/button'
import { DialogueBox } from '@/components/ui/dialogue-box'
import type { DialogueLine, DialoguePortraitState } from '@/components/ui/dialogue-box'
import type { DocEntry } from '../types'
import { PlayGate } from '../play-gate'

/** A second character: the mascot recoloured (pop hair, accent eyes). */
const Rin = ({ expression, talking }: DialoguePortraitState) => (
  <Mascot expression={expression} talking={talking} hair="var(--color-pop)" eyes="var(--color-accent)" ribbon="var(--color-accent)" />
)

const SCRIPT: DialogueLine[] = [
  { speaker: MASCOT_NAME, expression: 'happy', text: "Oh! You're finally awake. Welcome to the *festival*!" },
  { speaker: MASCOT_NAME, expression: 'smug', text: 'I drew every frame of tonight myself, you know. Every. Single. *Koma*.' },
  { speaker: 'Rin', portrait: Rin, side: 'right', expression: 'angry', text: 'Koma! You left the fireworks *unattended* again!' },
  { speaker: MASCOT_NAME, expression: 'surprised', text: 'Eh?! But they were only *slightly* on fire…' },
  { speaker: 'Rin', portrait: Rin, side: 'right', expression: 'hurt', text: 'Slightly. She says slightly.' },
  { speaker: MASCOT_NAME, expression: 'wink', text: 'Quick, before she catches us. Where to?', choices: ['The rooftop', 'The food stalls'] },
]

function DialogueDemo() {
  const [run, setRun] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  return (
    <div className="grid w-full justify-items-center gap-5">
      {/* calm until clicked: the first line is already written; Restart plays it typed */}
      <DialogueBox key={run} autoPlay={run > 0} lines={SCRIPT} onChoose={(v) => setPicked(v)} onComplete={() => setDone(true)} />
      <div className="flex flex-wrap items-center justify-center gap-3">
        {picked && <span className="text-sm text-mute">Heading to: {picked.toLowerCase()}</span>}
        <Button
          size="sm"
          variant={done ? 'accent' : 'paper'}
          sfx="もう一度"
          onClick={() => {
            setRun((r) => r + 1)
            setPicked(null)
            setDone(false)
          }}
        >
          {done ? 'Play again' : run ? 'Restart' : 'Play scene'}
        </Button>
      </div>
    </div>
  )
}

export default {
  slug: 'dialogue-box',
  name: 'Dialogue Box',
  jp: 'セリフ',
  category: 'Game',
  description:
    'A visual-novel text box. The speaker stands half out of the box in a soft glow (the mascot by default), hops on every line, bobs and talks while the text types, and changes expression per line. Characters pop in one by one with a beat on punctuation, *emphasis* words shake, and the name plate slams in on a speaker change. Lines can end in choices; Auto, Skip, a history Log and the line counter sit in a footer row under the text. Click, Enter or Space finishes the line, then advances; 1–9 pick a choice.',
  preview: <DialogueDemo />,
  usage: `import { DialogueBox } from '@/components/ui/dialogue-box'

<DialogueBox
  speaker="Koma"
  lines={[
    { text: 'The festival starts *tonight*!', expression: 'happy' },
    { speaker: 'Rin', side: 'right', portrait: (s) => <Mascot {...s} hair="var(--color-pop)" />, text: 'Is that *smoke*?' },
    { text: 'Where to?', expression: 'wink', choices: ['Rooftop', 'Food stalls'] },
  ]}
  onChoose={(value) => goTo(value)}
  onComplete={() => nextScene()}
/>`,
  examples: [
    {
      title: 'Narration, no portrait',
      preview: (
        <PlayGate>{(run) => <DialogueBox key={run} autoPlay={run > 0} speed={55} lines={['The wind howled across the empty platform…', 'Then, somewhere far off — a *bell*.']} />}</PlayGate>
      ),
      code: `<DialogueBox
  speed={55}
  lines={['The wind howled across the empty platform…', 'Then, somewhere far off — a *bell*.']}
/>`,
    },
    {
      title: 'Slow and dramatic',
      preview: (
        <PlayGate>
          {(run) => <DialogueBox key={run} autoPlay={run > 0} speaker="???" expression="smug" speed={14} controls={false} lines={['So… you are the one they call the *Combo Kid*.']} />}
        </PlayGate>
      ),
      code: `<DialogueBox speaker="???" expression="smug" speed={14} controls={false} lines={['So… you are the one they call the *Combo Kid*.']} />`,
    },
    {
      title: 'Your own portrait',
      preview: (
        <PlayGate>
          {(run) => (
            <DialogueBox
              key={run}
              autoPlay={run > 0}
              speaker="Rin"
              side="right"
              portrait={Rin}
              lines={[{ text: 'Any node works as a portrait. A function also gets the *expression* and whether the line is typing.', expression: 'smug' }]}
            />
          )}
        </PlayGate>
      ),
      code: `<DialogueBox
  speaker="Rin"
  side="right"
  portrait={({ expression, talking }) => <Mascot expression={expression} talking={talking} hair="var(--color-pop)" />}
  lines={[{ text: 'Any node works as a portrait.', expression: 'smug' }]}
/>`,
    },
  ],
  props: [
    {
      name: 'lines',
      type: '(string | { text; speaker?; portrait?; expression?; side?; choices? })[]',
      description: 'Required. The script. Wrap a word in *stars* to make it hit. `choices` wait for a pick. Change the `key` to restart.',
    },
    { name: 'speaker', type: 'string', description: 'Default name on the plate; a line can override it.' },
    { name: 'portrait', type: 'ReactNode | ({ expression, talking }) => ReactNode', description: 'Default portrait. Lines with a speaker get the mascot unless this is set; `false` hides it.' },
    { name: 'expression', type: "'neutral' | 'happy' | 'surprised' | 'angry' | 'hurt' | 'wink' | 'smug'", default: "'neutral'", description: 'Default face for the portrait; a line can override it.' },
    { name: 'side', type: "'left' | 'right'", default: "'left'", description: 'Which side the portrait stands on; a line can override it.' },
    { name: 'speed', type: 'number', default: '40', description: 'Characters per second. Punctuation holds for a few extra beats.' },
    { name: 'autoPlay', type: 'boolean', default: 'true', description: 'Type the first line on mount. false shows it already written and waits for the reader.' },
    { name: 'controls', type: 'boolean', default: 'true', description: 'Auto (advances after a pause), Skip (fast-forwards to the next choice) and Log (history; Esc closes).' },
    { name: 'autoDelay', type: 'number', default: '1400', description: 'Auto mode pause after a finished line, in ms (plus a little per character).' },
    { name: 'onChoose', type: '(value: string, line: number) => void', description: "Fired with the picked choice's value (or label)." },
    { name: 'onLineChange', type: '(index: number) => void', description: 'Fired when the box moves to the next line.' },
    { name: 'onComplete', type: '() => void', description: 'Fired once when the reader advances past the last line.' },
    { name: '...props', type: 'HTMLAttributes<HTMLDivElement>', description: 'Passed to the focusable root. Each line (and its choices) is announced through a polite live region.' },
  ],
} satisfies DocEntry
