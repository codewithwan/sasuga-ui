import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { DocEntry } from '../types'

const Star = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="fill-current">
    <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
  </svg>
)
const Arrow = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="fill-none stroke-current stroke-[3] [stroke-linecap:round] [stroke-linejoin:round]">
    <path d="M5 12h13M13 6l6 6-6 6" />
  </svg>
)

function LoadingDemo() {
  const [busy, setBusy] = useState(false)
  return (
    <Button
      variant="accent"
      sfx="セーブ!"
      loading={busy}
      onClick={() => {
        setBusy(true)
        window.setTimeout(() => setBusy(false), 1600)
      }}
    >
      {busy ? 'Saving' : 'Save'}
    </Button>
  )
}

export default {
  slug: 'button',
  name: 'Button',
  jp: 'ボタン',
  category: 'Actions',
  description:
    'A calm sticker at rest that charges on hover (a slight inflate and a shine sweep), squashes on press, overshoots on release and lands an impact frame: a flash, a hop of the icon, a drawn burst and sound-effect lettering. Shape, line and shadow follow the active style.',
  preview: <Button variant="accent">Confirm</Button>,
  usage: `import { useState } from 'react'
import { Button } from '@/components/ui/button'

<Button variant="accent" sfx="ドン!" onClick={save}>Confirm</Button>`,
  examples: [
    {
      title: 'Variants',
      preview: (
        <div className="flex flex-wrap items-center justify-center gap-6">
          <Button>Paper</Button>
          <Button variant="accent" sfx="バン!">Accent</Button>
          <Button variant="ink" sfx="ポン">Ink</Button>
          <Button variant="pop" sfx="キラッ">Pop</Button>
          <Button variant="outline" sfx={false}>Outline</Button>
        </div>
      ),
      code: `<Button>Paper</Button>
<Button variant="accent" sfx="バン!">Accent</Button>
<Button variant="ink" sfx="ポン">Ink</Button>
<Button variant="pop" sfx="キラッ">Pop</Button>
<Button variant="outline" sfx={false}>Outline</Button>`,
    },
    {
      title: 'Sizes',
      preview: (
        <div className="flex flex-wrap items-center justify-center gap-6">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg" variant="accent" sfx="ドドン!">Large</Button>
        </div>
      ),
      code: `<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg" variant="accent" sfx="ドドン!">Large</Button>`,
    },
    {
      title: 'Icons',
      preview: (
        <div className="flex flex-wrap items-center justify-center gap-6">
          <Button variant="pop" icon={<Star />} sfx="キラッ">
            Favourite
          </Button>
          <Button iconEnd={<Arrow />}>Next</Button>
          <Button size="icon" variant="ink" icon={<Star />} aria-label="Favourite" sfx="ポン" />
        </div>
      ),
      code: `<Button variant="pop" icon={<StarIcon />} sfx="キラッ">Favourite</Button>
<Button iconEnd={<ArrowIcon />}>Next</Button>
<Button size="icon" variant="ink" icon={<StarIcon />} aria-label="Favourite" />`,
    },
    {
      title: 'Loading',
      preview: <LoadingDemo />,
      code: `const [busy, setBusy] = useState(false)

<Button variant="accent" loading={busy} onClick={save}>
  {busy ? 'Saving' : 'Save'}
</Button>`,
    },
  ],
  props: [
    { name: 'variant', type: "'paper' | 'accent' | 'ink' | 'pop' | 'outline'", default: "'paper'", description: 'Face colour. Line, radius and shadow come from the active style.' },
    { name: 'size', type: "'sm' | 'md' | 'lg' | 'icon'", default: "'md'", description: 'Padding, type size and how big the hit is. icon is a square for a lone icon (add aria-label).' },
    { name: 'sfx', type: 'string | false', default: "'ドン!'", description: 'Lettering drawn on click. false turns it off.' },
    { name: 'power', type: 'number', default: '1', description: 'Multiplies the impact effect size.' },
    { name: 'loading', type: 'boolean', default: 'false', description: 'Busy: bouncing dots replace the icon, lines drift across the face, the button is disabled (aria-busy). It stretches when it finishes.' },
    { name: 'icon', type: 'ReactNode', description: 'Leading icon; it hops on every hit.' },
    { name: 'iconEnd', type: 'ReactNode', description: 'Trailing icon.' },
    { name: '...props', type: 'ButtonHTMLAttributes', description: 'Everything a native <button> accepts. ButtonLink takes the same props plus href.' },
  ],
} satisfies DocEntry
