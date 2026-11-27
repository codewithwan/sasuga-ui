import { useRef, useState } from 'react'
import type { CSSProperties, MouseEvent } from 'react'
import { Button } from '@/components/ui/button'
import { ICON_NAMES, Icon } from '@/components/ui/icon'
import type { IconName } from '@/components/ui/icon'
import { impactOn, prefersReducedMotion, rand, uiStyle } from '@/fx'
import { cn } from '@/lib/utils'
import { Field } from '@/components/ui/field'
import type { DocEntry } from '../types'

const POP = 'cubic-bezier(.2,1.6,.4,1)'

/** A clicked icon hops out of its tile with a small impact. */
function hit(btn: HTMLElement) {
  impactOn(btn, { text: false, size: uiStyle() === 'flat' ? 0.3 : 0.45, smoky: false })
  if (prefersReducedMotion()) return
  btn.querySelector('svg')?.animate(
    [
      { transform: 'none' },
      { transform: `translateY(-30%) rotate(${rand(-22, 22)}deg) scale(1.45)`, offset: 0.35 },
      { transform: 'translateY(4%) scale(1.12, .86)', offset: 0.7 },
      { transform: 'none' },
    ],
    { duration: 480, easing: POP },
  )
}

const TILE =
  'ui-r ui-border-thin grid cursor-pointer touch-manipulation place-items-center gap-1.5 bg-paper px-1 pt-3 pb-2 text-ink transition-[translate,background-color,box-shadow] duration-200 ease-snap hover:-translate-y-0.5 hover:bg-canvas hover:ui-shadow-sm focus-visible:ui-focus active:translate-y-px'

function IconBrowser() {
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<IconName | null>(null)
  const [copied, setCopied] = useState(false)
  const timer = useRef(0)
  const query = q.trim().toLowerCase()
  const shown = query ? ICON_NAMES.filter((n) => n.includes(query)) : ICON_NAMES

  const pick = (name: IconName, e: MouseEvent<HTMLButtonElement>) => {
    hit(e.currentTarget)
    setPicked(name)
    setCopied(false)
    window.clearTimeout(timer.current)
    navigator.clipboard?.writeText(`<Icon name="${name}" />`).then(
      () => {
        setCopied(true)
        timer.current = window.setTimeout(() => setCopied(false), 1600)
      },
      () => {},
    )
  }

  return (
    <div className="grid w-full gap-4">
      <Field label={`Search ${ICON_NAMES.length} icons`} value={q} onChange={setQ} type="search" />

      {shown.length ? (
        <ul aria-label="Icons" className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-2 p-0">
          {shown.map((name) => (
            <li key={name} className="grid">
              <button
                type="button"
                aria-label={`${name}, copy JSX`}
                aria-pressed={picked === name}
                onClick={(e) => pick(name, e)}
                className={cn(TILE, picked === name && 'bg-accent-soft hover:bg-accent-soft')}
              >
                <Icon name={name} size={28} />
                <span className="max-w-full truncate font-mono text-[10px] leading-none text-mute">{name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 py-6 text-center text-sm text-mute">No icon matches "{q}".</p>
      )}

      <p aria-live="polite" className="m-0 flex min-h-6 flex-wrap items-center justify-center gap-2 text-center text-xs text-mute">
        {picked ? (
          <>
            <code className="ui-r-sm bg-canvas px-2 py-1 font-mono text-[12px] text-ink">{`<Icon name="${picked}" />`}</code>
            {copied && (
              <span className="inline-flex items-center gap-1 font-bold text-accent">
                <Icon name="check" tone="line" size={14} /> Copied
              </span>
            )}
          </>
        ) : (
          'Click an icon to copy its JSX.'
        )}
      </p>
    </div>
  )
}

const FEATURED: IconName[] = ['sword', 'fire', 'heart', 'sparkle', 'shield', 'potion', 'chest', 'crown']

function Featured() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      {FEATURED.map((name) => (
        <button key={name} type="button" aria-label={name} onClick={(e) => hit(e.currentTarget)} className={cn(TILE, 'size-14 p-0')}>
          <Icon name={name} size={30} />
        </button>
      ))}
    </div>
  )
}

const tint = (fill: string) => ({ '--icon-fill': fill }) as CSSProperties

export default {
  slug: 'icon',
  name: 'Icon',
  jp: 'アイコン',
  category: 'Display',
  description:
    'Fifty hand-drawn sticker icons on a 24 grid with round joins, from game loot (sword, potion, chest) to UI basics (close, search, settings). The line weight follows the active style, `duo` fills them with the soft tint, and they are decorative unless you give them a `title`. Use them everywhere instead of emoji or text glyphs.',
  preview: <Featured />,
  usage: `import { Icon } from '@/components/ui/icon'

<Icon name="sword" />                      // duo: ink line + soft fill
<Icon name="close" tone="line" />          // strokes in currentColor
<Icon name="heart" tone="solid" className="text-pop" />
<Icon name="warning" title="Warning" />    // role="img" with a name`,
  examples: [
    {
      title: 'All icons (search, click to copy)',
      preview: <IconBrowser />,
      code: `import { ICON_NAMES, Icon } from '@/components/ui/icon'

{ICON_NAMES.map((name) => <Icon key={name} name={name} size={28} />)}`,
    },
    {
      title: 'Tones',
      preview: (
        <div className="grid gap-4">
          {(['duo', 'line', 'solid'] as const).map((tone) => (
            <div key={tone} className="flex flex-wrap items-center justify-center gap-3 text-ink">
              <span className="w-12 font-mono text-xs text-mute">{tone}</span>
              {(['star', 'heart', 'shield', 'skull', 'bell', 'lock', 'github'] as const).map((n) => (
                <Icon key={n} name={n} tone={tone} size={28} />
              ))}
            </div>
          ))}
        </div>
      ),
      code: `<Icon name="star" />               // duo (default)
<Icon name="star" tone="line" />
<Icon name="star" tone="solid" />  // details are cut out of the fill`,
    },
    {
      title: 'Sizes',
      preview: (
        <div className="flex flex-wrap items-end justify-center gap-5">
          {[16, 20, 24, 32, 48, 64].map((s) => (
            <span key={s} className="grid justify-items-center gap-1.5">
              <Icon name="trophy" size={s} />
              <span className="font-mono text-[10px] leading-none text-mute">{s}</span>
            </span>
          ))}
        </div>
      ),
      code: `<Icon name="trophy" size={16} />
<Icon name="trophy" size={48} />
<Icon name="trophy" size="1em" />   // follow the font size`,
    },
    {
      title: 'Colour',
      preview: (
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Icon name="potion" size={40} style={tint('var(--color-pop)')} />
          <Icon name="gem" size={40} style={tint('var(--color-accent)')} />
          <Icon name="coin" size={40} style={tint('var(--color-paper)')} />
          <Icon name="bolt" size={40} tone="solid" className="text-accent" />
          <Icon name="fire" size={40} tone="solid" className="text-pop" />
          <Icon name="moon" size={40} tone="line" className="text-mute" />
        </div>
      ),
      code: `<Icon name="potion" style={{ '--icon-fill': 'var(--color-pop)' }} />
<Icon name="bolt" tone="solid" className="text-accent" />
<Icon name="moon" tone="line" className="text-mute" />`,
    },
    {
      title: 'In buttons',
      preview: (
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button variant="accent" icon={<Icon name="sword" />} sfx="ズバッ">
            Attack
          </Button>
          <Button size="sm" icon={<Icon name="copy" tone="line" />} sfx={false}>
            Copy
          </Button>
          <Button size="icon" aria-label="Settings" sfx={false}>
            <Icon name="settings" tone="line" />
          </Button>
        </div>
      ),
      code: `<Button variant="accent" icon={<Icon name="sword" />}>Attack</Button>
<Button size="icon" aria-label="Settings"><Icon name="settings" tone="line" /></Button>`,
    },
  ],
  props: [
    { name: 'name', type: 'IconName', description: 'Which icon. `ICON_NAMES` lists all of them.' },
    { name: 'size', type: 'number | string', default: '20', description: 'Width and height (px number, or any CSS length such as "1em").' },
    {
      name: 'tone',
      type: "'duo' | 'line' | 'solid'",
      default: "'duo'",
      description: 'duo: ink line + fill from `--icon-fill` (default accent-soft; `--icon-stroke` changes the line). line: strokes in currentColor. solid: filled currentColor with details cut out.',
    },
    { name: 'title', type: 'string', description: 'Accessible name. With it the svg gets role="img" and a <title>; without it, aria-hidden.' },
    { name: 'className', type: 'string', description: 'Colour (text-*) and layout.' },
    { name: '--icon-bw', type: 'CSS variable', default: 'var(--ui-bw)', description: 'Line weight source; the stroke follows the style (thick in cel/manga, fine in flat).' },
    { name: '...props', type: "Omit<SVGProps<SVGSVGElement>, 'name'>", description: 'Passed to the svg.' },
  ],
} satisfies DocEntry
