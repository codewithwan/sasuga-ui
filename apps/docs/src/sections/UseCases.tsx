import { useEffect, useRef } from 'react'
import { AchievementHost } from '@/components/ui/achievement'
import { Icon } from '@/components/ui/icon'
import { Kbd } from '@/components/ui/kbd'
import { SplitReveal } from '@/components/ui/split-reveal'
import { TextScramble } from '@/components/ui/text-scramble'
import { impactOn } from '@/fx'
import { cn } from '@/lib/utils'
import { Chat } from './samples/Chat'
import { GameHud } from './samples/GameHud'
import { Learn } from './samples/Learn'
import { Player } from './samples/Player'
import { Shop } from './samples/Shop'

type Props = { xray: boolean; onXrayChange: (on: boolean) => void }

const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))

/** The one switch for every sample: outlines each kit component and tags it with a link to its docs. */
function XRayToggle({ xray, onXrayChange }: Props) {
  const btn = useRef<HTMLButtonElement>(null)
  const flip = (on: boolean) => {
    onXrayChange(on)
    if (on && btn.current) impactOn(btn.current, { text: 'X-RAY', size: 0.45, smoky: false })
  }
  const toggle = useRef(() => {})
  useEffect(() => {
    toggle.current = () => flip(!xray)
  })

  // X anywhere on the page (outside a text field) flips it too
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'x' || e.repeat || e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return
      toggle.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <button
      ref={btn}
      type="button"
      aria-pressed={xray}
      onClick={() => flip(!xray)}
      className={cn(
        'ui-head ui-border ui-pill ui-shadow pointer-events-auto inline-flex cursor-pointer items-center gap-2.5 py-2 pr-2.5 pl-3.5 text-[15px] leading-none transition-[translate,box-shadow,background-color,color] duration-200 ease-snap hover:-translate-y-0.5 hover:ui-shadow-hover focus-visible:ui-focus active:translate-y-px active:ui-shadow-press',
        xray ? 'ui-fill bg-ink text-paper' : 'bg-paper text-ink',
      )}
    >
      <Icon name="search" tone="line" size={18} className={xray ? 'text-accent-soft' : 'text-accent'} />
      Show the components
      <span
        aria-hidden="true"
        className={cn('ui-border-thin ui-pill relative h-[22px] w-[40px] shrink-0 transition-colors duration-200', xray ? 'bg-accent' : 'bg-canvas')}
      >
        <span
          className={cn(
            'ui-border-thin absolute top-1/2 left-[3px] size-[14px] -translate-y-1/2 rounded-full bg-paper transition-transform duration-300 ease-snap',
            xray && 'translate-x-[17px]',
          )}
        />
      </span>
      <Kbd aria-hidden="true" className="hidden sm:inline-flex">
        X
      </Kbd>
    </button>
  )
}

/** Five sample apps built only from the kit, and one switch that X-rays all of them. */
export function UseCases(props: Props) {
  return (
    <section id="use-cases" aria-labelledby="uc-title" className="bg-paper pt-[clamp(28px,5vw,56px)] pb-[clamp(56px,8vw,104px)]">
      <div className="frame">
        <header className="grid max-w-[62ch] gap-3">
          <p className="ui-head m-0 text-[14px] leading-none text-accent">
            <TextScramble text="Use cases" trigger="view" />
          </p>
          <h2 id="uc-title" className="ui-head m-0 text-[clamp(32px,4.6vw,56px)] leading-[1.02] text-ink">
            <SplitReveal text="Five apps. One kit." as="span" by="word" />
          </h2>
          <p className="m-0 text-[clamp(16px,1.6vw,18px)] leading-snug text-mute">
            Each sample is a small, working screen made only from kit components. Click around, then flip Show the components (or press X) to see what every part is.
          </p>
        </header>

        {/* first in the tab order, but laid out last: it floats at the bottom of the screen while the samples scroll by */}
        <div className="mt-10 flex flex-col">
          <div className="pointer-events-none sticky bottom-4 z-40 order-last mt-12 flex justify-center">
            <XRayToggle {...props} />
          </div>
          {/* bento: full · 7/5 · 5/7. Pairs are matched by content height, and nothing stretches to a neighbour. */}
          <div className="grid items-start gap-x-[clamp(24px,3vw,40px)] gap-y-16 min-[880px]:grid-cols-12">
            <div className="min-w-0 min-[880px]:col-span-12">
              <GameHud />
            </div>
            <div className="min-w-0 min-[880px]:col-span-7">
              <Shop />
            </div>
            <div className="min-w-0 min-[880px]:col-span-5">
              <Player />
            </div>
            <div className="min-w-0 min-[880px]:col-span-5">
              <Chat />
            </div>
            <div className="min-w-0 min-[880px]:col-span-7">
              <Learn />
            </div>
          </div>
        </div>
      </div>
      <AchievementHost className="top-20 sm:top-24" />
    </section>
  )
}
