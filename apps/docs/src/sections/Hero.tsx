import { ButtonLink } from '@/components/ui'
import { Icon } from '@/components/ui/icon'
import { KineticText } from '@/components/ui/kinetic-text'
import { Reveal } from '@/components/ui/reveal'
import { TextRotate } from '@/components/ui/text-rotate'
import { WipeLink } from '@/components/site/WipeLink'
import { useWipeClick } from '@/components/site/wipe-context'
import { site, withBase } from '@/data/site'
import { InstallSnippet } from '@/pages/docs/InstallSnippet'

const USES = ['games', 'shops', 'dashboards', 'chat apps', 'learning apps']

/** The small "what's new" pill over the headline. */
function Announcement() {
  return (
    <WipeLink
      to="/components"
      label="Components"
      className="ui-pill ui-border-thin ui-shadow-sm group inline-flex max-w-full items-center gap-2 bg-paper py-1.5 pr-3 pl-1.5 text-[13px] leading-none font-bold text-ink no-underline transition-[translate,box-shadow] duration-200 ease-snap hover:-translate-y-0.5 hover:ui-shadow focus-visible:ui-focus active:translate-y-px active:ui-shadow-press"
    >
      <span className="ui-head ui-pill ui-fill bg-accent px-2 py-1 text-[11px] leading-none text-white">New</span>
      <span className="truncate">Gacha spins &amp; text motion</span>
      <Icon name="arrow-right" tone="line" size={14} className="shrink-0 text-accent transition-transform duration-200 ease-snap group-hover:translate-x-0.5" />
    </WipeLink>
  )
}

/** The opening screen: what's new, the name, one line, two ways in and the install command; Koma's key visual
 *  sits beside it on wide screens and under it on phones. */
export function Hero({ ready }: { ready: boolean }) {
  const go = useWipeClick()

  return (
    <section
      id="top"
      tabIndex={-1}
      aria-labelledby="hero-title"
      className="relative flex items-center bg-paper pt-[clamp(96px,8vw,104px)] pb-[clamp(40px,5vw,56px)] outline-none min-[1024px]:min-h-[min(74svh,780px)]"
    >
      <div className="frame grid items-center gap-x-10 gap-y-10 min-[1024px]:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="grid min-w-0 justify-items-center text-center min-[1024px]:justify-items-start min-[1024px]:text-left">
          <Reveal show={ready} from="up" delay={300}>
            <Announcement />
          </Reveal>

          <h1 id="hero-title" className="ui-head m-0 mt-6 text-[clamp(52px,8.6vw,116px)] leading-[0.92] text-ink min-[1024px]:text-[clamp(64px,6.6vw,100px)]">
            {/* word + accent suffix ("sasuga" + "/ui"); a "/" suffix sits flush against the word */}
            <KineticText
              text={`${site.word} ${site.suffix}`}
              label={site.name}
              seed={1}
              paused={!ready}
              className={site.suffix.startsWith('/') ? 'gap-x-0' : undefined}
            />
          </h1>

          <Reveal show={ready} from="up" delay={450} as="p" className="m-0 mt-5 text-[clamp(19px,2.2vw,26px)] leading-snug font-bold text-mute">
            Game-feel UI for <TextRotate words={USES} interval={2200} className="ui-head text-accent" />
          </Reveal>

          <Reveal show={ready} from="up" delay={550} className="mt-8 flex flex-wrap items-center justify-center gap-3 min-[1024px]:justify-start">
            <ButtonLink href={withBase('/docs')} variant="accent" sfx="ドン!" onClick={go('/docs', 'Get started')}>
              Get started
            </ButtonLink>
            <ButtonLink href={withBase('/components')} variant="paper" sfx="バン!" onClick={go('/components', 'Components')}>
              Browse components
            </ButtonLink>
          </Reveal>

          <Reveal show={ready} from="up" delay={650} className="mt-10 grid w-full max-w-[600px] justify-items-center gap-3.5 min-[1024px]:justify-items-start">
            <InstallSnippet mode="cli" className="w-full text-left" />
            <p className="m-0 text-[14px] leading-snug font-semibold text-mute">
              or{' '}
              <WipeLink
                to="/docs/installation"
                label="Installation"
                className="font-bold text-accent underline decoration-2 underline-offset-[3px] focus-visible:ui-focus"
              >
                copy the files you need
              </WipeLink>
            </p>
          </Reveal>
        </div>

        <Reveal show={ready} from="right" delay={500} className="mx-auto w-full max-w-[520px] min-[1024px]:max-w-none">
          <img
            src={withBase('/assets/hero/koma-impact.webp')}
            alt={`Koma, the ${site.name} mascot, slamming a giant button with an impact burst`}
            width={1600}
            height={1067}
            fetchPriority="high"
            decoding="async"
            draggable={false}
            className="block h-auto w-full select-none"
          />
        </Reveal>
      </div>
    </section>
  )
}
