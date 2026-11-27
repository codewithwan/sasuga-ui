import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import type { DocEntry } from '../types'

function ShowDemo() {
  const [n, setN] = useState(0)
  return (
    <div className="grid w-[min(100%,420px)] justify-items-center gap-5">
      {n > 0 && (
        <Alert key={n} variant="danger" animate dismissible className="w-full">
          <AlertTitle>Unsaved changes</AlertTitle>
          <AlertDescription>Save your work before leaving this page.</AlertDescription>
        </Alert>
      )}
      <Button size="sm" variant={n ? 'paper' : 'accent'} sfx={false} icon={<Icon name="bell" tone="line" size={16} />} onClick={() => setN((v) => v + 1)}>
        {n ? 'Show again' : 'Show alert'}
      </Button>
    </div>
  )
}

function VariantsDemo() {
  const [n, setN] = useState(0)
  return (
    <div className="grid w-[min(100%,440px)] gap-7">
      <div key={n} className="grid gap-7">
        <Alert variant="info" animate={n > 0}>
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>New chapter unlocked tomorrow.</AlertDescription>
        </Alert>
        <Alert variant="success" from="right" animate={n > 0}>
          <AlertTitle>Export finished</AlertTitle>
          <AlertDescription>Your clip is ready to download.</AlertDescription>
        </Alert>
        <Alert variant="danger" animate={n > 0}>
          <AlertTitle>Storage almost full</AlertTitle>
          <AlertDescription>Free up space before the next upload.</AlertDescription>
        </Alert>
      </div>
      <Button size="sm" sfx={false} className="justify-self-center" icon={<Icon name="play" tone="line" size={16} />} onClick={() => setN((v) => v + 1)}>
        Play entrances
      </Button>
    </div>
  )
}

function DismissDemo() {
  const [shown, setShown] = useState(1)
  return (
    <div className="grid w-[min(100%,420px)] justify-items-center gap-5">
      {shown ? (
        <Alert key={shown} variant="danger" animate={shown > 1} onDismiss={() => setShown(0)} className="w-full">
          <AlertTitle>Connection lost</AlertTitle>
          <AlertDescription>Hit the close button to fling this away.</AlertDescription>
        </Alert>
      ) : (
        <Button size="sm" variant="accent" sfx={false} onClick={() => setShown(2)}>
          Bring it back
        </Button>
      )}
    </div>
  )
}

export default {
  slug: 'alert',
  name: 'Alert',
  jp: 'アラート',
  category: 'Feedback',
  description:
    'A callout card with a round icon sticker and a small Japanese tag in the corner (hidden in flat). It is static by default. With `animate` it slams in from the side on mount, trailing speed lines, the icon sticker pops with a burst and danger alerts shake on contact; the close button flings it off screen.',
  preview: <ShowDemo />,
  usage: `import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

<Alert variant="danger" animate onDismiss={() => setShown(false)}>
  <AlertTitle>Unsaved changes</AlertTitle>
  <AlertDescription>Save your work first.</AlertDescription>
</Alert>`,
  examples: [
    {
      title: 'Variants',
      preview: <VariantsDemo />,
      code: `<Alert variant="info">…</Alert>
<Alert variant="success" from="right" animate>…</Alert>
<Alert variant="danger" animate>…</Alert>`,
    },
    {
      title: 'Dismissible',
      preview: <DismissDemo />,
      code: `{shown && (
  <Alert variant="danger" animate onDismiss={() => setShown(false)}>
    <AlertTitle>Connection lost</AlertTitle>
    <AlertDescription>Hit the close button to fling this away.</AlertDescription>
  </Alert>
)}`,
    },
    {
      title: 'Custom tag',
      preview: (
        <Alert variant="success" sfx="やった!" className="w-[min(100%,420px)]">
          <AlertTitle>Deployed</AlertTitle>
          <AlertDescription>Your site is live.</AlertDescription>
        </Alert>
      ),
      code: `<Alert variant="success" sfx="やった!">
  <AlertTitle>Deployed</AlertTitle>
  <AlertDescription>Your site is live.</AlertDescription>
</Alert>`,
    },
  ],
  props: [
    { name: 'variant', type: "'info' | 'success' | 'danger'", default: "'info'", description: 'Icon and tag colours. danger uses role="alert" and shakes on landing; the others use role="status".' },
    { name: 'sfx', type: 'string | false', default: '注意 / 成功 / 危険', description: 'Corner tag. false hides it.' },
    { name: 'from', type: "'left' | 'right'", default: "'left'", description: 'Side it slams in from (it is flung out the other way).' },
    { name: 'onDismiss', type: '() => void', description: 'Shows a close button; called after the fling-out. Unmount the alert here.' },
    { name: 'dismissible', type: 'boolean', default: 'false', description: 'Shows the close button without a callback; the alert hides itself.' },
    { name: 'animate', type: 'boolean', default: 'false', description: 'Slam in on mount, for alerts shown in response to an action. Without it the alert is static.' },
    { name: 'animateOnMount', type: 'boolean', default: 'false', description: 'Deprecated alias of animate.' },
    { name: '...props', type: 'HTMLAttributes<HTMLDivElement>', description: 'Passed to the panel.' },
  ],
} satisfies DocEntry
