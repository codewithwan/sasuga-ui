import { useRef } from 'react'
import { Button } from '@/components/ui'
import { burst, delayed, impactAt, impactOn, pick, prefersReducedMotion, sparkle, spawn, useSprings } from '@/fx'
import { useTheme } from '@/lib/theme'
import { CodeBlock, PreviewPanel } from '../CodeBlock'
import { C, Guide, P, Section, Table } from './Guide'

const WORDS = ['ドン!', 'バン!', 'ズバッ', 'ドカン!', 'ポン']

/** Click anywhere in the panel: an impact lands where you clicked. */
function ImpactPad() {
  return (
    <button
      type="button"
      onClick={(e) => {
        // keyboard clicks report 0,0 — aim at the middle instead
        if (e.detail === 0) impactOn(e.currentTarget, { text: pick(WORDS) })
        else impactAt(e.clientX, e.clientY, { text: pick(WORDS) })
      }}
      className="ui-r ui-border-thin ui-tone grid h-48 w-full cursor-crosshair place-items-center bg-paper text-mute focus-visible:ui-focus"
    >
      <span className="ui-head text-lg">Click anywhere in here</span>
    </button>
  )
}

/** A sticker on a spring: set a target, kick velocity. */
function SpringDemo() {
  const box = useRef<HTMLSpanElement>(null)
  const spring = useSprings(
    box,
    { sx: 1, sy: 1, y: 0, r: 0 },
    (v, el) => {
      el.style.transform = `translateY(${v.y}px) rotate(${v.r}deg) scale(${v.sx}, ${v.sy})`
    },
    { stiffness: 520, damping: 14 },
  )
  return (
    <div className="grid justify-items-center gap-6">
      <span ref={box} aria-hidden="true" className="ui-head ui-border ui-r-lg ui-shadow grid size-24 origin-bottom place-items-center bg-accent-soft font-jp text-2xl">
        ばね
      </span>
      <div className="flex flex-wrap justify-center gap-4">
        <Button size="sm" variant="accent" sfx={false} onClick={() => spring.kick({ sx: -6, sy: 9, y: -120, r: 60 })}>
          kick()
        </Button>
        <Button size="sm" variant="paper" sfx={false} onPointerDown={() => spring.set({ sx: 1.15, sy: 0.8, y: 6 })} onPointerUp={() => spring.set({ sx: 1, sy: 1, y: 0 })}>
          Hold: set()
        </Button>
      </div>
    </div>
  )
}

const IMPACT = `import { impactAt, impactOn } from '@/fx'

impactOn(buttonEl, { text: 'ドン!' })          // hit the centre of an element
impactAt(e.clientX, e.clientY, {               // or any point on screen
  text: false,   // no lettering
  size: 0.6,     // scale everything
  color: '#fff', // burst colour (defaults to the accent)
  smoky: false,  // skip the smoke puff
})`

const FACTORIES = `import { burst, delayed, rays, shards, sfx, slash, smoke, sparkle, spawn, speedLines } from '@/fx'

spawn(
  burst(x, y, { radius: 40 }),
  delayed(0.1, sparkle(x + 30, y - 20, { size: 14 })),
)`

const SPRINGS = `import { useRef } from 'react'
import { useSprings } from '@/fx'

function Boing() {
  const ref = useRef<HTMLSpanElement>(null)
  const spring = useSprings(
    ref,
    { sx: 1, sy: 1, y: 0 },                       // initial values
    (v, el) => {                                  // render: write to the DOM, no re-render
      el.style.transform = \`translateY(\${v.y}px) scale(\${v.sx}, \${v.sy})\`
    },
    { stiffness: 520, damping: 14 },
  )
  return <span ref={ref} onClick={() => spring.kick({ sx: -6, sy: 9, y: -90 })} />
}`

const STYLE = `import { KICK, prefersReducedMotion, uiStyle } from '@/fx'

uiStyle()              // 'cel' | 'manga' | 'flat', read from <html data-style>
KICK[uiStyle()]        // 1, 1, 0.5 — kick() already multiplies by this
prefersReducedMotion() // true when the OS asks for less motion

// effects above a modal <dialog> use the Web Animations API instead of the canvas:
if (!prefersReducedMotion() && uiStyle() !== 'flat') el.animate(/* … */)`

export function FxMotion() {
  const { style } = useTheme()

  return (
    <Guide
      to="/docs/motion"
      lead={
        <p className="m-0">
          Keep the energy in motion, not decoration: springs that squash and overshoot, and drawn effects on one shared canvas. Everything
          adapts to the active style and steps aside for reduced motion.
        </p>
      }
    >
      <Section id="impacts" title="Impacts">
        <P>
          <C>impactOn</C> and <C>impactAt</C> are the full “hit”: focus lines, a starburst, debris, smoke, a sparkle and optional
          sound-effect lettering. The active style picks the voice — you are in <C>{style}</C> right now.
        </P>
        <PreviewPanel className="px-4 py-6">
          <ImpactPad />
        </PreviewPanel>
        <CodeBlock code={IMPACT} />
        <Table
          head={['Option', 'Type', 'Default', 'Description']}
          rows={[
            ['text', 'string | false', '—', 'Lettering drawn above the hit. Not drawn in flat.'],
            ['size', 'number', '1', 'Scales radius, debris count and lettering.'],
            ['color', 'string', 'accent', 'Burst colour.'],
            ['smoky', 'boolean', 'true', 'Adds the smoke puff.'],
          ]}
        />
      </Section>

      <Section id="factories" title="Effect factories">
        <P>
          Build your own moments from the pieces. Each factory returns an effect; <C>spawn</C> starts it on the canvas, which is created
          on first use and only animates while something is alive. In flat, smoke, speed lines, slashes and lettering return nothing.
        </P>
        <div className="flex flex-wrap gap-4">
          <Button
            size="sm"
            variant="paper"
            sfx={false}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              const x = r.left + r.width / 2
              const y = r.top + r.height / 2
              spawn(burst(x, y, { radius: 40 }), delayed(0.1, sparkle(x + 30, y - 20, { size: 14 })))
            }}
          >
            burst + sparkle
          </Button>
        </div>
        <CodeBlock code={FACTORIES} />
      </Section>

      <Section id="springs" title="Springs">
        <P>
          <C>useSprings(ref, initial, render, config)</C> runs damped springs and calls <C>render</C> every frame with the values and
          velocities, so nothing re-renders in React. <C>set</C> moves the target, <C>kick</C> adds velocity (scaled by the style),{' '}
          <C>snap</C> jumps without animating.
        </P>
        <PreviewPanel>
          <SpringDemo />
        </PreviewPanel>
        <CodeBlock code={SPRINGS} />
      </Section>

      <Section id="style-aware" title="Style-aware motion">
        <CodeBlock code={STYLE} />
      </Section>

      <Section id="reduced-motion" title="Reduced motion">
        <ul className="m-0 grid max-w-[68ch] gap-2 pl-5 leading-relaxed">
          <li>
            <C>spawn</C> does nothing when <C>prefers-reduced-motion: reduce</C> is set, so every canvas effect is skipped.
          </li>
          <li>The stylesheet shortens all CSS animations and transitions to near zero.</li>
          <li>
            Web Animations and timed intros (page wipe, title card, dialog entrances) check <C>prefersReducedMotion()</C> and jump to
            the end state.
          </li>
          <li>Never put information only in an effect: lettering is decoration, so pair it with text, a toast or a live region.</li>
        </ul>
        <P>
          {prefersReducedMotion()
            ? 'Your device asks for reduced motion, so the demos above stay still.'
            : 'Turn on “reduce motion” in your OS settings to see the demos above go quiet.'}
        </P>
      </Section>
    </Guide>
  )
}
