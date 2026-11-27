import { useRef, useState } from 'react'
import type { ComponentProps } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { FxScreen } from '@/components/ui/fx-screen'
import type { FxScreenHandle } from '@/components/ui/fx-screen'
import { Icon } from '@/components/ui/icon'
import { Mascot } from '@/components/art/mascot'
import type { DocEntry } from '../types'

/** A 16:9 stage that stays still until Play is pressed. */
function Stage(props: Omit<ComponentProps<typeof FxScreen>, 'play'>) {
  const [play, setPlay] = useState(false)
  return (
    <div className="grid w-full max-w-xl justify-items-center gap-4">
      <div className="ui-border ui-r-lg ui-tone relative grid aspect-video w-full grid-cols-[1fr_auto] items-end overflow-hidden bg-canvas">
        <p className="ui-head m-0 self-center px-[6%] text-[clamp(14px,3.6vw,22px)] leading-tight text-ink">The page behind the screen</p>
        <Mascot expression="surprised" animated={false} className="h-[82%] w-auto" />
        <FxScreen {...props} play={play} />
      </div>
      <Button
        size="sm"
        variant={play ? 'paper' : 'accent'}
        sfx={false}
        icon={<Icon name={play ? 'pause' : 'play'} tone="line" size={16} />}
        onClick={() => setPlay((p) => !p)}
      >
        {play ? 'Pause' : 'Play'}
      </Button>
    </div>
  )
}

function HitDemo() {
  const screen = useRef<FxScreenHandle>(null)
  const [hits, setHits] = useState(0)
  return (
    <div className="grid w-full max-w-xl justify-items-center gap-4">
      <div className="ui-border ui-r-lg relative aspect-video w-full overflow-hidden">
        <FxScreen ref={screen} effect="impact" background="paper" trigger="click" text="ドン" onHit={() => setHits((n) => n + 1)} />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="sm" variant="accent" sfx={false} onClick={() => screen.current?.hit([0.3, 0.55])}>
          ref.hit()
        </Button>
        <span className="text-sm text-mute tabular-nums">Hits: {hits} — or click the screen</span>
      </div>
    </div>
  )
}

export default {
  slug: 'fx-screen',
  name: 'FX Screen',
  jp: 'エフェクト画面',
  category: 'Motion',
  description:
    'A self-contained screen of fast anime effects that fills its parent: speed lines, focus lines, impact frames, flash cuts, sparkle rain or a slash storm, with lettering that slams in on each hit. It draws on its own canvas (not the page-wide FX layer), so it embeds anywhere; it pauses off-screen, shows a calm still frame with reduced motion or play={false}, and caps flashes at three per second.',
  preview: <Stage effect="speed-lines" angle={-12} intensity={0.8} />,
  usage: `import { FxScreen } from '@/components/ui/fx-screen'

// fills its positioned parent
<div className="relative aspect-video">
  <FxScreen effect="impact" text="ドン" />
</div>`,
  examples: [
    {
      title: 'Impact with lettering, on an interval',
      preview: <Stage effect="impact" trigger="interval" interval={1400} text="ドン" background="paper" />,
      code: `<FxScreen effect="impact" trigger="interval" interval={1400} text="ドン" background="paper" />`,
    },
    {
      title: 'Focus lines on an off-centre subject',
      preview: <Stage effect="focus-lines" color="ink" center={[0.78, 0.6]} intensity={0.9} />,
      code: `<FxScreen effect="focus-lines" color="ink" center={[0.78, 0.6]} intensity={0.9} />`,
    },
    {
      title: 'Flash cut without full-frame flashes',
      preview: <Stage effect="flash-cut" flashes={false} text="バン" speed={1.2} />,
      code: `// flashes never exceed 3 per second; flashes={false} keeps the cut without flashing
<FxScreen effect="flash-cut" flashes={false} text="バン" speed={1.2} />`,
    },
    {
      title: 'Sparkle rain and slash storm',
      preview: (
        <div className="grid w-full gap-6 min-[720px]:grid-cols-2">
          <Stage effect="sparkle-rain" color="pop" />
          <Stage effect="slash-storm" intensity={0.6} background="ink" color="accent" />
        </div>
      ),
      code: `<FxScreen effect="sparkle-rain" color="pop" />
<FxScreen effect="slash-storm" intensity={0.6} background="ink" />`,
    },
    {
      title: 'Click trigger and ref.hit()',
      preview: <HitDemo />,
      code: `const screen = useRef<FxScreenHandle>(null)

<FxScreen ref={screen} effect="impact" trigger="click" text="ドン" onHit={() => setHits((n) => n + 1)} />
<Button onClick={() => screen.current?.hit([0.3, 0.55])}>Hit</Button>`,
    },
    {
      title: 'As an embed (iframe, OBS, Notion)',
      preview: (
        <p className="m-0 max-w-[48ch] text-center text-sm text-mute">
          The same screen lives at <code className="font-mono text-accent">/embed/fx</code>, configured from its URL. Build one in the{' '}
          <Link to="/docs/embed" className="font-bold text-accent">
            Embed guide
          </Link>
          .
        </p>
      ),
      code: `<iframe src="https://…/embed/fx/?effect=impact&amp;text=%E3%83%89%E3%83%B3&amp;background=transparent"
  title="Animated FX screen" style="width:100%;aspect-ratio:16/9;border:0;color-scheme:normal"
  sandbox="allow-scripts allow-same-origin" loading="lazy"></iframe>`,
    },
  ],
  props: [
    { name: 'effect', type: "'speed-lines' | 'focus-lines' | 'impact' | 'flash-cut' | 'sparkle-rain' | 'slash-storm'", default: "'speed-lines'", description: 'What plays. Speed lines stream past; focus lines converge and pulse on the centre; impact throws a burst, shards, a ring and shakes the screen; flash cut alternates hard ink and accent frames like a fast edit; sparkle rain falls; slash storm swipes blades across.' },
    { name: 'intensity', type: 'number', default: '0.7', description: '0..1: density, size and shake.' },
    { name: 'speed', type: 'number', default: '1', description: 'Time multiplier for everything on the screen (0.25..3).' },
    { name: 'color', type: "'accent' | 'pop' | 'ink' | 'paper'", default: "'accent'", description: 'Effect colour from the theme tokens; a second tone for depth is picked to match.' },
    { name: 'background', type: "'transparent' | 'paper' | 'ink' | 'canvas'", default: "'transparent'", description: 'What the screen sits on. transparent lets the page (or an OBS scene) show through.' },
    { name: 'trigger', type: "'loop' | 'click' | 'interval'", default: "'loop'", description: "What fires the hits: the effect's own beat, a click / Enter on the screen, or every interval ms. The field between hits always runs." },
    { name: 'interval', type: 'number', default: '1200', description: 'ms between hits with trigger="interval".' },
    { name: 'text', type: 'string', description: 'Lettering that slams in on each hit (cel and manga; flat fades in a calm word).' },
    { name: 'center', type: '[x: number, y: number]', default: '[0.5, 0.5]', description: 'Where hits land and lines converge, as 0..1 of the screen.' },
    { name: 'angle', type: 'number', default: '0', description: 'Speed-line direction in degrees.' },
    { name: 'play', type: 'boolean', default: 'true', description: 'false shows a calm still frame. Reduced motion always does.' },
    { name: 'flashes', type: 'boolean', default: 'true', description: 'flash-cut only: false keeps the cut without full-frame flashes. Flashes are capped at 3 per second either way.' },
    { name: 'onHit', type: '() => void', description: 'Called on every hit (also from ref.hit() and clicks).' },
    { name: 'ref', type: 'Ref<FxScreenHandle>', description: 'ref.current.hit(at?) plays one hit now, at [x, y] (0..1) or the centre. Does nothing visible while paused.' },
    { name: 'label', type: 'string', description: 'Accessible name (role img, or button with trigger="click"). Default: the effect name and the text.' },
    { name: 'className', type: 'string', description: 'Extra classes for the screen (it is absolute inset-0).' },
  ],
} satisfies DocEntry
