import { Tabs } from '@/components/ui/tabs'
import type { DocEntry } from '../types'

const demo = [
  { id: 'home', label: 'Home', content: <p className="m-0">Home base. Switch tabs.</p> },
  { id: 'profile', label: 'Profile', content: <p className="m-0">The accent pill slid over to get here.</p>, sfx: 'スッ' },
  { id: 'settings', label: 'Settings', content: <p className="m-0">Arrow keys, Home and End work too.</p>, sfx: 'ザッ' },
]

export default {
  slug: 'tabs',
  name: 'Tabs',
  jp: 'タブ',
  category: 'Layout',
  description:
    'ARIA tabs in a pill bar. The accent pill dashes to the new tab, stretching and trailing afterimages, lands in a puff of dust with its own lettering, and the panel slides in from the side it travelled from.',
  preview: <Tabs label="Example tabs" tabs={demo} />,
  usage: `import { Tabs } from '@/components/ui/tabs'

<Tabs
  label="Account"
  tabs={[
    { id: 'home', label: 'Home', content: <Home /> },
    { id: 'profile', label: 'Profile', content: <Profile />, sfx: 'スッ' },
  ]}
/>`,
  props: [
    { name: 'tabs', type: '{ id: string; label: string; content: ReactNode; sfx?: string }[]', description: 'Tabs in order. sfx overrides the default シュッ lettering.' },
    { name: 'label', type: 'string', description: 'Accessible name for the tab list.' },
    { name: 'defaultTab', type: 'string', default: 'first tab', description: 'Id of the tab selected first.' },
    { name: 'onTabChange', type: '(id: string) => void', description: 'Called when the user picks another tab.' },
  ],
} satisfies DocEntry
