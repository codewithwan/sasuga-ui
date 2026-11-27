import { Art } from '@/components/site/Art'
import { ButtonLink } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { useWipeClick } from '@/components/site/wipe-context'
import { withBase } from '@/data/site'
import { docs } from '@/docs/registry'
import { STYLES, THEMES } from '@/lib/theme'

const STATS = [
  { value: docs.length, label: 'components' },
  { value: STYLES.length, label: 'styles' },
  { value: THEMES.length, label: 'colours' },
]

/** The band under the samples: the claim, three numbers, the way in. */
export function KitBand() {
  const go = useWipeClick()
  return (
    <section aria-labelledby="kit-title" className="bg-paper pb-[clamp(56px,8vw,104px)]">
      <div className="frame grid items-center gap-x-10 gap-y-7 min-[960px]:grid-cols-[auto_minmax(0,1fr)_auto]">
        <Art name="mascot/koma-happy" alt="" reveal="pop" className="hidden w-[clamp(140px,14vw,190px)] min-[960px]:block" />
        <h2 id="kit-title" className="ui-head m-0 max-w-[20ch] text-[clamp(30px,4.2vw,50px)] leading-[1.04] text-ink">
          Every sample above is the kit, as&#8209;is.
        </h2>
        <div className="grid justify-items-start gap-6">
          <dl className="m-0 grid grid-cols-3 gap-x-[clamp(20px,4vw,44px)]">
            {STATS.map((s) => (
              <div key={s.label} className="grid gap-1.5">
                <dt className="order-last text-[14px] leading-none font-bold text-mute">{s.label}</dt>
                <dd className="ui-head m-0 text-[clamp(40px,5vw,60px)] leading-none text-accent">{s.value}</dd>
              </div>
            ))}
          </dl>
          <ButtonLink
            href={withBase('/components')}
            variant="accent"
            sfx="ドン!"
            iconEnd={<Icon name="arrow-right" tone="line" size={18} />}
            onClick={go('/components', 'Components')}
            className="justify-self-start"
          >
            Browse components
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
