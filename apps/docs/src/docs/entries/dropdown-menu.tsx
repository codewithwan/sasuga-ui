import { useState } from 'react'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import type { DropdownMenuEntry } from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'
import type { DocEntry } from '../types'

const Dots = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current">
    <circle cx="5" cy="12" r="2.4" />
    <circle cx="12" cy="12" r="2.4" />
    <circle cx="19" cy="12" r="2.4" />
  </svg>
)

function ActionsDemo() {
  const toast = useToast()
  const items: DropdownMenuEntry[] = [
    { type: 'label', label: 'Episode 04' },
    { label: 'Rename', shortcut: 'R', onSelect: () => toast('Renamed', { sfx: 'スッ' }) },
    { label: 'Duplicate', hint: 'Copies every cel', shortcut: 'Ctrl+D', onSelect: () => toast('Duplicated', { sfx: 'ポン!' }) },
    { label: 'Export', shortcut: 'Ctrl+E', onSelect: () => toast('Export started', { sfx: 'ゴー!' }) },
    { label: 'Publish', disabled: true },
    { type: 'separator' },
    { label: 'Delete', danger: true, sfx: 'ドカン!', onSelect: () => toast('Deleted', { variant: 'danger', sfx: 'ドカン!' }) },
  ]
  return <DropdownMenu trigger="Actions" items={items} />
}

function ViewDemo() {
  const [grid, setGrid] = useState(true)
  const [onion, setOnion] = useState(false)
  return (
    <div className="grid justify-items-center gap-3">
      <DropdownMenu
        trigger={<Dots />}
        triggerLabel="View options"
        variant="ink"
        align="end"
        items={[
          { type: 'label', label: 'View' },
          { type: 'checkbox', label: 'Show grid', checked: grid, onCheckedChange: setGrid, shortcut: 'G' },
          { type: 'checkbox', label: 'Onion skin', checked: onion, onCheckedChange: setOnion, shortcut: 'O' },
          { type: 'checkbox', label: 'Safe area', defaultChecked: true },
        ]}
      />
      <span className="text-sm text-mute">
        grid: {grid ? 'on' : 'off'} · onion skin: {onion ? 'on' : 'off'}
      </span>
    </div>
  )
}

export default {
  slug: 'dropdown-menu',
  name: 'Dropdown Menu',
  jp: 'メニュー',
  category: 'Overlay',
  description:
    'A menu button. The trigger squashes, the menu pops out and deals its items in from alternating sides, a highlight glides between them, and choosing an item flashes the row and lands a burst with lettering. Checkbox items toggle in place with a popping check. Roving focus with arrows, Home/End, Enter/Space, Esc, Tab and type-ahead.',
  preview: <ActionsDemo />,
  usage: `import { DropdownMenu } from '@/components/ui/dropdown-menu'

<DropdownMenu
  trigger="Actions"
  items={[
    { type: 'label', label: 'Episode 04' },
    { label: 'Rename', shortcut: 'R', onSelect: rename },
    { label: 'Export', onSelect: exportClip },
    { type: 'separator' },
    { label: 'Delete', danger: true, onSelect: remove },
  ]}
/>`,
  examples: [
    {
      title: 'Icon trigger with checkbox items',
      preview: <ViewDemo />,
      code: `<DropdownMenu
  trigger={<DotsIcon />}
  triggerLabel="View options"
  variant="ink"
  align="end"
  items={[
    { type: 'label', label: 'View' },
    { type: 'checkbox', label: 'Show grid', checked: grid, onCheckedChange: setGrid },
    { type: 'checkbox', label: 'Onion skin', checked: onion, onCheckedChange: setOnion },
    { type: 'checkbox', label: 'Safe area', defaultChecked: true },
  ]}
/>`,
    },
  ],
  props: [
    { name: 'trigger', type: 'ReactNode', description: 'Content of the trigger button (a chevron is added).' },
    { name: 'items', type: 'DropdownMenuEntry[]', description: 'Items, checkbox items, labels and separators, in order (see below).' },
    { name: "items[] (item)", type: '{ label; onSelect?; hint?; shortcut?; icon?; danger?; disabled?; sfx? }', description: 'A menuitem. Choosing it calls onSelect and closes the menu. sfx overrides the menu lettering.' },
    { name: "items[] (checkbox)", type: "{ type: 'checkbox'; label; checked?; defaultChecked?; onCheckedChange?; shortcut?; disabled? }", description: 'A menuitemcheckbox; toggles without closing. Controlled or uncontrolled.' },
    { name: "items[] (label / separator)", type: "{ type: 'label'; label } | { type: 'separator' }", description: 'Group heading and divider; skipped by the keyboard.' },
    { name: 'triggerLabel', type: 'string', description: 'Accessible name when the trigger is only an icon.' },
    { name: 'variant', type: "'paper' | 'accent' | 'ink'", default: "'paper'", description: 'Trigger colour.' },
    { name: 'align', type: "'start' | 'end'", default: "'start'", description: 'Which trigger edge the menu lines up with.' },
    { name: 'sfx', type: 'string | false', default: "'ポチッ'", description: 'Lettering when an item is chosen.' },
    { name: 'onOpenChange', type: '(open: boolean) => void', description: 'Called when the menu opens or closes.' },
    { name: 'className', type: 'string', description: 'Extra classes for the wrapper.' },
  ],
} satisfies DocEntry
