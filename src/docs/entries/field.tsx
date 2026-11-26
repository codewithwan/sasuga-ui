import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import type { DocEntry } from '../types'

function FieldDemo({ multiline }: { multiline?: boolean }) {
  const [v, setV] = useState('')
  return (
    <div className="w-[min(100%,380px)]">
      <Field label={multiline ? 'Message' : 'Name'} placeholder="Type something" multiline={multiline} value={v} onChange={setV} />
    </div>
  )
}

function ValidateDemo() {
  const [v, setV] = useState('')
  const [checked, setChecked] = useState(false)
  const ok = /^\S+@\S+\.\S+$/.test(v)
  return (
    <form
      className="grid w-[min(100%,380px)] gap-3"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        setChecked(true)
      }}
    >
      <Field
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={v}
        onChange={(next) => {
          setV(next)
          setChecked(false)
        }}
        error={checked && !ok ? 'That does not look like an email.' : undefined}
        success={checked && ok}
      />
      <Button type="submit" variant="accent" size="sm" sfx={false} className="justify-self-start">
        Check
      </Button>
    </form>
  )
}

export default {
  slug: 'field',
  name: 'Field',
  jp: '入力',
  category: 'Forms',
  description:
    'Label + input (or textarea) in a sticker box. Focus makes the label hop and the border charge up; typing jolts the box and throws sparks from the caret now and then. Turning invalid shakes it with ダメ! lettering; success pops a self-drawing check.',
  preview: <FieldDemo />,
  usage: `import { Field } from '@/components/ui/field'

const [name, setName] = useState('')
<Field label="Name" value={name} onChange={setName} required />`,
  examples: [
    {
      title: 'Multiline',
      preview: <FieldDemo multiline />,
      code: `<Field label="Message" multiline value={msg} onChange={setMsg} />`,
    },
    {
      title: 'Error and success',
      preview: <ValidateDemo />,
      code: `<Field
  label="Email"
  type="email"
  value={email}
  onChange={setEmail}
  error={submitted && !valid ? 'That does not look like an email.' : undefined}
  success={submitted && valid}
/>`,
    },
  ],
  props: [
    { name: 'label', type: 'string', description: 'Visible label, linked to the input.' },
    { name: 'value', type: 'string', description: 'Controlled value.' },
    { name: 'onChange', type: '(value: string) => void', description: 'Called with the new text.' },
    { name: 'multiline', type: 'boolean', default: 'false', description: 'Render a textarea.' },
    { name: 'type', type: "'text' | 'email' | 'password' | 'search' | 'tel' | 'url'", default: "'text'", description: 'Input type.' },
    { name: 'error', type: 'ReactNode', description: 'Marks the field invalid and shakes it when it appears or changes. Text is shown as the message below.' },
    { name: 'success', type: 'boolean', default: 'false', description: 'Pops a check into the box.' },
    { name: 'errorSfx', type: 'string | false', default: "'ダメ!'", description: 'Lettering when it turns invalid (also on native required/type failures).' },
    { name: 'placeholder / name / required', type: 'string / string / boolean', description: 'Passed to the native element.' },
  ],
} satisfies DocEntry
