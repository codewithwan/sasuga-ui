import { Link, useParams } from 'react-router'
import { Tabs } from '@/components/ui/tabs'
import { docs, findDoc } from '@/docs/registry'
import { NotFound } from '../NotFound'
import { useTitle } from '../use-title'
import { CodeBlock, CopyButton, PreviewPanel } from './CodeBlock'
import { AddComponent } from './AddComponent'
import { agentPrompt } from '@/docs/sources'
import { useSources } from '@/docs/use-sources'
import { Icon } from '@/components/ui/icon'

export function DocPage() {
  const { slug } = useParams()
  const doc = findDoc(slug)

  useTitle(doc ? doc.name : 'Not found')
  const files = useSources(slug ?? '')

  if (!doc) return <NotFound embedded />

  const i = docs.indexOf(doc)
  const prev = docs[i - 1]
  const next = docs[i + 1]

  return (
    <article className="grid grid-cols-[minmax(0,1fr)] gap-12 [&>*]:min-w-0">
      <header className="grid gap-4">
        <nav aria-label="Breadcrumb" className="ui-head text-sm">
          <Link to="/components" className="text-mute no-underline transition-colors hover:text-accent">
            Components
          </Link>
          <span className="mx-2 text-accent">/</span>
          <span className="text-ink">{doc.category}</span>
        </nav>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <h1 className="ui-head m-0 text-[clamp(40px,6.5vw,80px)] leading-[0.95] text-ink">{doc.name}</h1>
          <span className="ui-pill bg-accent-soft/60 px-3 py-1 font-jp text-lg leading-tight text-ink">{doc.jp}</span>
        </div>
        <p className="m-0 max-w-[62ch] text-lg leading-relaxed text-mute">{doc.description}</p>
        {files && files.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <CopyButton
              label="Copy prompt for your agent"
              text={agentPrompt(
                doc.name,
                doc.slug,
                files.map((f) => f.path),
                doc.usage,
              )}
            />
            <a href="#add" className="ui-head text-[13px] text-accent no-underline hover:underline focus-visible:ui-focus">
              or copy the code
            </a>
          </div>
        )}
      </header>

      <Tabs
        label={`${doc.name} preview and code`}
        tabs={[
          { id: 'preview', label: 'Preview', content: <PreviewPanel>{doc.preview}</PreviewPanel> },
          { id: 'code', label: 'Code', content: <CodeBlock code={doc.usage} />, sfx: 'コード' },
        ]}
      />

      <section aria-labelledby="usage" className="grid gap-4">
        <h2 id="usage" className="ui-head m-0 text-3xl leading-none text-ink">
          Usage
        </h2>
        <CodeBlock code={doc.usage} />
      </section>

      <section aria-labelledby="add" className="grid gap-4">
        <h2 id="add" className="ui-head m-0 scroll-mt-28 text-3xl leading-none text-ink">
          Add it to your project
        </h2>
        <AddComponent slug={doc.slug} name={doc.name} usage={doc.usage} files={files} />
      </section>

      {doc.examples?.length ? (
        <section aria-labelledby="examples" className="grid gap-8">
          <h2 id="examples" className="ui-head m-0 text-3xl leading-none text-ink">
            Examples
          </h2>
          {doc.examples.map((ex) => (
            <div key={ex.title} className="grid gap-4">
              <h3 className="ui-head ui-pill m-0 inline-block justify-self-start bg-accent-soft/60 px-3.5 py-1.5 text-lg leading-none text-ink">
                {ex.title}
              </h3>
              <PreviewPanel>{ex.preview}</PreviewPanel>
              <CodeBlock code={ex.code} />
            </div>
          ))}
        </section>
      ) : null}

      <section aria-labelledby="props" className="grid gap-4">
        <h2 id="props" className="ui-head m-0 text-3xl leading-none text-ink">
          Props
        </h2>
        {/* phones: one card, a row per prop split by hairlines; nothing scrolls sideways */}
        <ul className="ui-card m-0 list-none divide-y divide-line overflow-hidden p-0 sm:hidden">
          {doc.props.map((p) => (
            <li key={p.name} className="grid gap-2 px-4 py-3.5 even:bg-canvas/50">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <code className="font-mono text-[15px] font-bold break-all text-accent">{p.name}</code>
                {p.default && (
                  <span className="text-xs text-mute">
                    default <code className="font-mono text-ink">{p.default}</code>
                  </span>
                )}
              </div>
              <code className="ui-r-sm block bg-canvas px-2.5 py-1.5 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">{p.type}</code>
              <p className="m-0 text-sm leading-relaxed">{p.description}</p>
            </li>
          ))}
        </ul>
        {/* wider screens: a table whose columns wrap instead of scrolling */}
        <div className="ui-card hidden overflow-hidden sm:block">
          <table className="w-full table-fixed border-collapse text-left text-sm">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[28%]" />
              <col className="w-[14%]" />
              <col />
            </colgroup>
            <thead className="bg-canvas">
              <tr>
                {['Prop', 'Type', 'Default', 'Description'].map((h) => (
                  <th key={h} scope="col" className="ui-head px-4 pt-3 pb-2.5 text-[13px] text-mute">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {doc.props.map((p) => (
                <tr key={p.name} className="border-t border-line align-top even:bg-canvas/50">
                  <td className="px-4 py-3 font-mono font-bold break-words text-accent">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-xs break-words">{p.type}</td>
                  <td className="px-4 py-3 font-mono text-xs break-words">{p.default ?? '—'}</td>
                  <td className="px-4 py-3">{p.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <nav aria-label="Other components" className="grid gap-5 min-[640px]:grid-cols-2">
        {prev ? (
          <Link
            to={`/components/${prev.slug}`}
            className="ui-border ui-r-lg ui-shadow group bg-paper px-5 py-4 text-ink no-underline transition-[translate,box-shadow,background-color] duration-200 ease-snap hover:-translate-y-1 hover:bg-accent-soft hover:ui-shadow-hover"
          >
            <span className="ui-head flex items-center gap-1 text-xs text-mute">
              <Icon name="arrow-left" tone="line" size="1em" />
              Previous
            </span>
            <span className="ui-head mt-1 block text-2xl leading-tight">{prev.name}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            to={`/components/${next.slug}`}
            className="ui-border ui-r-lg ui-shadow ui-fill group bg-accent px-5 py-4 text-right text-white no-underline transition-[translate,box-shadow] duration-200 ease-snap hover:-translate-y-1 hover:ui-shadow-hover"
          >
            <span className="ui-head flex items-center justify-end gap-1 text-xs text-white/80">
              Next
              <Icon name="arrow-right" tone="line" size="1em" />
            </span>
            <span className="ui-head mt-1 block text-2xl leading-tight">{next.name}</span>
          </Link>
        )}
      </nav>
    </article>
  )
}
