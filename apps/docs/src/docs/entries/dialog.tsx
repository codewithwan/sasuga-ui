import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import type { DocEntry } from '../types'

function BasicDemo() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="accent" sfx="バン!" onClick={() => setOpen(true)}>
        Open dialog
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Ready to start?"
        description="Cel pops with a burst and debris, manga slams through focus lines, flat lifts in. Press Esc, click outside or hit the close button to fling it away."
        footer={
          <>
            <Button variant="paper" size="sm" sfx={false} onClick={() => setOpen(false)}>
              Not yet
            </Button>
            <Button size="sm" variant="accent" sfx="ドン!" onClick={() => setOpen(false)}>
              Start
            </Button>
          </>
        }
      />
    </>
  )
}

function FormDemo() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('codewithwan')
  return (
    <>
      <Button variant="ink" onClick={() => setOpen(true)}>
        Edit codename
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Codename"
        sfx="シャキン"
        footer={
          <Button size="sm" variant="accent" sfx="セーブ!" onClick={() => setOpen(false)}>
            Save
          </Button>
        }
      >
        <Field label="New codename" value={name} onChange={setName} />
      </Dialog>
    </>
  )
}

export default {
  slug: 'dialog',
  name: 'Dialog',
  jp: 'ダイアログ',
  category: 'Overlay',
  description:
    'A modal on the native <dialog> element: focus trap, Esc and top-layer stacking come free. The entrance follows the style: cel pops with squash and stretch, a spiky burst, flying debris and stamped lettering; manga slams down through focus lines, shakes on contact and gets slashed; flat lifts in calmly. Closing flings the panel away. Effects are DOM (Web Animations) because the dialog sits above the canvas FX layer.',
  preview: <BasicDemo />,
  usage: `import { Dialog } from '@/components/ui/dialog'

const [open, setOpen] = useState(false)

<Button onClick={() => setOpen(true)}>Open</Button>
<Dialog
  open={open}
  onOpenChange={setOpen}
  title="Ready to start?"
  description="Esc, outside click or the close button closes it."
  footer={<Button onClick={() => setOpen(false)}>Start</Button>}
/>`,
  examples: [
    {
      title: 'With content',
      preview: <FormDemo />,
      code: `<Dialog open={open} onOpenChange={setOpen} title="Codename" sfx="シャキン"
  footer={<Button variant="accent" sfx="セーブ!" onClick={() => setOpen(false)}>Save</Button>}>
  <Field label="New codename" value={name} onChange={setName} />
</Dialog>`,
    },
  ],
  props: [
    { name: 'open', type: 'boolean', description: 'Controlled open state.' },
    { name: 'onOpenChange', type: '(open: boolean) => void', description: 'Called with false on Esc, backdrop click or the close button.' },
    { name: 'title', type: 'ReactNode', description: 'Heading; wired to aria-labelledby.' },
    { name: 'description', type: 'ReactNode', description: 'Optional text; wired to aria-describedby.' },
    { name: 'children', type: 'ReactNode', description: 'Body content.' },
    { name: 'footer', type: 'ReactNode', description: 'Actions row, right-aligned.' },
    { name: 'sfx', type: 'string | false', default: "'バン!'", description: 'Lettering stamped on the panel corner when it lands (cel and manga; flat shows none).' },
    { name: 'className', type: 'string', description: 'Extra classes for the panel wrapper (e.g. a wider max width).' },
  ],
} satisfies DocEntry
