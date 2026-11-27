import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, HTMLAttributes } from 'react'
import { burst, centerOf, clamp, delayed, prefersReducedMotion, rays, shards, slash, smoke, sparkle, spawn, uiStyle, useSprings } from '@/fx'
import { C } from '@/fx/palette'
import { cn } from '@/lib/utils'
import { Icon } from './icon'

export type QuestObjective = {
  id: string
  label: string
  /** With `target`, shows "current/target" and a mini bar; done when current ≥ target. */
  current?: number
  target?: number
  /** Explicit done flag (for objectives without a count). */
  done?: boolean
}

export type Quest = {
  id: string
  title: string
  description?: string
  /** Shown as a small chip, e.g. "300 G". */
  reward?: string
  objectives: QuestObjective[]
}

export type QuestGroup = {
  id: string
  title: string
  quests: Quest[]
  /** Starts expanded (default true). */
  defaultOpen?: boolean
}

export type QuestLogProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** Controlled data: update it and the log animates what changed. */
  groups: QuestGroup[]
  /** Stamp that lands on a cleared quest. `false` = none. */
  clearText?: string | false
}

const POP = 'cubic-bezier(.2,1.6,.4,1)'
const STAMP: CSSProperties = { fontFamily: 'var(--font-display)', color: 'var(--color-pop)', transform: 'translateY(-50%)' }

const isObjectiveDone = (o: QuestObjective) => o.done ?? (o.target != null && (o.current ?? 0) >= o.target)
const isQuestDone = (q: Quest) => q.objectives.length > 0 && q.objectives.every(isObjectiveDone)

function Check({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn('fill-none stroke-current stroke-[3.6] [stroke-linecap:round] [stroke-linejoin:round]', className)}>
      <path
        d="M5 12.5 9.5 17 19 7"
        pathLength={1}
        strokeDasharray="1"
        className="transition-[stroke-dashoffset] delay-150 duration-300 ease-whip [stroke-dashoffset:1] in-data-done:[stroke-dashoffset:0]"
      />
    </svg>
  )
}

function ObjectiveRow({ o, onDone }: { o: QuestObjective; onDone: (o: QuestObjective) => void }) {
  const done = isObjectiveDone(o)
  const labelEl = useRef<HTMLSpanElement>(null)
  const count = useRef<HTMLSpanElement>(null)
  const box = useRef<HTMLSpanElement>(null)
  const prevDone = useRef(done)
  const prevCur = useRef(o.current)
  const onDoneRef = useRef(onDone)
  useLayoutEffect(() => {
    onDoneRef.current = onDone
  })

  useEffect(() => {
    const wasDone = prevDone.current
    const was = prevCur.current
    prevDone.current = done
    prevCur.current = o.current
    const still = prefersReducedMotion()
    if (!still && o.current !== was && count.current) {
      count.current.animate([{ transform: 'scale(1.6)', color: 'var(--color-pop)' }, { transform: 'none' }], { duration: 360, easing: POP })
    }
    if (!done || wasDone) return
    onDoneRef.current(o)
    if (still) return
    // the slash cuts across the label; the strike line and the check draw in behind it
    const el = labelEl.current
    if (el) {
      const r = el.getBoundingClientRect()
      spawn(slash(r.left - 10, r.top + r.height * 0.75, r.right + 14, r.top + r.height * 0.3, { width: 7, bend: 0.06 }))
    }
    box.current?.animate([{ transform: 'scale(.4)' }, { transform: 'scale(1.3)', offset: 0.6 }, { transform: 'none' }], { duration: 380, delay: 60, easing: POP })
    if (box.current) {
      const { x, y } = centerOf(box.current)
      spawn(delayed(0.12, sparkle(x + 10, y - 10, { size: 10, color: C.pop })))
    }
  }, [done, o])

  const hasCount = o.target != null
  const pct = hasCount ? clamp(((o.current ?? 0) / Math.max(1, o.target!)) * 100, 0, 100) : 0

  return (
    <li data-done={done || undefined} className="group/obj flex items-center gap-2.5 text-[15px] leading-snug">
      <span
        ref={box}
        className="ui-border-thin ui-r-sm grid size-5 shrink-0 place-items-center bg-paper text-white transition-colors duration-200 group-data-done/obj:ui-fill group-data-done/obj:bg-accent"
      >
        <Check className="size-3.5" />
      </span>
      <span className="relative min-w-0 flex-1">
        <span ref={labelEl} className="relative inline-block max-w-full text-ink transition-colors delay-150 duration-300 group-data-done/obj:text-mute">
          {o.label}
          <span
            aria-hidden="true"
            className="ui-rule absolute inset-x-[-2px] top-1/2 origin-left scale-x-0 transition-transform delay-100 duration-300 ease-whip group-data-done/obj:scale-x-100"
          />
        </span>
      </span>
      {hasCount && (
        <span className="flex shrink-0 items-center gap-2">
          <span aria-hidden="true" className="ui-pill relative hidden h-1.5 w-12 overflow-hidden bg-canvas sm:block">
            <span className="absolute inset-y-0 left-0 bg-accent transition-[width] duration-500 ease-snap" style={{ width: `${pct}%` }} />
          </span>
          <span ref={count} className="ui-head inline-block min-w-9 text-right text-[13px] leading-none tabular-nums">
            {Math.min(o.current ?? 0, o.target!)}/{o.target}
          </span>
        </span>
      )}
      <span className="sr-only">{done ? '(complete)' : ''}</span>
    </li>
  )
}

function QuestCard({ quest, clearText, announce }: { quest: Quest; clearText: string | false; announce: (msg: string) => void }) {
  const card = useRef<HTMLElement>(null)
  const stamp = useRef<HTMLSpanElement>(null)
  const done = isQuestDone(quest)
  const doneCount = quest.objectives.filter(isObjectiveDone).length
  const prevDone = useRef(done)
  const announceRef = useRef(announce)
  useLayoutEffect(() => {
    announceRef.current = announce
  })

  const spring = useSprings(
    card,
    { y: 0, s: 0 },
    (v, el) => {
      el.style.transform = `translateY(${v.y}px) scale(${1 + v.s * 0.015}, ${1 - v.s * 0.025})`
    },
    { stiffness: 480, damping: 12 },
  )

  const onObjectiveDone = (o: QuestObjective) => {
    announce(`Objective complete: ${o.label}`)
    spring.kick({ y: -220, s: 5 })
  }

  // whole quest cleared: big bounce, the stamp lands with a burst
  useEffect(() => {
    const was = prevDone.current
    prevDone.current = done
    if (!done || was) return
    announceRef.current(`Quest clear: ${quest.title}`)
    if (prefersReducedMotion()) return
    const flat = uiStyle() === 'flat'
    const t = window.setTimeout(() => {
      spring.kick({ y: -420, s: 12 })
      const el = stamp.current
      const host = card.current
      if (!host) return
      const target = el && el.offsetParent ? el : host
      const { x, y } = centerOf(target)
      el?.animate(
        [
          { opacity: 0, transform: 'translateY(-50%) scale(3.2)' },
          { opacity: 1, transform: 'translateY(-50%) scale(.86)', offset: 0.55 },
          { opacity: 1, transform: 'translateY(-50%) scale(1)' },
        ],
        { duration: 380, easing: 'cubic-bezier(.5,0,.3,1.4)', fill: 'backwards' },
      )
      host.animate([{ backgroundColor: 'var(--color-accent-soft)' }, { backgroundColor: 'var(--color-paper)' }], { duration: 520, easing: 'ease-out' })
      window.setTimeout(() => {
        spawn(
          rays(x, y, { inner: 40, outer: 170, count: 18 }),
          burst(x, y, { radius: flat ? 60 : 56, spikes: 13, color: C.pop }),
          shards(x, y, { count: 14, speed: 520 }),
          delayed(0.05, smoke(x, y + 16, { count: 5, spread: 50, size: 12 })),
          delayed(0.14, sparkle(x - 50, y - 24, { size: 14 })),
        )
      }, 200)
    }, 420)
    return () => window.clearTimeout(t)
  }, [done, quest.title, spring])

  return (
    <article ref={card} data-done={done || undefined} className="ui-card ui-tone relative grid origin-bottom gap-3 p-4 text-ink">
      <header className="flex items-start gap-3">
        <span className="grid min-w-0 flex-1 gap-1">
          <span className="ui-head text-[18px] leading-tight">{quest.title}</span>
          {quest.description && <span className="text-[13px] leading-snug text-mute">{quest.description}</span>}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1.5">
          {done ? (
            <span className="ui-head ui-pill ui-fill ui-border-thin inline-flex animate-pop items-center gap-1 bg-pop px-2.5 py-1 text-[11px] leading-none text-white" data-done>
              Clear
              <Check className="size-3" />
            </span>
          ) : (
            <span className="ui-head ui-pill ui-border-thin bg-canvas px-2.5 py-1 text-[11px] leading-none tabular-nums">
              {doneCount}/{quest.objectives.length}
            </span>
          )}
          {quest.reward && <span className="text-[11px] leading-none font-bold text-accent">{quest.reward}</span>}
        </span>
      </header>
      <ul className="m-0 grid list-none gap-2 p-0">
        {quest.objectives.map((o) => (
          <ObjectiveRow key={o.id} o={o} onDone={onObjectiveDone} />
        ))}
      </ul>
      {done && clearText && (
        <span
          ref={stamp}
          aria-hidden="true"
          className="fx-only ui-lettering pointer-events-none absolute top-1/2 right-5 z-10 text-[40px] whitespace-nowrap"
          style={STAMP}
        >
          {clearText}
        </span>
      )}
    </article>
  )
}

function Group({ group, clearText, announce }: { group: QuestGroup; clearText: string | false; announce: (msg: string) => void }) {
  const [open, setOpen] = useState(group.defaultOpen ?? true)
  const id = useId()
  const cleared = group.quests.filter(isQuestDone).length

  return (
    <section className="grid">
      <h3 className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="group ui-head ui-r-sm flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-1 py-2 text-left text-[17px] leading-none text-ink focus-visible:ui-focus"
        >
          <Icon name="arrow-right" tone="line" size={14} className="text-accent transition-transform duration-300 ease-snap group-aria-expanded:rotate-90" />
          {group.title}
          <span aria-hidden="true" className="ui-divider flex-1" />
          <span className="ui-pill bg-accent-soft/50 px-2 py-1 text-[11px] leading-none tabular-nums">
            {cleared}/{group.quests.length}
          </span>
        </button>
      </h3>
      <div id={id} data-open={open || undefined} className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-snap data-open:grid-rows-[1fr]">
        <div className="min-h-0 overflow-hidden" inert={!open}>
          <div className="grid gap-4 pt-2 pr-3 pb-4 pl-1">
            {group.quests.map((q) => (
              <QuestCard key={q.id} quest={q} clearText={clearText} announce={announce} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * A quest journal. Objectives tick off with a blade slash, a strike line and a
 * self-drawing check while their card bounces; when every objective is done the quest
 * stamps "CLEAR!" with a burst. Groups collapse. Fully controlled: pass new data and
 * the log animates the difference (and announces it to screen readers).
 */
export function QuestLog({ groups, clearText = 'CLEAR!', className, ...rest }: QuestLogProps) {
  const [message, setMessage] = useState('')
  return (
    <div {...rest} className={cn('grid w-[min(100%,480px)] gap-2', className)}>
      {groups.map((g) => (
        <Group key={g.id} group={g} clearText={clearText} announce={setMessage} />
      ))}
      <p className="sr-only" aria-live="polite">
        {message}
      </p>
    </div>
  )
}
