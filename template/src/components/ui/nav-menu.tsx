import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react'
import type { AnchorHTMLAttributes, ElementType, KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { Icon } from '@/components/ui/icon'
import { clamp, prefersReducedMotion, uiStyle, useSprings } from '@/fx'
import { cn } from '@/lib/utils'

export type NavMenuItem = { id: string; label: string; href: string; badge?: ReactNode }
export type NavMenuGroup = { id: string; label: string; icon?: ReactNode; items: NavMenuItem[] }

/** Props NavMenu hands to every link. Spread them onto your router's link (map `href` to `to` if needed). */
export type NavMenuLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string
  ref: (el: HTMLAnchorElement | null) => void
}

export type NavMenuProps = {
  groups: NavMenuGroup[]
  /** Id of the current page's item (controlled). Its group opens when it changes. */
  activeId?: string
  /** Initial active item when `activeId` is not controlled; clicks then move it. */
  defaultActiveId?: string
  /** Called on every item click (call `event.preventDefault()` to cancel a plain link). */
  onNavigate?: (item: NavMenuItem, event: MouseEvent<HTMLAnchorElement>) => void
  /** Show a filter field that narrows the items live. */
  searchable?: boolean
  searchPlaceholder?: string
  /** Groups open at first: `true` all, an id list, or (default) the active item's group / the first group. */
  defaultOpen?: string[] | boolean
  /** Accessible name of the <nav>. */
  label?: string
  /** Render each link yourself, e.g. `(p) => <Link to={p.href} {...p} />` for react-router. */
  renderLink?: (props: NavMenuLinkProps, item: NavMenuItem) => ReactNode
  /** Link component that takes `href` (Next.js Link, …). Ignored when `renderLink` is set. Default <a>. */
  as?: ElementType
  className?: string
}

const WHIP = 'cubic-bezier(.7,0,.2,1)'

/** Layout offset of `el` inside `root`, ignoring transforms (so dealt-in items don't drag the cursor). */
function offsetWithin(el: HTMLElement, root: HTMLElement) {
  let x = 0
  let y = 0
  let n: HTMLElement | null = el
  while (n && n !== root) {
    x += n.offsetLeft
    y += n.offsetTop
    n = n.offsetParent as HTMLElement | null
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight }
}

const norm = (s: string) => s.trim().toLowerCase()

type View = { g: NavMenuGroup; items: NavMenuItem[]; visible: boolean }
function filterGroups(groups: NavMenuGroup[], q: string): View[] {
  return groups.map((g) => {
    const items = !q || g.label.toLowerCase().includes(q) ? g.items : g.items.filter((i) => i.label.toLowerCase().includes(q))
    return { g, items, visible: !q || items.length > 0 }
  })
}

function Highlight({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q) : -1
  if (i < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent text-inherit underline decoration-pop decoration-2 underline-offset-2">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  )
}

/**
 * Grouped sidebar navigation. Group headers carry a count and a chevron that spins; a group
 * opens with a bounce and deals its items in. One accent cursor springs between active
 * items (across groups too), slides with a light settle, and parks on the header
 * when its group is folded. The optional filter pops items out and back in as you type.
 * Keyboard: roving focus with ↑/↓, Home/End, → opens a group (or enters it), ← leaves or
 * folds it, and typing a letter jumps to the next matching entry.
 */
export function NavMenu({
  groups,
  activeId,
  defaultActiveId,
  onNavigate,
  searchable = false,
  searchPlaceholder = 'Filter…',
  defaultOpen,
  label = 'Menu',
  renderLink,
  as,
  className,
}: NavMenuProps) {
  const base = useId()
  const [inner, setInner] = useState(defaultActiveId)
  const active = activeId ?? inner
  const groupOf = (id: string | undefined) => (id === undefined ? undefined : groups.find((g) => g.items.some((i) => i.id === id))?.id)

  const [open, setOpen] = useState<Set<string>>(() => {
    const s = new Set<string>(defaultOpen === true ? groups.map((g) => g.id) : Array.isArray(defaultOpen) ? defaultOpen : [])
    const ag = groupOf(active)
    if (ag) s.add(ag)
    if (!s.size && defaultOpen === undefined && groups[0]) s.add(groups[0].id)
    return s
  })
  // a new current page opens its group (state adjusted during render, no effect needed)
  const [seenActive, setSeenActive] = useState(active)
  if (active !== seenActive) {
    setSeenActive(active)
    const ag = groupOf(active)
    if (ag && !open.has(ag)) setOpen(new Set(open).add(ag))
  }

  const [query, setQuery] = useState('')
  const q = norm(query)
  const saved = useRef<Set<string> | null>(null)
  const view = filterGroups(groups, q)
  const total = view.reduce((n, v) => n + (v.visible ? v.items.length : 0), 0)

  const [focusKey, setFocusKey] = useState<string | null>(null)
  const typed = useRef({ s: '', t: 0 })

  const track = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const ink = useRef<HTMLSpanElement>(null)
  const landing = useRef<number | null>(null)

  /* element registry: g: group li · h: header · c: chevron · b: badge · p: panel · i: item li · a: link */
  const [els] = useState(() => new Map<string, HTMLElement>())
  const [refs] = useState(() => new Map<string, (el: HTMLElement | null) => void>())
  const reg = (key: string) => {
    let fn = refs.get(key)
    if (!fn) {
      fn = (el) => {
        if (el) els.set(key, el)
        else els.delete(key)
      }
      refs.set(key, fn)
    }
    return fn
  }

  // what is logically on screen, in document order; focus nodes are the headers and reachable links
  const shown: string[] = []
  const nodes: string[] = []
  const labels = new Map<string, string>()
  for (const v of view) {
    const isOpen = open.has(v.g.id)
    if (v.visible) {
      shown.push(`g:${v.g.id}`)
      nodes.push(`h:${v.g.id}`)
      labels.set(`h:${v.g.id}`, v.g.label)
    }
    if (isOpen) shown.push(`p:${v.g.id}`)
    for (const it of v.items) {
      shown.push(`i:${it.id}`)
      if (v.visible && isOpen) {
        nodes.push(`a:${it.id}`)
        labels.set(`a:${it.id}`, it.label)
      }
    }
  }
  const signature = shown.join('|')
  const tabStop = focusKey && nodes.includes(focusKey) ? focusKey : active !== undefined && nodes.includes(`a:${active}`) ? `a:${active}` : nodes[0]

  // live state for callbacks that outlive a render (ResizeObserver, springs)
  const live = useRef({ active, shown: new Set<string>(), groupOf })
  useLayoutEffect(() => {
    live.current = { active, shown: new Set(shown), groupOf }
  })

  /* ── the cursor ── */

  const land = () => {
    const el = ink.current
    if (!el || prefersReducedMotion()) return
    // a small settle so it doesn't feel flat — no sparkle, no big squash
    el.animate([{ scale: '1' }, { scale: '1.015 .95' }, { scale: '1' }], { duration: 220, easing: 'ease-out' })
  }

  const spring = useSprings(
    ink,
    { x: 0, y: 0, w: 0, h: 0, o: 0 },
    (v, el, vel) => {
      const speed = Math.abs(vel.y)
      const o = clamp(v.o, 0, 1)
      // plain slide with a light settle
      el.style.width = `${Math.max(v.w, 0)}px`
      el.style.height = `${Math.max(v.h, 0)}px`
      el.style.transform = `translate(${v.x}px, ${v.y}px)`
      el.style.opacity = String(o)
      const l = landing.current
      if (l !== null && Math.abs(v.y - l) < 1.5 && speed < 400) {
        landing.current = null
        land()
      }
    },
    { stiffness: 320, damping: 27 },
  )

  /** Where the cursor should be: the active link, its folded group's header (as a slim tab), or hidden. */
  const target = useCallback(() => {
    const root = track.current
    const { active: a, shown: s, groupOf: gOf } = live.current
    if (!root || a === undefined) return { o: 0 }
    const gid = gOf(a)
    const link = els.get(`a:${a}`)
    if (link && gid && s.has(`i:${a}`) && s.has(`p:${gid}`) && s.has(`g:${gid}`)) return { ...offsetWithin(link, root), o: 1 }
    const head = gid && s.has(`g:${gid}`) ? els.get(`h:${gid}`) : undefined
    if (head) {
      const r = offsetWithin(head, root)
      return { x: r.x + 3, y: r.y + r.h * 0.22, w: 5, h: r.h * 0.56, o: 1 }
    }
    return { o: 0 }
  }, [els])

  const place = useCallback(
    (mode: 'snap' | 'set' | 'fly') => {
      const t = target()
      if (mode === 'snap' || prefersReducedMotion()) return spring.snap(t)
      if (mode === 'fly' && 'y' in t) landing.current = t.y
      spring.set(t)
    },
    [spring, target],
  )

  useLayoutEffect(() => {
    place('snap')
    const ro = new ResizeObserver(() => place('set'))
    if (list.current) ro.observe(list.current)
    document.fonts?.ready.then(() => place('snap'))
    // bring the current page into view inside a scrolling sidebar (never scrolls the page)
    const a = live.current.active
    const link = a === undefined ? undefined : els.get(`a:${a}`)
    if (link?.offsetParent) {
      let sc = link.parentElement
      while (sc && !(sc.scrollHeight > sc.clientHeight && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement
      if (sc && sc !== document.scrollingElement) {
        const lr = link.getBoundingClientRect()
        const sr = sc.getBoundingClientRect()
        if (lr.bottom > sr.bottom || lr.top < sr.top) sc.scrollTop += lr.top - sr.top - sr.height / 3
      }
    }
    return () => ro.disconnect()
  }, [place, els])

  const firstActive = useRef(true)
  useLayoutEffect(() => {
    if (firstActive.current) {
      firstActive.current = false
      return
    }
    place('fly')
  }, [active, place])

  /* ── presence: groups/items popping in and out, panels bouncing open and snapping shut ── */

  const prevShown = useRef<Set<string> | null>(null)
  useLayoutEffect(() => {
    const prev = prevShown.current
    const now = new Set(signature ? signature.split('|') : [])
    prevShown.current = now
    if (!prev || prefersReducedMotion()) return place('set')
    const style = uiStyle()
    const flat = style === 'flat'

    const settle = (el: HTMLElement, key: string) => () => {
      if (el.getAnimations().length) return // a newer animation took over
      el.hidden = !prevShown.current?.has(key)
      el.style.overflow = ''
    }
    const run = (el: HTMLElement, key: string, kf: Keyframe[], opts: KeyframeAnimationOptions) => {
      el.getAnimations().forEach((a) => a.cancel())
      const fin = settle(el, key)
      el.animate(kf, opts).finished.then(fin, fin)
    }

    let dealt = 0
    for (const v of view) {
      const keys = [`g:${v.g.id}`, `p:${v.g.id}`, ...v.g.items.map((i) => `i:${i.id}`)]
      for (const key of keys) {
        const was = prev.has(key)
        const is = now.has(key)
        if (was === is) continue
        const el = els.get(key)
        if (!el) continue
        const kind = key[0]
        if (kind === 'p') {
          const gid = key.slice(2)
          const chev = els.get(`c:${gid}`)
          if (is) {
            const h = el.offsetHeight
            el.style.overflow = 'clip'
            run(
              el,
              key,
              [
                { height: '0px', opacity: 0 },
                { height: `${h}px`, opacity: 1 },
              ],
              { duration: flat ? 200 : 240, easing: 'cubic-bezier(.2,.8,.2,1)' },
            )
            // items drift in, barely staggered
            el.querySelectorAll<HTMLElement>(':scope > ul > li:not([hidden]) > *').forEach((link, i) =>
              link.animate(
                [
                  { transform: 'translateY(-4px)', opacity: 0 },
                  { transform: 'none', opacity: 1 },
                ],
                { duration: 200, delay: 40 + i * 14, easing: 'ease-out', fill: 'backwards' },
              ),
            )
            chev?.animate([{ rotate: '0deg' }, { rotate: '180deg' }], { duration: 220, easing: 'ease-out' })
          } else {
            el.hidden = false
            const h = el.offsetHeight
            el.style.overflow = 'clip'
            run(el, key, [{ height: `${h}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 180, easing: 'ease-in' })
            chev?.animate([{ rotate: '180deg' }, { rotate: '0deg' }], { duration: 200, easing: 'ease-out' })
          }
        } else if (is) {
          // pop in: grow the row and spring the content up from small
          const h = el.offsetHeight
          run(
            el,
            key,
            flat
              ? [
                  { height: '0px', opacity: 0, transform: 'translateY(-4px)' },
                  { height: `${h}px`, opacity: 1, transform: 'none' },
                ]
              : [
                  { height: '0px', opacity: 0, transform: 'translateY(-4px)' },
                  { height: `${h}px`, opacity: 1, transform: 'none' },
                ],
            { duration: 200, delay: dealt++ * 10, easing: 'ease-out', fill: 'backwards' },
          )
        } else {
          // pop out: shrink away and close the gap
          el.hidden = false
          const h = el.offsetHeight
          run(
            el,
            key,
            [
              { height: `${h}px`, opacity: 1, transform: 'none' },
              { height: '0px', opacity: 0, transform: flat ? 'translateY(-4px)' : 'translateX(-12px) scale(.5)' },
            ],
            { duration: flat ? 140 : 200, easing: WHIP },
          )
        }
      }
    }
    place('set')
    // keyed on what is shown; `view` is derived from the same render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, place])

  // counts bounce when the filter changes them
  const counts = view.map((v) => `${v.g.id}:${v.items.length}`).join('|')
  const prevCounts = useRef(counts)
  useLayoutEffect(() => {
    const before = new Map(prevCounts.current.split('|').map((s) => s.split(':') as [string, string]))
    prevCounts.current = counts
    if (prefersReducedMotion()) return
    for (const v of view) {
      if (before.get(v.g.id) === String(v.items.length)) continue
      els.get(`b:${v.g.id}`)?.animate([{ scale: '1' }, { scale: '1.35' }, { scale: '.9' }, { scale: '1' }], { duration: 320, easing: 'ease-out' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counts])

  /* ── interaction ── */

  const toggle = (id: string) =>
    setOpen((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const onQuery = (value: string) => {
    const nq = norm(value)
    if (nq && !q) saved.current = open
    setQuery(value)
    if (nq) {
      const next = filterGroups(groups, nq)
      setOpen(new Set(next.filter((v) => v.visible).map((v) => v.g.id)))
      const count = next.reduce((n, v) => n + (v.visible ? v.items.length : 0), 0)
      if (!count && total && search.current && !prefersReducedMotion())
        search.current.animate([{ translate: '0' }, { translate: '-6px' }, { translate: '5px' }, { translate: '-3px' }, { translate: '0' }], { duration: 320 })
    } else if (q) {
      const back = new Set(saved.current ?? open)
      const ag = groupOf(active)
      if (ag) back.add(ag)
      setOpen(back)
      saved.current = null
    }
  }

  const focusNode = (key: string | undefined) => {
    if (key) els.get(key)?.focus()
  }

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      focusNode(nodes.find((k) => k[0] === 'a') ?? nodes[0])
    } else if (e.key === 'Enter' && q) {
      e.preventDefault()
      const first = nodes.find((k) => k[0] === 'a')
      if (first) els.get(first)?.click()
    } else if (e.key === 'Escape' && query) {
      e.preventDefault()
      e.stopPropagation()
      onQuery('')
    }
  }

  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.target instanceof HTMLInputElement) return
    const cur = focusKey && nodes.includes(focusKey) ? focusKey : tabStop
    const i = cur ? nodes.indexOf(cur) : -1
    const n = nodes.length
    const go = (k: string | undefined) => {
      e.preventDefault()
      focusNode(k)
    }
    if (!cur || !n || i < 0) return
    const isHead = cur[0] === 'h'
    const gid = isHead ? cur.slice(2) : groupOf(cur.slice(2))
    switch (e.key) {
      case 'ArrowDown':
        return go(nodes[Math.min(i + 1, n - 1)])
      case 'ArrowUp':
        if (i === 0 && searchable) {
          e.preventDefault()
          return search.current?.focus()
        }
        return go(nodes[Math.max(i - 1, 0)])
      case 'Home':
        return go(nodes[0])
      case 'End':
        return go(nodes[n - 1])
      case 'ArrowRight':
        if (!isHead || !gid) return
        e.preventDefault()
        if (!open.has(gid)) return toggle(gid)
        return nodes[i + 1]?.[0] === 'a' ? focusNode(nodes[i + 1]) : undefined
      case 'ArrowLeft':
        if (!gid) return
        e.preventDefault()
        if (!isHead) return focusNode(`h:${gid}`)
        if (open.has(gid)) toggle(gid)
        return
    }
    // type-ahead: jump to the next entry starting with what was typed
    if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey || !/\S/.test(e.key)) return
    const now = performance.now()
    const buf = (now - typed.current.t < 600 ? typed.current.s : '') + e.key.toLowerCase()
    typed.current = { s: buf, t: now }
    const same = [...buf].every((c) => c === buf[0])
    const needle = same ? buf[0] : buf
    const start = same ? i + 1 : i
    for (let step = 0; step < n; step++) {
      const k = nodes[(start + step) % n]
      if (labels.get(k)?.toLowerCase().startsWith(needle)) return go(k)
    }
  }

  const Link = as ?? 'a'
  const listId = `${base}-list`

  return (
    <nav aria-label={label} className={cn('grid gap-3 text-ink', className)}>
      {searchable && (
        <div className="relative">
          <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 grid -translate-y-1/2 place-items-center text-mute">
            <Icon name="search" tone="line" size={17} />
          </span>
          <input
            ref={search}
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={onSearchKey}
            placeholder={searchPlaceholder}
            aria-label={`Filter ${label.toLowerCase()}`}
            aria-controls={listId}
            autoComplete="off"
            spellCheck={false}
            className="ui-border-thin ui-pill ui-shadow-sm w-full bg-paper py-2 pr-9 pl-9 text-[15px] font-semibold text-ink transition-shadow duration-200 ease-snap placeholder:font-medium placeholder:text-mute focus:ui-shadow focus-visible:ui-focus [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear filter"
              onClick={() => {
                onQuery('')
                search.current?.focus()
              }}
              className="ui-pill absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 animate-pop cursor-pointer place-items-center border-0 bg-transparent p-0 text-mute transition-[color,background-color,scale] duration-200 ease-snap hover:scale-110 hover:bg-accent-soft hover:text-ink focus-visible:ui-focus"
            >
              <Icon name="close" tone="line" size={14} />
            </button>
          )}
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {q ? `${total} ${total === 1 ? 'result' : 'results'}` : ''}
      </p>

      <div ref={track} onKeyDown={onKey} className="relative isolate">
        <span ref={ink} aria-hidden="true" className="ui-pill ui-fill ui-shadow-sm pointer-events-none absolute top-0 left-0 -z-10 bg-accent opacity-0" />

        <ul ref={list} id={listId} className="m-0 grid list-none gap-1 p-0">
          {view.map(({ g, items, visible }) => {
            const isOpen = open.has(g.id)
            const hk = `h:${g.id}`
            const pid = `${base}-p-${g.id}`
            const hidden = new Set(g.items.filter((it) => !items.includes(it)).map((it) => it.id))
            return (
              <li key={g.id} ref={reg(`g:${g.id}`)} hidden={!visible} className="origin-left">
                <button
                  ref={reg(hk)}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={pid}
                  tabIndex={tabStop === hk ? 0 : -1}
                  onFocus={() => setFocusKey(hk)}
                  onClick={() => toggle(g.id)}
                  className="ui-head ui-pill group/h flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent py-2 pr-2 pl-3 text-left text-[13px] leading-tight text-accent transition-[background-color,color] duration-200 hover:bg-canvas hover:text-ink focus-visible:ui-focus"
                >
                  {g.icon && (
                    <span aria-hidden="true" className="grid shrink-0 place-items-center transition-transform duration-300 ease-snap group-hover/h:-rotate-12">
                      {g.icon}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate py-0.5">{g.label}</span>
                  <span
                    ref={reg(`b:${g.id}`)}
                    className="ui-pill min-w-6 shrink-0 bg-accent-soft px-1.5 py-1 text-center font-sans text-[11px] leading-none font-bold text-ink tabular-nums normal-case"
                  >
                    {items.length}
                    <span className="sr-only"> {items.length === 1 ? 'item' : 'items'}</span>
                  </span>
                  <span ref={reg(`c:${g.id}`)} aria-hidden="true" className={cn('grid shrink-0 place-items-center text-mute', isOpen && 'rotate-180')}>
                    <Icon name="chevron-down" tone="line" size={16} />
                  </span>
                </button>
                <div ref={reg(`p:${g.id}`)} id={pid} hidden={!isOpen}>
                  <ul className="m-0 ml-[18px] grid list-none gap-0.5 border-0 border-l-[length:var(--ui-bw-thin)] border-solid border-line py-1 pr-0 pl-2">
                    {g.items.map((it) => {
                      const ak = `a:${it.id}`
                      const current = it.id === active
                      const props: NavMenuLinkProps = {
                        href: it.href,
                        ref: reg(ak),
                        'aria-current': current ? 'page' : undefined,
                        tabIndex: tabStop === ak ? 0 : -1,
                        onFocus: () => setFocusKey(ak),
                        onClick: (e) => {
                          onNavigate?.(it, e)
                          if (activeId === undefined) setInner(it.id)
                        },
                        className: cn(
                          'ui-pill flex min-w-0 items-center gap-2 px-3 py-1.5 text-[15px] leading-tight font-bold no-underline transition-[translate,background-color,color] duration-200 ease-snap focus-visible:ui-focus',
                          current ? 'text-white' : 'text-ink hover:translate-x-1 hover:bg-accent-soft/45',
                        ),
                        children: (
                          <>
                            <span className="min-w-0 flex-1 truncate">
                              <Highlight text={it.label} q={q} />
                            </span>
                            {it.badge !== undefined && (
                              <span className={cn('ui-pill shrink-0 px-1.5 py-0.5 text-[11px] leading-none font-bold', current ? 'bg-paper/25 text-white' : 'bg-canvas text-mute')}>
                                {it.badge}
                              </span>
                            )}
                          </>
                        ),
                      }
                      return (
                        <li key={it.id} ref={reg(`i:${it.id}`)} hidden={hidden.has(it.id)} className="origin-left">
                          {renderLink ? renderLink(props, it) : <Link {...props} />}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {q && !total && (
        <p className="m-0 animate-pop px-3 text-sm text-mute">
          Nothing matches <strong className="text-ink">“{query.trim()}”</strong>.
        </p>
      )}
    </nav>
  )
}
