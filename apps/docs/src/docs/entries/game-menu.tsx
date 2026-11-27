import { useState } from 'react'
import { GameMenu } from '@/components/ui/game-menu'
import type { GameMenuItem } from '@/components/ui/game-menu'
import type { DocEntry } from '../types'

const TITLE_MENU: GameMenuItem[] = [
  { id: 'start', label: 'New Game', hint: 'Prologue' },
  { id: 'continue', label: 'Continue', hint: 'Slot 2 · 14h' },
  { id: 'options', label: 'Options' },
  { id: 'extras', label: 'Extras', disabled: true, hint: 'Clear the game' },
  { id: 'quit', label: 'Quit' },
]

const PARTY_MENU: GameMenuItem[] = [
  { id: 'items', label: 'Items' },
  { id: 'skills', label: 'Skills' },
  { id: 'equip', label: 'Equip' },
  { id: 'status', label: 'Status' },
  { id: 'save', label: 'Save', disabled: true, hint: 'Not here' },
]

function MenuDemo() {
  const [last, setLast] = useState('—')
  return (
    <div className="grid justify-items-center gap-3">
      <GameMenu label="Title menu" items={TITLE_MENU} onSelect={(it) => setLast(it.label)} onBack={() => setLast('Back')} />
      <p className="m-0 text-xs text-mute" aria-live="polite">
        Last: <span className="font-bold text-ink">{last}</span>
      </p>
    </div>
  )
}

export default {
  slug: 'game-menu',
  name: 'Game Menu',
  jp: 'メニュー',
  category: 'Game',
  description:
    'A JRPG command menu. The pointing cursor springs between items trailing afterimages, the item under it slides out on a highlight, confirming flashes it with an impact, and disabled items shake no. Arrow keys wrap, Enter confirms, Esc goes back, and the mouse moves the cursor too.',
  preview: <MenuDemo />,
  usage: `import { GameMenu } from '@/components/ui/game-menu'

<GameMenu
  label="Title menu"
  items={[
    { id: 'start', label: 'New Game', onSelect: startGame },
    { id: 'continue', label: 'Continue', hint: 'Slot 2 · 14h' },
    { id: 'extras', label: 'Extras', disabled: true },
  ]}
  onBack={closeMenu}
/>`,
  examples: [
    {
      title: 'Hand cursor with a title',
      preview: <GameMenu label="Party" title="Party" cursor="hand" items={PARTY_MENU} sfx="OK!" hints={false} />,
      code: `<GameMenu label="Party" title="Party" cursor="hand" items={partyItems} sfx="OK!" hints={false} />`,
    },
  ],
  props: [
    { name: 'items', type: 'GameMenuItem[]', description: 'Required. { id, label, hint?, disabled?, onSelect? }. Disabled items can be pointed at but shake when chosen.' },
    { name: 'label', type: 'string', description: 'Required. Accessible name of the role="menu".' },
    { name: 'title', type: 'ReactNode', description: 'Visible heading above the items.' },
    { name: 'defaultIndex', type: 'number', default: 'first enabled', description: 'Where the cursor starts.' },
    { name: 'onSelect', type: '(item, index) => void', description: 'Confirm of an enabled item (click, Enter, Space).' },
    { name: 'onBack', type: '() => void', description: 'Escape. Also shows the Esc hint.' },
    { name: 'cursor', type: "'arrow' | 'hand'", default: "'arrow'", description: 'The pointer glyph.' },
    { name: 'sfx', type: 'string | false', default: "'決定!'", description: 'Lettering on confirm.' },
    { name: 'hints', type: 'boolean', default: 'true', description: 'Shows the key hints row.' },
    { name: '...props', type: 'HTMLAttributes<HTMLDivElement>', description: 'Passed to the role="menu" element; `className` goes to the panel.' },
  ],
} satisfies DocEntry
