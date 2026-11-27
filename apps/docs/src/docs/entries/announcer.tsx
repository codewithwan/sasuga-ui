import { AnnouncerHost, announce, useAnnouncer } from '@/components/ui/announcer'
import { Button } from '@/components/ui/button'
import type { DocEntry } from '../types'

function AnnouncerDemo() {
  const { announce: say } = useAnnouncer()
  return (
    <div className="grid justify-items-center gap-4">
      <div className="flex flex-wrap justify-center gap-3">
        <Button size="sm" variant="accent" sfx={false} onClick={() => say('LEVEL UP!', { sub: 'Lv 12, +3 skill points' })}>
          Level up
        </Button>
        <Button size="sm" variant="pop" sfx={false} onClick={() => say('NEW RECORD', { sub: '12,480 pts', variant: 'pop', sfx: 'やった!' })}>
          New record
        </Button>
        <Button size="sm" variant="ink" sfx={false} onClick={() => say('STAGE CLEAR', { sub: 'Stage 2-4', variant: 'ink' })}>
          Stage clear
        </Button>
      </div>
      <p className="m-0 text-center text-xs text-mute">The splash plays over the whole page and never blocks clicks.</p>
      <AnnouncerHost />
    </div>
  )
}

function QueueDemo() {
  return (
    <Button
      size="sm"
      sfx={false}
      onClick={() => {
        announce('READY')
        announce('SET', { variant: 'pop' })
        announce('GO!', { variant: 'ink', sfx: 'ドン!', duration: 900 })
      }}
    >
      Queue three
    </Button>
  )
}

export default {
  slug: 'announcer',
  name: 'Announcer',
  jp: 'アナウンス',
  category: 'Motion',
  description:
    'Big centre-screen splash text for moments like LEVEL UP!, NEW RECORD or STAGE CLEAR. Letters slam in one by one with an overshoot and land with focus lines, a burst and lettering (flat keeps it to a calm scale, fade and ring). It holds, leaves fast and plays queued splashes in order. announce() works from anywhere, even outside React; screen readers hear it assertively.',
  preview: <AnnouncerDemo />,
  usage: `import { AnnouncerHost, announce } from '@/components/ui/announcer'

// once, near the root of the app
<AnnouncerHost />

// anywhere: event handlers, game loops, outside React
announce('LEVEL UP!', { sub: 'Lv 12', variant: 'accent' })`,
  examples: [
    {
      title: 'Queueing (uses the host from the preview above)',
      preview: <QueueDemo />,
      code: `announce('READY')
announce('SET', { variant: 'pop' })
announce('GO!', { variant: 'ink', sfx: 'ドン!', duration: 900 })`,
    },
  ],
  props: [
    { name: 'announce(text, options?)', type: '(text: string, o?: AnnounceOptions) => number', description: 'Queue a splash; returns its id. Also useAnnouncer() → { announce, dismiss, clear }, and dismissAnnouncement(id) / clearAnnouncements().' },
    { name: 'o.sub', type: 'string', description: 'A smaller line under the splash.' },
    { name: 'o.variant', type: "'accent' | 'pop' | 'ink'", default: "'accent'", description: 'Fill colour of the lettering.' },
    { name: 'o.duration', type: 'number', description: 'Hold time once it has landed, ms. Defaults to the host setting.' },
    { name: 'o.sfx', type: 'string | false', description: 'Canvas lettering thrown on the landing (cel / manga). Overrides the host.' },
    { name: 'duration', type: 'number', default: '1500', description: 'AnnouncerHost. Default hold, ms; shortened while more splashes wait.' },
    { name: 'sfx', type: 'string | false', default: "'ドン!'", description: 'AnnouncerHost. Default lettering.' },
  ],
} satisfies DocEntry
