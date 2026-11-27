import { useRef } from 'react'
import { ScrollCaption } from '@/components/ui/scroll-caption'
import { Icon } from '@/components/ui/icon'
import type { DocEntry } from '../types'

const STORY =
  'Every button you press lands like a *hit*. Calm at rest, loud on contact, and back to quiet before you notice. That is the whole *trick*.'

/** A scroll box, so the demo scrubs without moving the page. */
function Box({ mode, text, label }: { mode?: 'word' | 'line'; text: string; label: string }) {
  const box = useRef<HTMLDivElement>(null)
  return (
    <div
      ref={box}
      role="region"
      aria-label={label}
      tabIndex={0}
      className="ui-border ui-r-lg relative h-[260px] w-full max-w-xl overflow-y-auto overscroll-contain bg-paper px-5 focus-visible:ui-focus sm:px-8"
    >
      <div className="grid h-[240px] place-items-center content-center gap-1 text-mute">
        <span className="ui-head text-sm">Scroll</span>
        <Icon name="chevron-down" tone="line" size={20} className="animate-bob" />
      </div>
      <ScrollCaption text={text} mode={mode} scroller={box} from={0.9} to={0.55} className="text-[clamp(20px,1rem+1.6vw,32px)]" />
      <div className="h-[220px]" />
    </div>
  )
}

export default {
  slug: 'scroll-caption',
  name: 'Scroll Caption',
  jp: 'スクロール',
  category: 'Motion',
  description:
    'Scroll-scrubbed text: as the paragraph travels up through the viewport its words go from dim to full ink one after another (or a line at a time), and back when you scroll up. Words marked *like this* turn accent when they are reached. It only listens while on screen, never takes over the scroll, and shows the full text with reduced motion.',
  preview: <Box text={STORY} label="Scroll caption demo" />,
  usage: `import { ScrollCaption } from '@/components/ui/scroll-caption'

<ScrollCaption text="Every button you press lands like a *hit*. Calm at rest, loud on contact." />`,
  examples: [
    {
      title: 'A line at a time',
      preview: (
        <Box
          mode="line"
          label="Line mode demo"
          text="Lines light up as whole units, the way a lyric sheet follows the song. Resize the window and the lines are measured again."
        />
      ),
      code: `<ScrollCaption mode="line" text="Lines light up as whole units, the way a lyric sheet follows the song." />`,
    },
    {
      title: 'With the page scroll, as a section heading',
      preview: (
        <ScrollCaption
          as="h2"
          from={0.95}
          to={0.6}
          text="Scroll the page: this heading fills in as it rises, and *empties* again on the way back."
          className="max-w-xl text-center"
        />
      ),
      code: `<ScrollCaption as="h2" from={0.95} to={0.6} text="Scroll the page: this heading fills in as it rises, and *empties* again on the way back." />`,
    },
    {
      title: 'Inside a scroll box',
      preview: <Box text="Pass a ref to the scrolling element and the range is measured against that box instead of the window." label="Scroll box demo" />,
      code: `const box = useRef<HTMLDivElement>(null)

<div ref={box} className="h-64 overflow-y-auto">
  <ScrollCaption scroller={box} from={0.9} to={0.55} text="Pass a ref to the scrolling element…" />
</div>`,
    },
  ],
  props: [
    { name: 'text', type: 'string', description: 'The paragraph. Wrap words in *stars* to turn them accent when they light up (the stars are not shown).' },
    { name: 'as', type: "'p' | 'h2' | 'h3' | 'div'", default: "'p'", description: 'Element to render. The words stay real text in it.' },
    { name: 'from', type: 'number', default: '0.85', description: 'Viewport line (0 = top, 1 = bottom) where the paragraph’s top starts lighting.' },
    { name: 'to', type: 'number', default: '0.45', description: 'Viewport line the paragraph’s bottom reaches when it is fully lit.' },
    { name: 'mode', type: "'word' | 'line'", default: "'word'", description: 'Light word by word, or a measured line at a time.' },
    { name: 'scroller', type: 'RefObject<HTMLElement | null>', description: 'Measure against this scrolling element instead of the window.' },
    { name: 'className', type: 'string', description: 'Type size, colour (lit words use it) and width. Defaults to the heading face with clamp() sizing.' },
  ],
} satisfies DocEntry
