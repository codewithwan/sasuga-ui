import { Button } from '@/components/ui'
import { site } from '@/data/site'
import { docs } from '@/docs/registry'
import { CATEGORIES } from '@/docs/types'
import { STYLES, THEMES } from '@/lib/theme'
import { PreviewPanel } from '../CodeBlock'
import { C, Guide, NextCard, P, Section } from './Guide'

export function Introduction() {
  const counts = CATEGORIES.map((c) => ({ c, n: docs.filter((d) => d.category === c).length })).filter((x) => x.n)

  return (
    <Guide to="/docs" lead={<p className="m-0">{site.tagline}</p>}>
      <Section id="what" title="What it is">
        <P>
          {site.name} is a copy-paste React component kit with game feel, built around anime impact frames. Controls sit calm like stickers at rest, then squash, overshoot and burst with drawn impacts and sound-effect lettering
          when you touch them. It is made for web games, game launchers and fan sites, and anywhere else that should feel a little more alive.
        </P>
        <PreviewPanel>
          <div className="flex flex-wrap justify-center gap-6">
            <Button variant="accent">Click me</Button>
            <Button variant="pop" sfx="バン!">
              Then me
            </Button>
          </div>
        </PreviewPanel>
      </Section>

      <Section id="how" title="How it works">
        <ul className="m-0 grid max-w-[68ch] gap-2.5 pl-5 leading-relaxed">
          <li>
            <strong>You own the code.</strong> Like shadcn/ui there is no package: copy <C>components/ui/&lt;name&gt;.tsx</C> into your
            project and edit it freely.
          </li>
          <li>
            <strong>Motion lives in springs.</strong> <C>useSprings</C> drives squash, stretch and overshoot by writing straight to the DOM.
          </li>
          <li>
            <strong>Effects draw on one canvas.</strong> <C>impactOn(el)</C> spawns focus lines, a burst, debris, smoke and lettering on a
            shared full-screen layer.
          </li>
          <li>
            <strong>Shape comes from tokens.</strong> {STYLES.length} structural styles × {THEMES.length} colours, set by{' '}
            <C>data-style</C> and <C>data-theme</C> on <C>&lt;html&gt;</C>.
          </li>
          <li>
            <strong>Accessible by default.</strong> Native elements, ARIA, keyboard support and <C>prefers-reduced-motion</C> respected.
          </li>
        </ul>
      </Section>

      <Section id="included" title="What's included">
        <P>
          {docs.length} components across {counts.length} categories, plus the FX engine, the spring hook and the token stylesheet.
        </P>
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {counts.map(({ c, n }) => (
            <li key={c} className="ui-head ui-pill ui-border-thin bg-paper px-3 py-1.5 text-sm leading-none">
              {c} <span className="text-accent">{n}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="next" title="Next steps">
        <div className="grid gap-5 min-[640px]:grid-cols-2">
          <NextCard to="/docs/installation" title="Installation" body="One command to set up, one more per component." />
          <NextCard to="/docs/theming" title="Theming" body="Styles, colours and the ui-* token utilities." />
          <NextCard to="/docs/motion" title="FX & Motion" body="impactOn, springs and reduced motion." />
          <NextCard to="/components" title="Components" body={`Browse all ${docs.length} with live previews.`} />
        </div>
      </Section>
    </Guide>
  )
}
