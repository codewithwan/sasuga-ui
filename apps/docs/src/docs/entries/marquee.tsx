import { Marquee } from '@/components/ui/marquee'
import type { DocEntry } from '../types'

export default {
  slug: 'marquee',
  name: 'Marquee',
  jp: '流れ',
  category: 'Motion',
  description:
    'A flat band of endlessly scrolling words between sections, outlined top and bottom. Japanese words switch to the Japanese font automatically. Hover it and it pauses, the dots swell and the word under the pointer springs up in the accent colour. Use bleed to run it past the container edges.',
  preview: (
    <div className="w-full overflow-hidden py-6">
      <Marquee words={['sasuga/ui', 'さすが', 'Game feel']} />
    </div>
  ),
  usage: `import { Marquee } from '@/components/ui/marquee'

<Marquee words={['Selected work', '作品', 'Ship it']} tone="soft" bleed />`,
  examples: [
    {
      title: 'Tones',
      preview: (
        <div className="grid w-full gap-6 overflow-hidden py-6">
          <Marquee words={['Paper', '紙']} tone="paper" />
          <Marquee words={['Canvas', '下地']} tone="canvas" reverse />
          <Marquee words={['Soft', '淡']} tone="soft" />
        </div>
      ),
      code: `<Marquee words={['Paper', '紙']} tone="paper" />
<Marquee words={['Canvas', '下地']} tone="canvas" reverse />
<Marquee words={['Soft', '淡']} tone="soft" />`,
    },
    {
      title: 'Fast',
      preview: (
        <div className="w-full overflow-hidden py-6">
          <Marquee words={['Full speed', '全速', 'Go']} tone="paper" speed={9} />
        </div>
      ),
      code: `<Marquee words={['Full speed', '全速', 'Go']} tone="paper" speed={9} />`,
    },
  ],
  props: [
    { name: 'words', type: 'string[]', description: 'Repeated with dot separators.' },
    { name: 'tone', type: "'paper' | 'canvas' | 'soft'", default: "'soft'", description: 'Band colour. Older names still work: accent/pop → soft, white → paper, ink → canvas with screentone.' },
    { name: 'reverse', type: 'boolean', default: 'false', description: 'Scroll the other way.' },
    { name: 'bleed', type: 'boolean', default: 'false', description: 'Overhang the container edges.' },
    { name: 'speed', type: 'number', default: '28', description: 'Seconds per loop (lower is faster).' },
    { name: 'interactive', type: 'boolean', default: 'true', description: 'Pause on hover and let words jump under the pointer.' },
    { name: 'tilt', type: 'number', description: 'Deprecated and ignored: the band never tilts.' },
  ],
} satisfies DocEntry
