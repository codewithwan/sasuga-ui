import { Reveal } from '@/components/ui/reveal'
import type { DocEntry } from '../types'
import { PlayGate } from '../play-gate'

const chip = 'ui-head ui-border ui-pill ui-shadow-sm inline-block px-4 py-2 text-xl leading-none'

function ImpactDemo() {
  return (
    <PlayGate>
      {(n) => (
        <div key={n} className="flex flex-wrap justify-center gap-5">
          <Reveal variant="impact" from="left" show={n > 0}>
            <span className={`${chip} bg-paper`}>Left</span>
          </Reveal>
          <Reveal variant="impact" from="down" delay={180} show={n > 0}>
            <span className={`${chip} bg-paper`}>Drop</span>
          </Reveal>
          <Reveal variant="impact" from="zoom" delay={360} sfx="ドン!" show={n > 0}>
            <span className={`${chip} ui-fill bg-pop text-white`}>Slam</span>
          </Reveal>
        </div>
      )}
    </PlayGate>
  )
}

function SlideDemo() {
  return (
    <PlayGate>
      {(n) => (
        <div key={n} className="flex flex-wrap justify-center gap-4">
          <Reveal from="left" show={n > 0}>
            <span className={`${chip} bg-paper`}>Left</span>
          </Reveal>
          <Reveal from="up" delay={120} show={n > 0}>
            <span className={`${chip} bg-paper`}>Up</span>
          </Reveal>
          <Reveal from="right" delay={240} show={n > 0}>
            <span className={`${chip} bg-paper`}>Right</span>
          </Reveal>
          <Reveal from="zoom" delay={360} variant="impact" show={n > 0}>
            <span className={`${chip} ui-fill bg-accent text-white`}>Impact</span>
          </Reveal>
        </div>
      )}
    </PlayGate>
  )
}

export default {
  slug: 'reveal',
  name: 'Reveal',
  jp: '登場',
  category: 'Motion',
  description:
    'Brings its content in the first time it scrolls into view. The default slide eases in on translate with a slight overshoot; the impact variant flies in fast, squashes on contact, kicks up dust and debris (plus optional lettering) and wobbles to rest.',
  preview: <SlideDemo />,
  usage: `import { Reveal } from '@/components/ui/reveal'

<Reveal from="right" delay={120}>
  <Card>…</Card>
</Reveal>

<Reveal variant="impact" from="down" sfx="ドン!">
  <h2>Boss fight</h2>
</Reveal>`,
  examples: [
    {
      title: 'Impact entrance',
      preview: <ImpactDemo />,
      code: `<Reveal variant="impact" from="left">…</Reveal>
<Reveal variant="impact" from="down" delay={180}>…</Reveal>
<Reveal variant="impact" from="zoom" delay={360} sfx="ドン!">…</Reveal>`,
    },
  ],
  props: [
    { name: 'from', type: "'left' | 'right' | 'up' | 'down' | 'zoom'", default: "'left'", description: 'Where it waits before coming in.' },
    { name: 'variant', type: "'slide' | 'impact'", default: "'slide'", description: 'slide eases in; impact flies in, squashes on contact and throws dust and debris (calmer in flat).' },
    { name: 'sfx', type: 'string', description: 'Lettering on contact for the impact variant (cel and manga).' },
    { name: 'delay', type: 'number', default: '0', description: 'Milliseconds, for staggering.' },
    { name: 'show', type: 'boolean', default: 'true', description: 'Extra gate — it reveals only when visible AND show is true.' },
    { name: 'as', type: "'div' | 'li' | 'span' | 'p' | 'header'", default: "'div'", description: 'Element to render.' },
    { name: 'className / style', type: 'string / CSSProperties', description: 'Passed to the element.' },
  ],
} satisfies DocEntry
