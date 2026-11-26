import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import type { DocEntry } from '../types'

export default {
  slug: 'tooltip',
  name: 'Tooltip',
  jp: 'ツールチップ',
  category: 'Overlay',
  description:
    'A small sticker bubble with a tail. On hover or keyboard focus it pops out of its trigger: squashed flat, it stretches out past its size, wobbles to rest, and a tiny burst marks where it left. Hides on Esc, blur or leave.',
  preview: (
    <Tooltip content="Adds an impact frame on click.">
      <Button variant="paper" sfx="ポン">
        Hover me
      </Button>
    </Tooltip>
  ),
  usage: `import { Tooltip } from '@/components/ui/tooltip'

<Tooltip content="Adds an impact frame on click.">
  <Button>Hover me</Button>
</Tooltip>`,
  examples: [
    {
      title: 'Sides',
      preview: (
        <div className="flex flex-wrap items-center justify-center gap-10 py-10">
          <Tooltip content="Up here!" side="top">
            <Button size="sm" sfx={false}>
              Top
            </Button>
          </Tooltip>
          <Tooltip content="Down here!" side="bottom">
            <Button size="sm" variant="accent" sfx={false}>
              Bottom
            </Button>
          </Tooltip>
        </div>
      ),
      code: `<Tooltip content="Up here!" side="top"><Button>Top</Button></Tooltip>
<Tooltip content="Down here!" side="bottom"><Button>Bottom</Button></Tooltip>`,
    },
    {
      title: 'On a link',
      preview: (
        <p className="m-0 text-center text-[15px] font-semibold text-ink">
          Built by{' '}
          <Tooltip content="Fullstack dev and security researcher">
            <a href="https://github.com/codewithwan" target="_blank" rel="noreferrer" className="font-bold text-accent underline decoration-2 underline-offset-4">
              codewithwan
            </a>
          </Tooltip>
          .
        </p>
      ),
      code: `<Tooltip content="Fullstack dev and security researcher">
  <a href="https://github.com/codewithwan">codewithwan</a>
</Tooltip>`,
    },
  ],
  props: [
    { name: 'content', type: 'ReactNode', description: 'What the bubble says.' },
    { name: 'children', type: 'ReactElement', description: 'One focusable trigger; it receives aria-describedby.' },
    { name: 'side', type: "'top' | 'bottom'", default: "'top'", description: 'Where the bubble appears.' },
    { name: 'className', type: 'string', description: 'Extra classes for the bubble.' },
  ],
} satisfies DocEntry
