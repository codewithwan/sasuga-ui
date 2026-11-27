import { Spin, Spinner } from '@/components/ui/spinner'
import type { SpinnerVariant } from '@/components/ui/spinner'
import type { DocEntry } from '../types'

const TYPES: SpinnerVariant[] = ['ring', 'dots', 'orbit', 'shuriken', 'pulse', 'bars', 'flip', 'clock', 'kanji', 'chase', 'burst']

const Sticker = ({ children }: { children: string }) => (
  <span className="ui-border ui-r-sm ui-fill ui-shadow-sm grid size-12 place-items-center bg-accent font-jp text-xl text-white">{children}</span>
)

export default {
  slug: 'spinner',
  name: 'Spinner',
  jp: 'スピナー',
  category: 'Feedback',
  description:
    'A loader with eleven kinds of motion: a stepped ring, hopping dots, orbiting sparkles, a shuriken with afterimages, rippling rings, an equalizer, a flipping card, a sweeping clock, popping kanji, chasing dots and turning impact rays. Each adapts to the style (manga steps its turns like limited animation, flat calms down), takes a speed and a size, and announces itself as role="status". Spin makes anything turn.',
  preview: (
    <div className="grid grid-cols-4 place-items-center gap-x-5 gap-y-4">
      {TYPES.map((v) => (
        <Spinner key={v} variant={v} label={false} srLabel={`Loading (${v})`} />
      ))}
    </div>
  ),
  usage: `import { Spinner } from '@/components/ui/spinner'

<Spinner variant="shuriken" label="読込中" srLabel="Loading projects" />`,
  examples: [
    {
      title: 'All types',
      preview: (
        <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-4">
          {TYPES.map((v) => (
            <div key={v} className="ui-border-thin ui-r grid place-items-center gap-3 bg-paper px-3 pt-5 pb-3">
              <Spinner variant={v} size="lg" label={false} srLabel={`Loading (${v})`} />
              <code className="font-mono text-xs text-mute">{v}</code>
            </div>
          ))}
        </div>
      ),
      code: `${TYPES.map((v) => `<Spinner variant="${v}" size="lg" label={false} />`).join('\n')}`,
    },
    {
      title: 'Sizes',
      preview: (
        <div className="flex flex-wrap items-center justify-center gap-8">
          <Spinner size="sm" label={false} />
          <Spinner size="md" variant="chase" />
          <Spinner size="lg" variant="shuriken" label="LOADING" />
          <Spinner size="xl" variant="kanji" />
          <Spinner size={52} variant="burst" label={false} />
        </div>
      ),
      code: `<Spinner size="sm" label={false} />
<Spinner size="md" variant="chase" />
<Spinner size="lg" variant="shuriken" label="LOADING" />
<Spinner size="xl" variant="kanji" />
<Spinner size={52} variant="burst" label={false} />`,
    },
    {
      title: 'Speed',
      preview: (
        <div className="flex flex-wrap items-center justify-center gap-10">
          <Spinner variant="clock" speed={0.5} label="ゆっくり" />
          <Spinner variant="clock" label="普通" />
          <Spinner variant="clock" speed={2.5} label="速い" />
        </div>
      ),
      code: `<Spinner variant="clock" speed={0.5} label="ゆっくり" />
<Spinner variant="clock" label="普通" />
<Spinner variant="clock" speed={2.5} label="速い" />`,
    },
    {
      title: 'Kanji glyphs',
      preview: (
        <div className="flex flex-wrap items-center justify-center gap-10">
          <Spinner variant="kanji" size="lg" />
          <Spinner variant="kanji" size="lg" glyphs="待機中" label="STANDBY" />
          <Spinner variant="kanji" size="lg" glyphs="壱弐参" speed={1.5} />
        </div>
      ),
      code: `<Spinner variant="kanji" size="lg" />
<Spinner variant="kanji" size="lg" glyphs="待機中" label="STANDBY" />
<Spinner variant="kanji" size="lg" glyphs="壱弐参" speed={1.5} />`,
    },
    {
      title: 'Spin anything',
      preview: (
        <div className="flex flex-wrap items-center justify-center gap-8">
          <Spin>
            <Sticker>回</Sticker>
          </Spin>
          <Spin mode="steps" steps={8} speed={0.6} direction="ccw">
            <Sticker>歩</Sticker>
          </Spin>
          <Spin mode="wobble">
            <Sticker>揺</Sticker>
          </Spin>
          <Spin mode="bounce">
            <Sticker>跳</Sticker>
          </Spin>
          <Spin mode="flip">
            <Sticker>裏</Sticker>
          </Spin>
        </div>
      ),
      code: `import { Spin } from '@/components/ui/spinner'

<Spin><Sticker /></Spin>
<Spin mode="steps" steps={8} speed={0.6} direction="ccw"><Sticker /></Spin>
<Spin mode="wobble"><Sticker /></Spin>
<Spin mode="bounce"><Sticker /></Spin>
<Spin mode="flip"><Sticker /></Spin>`,
    },
  ],
  props: [
    { name: 'variant', type: TYPES.map((t) => `'${t}'`).join(' | '), default: "'ring'", description: 'Kind of motion. All of them follow the active style.' },
    { name: 'size', type: "'sm' | 'md' | 'lg' | 'xl' | number", default: "'md'", description: 'Preset (24 / 40 / 64 / 96px) or the glyph size in px.' },
    { name: 'speed', type: 'number', default: '1', description: 'Playback multiplier; 2 is twice as fast. Can change live.' },
    { name: 'label', type: 'string | false', default: "'読込中' (none for kanji)", description: 'Visible caption; its letters wave. false hides it.' },
    { name: 'srLabel', type: 'string', default: "'Loading'", description: 'Text announced to screen readers (role="status").' },
    { name: 'glyphs', type: 'string', default: "'読込中'", description: 'Characters the kanji variant cycles through.' },
    { name: 'Spin · mode', type: "'spin' | 'steps' | 'wobble' | 'bounce' | 'flip'", default: "'spin'", description: 'spin and steps are CSS; wobble, bounce and flip are Web Animations.' },
    { name: 'Spin · speed / direction', type: "number / 'cw' | 'ccw'", default: "1 / 'cw'", description: 'Loops per second and turn direction.' },
    { name: 'Spin · steps / paused', type: 'number / boolean', default: '8 / false', description: 'Frame count for steps mode; pause the loop.' },
  ],
} satisfies DocEntry
