import type { ReactNode } from 'react'
import { BrandMark } from '@/components/art/stickers'
import { Art } from '@/components/site/Art'
import { WipeLink } from '@/components/site/WipeLink'
import { GitHubCard } from '@/components/site/GitHubCard'
import { HoverCard } from '@/components/ui/hover-card'
import { Icon } from '@/components/ui/icon'
import { YEAR, profile } from '@/data/profile'
import { GUIDES, site } from '@/data/site'
import { CATEGORIES } from '@/docs/types'

const LINE = 'Springs · バネ · Impact frames · 衝撃 · Sound effects · 効果音 · '

const LINK =
  'inline-flex items-center gap-1.5 rounded-sm font-bold text-ink no-underline transition-[color,translate] duration-150 ease-snap hover:translate-x-0.5 hover:text-accent focus-visible:ui-focus'

function Column({ title, label, children }: { title: string; label: string; children: ReactNode }) {
  return (
    <nav aria-label={label} className="grid min-w-0 content-start gap-3">
      <p className="ui-head m-0 text-[13px] leading-none text-mute">{title}</p>
      <ul className="m-0 grid list-none gap-2 p-0 text-[15px] leading-snug">{children}</ul>
    </nav>
  )
}

function External({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <a href={href} target="_blank" rel="noreferrer" className={LINK}>
        {children}
        <Icon name="arrow-right" tone="line" size="0.85em" className="-rotate-45 text-mute" />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </li>
  )
}

export function Footer() {
  return (
    <footer className="ui-tone ui-border-t overflow-hidden bg-canvas text-ink">
      {/* a flat, untilted band */}
      <div aria-hidden="true" className="overflow-hidden border-b-(length:--ui-bw-thin) border-b-line">
        <div className="ui-head flex w-max animate-marquee py-4 text-[clamp(20px,2.6vw,30px)] leading-none whitespace-nowrap text-accent">
          <span className="pr-[0.5em]">{LINE.repeat(3)}</span>
          <span className="pr-[0.5em]">{LINE.repeat(3)}</span>
        </div>
      </div>

      <div className="frame relative">
        <Art name="mascot/koma-front" alt="" reveal="pop" className="pointer-events-none absolute right-[clamp(0px,2vw,32px)] bottom-[4.25rem] hidden w-52 min-[1100px]:block" />
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 min-[900px]:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))] min-[900px]:gap-x-10 min-[900px]:py-14">
          <div className="col-span-2 grid content-start gap-4 min-[900px]:col-span-1">
            <WipeLink to="/" label="Home" className="ui-head inline-flex w-max items-center gap-2 text-[32px] leading-none text-ink no-underline focus-visible:ui-focus">
              <BrandMark mark={site.mark} className="w-[1.3em]" />
              <span>
                {site.word}
                <span className="text-accent">{site.suffix}</span>
              </span>
              <span className="font-jp text-xs text-mute">{site.jp}</span>
            </WipeLink>
            <p className="m-0 max-w-[38ch] text-[15px] leading-relaxed text-mute">{site.tagline}</p>
            <p className="ui-pill ui-border-thin m-0 inline-flex w-max max-w-full items-center gap-2 overflow-x-auto bg-paper px-3 py-1.5 font-mono text-[12px] whitespace-nowrap leading-none font-semibold text-ink">
              <span className="text-accent">npx</span> {site.package} init
            </p>
          </div>

          <Column title="Docs" label="Footer docs">
            {GUIDES.map((g) => (
              <li key={g.to}>
                <WipeLink to={g.to} label={g.title} className={LINK}>
                  {g.title}
                </WipeLink>
              </li>
            ))}
          </Column>

          <Column title="Components" label="Footer components">
            {CATEGORIES.map((c) => (
              <li key={c}>
                <WipeLink to={`/components#cat-${c}`} label={c} className={LINK}>
                  {c}
                </WipeLink>
              </li>
            ))}
          </Column>

          <Column title="Project" label="Footer project">
            <li>
              <WipeLink to="/components" label="Components" className={LINK}>
                All components
              </WipeLink>
            </li>
            <External href={site.github}>GitHub</External>
          </Column>
        </div>

        <div className="ui-divider flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-6 text-sm leading-snug font-bold text-mute">
          <p className="m-0">
            Made by{' '}
            <HoverCard content={<GitHubCard />} side="top" align="start">
              <a
                href={`https://github.com/${profile.handle}`}
                target="_blank"
                rel="noreferrer"
                className="text-ink underline decoration-accent decoration-2 underline-offset-4 transition-colors hover:text-accent focus-visible:ui-focus"
              >
                {profile.handle}
                <span className="sr-only"> on GitHub (opens in a new tab)</span>
              </a>
            </HoverCard>
          </p>
          <p className="m-0">
            © {YEAR} {profile.handle}
          </p>
        </div>
      </div>
    </footer>
  )
}
