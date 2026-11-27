import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Chibi, MASCOT_NAME, Mascot } from '@/components/art/mascot'
import type { ChibiPose, MascotExpression } from '@/components/art/mascot'
import { cn } from '@/lib/utils'
import type { DocEntry } from '../types'

const EXPRESSIONS: MascotExpression[] = ['neutral', 'happy', 'surprised', 'angry', 'hurt', 'wink', 'smug']
const POSES: ChibiPose[] = ['idle', 'hurt', 'cheer', 'dodge']

function Picker<T extends string>({ items, value, onChange, label }: { items: T[]; value: T; onChange: (v: T) => void; label: string }) {
  // radio group keyboard: one tab stop, arrows move and select
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = items[(items.indexOf(value) + step + items.length) % items.length]
    onChange(next)
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-value="${next}"]`)?.focus()
  }
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKey} className="flex flex-wrap justify-center gap-1.5">
      {items.map((it) => (
        <button
          key={it}
          type="button"
          role="radio"
          data-value={it}
          tabIndex={value === it ? 0 : -1}
          aria-checked={value === it}
          onClick={() => onChange(it)}
          className={cn(
            'ui-head ui-pill ui-border-thin cursor-pointer px-2.5 py-1 text-[12px] leading-none capitalize transition-colors focus-visible:ui-focus',
            value === it ? 'ui-fill bg-accent text-white' : 'bg-paper text-ink hover:bg-accent-soft',
          )}
        >
          {it}
        </button>
      ))}
    </div>
  )
}

function MascotDemo() {
  const [face, setFace] = useState<MascotExpression>('happy')
  const [talking, setTalking] = useState(false)
  return (
    <div className="grid w-full justify-items-center gap-4">
      <div className="relative w-52">
        <span aria-hidden="true" className="absolute inset-x-[8%] top-[10%] bottom-0 rounded-full bg-accent opacity-30 blur-2xl" />
        <Mascot expression={face} talking={talking} label={`${MASCOT_NAME}, looking ${face}`} className="relative" />
      </div>
      <p className="m-0 text-center text-sm text-mute">Pick a face to see her switch.</p>
      <Picker label="Expression" items={EXPRESSIONS} value={face} onChange={setFace} />
      <label className="flex cursor-pointer items-center gap-2 text-sm text-mute">
        <input type="checkbox" checked={talking} onChange={(e) => setTalking(e.target.checked)} className="accent-(--color-accent)" />
        Talking
      </label>
    </div>
  )
}

function ChibiDemo() {
  const [pose, setPose] = useState<ChibiPose>('idle')
  return (
    <div className="grid justify-items-center gap-4">
      <Chibi pose={pose} label={`${MASCOT_NAME}, chibi, ${pose}`} className="w-36" />
      <Picker label="Pose" items={POSES} value={pose} onChange={setPose} />
    </div>
  )
}

export default {
  slug: 'mascot',
  name: 'Mascot',
  jp: 'コマ',
  category: 'Display',
  description: `${MASCOT_NAME}, the kit's mascot, hand-drawn as inline SVG. Seven expressions, a talking mouth and idle life (she blinks, breathes and her hair sways). Switching the expression animates: her head squashes and pops, the eyes blink-swap into the new face and a small mark pops in (a sparkle when happy or winking, sweat when surprised or hurt, an anger mark when angry). All of it is off under reduced motion. Hair follows the theme accent, eyes and ribbon the pop colour, the line follows the ink and its weight follows the style. A chibi variant with poses is made for game targets.`,
  preview: <MascotDemo />,
  usage: `import { Mascot, Chibi, MASCOT_NAME } from '@/components/art/mascot'

<Mascot expression="wink" talking={isTyping} label={MASCOT_NAME} />
<Chibi pose="hurt" />`,
  examples: [
    { title: 'Chibi poses', preview: <ChibiDemo />, code: `<Chibi pose="cheer" />  // idle | hurt | cheer | dodge` },
    {
      title: 'Face crop + recolour',
      preview: (
        <div className="flex flex-wrap justify-center gap-4">
          {EXPRESSIONS.map((e, k) => (
            <span key={e} className="ui-border-thin ui-pill size-16 overflow-hidden bg-accent-soft">
              <Mascot crop="face" expression={e} animated={false} hair={k % 2 ? 'var(--color-pop)' : undefined} eyes={k % 2 ? 'var(--color-accent)' : undefined} />
            </span>
          ))}
        </div>
      ),
      code: `<Mascot crop="face" expression="smug" hair="var(--color-pop)" eyes="var(--color-accent)" animated={false} />`,
    },
  ],
  props: [
    { name: 'expression', type: "'neutral' | 'happy' | 'surprised' | 'angry' | 'hurt' | 'wink' | 'smug'", default: "'neutral'", description: 'Her face. Changing it plays the swap (head pop, eye blink-swap, mark pop). Chibi defaults to the pose’s own face.' },
    { name: 'talking', type: 'boolean', default: 'false', description: 'Mascot only: the mouth opens and flaps.' },
    { name: 'animated', type: 'boolean', default: 'true', description: 'Idle life (blink, breath / bounce, hair sway) and the expression swap. false = a still drawing.' },
    { name: 'crop', type: "'bust' | 'face'", default: "'bust'", description: 'Mascot only: head and shoulders (200 × 220) or a square face crop for avatars.' },
    { name: 'pose', type: "'idle' | 'hurt' | 'cheer' | 'dodge'", default: "'idle'", description: 'Chibi only. Springs between poses; hurt is a squashed flinch.' },
    { name: 'hair / eyes / outfit / trim / ribbon', type: 'string (CSS colour)', description: 'Recolour her. Defaults come from the theme tokens.' },
    { name: 'label', type: 'string', description: 'Accessible name. Without it the art is decorative (aria-hidden).' },
    { name: '...props', type: 'SVGProps<SVGSVGElement>', description: 'Passed to the <svg>; size it with className (it fills its width).' },
  ],
} satisfies DocEntry
