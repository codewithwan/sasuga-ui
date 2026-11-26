import type { ReactNode } from 'react'
import { WipeLink } from '@/components/site/WipeLink'
import { Icon } from '@/components/ui/icon'
import type { IconName } from '@/components/ui/icon'
import { SplitReveal } from '@/components/ui/split-reveal'
import { TextScramble } from '@/components/ui/text-scramble'
import { cn } from '@/lib/utils'

export type Part = { name: string; slug: string }

type SampleProps = {
  id: string
  /** Small label over the title: the kind of app. */
  kind: string
  icon: IconName
  title: string
  caption: string
  /** The kit components this sample is made of (the "Built with" chips). */
  parts: Part[]
  /** Grid placement from the parent bento (spans). */
  className?: string
  children: ReactNode
}

/** One use case: label, title, caption, the mini app in its frame, and what it is built with. */
export function Sample({ id, kind, icon, title, caption, parts, className, children }: SampleProps) {
  return (
    <article aria-labelledby={`${id}-title`} className={cn('flex min-w-0 flex-col gap-4 self-start', className)}>
      <header className="grid gap-2">
        <p className="ui-head m-0 flex items-center gap-2 text-[13px] leading-none text-accent">
          <Icon name={icon} size={18} />
          <TextScramble text={kind} trigger="view" />
        </p>
        <h3 id={`${id}-title`} className="ui-head m-0 text-[clamp(24px,2.6vw,30px)] leading-[1.08] text-ink">
          <SplitReveal text={title} as="span" by="word" />
        </h3>
        <p className="m-0 max-w-[52ch] text-[15px] leading-snug text-mute">{caption}</p>
      </header>

      <div className="flex min-w-0 flex-1 flex-col">{children}</div>

      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
        <span className="mr-1 text-[12px] leading-none font-bold text-mute">Built with</span>
        {parts.map((p) => (
          <WipeLink
            key={p.name}
            to={`/components/${p.slug}`}
            label={p.name}
            className="ui-pill ui-border-thin bg-paper px-2.5 py-1.5 text-[12px] leading-none font-bold text-ink no-underline transition-[translate,background-color] duration-200 ease-snap hover:-translate-y-0.5 hover:bg-canvas focus-visible:ui-focus"
          >
            {p.name}
          </WipeLink>
        ))}
      </div>
    </article>
  )
}

/** Desktop app window: a title bar with an address pill, then the app. */
export function WindowFrame({ url, children, className }: { url: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('ui-card flex min-w-0 flex-1 flex-col', className)}>
      <div className="ui-border-b flex items-center gap-3 rounded-t-[calc(var(--ui-r-lg)-var(--ui-bw))] bg-canvas px-3 py-2">
        <span aria-hidden="true" className="flex shrink-0 gap-1.5">
          <span className="ui-border-thin size-2.5 rounded-full bg-pop" />
          <span className="ui-border-thin size-2.5 rounded-full bg-accent-soft" />
          <span className="ui-border-thin size-2.5 rounded-full bg-paper" />
        </span>
        <span className="ui-pill ui-border-thin mx-auto flex min-w-0 items-center gap-1.5 bg-paper px-3 py-1 text-[12px] leading-none font-semibold text-mute">
          <Icon name="lock" tone="line" size={11} className="shrink-0" />
          <span className="truncate">{url}</span>
        </span>
        <span aria-hidden="true" className="w-[42px] shrink-0" />
      </div>
      <div className="@container flex min-w-0 flex-1 flex-col rounded-b-[calc(var(--ui-r-lg)-var(--ui-bw))] bg-paper">{children}</div>
    </div>
  )
}

/** A phone: status bar, then the app. Centred in its column. */
export function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('ui-card mx-auto flex w-full max-w-[340px] flex-1 flex-col p-1.5', className)}>
      <div className="ui-r flex flex-1 flex-col bg-canvas">
        <div aria-hidden="true" className="flex items-center justify-between px-4 pt-2.5 pb-1.5 text-[12px] leading-none font-bold text-ink">
          <span>9:41</span>
          <span className="ui-pill h-1.5 w-14 bg-line" />
          <span className="flex items-center gap-1">
            <Icon name="bolt" tone="solid" size={12} />
            86%
          </span>
        </div>
        <div className="@container flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  )
}
