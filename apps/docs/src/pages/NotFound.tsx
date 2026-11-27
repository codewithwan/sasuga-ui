import { Chibi, MASCOT_NAME } from '@/components/art/mascot'
import { WipeLink } from '@/components/site/WipeLink'
import { KineticText } from '@/components/ui/kinetic-text'
import { site } from '@/data/site'
import { useTitle } from './use-title'
import { Icon } from '@/components/ui/icon'

const LINK =
  'ui-head ui-border ui-r ui-shadow px-6 py-3.5 text-lg leading-none no-underline transition-[translate,box-shadow] duration-200 ease-snap hover:-translate-y-0.5 hover:ui-shadow-hover focus-visible:ui-focus active:translate-y-[3px] active:ui-shadow-press'

/** 404 as a "game over" screen. Also used inside the docs layout for unknown component slugs (`embedded`). */
export function NotFound({ embedded = false }: { embedded?: boolean }) {
  useTitle('Not found')

  const card = (
    <div className="ui-card ui-shadow-lg grid w-full max-w-[560px] justify-items-center gap-5 px-6 py-10 text-center sm:px-10">
      <div className="flex items-end justify-center gap-3">
        <Chibi pose="hurt" label={`${MASCOT_NAME}, lost`} className="w-[clamp(72px,14vw,104px)]" />
        <p className="m-0 mb-6 animate-bob font-jp text-[clamp(26px,4.5vw,40px)] leading-none text-accent">迷子?</p>
      </div>
      <h1 className={`ui-head m-0 leading-[0.9] text-ink ${embedded ? 'text-[clamp(64px,12vw,140px)]' : 'text-[clamp(72px,16vw,180px)]'}`}>
        <KineticText text="404" seed={2} />
      </h1>
      <p className="ui-head m-0 text-xl leading-none">Game over — page not found</p>
      <p className="m-0 max-w-[36ch] text-lg text-mute">This page escaped the stage. Continue from a save point:</p>
      <div className="flex flex-wrap justify-center gap-4">
        <WipeLink to="/" label={site.name} className={`${LINK} ui-fill bg-accent text-white`}>
          <Icon name="arrow-left" tone="line" size="1em" /> Home
        </WipeLink>
        <WipeLink to="/components" label="Components" className={`${LINK} bg-paper text-ink`}>
          Components
        </WipeLink>
      </div>
    </div>
  )

  if (embedded) return <div className="grid place-items-center py-10">{card}</div>

  return (
    <main id="main" tabIndex={-1} className="ui-tone relative isolate grid min-h-svh place-items-center overflow-hidden bg-canvas px-4 pt-24 pb-16 outline-none">
      <div aria-hidden="true" className="absolute top-1/2 left-1/2 -z-10 size-[min(80vmin,620px)] -translate-1/2 rounded-full bg-accent-soft/50 blur-3xl" />
      {card}
    </main>
  )
}
