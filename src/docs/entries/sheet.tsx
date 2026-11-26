import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import type { DocEntry } from '../types'

const MENU = ['Profile', 'Skills', 'Projects', 'Settings']

function MenuSheet({ side }: { side: 'left' | 'right' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant={side === 'right' ? 'accent' : 'ink'} sfx={false} onClick={() => setOpen(true)}>
        Open {side}
      </Button>
      <Sheet open={open} onOpenChange={setOpen} title="Menu" side={side}>
        {MENU.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setOpen(false)}
            className="ui-head ui-r cursor-pointer border-0 bg-transparent px-3 py-2.5 text-left text-[clamp(22px,4vw,28px)] leading-none text-ink transition-[translate,background-color] duration-200 ease-snap hover:translate-x-1.5 hover:bg-accent-soft focus-visible:translate-x-1.5 focus-visible:bg-accent-soft"
          >
            {item}
          </button>
        ))}
      </Sheet>
    </>
  )
}

export default {
  slug: 'sheet',
  name: 'Sheet',
  jp: 'シート',
  category: 'Overlay',
  description:
    'A side drawer on the native <dialog>: the card whips in from an edge trailing two afterimages and speed lines, overshoots and settles, then deals its children in one at a time. Closing flings it back out. Flat keeps the slide and a gentle stagger. Good for menus.',
  preview: <MenuSheet side="right" />,
  usage: `import { Sheet } from '@/components/ui/sheet'

const [open, setOpen] = useState(false)

<Button onClick={() => setOpen(true)}>Menu</Button>
<Sheet open={open} onOpenChange={setOpen} title="Menu" side="right">
  <a href="/profile">Profile</a>
  <a href="/skills">Skills</a>
</Sheet>`,
  examples: [
    {
      title: 'From the left',
      preview: <MenuSheet side="left" />,
      code: `<Sheet open={open} onOpenChange={setOpen} title="Menu" side="left">
  {items}
</Sheet>`,
    },
  ],
  props: [
    { name: 'open', type: 'boolean', description: 'Controlled open state.' },
    { name: 'onOpenChange', type: '(open: boolean) => void', description: 'Called with false on Esc, backdrop click or the close button.' },
    { name: 'title', type: 'ReactNode', description: 'Heading; wired to aria-labelledby.' },
    { name: 'side', type: "'left' | 'right'", default: "'right'", description: 'Edge the sheet slides in from.' },
    { name: 'children', type: 'ReactNode', description: 'Each direct child is revealed with a stagger.' },
    { name: 'className', type: 'string', description: 'Extra classes for the sliding panel (e.g. a different width).' },
  ],
} satisfies DocEntry
