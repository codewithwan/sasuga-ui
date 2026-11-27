import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { StylePicker, ThemePicker } from '@/components/site/ThemePicker'
import { Icon } from '@/components/ui/icon'
import { NavMenu } from '@/components/ui/nav-menu'
import type { NavMenuGroup } from '@/components/ui/nav-menu'
import { Sheet } from '@/components/ui/sheet'
import { GUIDES } from '@/data/site'
import { docs } from '@/docs/registry'
import { CATEGORIES } from '@/docs/types'

/** Docs pages first, then every component grouped by category. Item ids are their paths. */
const GROUPS: NavMenuGroup[] = [
  {
    id: 'start',
    label: 'Getting started',
    icon: <Icon name="book" size={18} />,
    items: [
      ...GUIDES.map((g) => ({ id: g.to, label: g.title, href: g.to })),
      { id: '/components', label: 'All components', href: '/components', badge: docs.length },
    ],
  },
  ...CATEGORIES.map((c) => ({
    id: c,
    label: c,
    icon: <Icon name="puzzle" size={18} />,
    items: docs.filter((d) => d.category === c).map((d) => ({ id: `/components/${d.slug}`, label: d.name, href: `/components/${d.slug}` })),
  })).filter((g) => g.items.length),
]

function Sidebar({ pathname, onPick }: { pathname: string; onPick?: () => void }) {
  return (
    <NavMenu
      label="Docs sidebar"
      groups={GROUPS}
      activeId={pathname}
      defaultOpen={['start']}
      searchable
      searchPlaceholder="Filter components…"
      onNavigate={onPick}
      renderLink={({ href, ...props }) => <Link to={href} {...props} />}
    />
  )
}

function Pickers() {
  return (
    <div className="ui-tone ui-r grid justify-items-start gap-2 bg-canvas p-3">
      <p className="ui-head m-0 text-xs text-mute">Style</p>
      <StylePicker compact />
      <p className="ui-head m-0 mt-2 text-xs text-mute">Colour</p>
      <ThemePicker compact />
    </div>
  )
}

/** Where the reader is, for the small-screen bar. */
function currentLabel(pathname: string) {
  const guide = GUIDES.find((g) => g.to === pathname)
  if (guide) return guide.title
  if (pathname === '/components') return 'All components'
  return docs.find((d) => pathname === `/components/${d.slug}`)?.name ?? 'Docs'
}

export function DocsLayout() {
  const location = useLocation()
  // item ids are paths without a trailing slash
  const pathname = location.pathname.replace(/(.)\/+$/, '$1')
  const [open, setOpen] = useState(false)

  return (
    <main id="main" tabIndex={-1} className="min-h-svh bg-paper pt-24 pb-24 text-ink outline-none sm:pt-28">
      <div className="frame grid gap-8 min-[960px]:grid-cols-[250px_minmax(0,1fr)] min-[960px]:gap-10">
        {/* small screens: a bar that opens the sidebar in a sheet */}
        <div className="ui-r ui-border-thin ui-shadow-sm flex items-center justify-between gap-3 bg-paper py-2 pr-2 pl-4 min-[960px]:hidden">
          <span className="min-w-0 truncate text-sm font-bold">
            <span className="text-mute">Docs / </span>
            {currentLabel(pathname)}
          </span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={open}
            className="ui-head ui-pill ui-fill shrink-0 cursor-pointer border-0 bg-accent px-3.5 py-2 text-[13px] leading-none text-white transition duration-200 ease-snap hover:-translate-y-px focus-visible:ui-focus active:translate-y-px"
          >
            Browse docs
          </button>
        </div>
        <Sheet open={open} onOpenChange={setOpen} side="left" title="Docs">
          <Pickers />
          <div className="pt-3">
            <Sidebar pathname={pathname} onPick={() => setOpen(false)} />
          </div>
        </Sheet>

        <aside className="hidden min-[960px]:sticky min-[960px]:top-28 min-[960px]:block min-[960px]:max-h-[calc(100svh-8rem)] min-[960px]:self-start min-[960px]:overflow-y-auto min-[960px]:pr-2 min-[960px]:pb-3 min-[960px]:pl-1.5">
          <Pickers />
          <div className="mt-6">
            <Sidebar pathname={pathname} />
          </div>
        </aside>

        {/* key: slide the content in on every page change */}
        <div key={pathname} className="min-w-0 animate-panel-in">
          <Outlet />
        </div>
      </div>
    </main>
  )
}
