import { Link } from 'react-router'
import { StylePicker, ThemePicker } from '@/components/site/ThemePicker'
import { KineticText } from '@/components/ui/kinetic-text'
import { Reveal } from '@/components/ui/reveal'
import { docs } from '@/docs/registry'
import { CATEGORIES } from '@/docs/types'
import { STYLES, THEMES, useTheme } from '@/lib/theme'
import { useTitle } from '../use-title'
import { Icon } from '@/components/ui/icon'

/** The two axes, side by side: pick a style (structure) and a colour (accent). */
function StyleGallery() {
  const { style } = useTheme()
  const current = STYLES.find((s) => s.id === style) ?? STYLES[0]
  return (
    <div className="ui-card grid gap-4 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
      <span className="ui-head text-sm text-mute">Style</span>
      <div className="flex flex-wrap items-center gap-3">
        <StylePicker />
        <span className="text-sm text-mute">
          <strong className="font-jp font-normal text-accent">{current.jp}</strong> {current.blurb}
        </span>
      </div>
      <span className="ui-head text-sm text-mute">Colour</span>
      <ThemePicker />
    </div>
  )
}

export function DocsIndex() {
  useTitle('Components')

  return (
    <div className="grid gap-14">
      <header className="grid gap-5">
        <p className="m-0 font-jp text-accent">部品一覧</p>
        <h1 className="ui-head m-0 text-[clamp(48px,9vw,112px)] leading-[0.95] text-ink">
          <KineticText text="Components" />
        </h1>
        <p className="m-0 max-w-[60ch] text-lg leading-relaxed text-mute">
          Every component is one file you copy into your project. Each card below is live — poke it, then open its page for the code,
          variants and props. Switch the style and colour here and every preview redraws.
        </p>
        <div className="ui-head flex flex-wrap items-center gap-2.5 text-[15px] leading-none">
          <span className="ui-pill ui-fill bg-ink px-3.5 py-2 text-paper">{docs.length} components</span>
          <span className="ui-pill ui-fill bg-accent px-3.5 py-2 text-white">
            {STYLES.length} styles × {THEMES.length} colours
          </span>
        </div>
        <StyleGallery />
        <p className="m-0 text-[15px] text-mute">
          New here?{' '}
          <Link to="/docs/installation" className="ui-head text-accent no-underline hover:underline focus-visible:ui-focus">
            Start with the installation guide <Icon name="arrow-right" tone="line" size="1em" />
          </Link>
        </p>
      </header>

      {CATEGORIES.map((c) => {
        const items = docs.filter((d) => d.category === c)
        if (!items.length) return null
        return (
          <section key={c} aria-labelledby={`cat-${c}`}>
            <h2 id={`cat-${c}`} className="ui-head m-0 mb-6 flex items-center gap-3 text-3xl leading-none text-ink">
              {c}
              <span aria-hidden="true" className="h-px flex-1 bg-line" />
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-7">
              {items.map((d, i) => (
                <Reveal key={d.slug} from="up" delay={(i % 3) * 80} className="grid">
                  <div className="ui-card grid grid-rows-[auto_1fr_auto] overflow-hidden transition-[translate,box-shadow] duration-200 ease-snap hover:-translate-y-1 hover:ui-shadow-hover">
                  <div className="flex items-baseline justify-between gap-2 border-b border-line bg-canvas px-4 pt-3 pb-2.5">
                    <span className="ui-head text-lg leading-none text-ink">{d.name}</span>
                    <span className="font-jp text-xs text-accent">{d.jp}</span>
                  </div>
                  <div className="ui-tone grid min-h-[190px] place-items-center px-5 py-9">{d.preview}</div>
                  <Link
                    to={`/components/${d.slug}`}
                    className="ui-head group flex items-center justify-between border-t border-line px-4 py-3 text-sm leading-none text-ink no-underline transition-colors hover:bg-accent hover:text-white focus-visible:bg-accent focus-visible:text-white focus-visible:outline-none"
                  >
                    Docs <Icon name="arrow-right" tone="line" size="1.15em" className="transition-transform duration-200 ease-snap group-hover:translate-x-2" />
                  </Link>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
