import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { DocEntry } from '../types'

function ProgressDemo() {
  const [value, setValue] = useState(35)
  return (
    <div className="grid w-[min(100%,360px)] justify-items-start gap-6">
      <Progress value={value} label="Download" showValue />
      <Button size="sm" variant="accent" sfx={value >= 100 ? 'リセット' : 'グッ'} onClick={() => setValue((v) => (v >= 100 ? 0 : Math.min(100, v + 25)))}>
        {value >= 100 ? 'Reset' : '+25%'}
      </Button>
    </div>
  )
}

export default {
  slug: 'progress',
  name: 'Progress',
  jp: 'プログレス',
  category: 'Feedback',
  description:
    'A game-feel progress bar. The value bubble rides the tip, each step streaks speed lines and kicks up dust, every quarter sparks. At 100 the bar flashes and squashes, a big check draws itself, and a Complete sticker lands with lettering.',
  preview: <ProgressDemo />,
  usage: `import { Progress } from '@/components/ui/progress'

<Progress value={60} label="Download" showValue />`,
  examples: [
    {
      title: 'Bare and full',
      preview: (
        <div className="grid w-[min(100%,360px)] gap-5">
          <Progress value={40} aria-label="Level progress" />
          <Progress value={100} label="Upload" />
        </div>
      ),
      code: `<Progress value={40} aria-label="Level progress" />
<Progress value={100} label="Upload" />`,
    },
  ],
  props: [
    { name: 'value', type: 'number', description: 'Required. 0–100; clamped.' },
    { name: 'label', type: 'string', description: 'Shown above the bar and used as the accessible name.' },
    { name: 'showValue', type: 'boolean', default: 'false', description: 'Rides a percentage bubble on the tip of the fill.' },
    { name: 'sfx', type: 'string | false', default: "'完了!'", description: 'Lettering when it reaches 100.' },
    { name: 'doneLabel', type: 'string | false', default: "'Complete'", description: 'Sticker that lands next to the label at 100.' },
    { name: '...props', type: 'HTMLAttributes<HTMLDivElement>', description: 'Passed to the role="progressbar" wrapper.' },
  ],
} satisfies DocEntry
