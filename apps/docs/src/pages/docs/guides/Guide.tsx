import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Art } from '@/components/site/Art'
import { GUIDES } from '@/data/site'
import { docs } from '@/docs/registry'
import { cn } from '@/lib/utils'
import { useTitle } from '../../use-title'
import { Icon } from '@/components/ui/icon'

type GuideProps = {
  /** Path of this guide in GUIDES, e.g. '/docs/theming'. */
  to: (typeof GUIDES)[number]['to']
  lead: ReactNode
  children: ReactNode
}

/** A written docs page: breadcrumb, title + jp sticker, lead paragraph, body, previous / next. */
export function Guide({ to, lead, children }: GuideProps) {
  const i = GUIDES.findIndex((g) => g.to === to)
  const g = GUIDES[i]
  const prev = GUIDES[i - 1]
  const nextGuide = GUIDES[i + 1]
  const next = nextGuide ? { to: nextGuide.to, title: nextGuide.title } : { to: '/components', title: `Components (${docs.length})` }
  useTitle(g.title)

  return (
    <article className="grid gap-12">
      <header className="grid items-end gap-x-6 min-[640px]:grid-cols-[minmax(0,1fr)_auto]">
        <div className="grid min-w-0 gap-4">
          <nav aria-label="Breadcrumb" className="ui-head text-sm">
            <Link to="/docs" className="text-mute no-underline transition-colors hover:text-accent focus-visible:ui-focus">
              Docs
            </Link>
            <span aria-hidden="true" className="mx-2 text-accent">
              /
            </span>
            <span aria-current="page" className="text-ink">
              {g.title}
            </span>
          </nav>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <h1 className="ui-head m-0 text-[clamp(40px,6.5vw,80px)] leading-[0.95] text-ink">{g.title}</h1>
            <span className="ui-pill bg-accent-soft/60 px-3 py-1 font-jp text-lg leading-tight text-ink">{g.jp}</span>
          </div>
          <div className="m-0 max-w-[62ch] text-lg leading-relaxed text-mute">{lead}</div>
        </div>
        <Art name={g.art} alt="" reveal="pop" delay={120} className="hidden w-[clamp(120px,15vw,180px)] min-[640px]:block" />
      </header>

      {children}

      <nav aria-label="Other docs pages" className="grid gap-5 min-[640px]:grid-cols-2">
        {prev ? (
          <Link
            to={prev.to}
            className="ui-border ui-r-lg ui-shadow bg-paper px-5 py-4 text-ink no-underline transition-[translate,box-shadow,background-color] duration-200 ease-snap hover:-translate-y-1 hover:bg-accent-soft hover:ui-shadow-hover focus-visible:ui-focus"
          >
            <span className="ui-head flex items-center gap-1 text-xs text-mute">
              <Icon name="arrow-left" tone="line" size="1em" />
              Previous
            </span>
            <span className="ui-head mt-1 block text-2xl leading-tight">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        <Link
          to={next.to}
          className="ui-border ui-r-lg ui-shadow ui-fill bg-accent px-5 py-4 text-right text-white no-underline transition-[translate,box-shadow] duration-200 ease-snap hover:-translate-y-1 hover:ui-shadow-hover focus-visible:ui-focus"
        >
          <span className="ui-head flex items-center justify-end gap-1 text-xs text-white/80">
              Next
              <Icon name="arrow-right" tone="line" size="1em" />
            </span>
          <span className="ui-head mt-1 block text-2xl leading-tight">{next.title}</span>
        </Link>
      </nav>
    </article>
  )
}

/** A titled block with an anchor id. */
export function Section({ id, title, children, className }: { id: string; title: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={cn('grid gap-4', className)}>
      <h2 id={id} className="ui-head m-0 text-3xl leading-none text-ink">
        {title}
      </h2>
      {children}
    </section>
  )
}

export function P({ children }: { children: ReactNode }) {
  return <p className="m-0 max-w-[68ch] leading-relaxed">{children}</p>
}

/** Inline code. */
export function C({ children }: { children: ReactNode }) {
  return <code className="ui-r-sm bg-canvas px-1.5 py-0.5 font-mono text-[0.88em] font-semibold text-accent">{children}</code>
}

/** Simple striped table in a card (scrolls sideways on small screens). */
export function Table({ head, rows, minWidth = 520 }: { head: string[]; rows: ReactNode[][]; minWidth?: number }) {
  return (
    <div className="ui-card overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm" style={{ minWidth }}>
        <thead className="bg-canvas">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="ui-head px-4 pt-3 pb-2.5 text-[13px] text-mute">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line align-top even:bg-canvas/50">
              {r.map((cell, j) => (
                <td key={j} className={cn('px-4 py-3', j === 0 && 'font-mono font-bold whitespace-nowrap text-accent')}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Numbered step: a filled number sticker, a title and content. */
export function Step({ n, title, children }: { n: number; title: ReactNode; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3">
      <span aria-hidden="true" className="ui-head ui-pill ui-fill grid size-10 place-items-center bg-accent text-lg leading-none text-white">
        {n}
      </span>
      <h3 className="ui-head m-0 self-center text-xl leading-tight">{title}</h3>
      <div className="col-start-2 grid min-w-0 gap-3">{children}</div>
    </li>
  )
}

/** Card-style link used to point at the next thing to read. */
export function NextCard({ to, title, body }: { to: string; title: string; body: string }) {
  return (
    <Link
      to={to}
      className="ui-card group grid gap-1.5 p-5 text-ink no-underline transition-[translate,box-shadow] duration-200 ease-snap hover:-translate-y-1 hover:ui-shadow-hover focus-visible:ui-focus"
    >
      <span className="ui-head flex items-center justify-between gap-2 text-xl leading-tight">
        {title}
        <Icon name="arrow-right" tone="line" size="1em" className="text-accent transition-transform duration-200 ease-snap group-hover:translate-x-1.5" />
      </span>
      <span className="text-sm leading-snug text-mute">{body}</span>
    </Link>
  )
}
