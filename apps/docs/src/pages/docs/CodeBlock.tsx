import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { burst, delayed, prefersReducedMotion, spawn, sparkle, uiStyle } from '@/fx'
import { C } from '@/fx/palette'
import { Icon } from '@/components/ui/icon'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { CODE_SURFACE, CODE_VARS, NUMBERED, TOKEN_CLASS, copyText, guessLang, toLines, tokenize, useScrollEdges } from './code-kit'

const POP = 'cubic-bezier(.2,1.6,.4,1)'

/**
 * Copy button with a satisfying "got it": the copy icon squashes away as a check pops in,
 * the pill flashes to the accent, a tiny burst marks it and a toast confirms.
 */
/** `compact`: inside an `@container/bar`, the label drops when the bar is under 25rem and only the icon stays. */
export function CopyButton({ text, label = 'Copy', compact = false, className }: { text: string; label?: string; compact?: boolean; className?: string }) {
  const toast = useToast()
  const ref = useRef<HTMLButtonElement>(null)
  const timer = useRef(0)
  const [copied, setCopied] = useState(false)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = () => {
    copyText(text).then(
      () => {
        setCopied(true)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setCopied(false), 1800)
        toast('Copied to clipboard', { sfx: 'コピー', variant: 'success', duration: 2200 })
        const el = ref.current
        if (!el || prefersReducedMotion()) return
        const flat = uiStyle() === 'flat'
        el.animate(
          flat
            ? [{ transform: 'scale(.94)' }, { transform: 'none' }]
            : [{ transform: 'scale(1)' }, { transform: 'scale(1.14, .82)', offset: 0.25 }, { transform: 'scale(.96, 1.06)', offset: 0.6 }, { transform: 'none' }],
          { duration: flat ? 200 : 380, easing: flat ? 'ease-out' : POP },
        )
        const r = el.getBoundingClientRect()
        spawn(burst(r.left + 16, r.top + r.height / 2, { radius: 16, spikes: 8 }))
        if (!flat) spawn(delayed(0.08, sparkle(r.right - 4, r.top - 2, { size: 8, color: C.pop })))
      },
      () => toast('Copy failed: select the text instead', { sfx: 'エラー', variant: 'danger' }),
    )
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={copy}
      data-copied={copied || undefined}
      aria-label={copied ? 'Copied' : `${label} to clipboard`}
      className={cn(
        'ui-head ui-pill ui-border-thin group/copy inline-flex shrink-0 cursor-pointer items-center gap-1.5 bg-paper py-1.5 pr-3 pl-2.5 text-[13px] leading-none text-ink transition-[background-color,color,translate,border-color] duration-200 ease-snap hover:-translate-y-px hover:bg-canvas focus-visible:ui-focus active:translate-y-px data-copied:border-transparent data-copied:bg-accent data-copied:text-white',
        compact && '@max-[25rem]/bar:size-9 @max-[25rem]/bar:justify-center @max-[25rem]/bar:p-0',
        className,
      )}
    >
      <span aria-hidden="true" className="grid size-[15px] place-items-center *:col-start-1 *:row-start-1">
        <Icon
          name="copy"
          tone="line"
          size={15}
          className="transition-[scale,opacity] duration-200 ease-snap group-data-copied/copy:scale-[.2_.6] group-data-copied/copy:opacity-0"
        />
        <Icon
          name="check"
          tone="line"
          size={15}
          className="scale-[.2_.6] opacity-0 transition-[scale,opacity] delay-75 duration-300 ease-snap group-data-copied/copy:scale-100 group-data-copied/copy:opacity-100"
        />
      </span>
      <span className={cn(compact && '@max-[25rem]/bar:hidden')}>{copied ? 'Copied' : label}</span>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Copied to clipboard' : ''}
      </span>
    </button>
  )
}

/** Soft fades on the code surface that show there is more to scroll. */
export function FadeEdges({ left, right }: { left: boolean; right: boolean }) {
  const base = 'pointer-events-none absolute inset-y-0 w-10 transition-opacity duration-200'
  return (
    <>
      <span aria-hidden="true" className={cn(base, 'left-0 bg-[linear-gradient(to_right,var(--code-bg),transparent)]', left ? 'opacity-100' : 'opacity-0')} />
      <span aria-hidden="true" className={cn(base, 'right-0 bg-[linear-gradient(to_left,var(--code-bg),transparent)]', right ? 'opacity-100' : 'opacity-0')} />
    </>
  )
}

/** Mono typography shared by every snippet surface. */
export const CODE_TEXT = 'font-mono text-[13.5px] leading-[1.75] font-medium text-(color:--code-fg) [tab-size:2] selection:bg-accent/45 selection:text-(color:--code-fg)'

export type CodeBlockProps = {
  code: string
  /** File name in the header. Default: taken from a first-line comment like `// main.tsx` (a bare file-name line is then hidden). */
  title?: string
  /** Language badge. Default: guessed from the file name or the code. */
  lang?: string
  /** Show line numbers. Default: on for code files longer than four lines. */
  lineNumbers?: boolean
  className?: string
}

/**
 * A snippet card: a header with the file name, a language badge and a copy button over a
 * deep ink-tinted code surface with theme-token syntax colours. Long lines scroll sideways
 * behind a fade; line numbers stay pinned while they do.
 */
export function CodeBlock({ code, title, lang, lineNumbers, className }: CodeBlockProps) {
  const { body, file, language, lines } = useMemo(() => {
    let body = code.replace(/\s+$/, '')
    let file = title
    // "// main.tsx" names the file (and is hidden); "// tsconfig.json → paths" names it and stays
    const head = /^\/\/\s*([\w@./-]+\.[a-z]{2,4})\b([^\n]*)\n/.exec(body)
    if (!file && head) {
      file = head[1]
      if (!head[2].trim()) body = body.slice(head[0].length)
    }
    const language = lang ?? guessLang(body, file)
    return { body, file, language, lines: toLines(tokenize(body)) }
  }, [code, title, lang])

  const scroller = useRef<HTMLPreElement>(null)
  const { edges, update } = useScrollEdges(scroller)
  const numbered = lineNumbers ?? (lines.length > 4 && NUMBERED.has(language))
  const scrollable = edges.left || edges.right

  return (
    <figure className={cn('ui-card m-0 min-w-0 overflow-hidden', CODE_SURFACE, className)} style={CODE_VARS}>
      <figcaption className="flex min-h-12 items-center gap-2.5 border-b-(length:--ui-bw-thin) border-b-(color:--ui-line) bg-paper py-2 pr-2 pl-3">
        <span className="ui-pill shrink-0 bg-accent-soft/70 px-2 py-1 font-mono text-[11px] leading-none font-bold text-ink">{language}</span>
        {file && <span className="min-w-0 truncate font-mono text-[13px] font-semibold text-mute">{file}</span>}
        <CopyButton text={body} className="ml-auto" />
      </figcaption>
      <div className="relative bg-(color:--code-bg)">
        <pre
          ref={scroller}
          onScroll={update}
          tabIndex={scrollable ? 0 : undefined}
          aria-label={scrollable ? `${file ?? language} code, scrolls sideways` : undefined}
          className={cn(
            'm-0 overflow-x-auto py-4 [scrollbar-color:var(--code-mute)_transparent] [scrollbar-width:thin] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-accent',
            CODE_TEXT,
          )}
        >
          <code className={cn('min-w-max', numbered ? 'grid grid-cols-[auto_1fr]' : 'block')}>
            {lines.map((line, i) => (
              <Fragment key={i}>
                {numbered && (
                  <span aria-hidden="true" className="sticky left-0 z-10 bg-(color:--code-bg) pr-4 pl-4 text-right text-(color:--code-mute) select-none">
                    {i + 1}
                  </span>
                )}
                <span className={cn('block pr-6 whitespace-pre', numbered ? 'pl-1' : 'pl-5')}>{line.length ? line.map(renderToken) : ' '}</span>
              </Fragment>
            ))}
          </code>
        </pre>
        <FadeEdges left={edges.left && !numbered} right={edges.right} />
      </div>
    </figure>
  )
}

function renderToken(t: { text: string; kind?: keyof typeof TOKEN_CLASS }, i: number): ReactNode {
  return t.kind ? (
    <span key={i} className={TOKEN_CLASS[t.kind]}>
      {t.text}
    </span>
  ) : (
    <Fragment key={i}>{t.text}</Fragment>
  )
}

export function PreviewPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('ui-card ui-tone relative isolate grid min-h-[240px] place-items-center px-6 py-12 text-ink', className)}>{children}</div>
}
