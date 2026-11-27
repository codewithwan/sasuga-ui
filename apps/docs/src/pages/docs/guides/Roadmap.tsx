import { useEffect, useState } from 'react'
import { Art } from '@/components/site/Art'
import { Badge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { site, withBase } from '@/data/site'
import { cn } from '@/lib/utils'
import { C, Guide, P, Section } from './Guide'

/** r/frameworks.json (scripts/build-registry.mjs, from roadmap.json + the files each port has). */
type Framework = {
  id: string
  title: string
  status: 'planned' | 'in-progress' | 'preview' | 'available'
  requires?: string
  package: string
  registry: string | null
  components: string[]
  inProgress: string[]
}
type Card = { title: string; status: 'planned' | 'in-progress' | 'done'; tag?: string; issue?: number }
type Item = { name: string; title: string; type: string; category: string }
type Request = { number: number; title: string; html_url: string; votes: number; comments: number }

const STATUS: Record<Framework['status'], { label: string; variant: 'accent' | 'pop' | 'paper' | 'outline' }> = {
  available: { label: 'Available', variant: 'accent' },
  preview: { label: 'Preview', variant: 'pop' },
  'in-progress': { label: 'In progress', variant: 'paper' },
  planned: { label: 'Planned', variant: 'outline' },
}

const COLUMNS: { id: Card['status']; title: string; dot: string }[] = [
  { id: 'planned', title: 'Planned', dot: 'bg-line' },
  { id: 'in-progress', title: 'In progress', dot: 'bg-pop' },
  { id: 'done', title: 'Done', dot: 'bg-accent' },
]

const issueForm = (template: string) => `${site.github}/issues/new?template=${template}`
const EXT = { target: '_blank', rel: 'noreferrer' } as const

/** The ports, the kanban and the React item list, from the registry the CLI reads. */
function useRoadmap() {
  const [data, setData] = useState<{ frameworks: Framework[]; board: Card[]; items: Item[] } | null | 'error'>(null)
  useEffect(() => {
    let live = true
    const get = (p: string) => fetch(withBase(p)).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    Promise.all([get('/r/frameworks.json'), get('/r/index.json')])
      .then(
        ([fw, index]) =>
          live && setData({ frameworks: fw.frameworks, board: fw.board ?? [], items: index.items.filter((i: Item) => i.type !== 'core') }),
      )
      .catch(() => live && setData('error'))
    return () => {
      live = false
    }
  }, [])
  return data
}

/** Open "request" issues from GitHub, most thumbs-up first (cached for the session; null while loading). */
function useRequests() {
  const [list, setList] = useState<Request[] | null | 'error'>(null)
  useEffect(() => {
    let live = true
    const key = `ui-kit:requests:${site.repo}`
    try {
      const hit = sessionStorage.getItem(key)
      if (hit) {
        const { at, items } = JSON.parse(hit)
        if (Date.now() - at < 10 * 60_000) {
          queueMicrotask(() => live && setList(items))
          return () => {
            live = false
          }
        }
      }
    } catch {
      /* no storage: just fetch */
    }
    fetch(`https://api.github.com/repos/${site.repo}/issues?labels=request&state=open&per_page=50`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((raw: { number: number; title: string; html_url: string; comments: number; pull_request?: unknown; reactions?: { '+1'?: number } }[]) => {
        const items = raw
          .filter((i) => !i.pull_request)
          .map((i) => ({ number: i.number, title: i.title.replace(/^\[Request\]\s*/i, ''), html_url: i.html_url, comments: i.comments, votes: i.reactions?.['+1'] ?? 0 }))
          .sort((a, b) => b.votes - a.votes || b.number - a.number)
        try {
          sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), items }))
        } catch {
          /* ignore */
        }
        if (live) setList(items)
      })
      .catch(() => live && setList('error'))
    return () => {
      live = false
    }
  }, [])
  return list
}

function Bar({ value, total }: { value: number; total: number }) {
  const pct = total ? Math.round((value / total) * 100) : 0
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-mute">Ported</span>
        <span className="ui-head text-ink tabular-nums">
          {value} / {total}
        </span>
      </div>
      <div className="ui-border-thin ui-pill h-3 overflow-hidden bg-canvas" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Ported">
        <div className="ui-pill h-full bg-accent transition-[width] duration-700 ease-snap" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Board({ cards }: { cards: Card[] }) {
  return (
    <div className="grid gap-4 min-[860px]:grid-cols-3">
      {COLUMNS.map((col) => {
        const list = cards.filter((c) => c.status === col.id)
        return (
          <section key={col.id} aria-label={col.title} className="ui-r-lg grid content-start gap-3 bg-canvas p-3">
            <h3 className="ui-head m-0 flex items-center gap-2 px-1 pt-1 text-base leading-none">
              <span aria-hidden="true" className={cn('ui-pill size-2.5', col.dot)} />
              {col.title}
              <span className="ml-auto text-sm text-mute tabular-nums">{list.length}</span>
            </h3>
            <ul className="m-0 grid list-none gap-2.5 p-0">
              {list.map((c) => (
                <li key={c.title} className="ui-card grid gap-2 p-3.5">
                  <span className="text-[15px] leading-snug font-bold">{c.title}</span>
                  <span className="flex items-center gap-2">
                    {c.tag && <Badge variant={col.id === 'done' ? 'accent' : 'paper'}>{c.tag}</Badge>}
                    {c.issue && (
                      <a href={`${site.github}/issues/${c.issue}`} {...EXT} className="ml-auto text-xs font-bold text-accent">
                        #{c.issue}
                      </a>
                    )}
                  </span>
                </li>
              ))}
              {!list.length && <li className="px-1 pb-1 text-sm text-mute">Nothing here yet.</li>}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function Requests() {
  const list = useRequests()
  return (
    <div className="ui-card overflow-hidden">
      {list === null && <p className="m-0 p-5 text-mute">Loading requests from GitHub…</p>}
      {list === 'error' && (
        <p className="m-0 p-5 text-mute">
          Couldn't reach GitHub right now.{' '}
          <a href={`${site.github}/issues?q=is%3Aopen+label%3Arequest`} {...EXT} className="font-bold text-accent">
            See the requests on GitHub
          </a>
          .
        </p>
      )}
      {Array.isArray(list) && !list.length && (
        <p className="m-0 p-5 text-mute">No open requests yet — be the first to ask for a component.</p>
      )}
      {Array.isArray(list) && list.length > 0 && (
        <ol className="m-0 list-none divide-y divide-line p-0">
          {list.map((r) => (
            <li key={r.number}>
              <a href={r.html_url} {...EXT} className="flex items-center gap-3 px-4 py-3 text-ink no-underline transition-colors hover:bg-canvas focus-visible:ui-focus">
                <span className="ui-border-thin ui-pill inline-flex min-w-12 items-center justify-center gap-1 bg-paper px-2 py-1 text-sm font-bold tabular-nums">
                  <Icon name="heart" size={14} tone="solid" className="text-pop" /> {r.votes}
                </span>
                <span className="min-w-0 flex-1 truncate font-bold">{r.title}</span>
                <span className="text-xs text-mute">#{r.number}</span>
              </a>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function Checklist({ items, ports }: { items: Item[]; ports: Framework[] }) {
  const [fw, setFw] = useState(ports[0]?.id)
  const port = ports.find((p) => p.id === fw) ?? ports[0]
  if (!port) return null
  return (
    <div className="grid gap-4">
      <div role="radiogroup" aria-label="Framework" className="flex flex-wrap gap-2">
        {ports.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={p.id === port.id}
            onClick={() => setFw(p.id)}
            className="ui-head ui-pill ui-border-thin cursor-pointer bg-paper px-3.5 py-1.5 text-sm text-ink aria-checked:border-transparent aria-checked:bg-accent aria-checked:text-white focus-visible:ui-focus"
          >
            {p.title}
          </button>
        ))}
      </div>
      <ul className="ui-card m-0 grid list-none gap-x-6 gap-y-1 p-4 min-[560px]:grid-cols-2 min-[900px]:grid-cols-3">
        {items.map((i) => {
          const done = port.components.includes(i.name)
          const doing = port.inProgress.includes(i.name)
          return (
            <li key={i.name} className="flex items-center gap-2.5 py-1 text-sm">
              <span
                aria-hidden="true"
                className={cn(
                  'ui-border-thin grid size-5 shrink-0 place-items-center rounded-md',
                  done ? 'border-transparent bg-accent text-white' : doing ? 'bg-pop/20' : 'bg-paper',
                )}
              >
                {done && <Icon name="check" size={13} tone="line" />}
              </span>
              <span className={cn(done ? 'text-ink' : 'text-mute', 'min-w-0 truncate')}>{i.title}</span>
              <span className="sr-only">{done ? 'ported' : doing ? 'in progress' : 'not yet'}</span>
              {doing && <span className="ml-auto text-xs font-bold text-pop">in progress</span>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function Roadmap() {
  const data = useRoadmap()
  const ok = data && data !== 'error' ? data : null
  const total = ok ? ok.items.length : 0

  return (
    <Guide
      to="/docs/roadmap"
      lead={
        <p className="m-0">
          What's done, what's next and where each framework stands. Ask for a component or help port one — the most-wanted requests move up
          the board.
        </p>
      }
    >
      <div className="ui-card flex flex-wrap items-center gap-x-6 gap-y-4 bg-paper p-5 min-[640px]:flex-nowrap">
        <Art name="mascot/koma-wink" alt="" reveal="pop" className="-my-2 w-24 shrink-0 min-[640px]:w-28" />
        <div className="grid min-w-0 gap-3">
          <p className="ui-head m-0 text-xl leading-tight text-ink">Missing a component? Ask for it.</p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={issueForm('component-request.yml')} {...EXT} variant="accent" size="sm" sfx={false}>
              <Icon name="plus" size={16} tone="line" /> Request a component
            </ButtonLink>
            <ButtonLink href={issueForm('framework-port.yml')} {...EXT} size="sm" sfx={false}>
              Help port to Vue
            </ButtonLink>
            <ButtonLink href={issueForm('bug-report.yml')} {...EXT} variant="outline" size="sm" sfx={false}>
              Report a bug
            </ButtonLink>
          </div>
        </div>
      </div>

      {data === null && <P>Loading the roadmap…</P>}
      {data === 'error' && (
        <P>
          Couldn't load <C>r/frameworks.json</C>. The same data lives in <C>roadmap.json</C> in the repo.
        </P>
      )}

      {ok && (
        <>
          <Section id="frameworks" title="Frameworks">
            <ul className="m-0 grid list-none gap-5 p-0 min-[640px]:grid-cols-2">
              {ok.frameworks.map((f) => {
                const s = STATUS[f.status] ?? STATUS.planned
                return (
                  <li key={f.id} className="ui-card grid content-start gap-4 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="ui-head m-0 text-2xl leading-tight">{f.title}</h3>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </div>
                    <Bar value={f.components.length} total={total} />
                    <p className="m-0 text-sm text-mute">
                      {f.requires}
                      {' · '}
                      <a href={`${site.github}/tree/main/${f.package}`} {...EXT} className="font-bold text-accent">
                        {f.package}
                      </a>
                    </p>
                  </li>
                )
              })}
            </ul>
          </Section>

          <Section id="board" title="Board">
            <Board cards={ok.board} />
          </Section>
        </>
      )}

      <Section id="requests" title="Requests">
        <P>
          Open component requests from GitHub, most-voted first. Give the issue a thumbs-up to vote, or{' '}
          <a href={issueForm('component-request.yml')} {...EXT} className="font-bold text-accent">
            open a new one
          </a>
          .
        </P>
        <Requests />
      </Section>

      {ok && (
        <Section id="checklist" title="Port checklist">
          <P>
            Every item React has, per framework. A port counts an item as done as soon as its file exists; to claim one, add its name to{' '}
            <C>inProgress</C> in <C>roadmap.json</C> and read{' '}
            <a href={`${site.github}/blob/main/packages/vue/PORTING.md`} {...EXT} className="font-bold text-accent">
              PORTING.md
            </a>
            .
          </P>
          <Checklist items={ok.items} ports={ok.frameworks} />
        </Section>
      )}
    </Guide>
  )
}
