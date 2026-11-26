import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import type { ToastOptions } from '@/components/ui/use-toast'
import type { DocEntry } from '../types'

type DemoProps = ToastOptions & { message?: string; label?: string; button?: 'accent' | 'pop' | 'ink' }

function ToastDemo({ message = 'Changes saved', label = 'Save', button = 'accent', ...opts }: DemoProps) {
  const toast = useToast()
  return (
    <Button variant={button} sfx={false} onClick={() => toast(message, { sfx: 'セーブ!', ...opts })}>
      {label}
    </Button>
  )
}

export default {
  slug: 'toast',
  name: 'Toast',
  jp: '通知',
  category: 'Feedback',
  description:
    'A card that slams in from the edge with speed lines, a burst and lettering, then leaves when its timer bar drains (hovering pauses it). Toasts stack on a spring and re-flow when one leaves; swipe or fling one sideways, or hit its close button, to dismiss. Wrap the app in <Toaster> once.',
  preview: <ToastDemo />,
  usage: `import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/components/ui/use-toast'

// once, near the root
<Toaster><App /></Toaster>

// anywhere inside
const toast = useToast()
toast('Changes saved', { sfx: 'セーブ!' })
toast('Connection lost', { variant: 'danger', duration: 6000 })`,
  examples: [
    {
      title: 'Variants',
      preview: (
        <div className="flex flex-wrap items-center justify-center gap-4">
          <ToastDemo label="Success" message="Render complete" sfx="完成!" variant="success" />
          <ToastDemo label="Danger" message="Connection lost" sfx="危険!" variant="danger" button="pop" />
          <ToastDemo label="Quiet" message="Draft stored" sfx={false} button="ink" />
        </div>
      ),
      code: `toast('Render complete', { sfx: '完成!', variant: 'success' })
toast('Connection lost', { sfx: '危険!', variant: 'danger' })
toast('Draft stored', { sfx: false })`,
    },
    {
      title: 'Long timer (try swiping it away)',
      preview: <ToastDemo label="Show for 8s" message="Swipe me away" sfx="シュッ" duration={8000} />,
      code: `toast('Swipe me away', { sfx: 'シュッ', duration: 8000 })`,
    },
  ],
  props: [
    { name: 'toast(message, opts?)', type: '(message: string, opts?: ToastOptions) => void', description: 'Shows a toast. Up to three stack; a fourth flings the oldest out.' },
    { name: 'opts.sfx', type: 'string | false', default: "'ポン!'", description: 'Lettering that lands with it (cel/manga).' },
    { name: 'opts.duration', type: 'number', default: '3200', description: 'Milliseconds the timer bar takes to drain.' },
    { name: 'opts.variant', type: "'info' | 'success' | 'danger'", default: "'info'", description: 'Dot and timer colour; danger also shakes on landing.' },
    { name: '<Toaster>', type: '{ children: ReactNode }', description: 'Provider that renders the toast stack (aria-live="polite").' },
  ],
} satisfies DocEntry
