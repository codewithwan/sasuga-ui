import { Badge, Button, Switch } from '@/components/ui'
import { StylePicker, ThemePicker } from '@/components/site/ThemePicker'
import { STYLES, THEMES, useTheme } from '@/lib/theme'
import { CodeBlock, PreviewPanel } from '../CodeBlock'
import { C, Guide, P, Section, Table } from './Guide'

const UTILITIES: [string, string][] = [
  ['ui-card', 'Card / panel / popover surface: border + large radius + paper background + shadow'],
  ['ui-border · ui-border-thin', 'Main line · inner or secondary line'],
  ['ui-border-t / -b / -y', 'One side in the style’s line weight and colour'],
  ['ui-divider · ui-rule', 'Inner hairline divider · a bar drawn in the line colour'],
  ['ui-r · ui-r-sm · ui-r-lg', 'Radius from the style'],
  ['ui-pill', 'Pill in cel and flat, square-ish in manga'],
  ['ui-shadow(-sm/-lg)', 'Depth; ui-shadow-hover and ui-shadow-press work with hover: / active:'],
  ['ui-head', 'Headings, buttons, labels: family, weight, case and tracking from the style'],
  ['ui-tone · ui-tex', 'Screentone in manga (no-op elsewhere) · force the texture image'],
  ['ui-fill', 'Marker for filled controls, so their border disappears in flat'],
  ['fx-only', 'Marker for decoration that should vanish in flat'],
  ['focus-visible:ui-focus', 'Focus ring (also peer- / group-focus-visible:)'],
  ['ui-lettering', 'DOM sound-effect lettering: fill + ink outline + drop'],
]

const COLOURS: [string, string][] = [
  ['bg-paper', 'Surfaces'],
  ['bg-canvas', 'Page tint, sunken areas'],
  ['text-ink', 'Text and lines'],
  ['border-line · text-mute', 'Secondary lines and text'],
  ['bg-accent', 'Filled controls'],
  ['bg-accent-soft', 'Tints, selected rows, tracks, cel shadows'],
  ['text-pop · bg-pop', 'The hit colour — use sparingly'],
]

const SWITCH = `import { applyStyle, applyTheme, useTheme } from '@/lib/theme'

applyStyle('manga')   // sets <html data-style>, saves it
applyTheme('mint')    // sets <html data-theme>, refreshes the FX palette

function Picker() {
  const { style, setStyle, theme, setTheme } = useTheme()
  // …
}`

const ADD_CSS = `/* index.css — after the other [data-theme] blocks */
[data-theme='rose'] {
  --color-accent: #e8457a;      /* fills */
  --color-accent-soft: #ffc2d6; /* tints and cel shadows */
  --color-pop: #2fb5a8;         /* the hit colour */
}`

const ADD_TS = `// lib/theme-core.ts
export const THEMES = [
  // …
  { id: 'rose', label: 'Rose', swatch: '#e8457a' },
] as const`

export function Theming() {
  const { style } = useTheme()
  const current = STYLES.find((s) => s.id === style) ?? STYLES[0]

  return (
    <Guide
      to="/docs/theming"
      lead={
        <p className="m-0">
          Two independent axes on <C>&lt;html&gt;</C>, like shadcn’s style and base colour. <C>data-style</C> changes the structure of every
          component; <C>data-theme</C> only swaps the colours.
        </p>
      }
    >
      <Section id="try" title="Try it">
        <PreviewPanel className="gap-6">
          <div className="grid justify-items-center gap-3">
            <StylePicker />
            <ThemePicker />
            <p className="m-0 max-w-[48ch] text-center text-sm text-mute">
              <strong className="font-jp font-normal text-accent">{current.jp}</strong> {current.blurb}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Button variant="accent">Accent</Button>
            <Button variant="paper" sfx="ポン">
              Paper
            </Button>
            <Badge variant="pop">Pop</Badge>
            <Switch label="Toggle" defaultChecked />
          </div>
        </PreviewPanel>
      </Section>

      <Section id="styles" title="Styles">
        <Table
          head={['data-style', 'Look', 'Effects']}
          rows={[
            ['cel', 'White sticker, thick ink outline, 15–20px radius, solid offset shadow in accent-soft, Mochiy Pop One headings', 'Soft focus lines, spiky burst, smoke, round debris, pop lettering'],
            ['manga', 'Printed comic page: off-white paper, black line, almost square corners, black drop, screentone, Anton uppercase', 'Everything, plus focus lines, sharp debris, big lettering'],
            ['flat', 'Calm product UI: hairline, 14–22px radius, layered shadow tinted by the accent, glossy fills, Plus Jakarta Sans', 'Ring, dot pop and sparkle; no lettering. Springs kick at half strength'],
          ]}
        />
      </Section>

      <Section id="colours" title="Colours">
        <P>
          Each <C>data-theme</C> sets three variables: <C>--color-accent</C>, <C>--color-accent-soft</C> and <C>--color-pop</C>. Ink,
          paper, canvas, line and mute come from the style.
        </P>
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {THEMES.map((t) => (
            <li key={t.id} className="ui-pill ui-border-thin flex items-center gap-2 bg-paper px-3 py-1.5 text-sm font-bold">
              <span aria-hidden="true" className="ui-border-thin size-3.5 rounded-full" style={{ background: t.swatch }} />
              {t.id}
            </li>
          ))}
        </ul>
        <Table head={['Utility', 'Use for']} rows={COLOURS.map(([u, d]) => [u, d])} minWidth={420} />
      </Section>

      <Section id="utilities" title="Token utilities">
        <P>
          Components never hard-code a shape. Always reach for these instead of a raw radius, border width or shadow, so one class list
          serves all three styles.
        </P>
        <Table head={['Utility', 'What it does']} rows={UTILITIES.map(([u, d]) => [u, d])} />
        <P>
          Avoid <C>clip-*</C> polygons, <C>skew-*</C>, decorative <C>rotate-*</C>, hard-coded <C>shadow-[…]</C> and <C>border-2/3/4</C>{' '}
          outlines — they break the other styles.
        </P>
      </Section>

      <Section id="switching" title="Switching in code">
        <CodeBlock code={SWITCH} />
      </Section>

      <Section id="add-colour" title="Add a colour">
        <P>Add a block to the stylesheet, then list it so pickers and the FX palette know about it.</P>
        <CodeBlock code={ADD_CSS} />
        <CodeBlock code={ADD_TS} />
        <P>
          The canvas effects read these variables through <C>refreshPalette()</C>, which <C>applyTheme</C> calls for you.
        </P>
      </Section>
    </Guide>
  )
}
