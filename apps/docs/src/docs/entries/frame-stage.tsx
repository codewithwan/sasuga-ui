import { FrameControls } from '@/components/site/FrameControls'
import { FrameStage } from '@/components/ui/frame-stage'
import { KineticType } from '@/components/ui/kinetic-type'
import type { DocEntry } from '../types'

function Composition({ width, height }: { width: number; height: number }) {
  const tall = height > width
  return (
    <div className="grid h-full w-full place-items-center bg-ink p-[5%] text-paper">
      <div className="grid h-full w-full place-items-center">
        <KineticType
          text={tall ? 'One *frame*,\nany shape.\nDesign at\nreal pixels.' : 'One *frame*, any shape.\nDesign at real pixels.'}
          width={Math.round(width * 0.86)}
          height={Math.round(height * 0.6)}
          fit="box"
          align="center"
          valign="middle"
          wordStyle="block"
        />
      </div>
      <span className="absolute right-[3%] bottom-[3%] font-mono text-[28px] text-paper/60">
        {width} × {height}
      </span>
    </div>
  )
}

export default {
  slug: 'frame-stage',
  name: 'Frame Stage',
  jp: 'フレーム',
  category: 'Layout',
  description:
    'A fixed-resolution frame for video-style motion. Lay a composition out at the real video size (1920 × 1080, 1080 × 1920, 1080 × 1080, 1080 × 1350 or any width and height) and the frame scales it down to fit the page, so what you see is the final shot at every screen size. Motion components inside fill it with h-full w-full, and their cameras and type adapt to the frame shape.',
  preview: (
    <div className="w-full max-w-[720px]">
      <FrameControls initial="16:9" maxHeight="min(60svh, 520px)">
        {(size) => <Composition {...size} />}
      </FrameControls>
    </div>
  ),
  usage: `import { FrameStage } from '@/components/ui/frame-stage'

<FrameStage width={1080} height={1920} maxHeight="70svh">
  <CodeReel lines={lines} className="aspect-auto h-full" />
</FrameStage>`,
  examples: [
    {
      title: 'A vertical short',
      preview: (
        <FrameStage width={1080} height={1920} maxHeight="min(60svh, 520px)" frameClassName="ui-r">
          <Composition width={1080} height={1920} />
        </FrameStage>
      ),
      code: `<FrameStage width={1080} height={1920} frameClassName="rounded-xl">
  <MyComposition />
</FrameStage>`,
    },
  ],
  props: [
    { name: 'width / height', type: 'number', description: 'The frame in logical pixels: the resolution you design at.' },
    { name: 'maxHeight', type: 'string', default: "'70svh'", description: 'The tallest the frame may get on screen; it also never exceeds the available width.' },
    { name: 'frameClassName', type: 'string', description: 'Classes for the frame itself (radius, border, background).' },
    { name: 'className', type: 'string', description: 'Classes for the outer box, which takes the available width.' },
    { name: 'children', type: 'ReactNode', description: 'The composition, laid out at exactly width × height.' },
  ],
} satisfies DocEntry
