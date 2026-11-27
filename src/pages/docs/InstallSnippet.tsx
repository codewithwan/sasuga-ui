import { useLayoutEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { prefersReducedMotion, uiStyle } from '@/fx'
import { cn } from '@/lib/utils'
import { CODE_SURFACE, CODE_VARS, TOKEN_CLASS, useScrollEdges } from './code-kit'
import { CODE_TEXT, CopyButton, FadeEdges } from './CodeBlock'
import { site } from '@/data/site'
import { DEV, MANAGERS, RUN, VERB, readManager, usePackageManager, writeManager } from './package-manager'

const POP = 'cubic-bezier(.2,1.5,.4,1)'

export type InstallSnippetProps = {
  /** Space-separated package names. */
  packages?: string
  /** Install as dev dependencies (-D, or -d for bun). */
  dev?: boolean
  /** 'cli' runs the kit's CLI (`npx <package> init`); 'install' adds npm packages. */
  mode?: 'install' | 'cli'
  /** mode 'cli': what to run, e.g. 'add button'. */
  command?: string
  className?: string
}

/**
 * One card for an install command: a segmented npm / pnpm / yarn / bun switch with a sliding
 * accent pill, and a command line whose changed letters roll out and back in while the
 * unchanged part glides to its new place. The choice is remembered (localStorage) and shared
 * by every snippet on the page.
 */
export function InstallSnippet({ packages = site.package, dev = false, mode = 'install', command: cliCommand = 'init', className }: InstallSnippetProps) {
  const manager = usePackageManager()
  const segs =
    mode === 'cli'
      ? [RUN[manager], site.package, cliCommand]
      : [manager, dev ? `${VERB[manager]} ${DEV[manager]}` : VERB[manager], packages]
  const command = segs.join(' ')

  const group = useRef<HTMLDivElement>(null)
  const pill = useRef<HTMLSpanElement>(null)
  const btns = useRef<(HTMLButtonElement | null)[]>([])
  const line = useRef<HTMLSpanElement>(null)
  const segEls = useRef<(HTMLSpanElement | null)[]>([])
  const prev = useRef<{ texts: string[]; lefts: number[] } | null>(null)
  const scroller = useRef<HTMLPreElement>(null)
  const { edges, update } = useScrollEdges(scroller)
  const active = MANAGERS.indexOf(manager)

  // the accent pill sits under the active option; it springs across on change (CSS ease-snap)
  useLayoutEffect(() => {
    const place = (instant: boolean) => {
      const b = btns.current[MANAGERS.indexOf(readManager())]
      const p = pill.current
      if (!b || !p) return
      if (instant) p.style.transition = 'none'
      p.style.width = `${b.offsetWidth}px`
      p.style.translate = `${b.offsetLeft}px 0`
      if (instant) {
        void p.offsetWidth
        p.style.transition = ''
      }
    }
    place(true)
    const ro = new ResizeObserver(() => place(true))
    if (group.current) ro.observe(group.current)
    document.fonts?.ready.then(() => place(true))
    return () => ro.disconnect()
  }, [])
  const placed = useRef(false)
  useLayoutEffect(() => {
    const b = btns.current[active]
    const p = pill.current
    if (!b || !p) return
    const first = !placed.current
    placed.current = true
    if (first) return
    p.style.width = `${b.offsetWidth}px`
    p.style.translate = `${b.offsetLeft}px 0`
    if (prefersReducedMotion() || uiStyle() === 'flat') return
    p.animate([{ scale: '1' }, { scale: '1.08 .82', offset: 0.55 }, { scale: '.98 1.04', offset: 0.8 }, { scale: '1' }], { duration: 420, easing: 'ease-out' })
  }, [active])

  // the command morph: changed words roll their letters, the rest glides (FLIP)
  const texts = segs.join('\u0000')
  useLayoutEffect(() => {
    const now = segEls.current.map((el) => el?.offsetLeft ?? 0)
    const cur = texts.split('\u0000')
    const before = prev.current
    prev.current = { texts: cur, lefts: now }
    const host = line.current
    if (!before || !host || prefersReducedMotion()) return
    const flat = uiStyle() === 'flat'
    const rise = flat ? 0.35 : 0.8
    cur.forEach((text, s) => {
      const el = segEls.current[s]
      if (!el) return
      if (text === before.texts[s]) {
        const dx = before.lefts[s] - now[s]
        if (dx) el.animate([{ translate: `${dx}px 0` }, { translate: '0 0' }], { duration: flat ? 260 : 420, easing: flat ? 'cubic-bezier(.3,1.2,.5,1)' : POP })
        return
      }
      // the old word leaves upwards, letter by letter, from where it was
      const ghost = document.createElement('span')
      ghost.setAttribute('aria-hidden', 'true')
      ghost.className = `${el.className} pointer-events-none`
      Object.assign(ghost.style, { position: 'absolute', top: '0', left: `${before.lefts[s]}px` })
      host.appendChild(ghost)
      const leaving = [...before.texts[s]].map((ch, i) => {
        const c = document.createElement('span')
        c.className = 'inline-block whitespace-pre'
        c.textContent = ch
        ghost.appendChild(c)
        return c.animate([{ transform: 'none', opacity: 1 }, { transform: `translateY(-${rise}em) scale(${flat ? 1 : 0.7})`, opacity: 0 }], {
          duration: flat ? 160 : 220,
          delay: i * (flat ? 10 : 18),
          easing: 'cubic-bezier(.5,0,.75,0)',
          fill: 'forwards',
        })
      })
      Promise.all(leaving.map((a) => a.finished)).then(
        () => ghost.remove(),
        () => ghost.remove(),
      )
      // the new one rolls in from below with a little overshoot
      Array.from(el.children).forEach((c, i) =>
        c.animate(
          flat
            ? [{ transform: `translateY(${rise}em)`, opacity: 0 }, { transform: 'none', opacity: 1 }]
            : [
                { transform: `translateY(${rise}em) scale(.7)`, opacity: 0 },
                { transform: 'translateY(-0.12em) scale(1.08)', opacity: 1, offset: 0.6 },
                { transform: 'none', opacity: 1 },
              ],
          { duration: flat ? 220 : 380, delay: 60 + i * (flat ? 12 : 24), easing: flat ? 'ease-out' : 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' },
        ),
      )
    })
    update()
  }, [texts, update])

  const choose = (i: number, focus = false) => {
    const m = MANAGERS[(i + MANAGERS.length) % MANAGERS.length]
    if (focus) btns.current[MANAGERS.indexOf(m)]?.focus()
    if (m !== manager) writeManager(m)
  }
  const onKey = (e: KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowRight: active + 1, ArrowDown: active + 1, ArrowLeft: active - 1, ArrowUp: active - 1, Home: 0, End: MANAGERS.length - 1 }
    if (!(e.key in keys)) return
    e.preventDefault()
    choose(keys[e.key], true)
  }

  const segClass = [TOKEN_CLASS.cmd, TOKEN_CLASS.attr, 'text-(color:--code-fg)']

  return (
    <div className={cn('ui-card min-w-0 overflow-hidden', CODE_SURFACE, className)} style={CODE_VARS}>
      <div className="flex min-h-12 flex-wrap items-center gap-2 border-b-(length:--ui-bw-thin) border-b-(color:--ui-line) bg-paper p-1.5 pr-2">
        <div
          ref={group}
          role="radiogroup"
          aria-label="Package manager"
          onKeyDown={onKey}
          className="ui-pill relative isolate inline-flex max-w-full overflow-x-auto bg-canvas p-1 [scrollbar-width:none]"
        >
          <span
            ref={pill}
            aria-hidden="true"
            className="ui-pill ui-fill ui-shadow-sm absolute top-1 bottom-1 left-0 -z-10 bg-accent transition-[translate,width] duration-[420ms] ease-snap"
          />
          {MANAGERS.map((m, i) => (
            <button
              key={m}
              ref={(el) => {
                btns.current[i] = el
              }}
              type="button"
              role="radio"
              aria-checked={m === manager}
              tabIndex={m === manager ? 0 : -1}
              onClick={() => choose(i)}
              className="ui-head ui-pill shrink-0 cursor-pointer border-0 bg-transparent px-3.5 py-2 text-[14px] leading-none text-mute transition-colors duration-200 hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink aria-checked:text-white"
            >
              {m}
            </button>
          ))}
        </div>
        <CopyButton text={command} className="ml-auto" />
      </div>
      <div className="relative bg-(color:--code-bg)">
        <pre
          ref={scroller}
          onScroll={update}
          tabIndex={edges.left || edges.right ? 0 : undefined}
          className={cn('m-0 overflow-x-auto py-4 [scrollbar-width:none] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-accent', CODE_TEXT)}
        >
          <code className="block w-max px-5">
            <span className="sr-only">{command}</span>
            <span ref={line} aria-hidden="true" className="relative inline-block whitespace-pre">
              <span className="text-(color:--code-mute) select-none">$ </span>
              {segs.map((text, s) => (
                <span key={s}>
                  {s > 0 && ' '}
                  <span
                    ref={(el) => {
                      segEls.current[s] = el
                    }}
                    className={cn('relative inline-block whitespace-pre', segClass[s])}
                  >
                    {[...text].map((ch, i) => (
                      <span key={`${text}:${i}`} className="inline-block whitespace-pre">
                        {ch}
                      </span>
                    ))}
                  </span>
                </span>
              ))}
            </span>
          </code>
        </pre>
        <FadeEdges left={edges.left} right={edges.right} />
      </div>
    </div>
  )
}
