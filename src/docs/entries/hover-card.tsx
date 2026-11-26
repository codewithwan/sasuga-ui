import { Mascot, MASCOT_NAME } from '@/components/art/mascot'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HoverCard } from '@/components/ui/hover-card'
import type { DocEntry } from '../types'

function KomaCard() {
  return (
    <div className="grid w-[min(260px,calc(100vw-48px))] gap-3">
      <div className="flex items-center gap-3">
        <span className="ui-pill ui-border-thin grid size-14 shrink-0 place-items-center overflow-hidden bg-accent-soft">
          <Mascot expression="happy" animated={false} className="size-14" />
        </span>
        <div className="min-w-0">
          <p className="ui-head m-0 text-lg leading-tight">{MASCOT_NAME}</p>
          <p className="m-0 text-[13px] text-mute">Lead animator · Lv. 42</p>
        </div>
      </div>
      <p className="m-0 text-sm leading-snug">Draws every impact frame by hand. Will redraw yours if you ask nicely.</p>
      <div className="flex flex-wrap gap-2">
        <Badge>Animator</Badge>
        <Badge>Lettering</Badge>
      </div>
    </div>
  )
}

const trigger = 'font-bold text-accent underline decoration-2 underline-offset-4 focus-visible:ui-focus'

export default {
  slug: 'hover-card',
  name: 'Hover Card',
  jp: 'ホバーカード',
  category: 'Overlay',
  description:
    'A rich card that opens when you hover or focus its trigger. It pops out of the trigger with a squash and a tiny burst (a calm rise in flat), flips and shifts to stay on screen, and shrinks away when you leave. Touch: tap to open, tap again to follow the link, tap outside to close. Esc closes.',
  preview: (
    <p className="m-0 text-center text-[15px] font-semibold text-ink">
      Animated by{' '}
      <HoverCard content={<KomaCard />}>
        <a href="#koma" className={trigger}>
          @{MASCOT_NAME.toLowerCase()}
        </a>
      </HoverCard>
      .
    </p>
  ),
  usage: `import { HoverCard } from '@/components/ui/hover-card'

<HoverCard content={<ProfileCard />}>
  <a href="/koma">@koma</a>
</HoverCard>`,
  examples: [
    {
      title: 'Sides and alignment',
      preview: (
        <div className="flex flex-wrap items-center justify-center gap-6 py-10">
          <HoverCard side="top" align="start" content={<p className="m-0 max-w-[220px] text-sm">Top, aligned to the start of the trigger.</p>}>
            <Button size="sm" sfx={false}>
              Top start
            </Button>
          </HoverCard>
          <HoverCard side="right" content={<p className="m-0 max-w-[220px] text-sm">Right, centred. Flips left when there is no room.</p>}>
            <Button size="sm" variant="accent" sfx={false}>
              Right
            </Button>
          </HoverCard>
          <HoverCard side="bottom" align="end" content={<p className="m-0 max-w-[220px] text-sm">Bottom, aligned to the end.</p>}>
            <Button size="sm" sfx={false}>
              Bottom end
            </Button>
          </HoverCard>
        </div>
      ),
      code: `<HoverCard side="top" align="start" content={…}><Button>Top start</Button></HoverCard>
<HoverCard side="right" content={…}><Button>Right</Button></HoverCard>
<HoverCard side="bottom" align="end" content={…}><Button>Bottom end</Button></HoverCard>`,
    },
    {
      title: 'Snappy delays',
      preview: (
        <HoverCard openDelay={0} closeDelay={80} content={<p className="m-0 max-w-[220px] text-sm">No wait at all. Good for dense lists.</p>}>
          <a href="#instant" className={trigger}>
            Instant
          </a>
        </HoverCard>
      ),
      code: `<HoverCard openDelay={0} closeDelay={80} content="No wait at all.">
  <a href="#">Instant</a>
</HoverCard>`,
    },
  ],
  props: [
    { name: 'content', type: 'ReactNode', description: 'The card body. It can hold links and buttons.' },
    { name: 'children', type: 'ReactElement', description: 'One trigger, usually a link. It gets aria-expanded and, while open, aria-describedby.' },
    { name: 'side', type: "'top' | 'bottom' | 'left' | 'right'", default: "'bottom'", description: 'Preferred side. Flips to the opposite side when it does not fit.' },
    { name: 'align', type: "'start' | 'center' | 'end'", default: "'center'", description: 'Alignment along the trigger. Shifts to stay on screen.' },
    { name: 'openDelay', type: 'number', default: '320', description: 'ms of hover before it opens (keyboard focus waits at most 150).' },
    { name: 'closeDelay', type: 'number', default: '200', description: 'ms after leaving the trigger and the card before it closes.' },
    { name: 'offset', type: 'number', default: '10', description: 'Gap between trigger and card, in px.' },
    { name: 'onOpenChange', type: '(open: boolean) => void', description: 'Called when it opens or closes.' },
    { name: 'className', type: 'string', description: 'Extra classes for the card surface.' },
  ],
} satisfies DocEntry
