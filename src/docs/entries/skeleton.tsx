import { useState } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton, SkeletonSwap } from '@/components/ui/skeleton'
import type { DocEntry } from '../types'

const Placeholder = () => (
  <div className="flex items-center gap-4">
    <Skeleton className="size-14 shrink-0 rounded-full" />
    <div className="grid flex-1 gap-2.5">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
    </div>
  </div>
)

function SwapDemo() {
  const [loading, setLoading] = useState(true)
  return (
    <div className="grid w-[min(100%,340px)] gap-5">
      <SkeletonSwap loading={loading} fallback={<Placeholder />} className="ui-card p-4">
        <div className="flex items-center gap-4">
          <Avatar alt="Mio Aoyama" fallback="MA" status="online" />
          <div className="grid gap-1">
            <span className="ui-head text-lg leading-none">Mio Aoyama</span>
            <span className="text-sm text-mute">Effects animator</span>
          </div>
        </div>
      </SkeletonSwap>
      <Button size="sm" sfx={false} className="justify-self-center" onClick={() => setLoading((v) => !v)}>
        {loading ? 'Finish loading' : 'Load again'}
      </Button>
    </div>
  )
}

export default {
  slug: 'skeleton',
  name: 'Skeleton',
  jp: 'スケルトン',
  category: 'Feedback',
  description:
    'Soft placeholder blocks with drifting lines and a shimmer sweep while content loads. Size them with className. Wrap the swap in SkeletonSwap and the real content pops in with a flash, an overshoot and a small burst when loading ends.',
  preview: (
    <div className="flex w-[min(100%,340px)] items-center gap-4">
      <Skeleton className="size-14 shrink-0" />
      <div className="grid flex-1 gap-2.5">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  ),
  usage: `import { Skeleton, SkeletonSwap } from '@/components/ui/skeleton'

<Skeleton className="h-5 w-3/4" />

<SkeletonSwap loading={loading} fallback={<Skeleton className="h-20" />}>
  <ProfileCard />
</SkeletonSwap>`,
  examples: [
    {
      title: 'Pop the content in',
      preview: <SwapDemo />,
      code: `<SkeletonSwap loading={loading} fallback={<Placeholder />} className="ui-card p-4">
  <Profile />
</SkeletonSwap>`,
    },
    {
      title: 'On dark backgrounds',
      preview: (
        <div className="ui-r-lg grid w-[min(100%,340px)] gap-2.5 bg-ink p-5">
          <Skeleton tone="ink" className="h-28" />
          <Skeleton tone="ink" className="h-5 w-2/3" />
          <Skeleton tone="ink" className="h-4" />
        </div>
      ),
      code: `<div className="bg-ink p-5">
  <Skeleton tone="ink" className="h-28" />
  <Skeleton tone="ink" className="h-5 w-2/3" />
</div>`,
    },
  ],
  props: [
    { name: 'tone', type: "'paper' | 'ink'", default: "'paper'", description: 'Use ink on dark backgrounds.' },
    { name: 'className', type: 'string', description: 'Set width and height here (defaults to h-4 w-full).' },
    { name: '<SkeletonSwap>', type: '{ loading; fallback; children; burst?; className? }', description: 'Shows fallback while loading; when it flips to false the content squashes in from a flash, its direct children land in a stagger and a small burst marks it (burst={false} to skip).' },
  ],
} satisfies DocEntry
