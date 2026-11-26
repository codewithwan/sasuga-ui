import { useState } from 'react'
import { useLocation } from 'react-router'
import { BrandLogo } from '@/components/art/stickers'
import { ModeToggle, StylePicker, ThemePicker } from '@/components/site/ThemePicker'
import { WipeLink } from '@/components/site/WipeLink'
import { Sheet } from '@/components/ui/sheet'
import { GUIDES, site } from '@/data/site'
import { cn } from '@/lib/utils'

const LINKS = [
  { to: '/docs', label: 'Docs', flash: 'Docs' },
  { to: '/components', label: 'Components', flash: 'Components' },
]

const PILL =
  'ui-head ui-pill block px-3 py-2 text-[14px] leading-none whitespace-nowrap text-ink no-underline transition duration-200 ease-snap hover:-translate-y-px hover:bg-accent-soft focus-visible:ui-focus aria-[current]:bg-accent aria-[current]:text-white lg:px-3.5 lg:text-[15px]'

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={cn('size-4 fill-current', className)}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}

export function Nav({ ready }: { ready: boolean }) {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const current = (to: string) => (pathname === to || pathname.startsWith(`${to}/`) ? 'page' : undefined)

  return (
    <>
      <nav
        aria-label="Main"
        className={cn(
          'pointer-events-none fixed inset-x-0 top-0 z-[100] px-2.5 pt-2.5 transition duration-700 ease-snap sm:px-[clamp(16px,3vw,32px)] sm:pt-4',
          !ready && '-translate-y-28 opacity-0',
        )}
      >
        <div className="ui-card pointer-events-auto mx-auto flex max-w-[1180px] items-center justify-between gap-2 px-1.5 py-1.5 sm:gap-3 sm:px-2.5">
          <WipeLink
            to="/"
            label={site.name}
            aria-label={`${site.name} home`}
            className="ui-pill group inline-flex shrink-0 items-center px-2 py-1 text-lg leading-none text-ink no-underline transition duration-200 ease-snap hover:bg-accent-soft focus-visible:ui-focus sm:text-[22px]"
          >
            <BrandLogo markClassName="transition-transform duration-300 ease-snap group-hover:scale-115" />
          </WipeLink>

          <div className="flex min-w-0 items-center gap-2">
            <StylePicker compact className="hidden xl:inline-flex" />
            <ThemePicker compact className="hidden xl:inline-flex" />
            <ul className="m-0 hidden list-none gap-0.5 p-0 sm:flex">
              {LINKS.map((l) => (
                <li key={l.to}>
                  <WipeLink to={l.to} label={l.flash} aria-current={current(l.to)} className={PILL}>
                    {l.label}
                  </WipeLink>
                </li>
              ))}
              <li className="hidden md:block">
                <a href={site.github} target="_blank" rel="noreferrer" className={cn(PILL, 'inline-flex items-center gap-1.5')}>
                  <GitHubMark />
                  GitHub
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
            </ul>
            <ModeToggle />
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={open}
              className="ui-head ui-pill ui-border-thin ui-shadow-sm inline-flex cursor-pointer items-center gap-2 bg-paper px-3 py-2 text-[14px] leading-none text-ink transition duration-200 ease-snap hover:-translate-y-px hover:bg-accent-soft focus-visible:ui-focus active:translate-y-px active:ui-shadow-press xl:hidden"
            >
              <span aria-hidden="true" className="grid gap-[3px]">
                <span className="ui-rule block w-3.5" />
                <span className="ui-rule block w-3.5" />
                <span className="ui-rule block w-2.5" />
              </span>
              Menu
            </button>
          </div>
        </div>
      </nav>

      {/* outside the nav: pointer-events-none would be inherited by the dialog */}
      <Sheet open={open} onOpenChange={setOpen} title={site.name}>
        <p className="ui-head m-0 text-xs text-mute">Pages</p>
        <ul className="m-0 grid list-none gap-1 p-0">
          {[{ to: '/', label: 'Home', flash: site.name }, ...LINKS].map((l) => (
            <li key={l.to}>
              <WipeLink
                to={l.to}
                label={l.flash}
                onClick={() => setOpen(false)}
                aria-current={l.to === '/' ? (pathname === '/' ? 'page' : undefined) : current(l.to)}
                className={cn(PILL, 'px-4 py-3 text-lg lg:text-lg')}
              >
                {l.label}
              </WipeLink>
            </li>
          ))}
          <li>
            <a href={site.github} target="_blank" rel="noreferrer" className={cn(PILL, 'flex items-center gap-2 px-4 py-3 text-lg lg:text-lg')}>
              <GitHubMark />
              GitHub<span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
        </ul>
        <p className="ui-head m-0 mt-4 text-xs text-mute">Guides</p>
        <ul className="m-0 grid list-none gap-1 p-0">
          {GUIDES.map((g) => (
            <li key={g.to}>
              <WipeLink to={g.to} label={g.title} onClick={() => setOpen(false)} aria-current={pathname === g.to ? 'page' : undefined} className={PILL}>
                {g.title}
              </WipeLink>
            </li>
          ))}
        </ul>
        <p className="ui-head m-0 mt-4 text-xs text-mute">Style</p>
        <StylePicker compact className="justify-self-start" />
        <p className="ui-head m-0 mt-3 text-xs text-mute">Colour</p>
        <ThemePicker compact className="justify-self-start" />
      </Sheet>
    </>
  )
}
