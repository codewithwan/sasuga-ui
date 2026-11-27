import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Kbd } from '@/components/ui/kbd'
import type { DocEntry } from '../types'

function PressedDemo() {
  const [down, setDown] = useState(false)
  return (
    <div className="flex flex-wrap items-center justify-center gap-5">
      <Kbd pressed={down} className="text-lg">
        Space
      </Kbd>
      <Button size="sm" sfx={false} onPointerDown={() => setDown(true)} onPointerUp={() => setDown(false)} onPointerLeave={() => setDown(false)}>
        Hold me
      </Button>
    </div>
  )
}

export default {
  slug: 'kbd',
  name: 'Kbd',
  jp: 'キー',
  category: 'Display',
  description:
    'An outlined keycap sticker. Pressed (by pointer, the `pressed` prop or a real key it `listen`s for) it squashes into its shadow and tints; released, it springs back up with a dot pop.',
  preview: (
    <p className="m-0 flex flex-wrap items-center justify-center gap-2 text-[15px] font-semibold">
      Press <Kbd listen={['Control', 'Meta']}>Ctrl</Kbd> <Kbd listen="k">K</Kbd> to open the menu
    </p>
  ),
  usage: `import { Kbd } from '@/components/ui/kbd'

<Kbd>Ctrl</Kbd> <Kbd>K</Kbd>
<Kbd><Icon name="arrow-right" tone="line" title="Right" /></Kbd>
<Kbd pressed={jumping}>Space</Kbd>
<Kbd listen={['w', 'ArrowUp']}>W</Kbd>`,
  examples: [
    {
      title: 'Live keys (try typing W A S D)',
      preview: (
        <div className="grid justify-items-center gap-1.5 font-display text-lg">
          <Kbd listen={['w', 'ArrowUp']}>W</Kbd>
          <div className="flex gap-1.5">
            <Kbd listen={['a', 'ArrowLeft']}>A</Kbd>
            <Kbd listen={['s', 'ArrowDown']}>S</Kbd>
            <Kbd listen={['d', 'ArrowRight']}>D</Kbd>
          </div>
        </div>
      ),
      code: `<Kbd listen={['w', 'ArrowUp']}>W</Kbd>
<Kbd listen={['a', 'ArrowLeft']}>A</Kbd>
<Kbd listen={['s', 'ArrowDown']}>S</Kbd>
<Kbd listen={['d', 'ArrowRight']}>D</Kbd>`,
    },
    {
      title: 'Controlled pressed',
      preview: <PressedDemo />,
      code: `<Kbd pressed={down}>Space</Kbd>`,
    },
    {
      title: 'Combo',
      preview: (
        <div className="flex flex-wrap items-center justify-center gap-2 font-display text-lg">
          <Kbd>
            <Icon name="arrow-right" tone="line" title="Down" className="rotate-90" />
          </Kbd>
          <Kbd>
            <Icon name="arrow-right" tone="line" title="Down-right" className="rotate-45" />
          </Kbd>
          <Kbd>
            <Icon name="arrow-right" tone="line" title="Right" />
          </Kbd>
          <Icon name="plus" tone="line" size={18} className="mx-1 text-mute" />
          <span className="sr-only">plus</span>
          <Kbd>P</Kbd>
        </div>
      ),
      code: `<Kbd><Icon name="arrow-right" tone="line" title="Down" className="rotate-90" /></Kbd>
<Kbd><Icon name="arrow-right" tone="line" title="Down-right" className="rotate-45" /></Kbd>
<Kbd><Icon name="arrow-right" tone="line" title="Right" /></Kbd>
<Icon name="plus" tone="line" /> <Kbd>P</Kbd>`,
    },
  ],
  props: [
    { name: 'pressed', type: 'boolean', default: 'false', description: 'Holds the key down. Turning it off springs the key back up with a pop.' },
    { name: 'listen', type: 'string | string[]', description: 'KeyboardEvent.key value(s) that press it while held (case-insensitive).' },
    { name: '...props', type: 'HTMLAttributes<HTMLElement>', description: 'Passed to the native <kbd>.' },
  ],
} satisfies DocEntry
