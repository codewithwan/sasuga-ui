import { Icon } from '@/components/ui/icon'
import { NavMenu } from '@/components/ui/nav-menu'
import type { NavMenuGroup } from '@/components/ui/nav-menu'
import type { DocEntry } from '../types'

const groups: NavMenuGroup[] = [
  {
    id: 'base',
    label: 'Home base',
    icon: <Icon name="home" size={18} />,
    items: [
      { id: 'hub', label: 'Hub', href: '#hub' },
      { id: 'inventory', label: 'Inventory', href: '#inventory', badge: 12 },
      { id: 'quests', label: 'Quests', href: '#quests', badge: 'NEW' },
    ],
  },
  {
    id: 'world',
    label: 'World',
    icon: <Icon name="map" size={18} />,
    items: [
      { id: 'map', label: 'World map', href: '#map' },
      { id: 'towns', label: 'Towns', href: '#towns' },
      { id: 'dungeons', label: 'Dungeons', href: '#dungeons' },
      { id: 'arena', label: 'Arena', href: '#arena' },
    ],
  },
  {
    id: 'codex',
    label: 'Codex',
    icon: <Icon name="book" size={18} />,
    items: [
      { id: 'heroes', label: 'Heroes', href: '#heroes' },
      { id: 'monsters', label: 'Monsters', href: '#monsters' },
      { id: 'relics', label: 'Relics', href: '#relics' },
    ],
  },
]

/** Demo links stay on the page. */
const stay = (_: unknown, e: { preventDefault: () => void }) => e.preventDefault()

export default {
  slug: 'nav-menu',
  name: 'Nav Menu',
  jp: 'ナビ',
  category: 'Layout',
  description:
    'A grouped sidebar menu. Headers carry a count and a chevron that spins; a group opens with a bounce and deals its items in. One accent cursor springs between active items, even across groups, stretching and trailing afterimages, and parks on the header when its group is folded. The filter pops items out and back in as you type. Keyboard: ↑/↓, Home/End, ← / → fold and open groups, and type-ahead. This is the docs sidebar.',
  preview: (
    <div className="w-[min(100%,260px)] text-left">
      <NavMenu label="Game menu" groups={groups} defaultActiveId="inventory" defaultOpen={['base', 'world']} onNavigate={stay} />
    </div>
  ),
  usage: `import { NavMenu } from '@/components/ui/nav-menu'

<NavMenu
  label="Game menu"
  searchable
  activeId={current}
  groups={[
    {
      id: 'base',
      label: 'Home base',
      icon: <Icon name="home" />,
      items: [
        { id: 'hub', label: 'Hub', href: '/hub' },
        { id: 'inventory', label: 'Inventory', href: '/inventory', badge: 12 },
      ],
    },
  ]}
/>`,
  examples: [
    {
      title: 'Searchable',
      preview: (
        <div className="w-[min(100%,280px)] text-left">
          <NavMenu label="Codex" groups={groups} searchable searchPlaceholder="Filter… try “ar”" defaultActiveId="towns" defaultOpen onNavigate={stay} />
        </div>
      ),
      code: `<NavMenu label="Codex" groups={groups} searchable defaultOpen defaultActiveId="towns" />`,
    },
    {
      title: 'With react-router',
      preview: (
        <div className="w-[min(100%,260px)] text-left">
          <NavMenu label="Router demo" groups={groups.slice(1)} defaultActiveId="dungeons" onNavigate={stay} />
        </div>
      ),
      code: `import { Link, useLocation } from 'react-router'

const { pathname } = useLocation()

<NavMenu
  label="Docs sidebar"
  groups={groups} // item ids are their paths
  activeId={pathname}
  renderLink={({ href, ...props }) => <Link to={href} {...props} />}
/>`,
    },
  ],
  props: [
    { name: 'groups', type: '{ id; label; icon?: ReactNode; items: { id; label; href; badge?: ReactNode }[] }[]', description: 'Groups in order. Item ids must be unique across groups.' },
    { name: 'activeId', type: 'string', description: 'Current item (controlled). Gets aria-current="page"; its group opens when it changes.' },
    { name: 'defaultActiveId', type: 'string', description: 'Initial active item when uncontrolled; clicks move it.' },
    { name: 'onNavigate', type: '(item, event) => void', description: 'Called on every item click. event.preventDefault() cancels a plain link.' },
    { name: 'searchable', type: 'boolean', default: 'false', description: 'Adds a filter field. ↓ enters the list, Enter opens the first match, Esc clears.' },
    { name: 'searchPlaceholder', type: 'string', default: "'Filter…'", description: 'Placeholder of the filter field.' },
    { name: 'defaultOpen', type: 'string[] | boolean', default: 'active group', description: 'Groups open at first: true for all, or a list of ids. The active group always opens.' },
    { name: 'renderLink', type: '(props, item) => ReactNode', description: 'Render each link yourself (router links). Spread props; map href to to.' },
    { name: 'as', type: 'ElementType', default: "'a'", description: 'Link component that takes href. Ignored when renderLink is set.' },
    { name: 'label', type: 'string', default: "'Menu'", description: 'Accessible name of the <nav>.' },
  ],
} satisfies DocEntry
