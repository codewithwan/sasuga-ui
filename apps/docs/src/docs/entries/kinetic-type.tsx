import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Slider } from '@/components/ui/slider'
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Icon } from '@/components/ui/icon'
import { KineticType } from '@/components/ui/kinetic-type'
import type { KineticTypeAlign, KineticTypeFit, KineticTypeHandle, KineticTypeVAlign } from '@/components/ui/kinetic-type'
import { Switch } from '@/components/ui/switch'
import { TimelineScrubber, useTimeline } from '@/components/ui/timeline'
import { ToggleGroup } from '@/components/ui/toggle-group'
import { WORD_STYLES } from '@/components/ui/word-tiles'
import type { WordStyle } from '@/components/ui/word-tiles'
import type { DocEntry } from '../types'

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

function Range({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="grid min-w-0 gap-0.5">
      <span className="text-xs font-bold text-mute">{label}</span>
      <Slider label={label} min={min} max={max} step={1} value={value} onChange={onChange} format={(v) => `${Math.round(v)}px`} ticks={false} maxSfx={false} minSfx={false} className="w-full" />
    </div>
  )
}

const MIN_W = 120
const MIN_H = 80
const MAX_H = 420

/** A box you can resize: corner handle (pointer or arrow keys) plus two sliders. */
function useStage(initial: { w: number; h: number }) {
  const wrap = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(initial.w)
  const [h, setH] = useState(initial.h)
  const [room, setRoom] = useState(initial.w)
  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setRoom(Math.max(MIN_W, Math.floor(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const width = clamp(w, MIN_W, room)
  const drag = useRef<{ x: number; y: number; w: number; h: number } | null>(null)
  const onDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, w: width, h }
  }
  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d) return
    setW(clamp(d.w + e.clientX - d.x, MIN_W, room))
    setH(clamp(d.h + e.clientY - d.y, MIN_H, MAX_H))
  }
  const onUp = () => {
    drag.current = null
  }
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? 40 : 10
    const dx = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0
    const dy = e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0
    if (!dx && !dy) return
    e.preventDefault()
    setW(clamp(width + dx, MIN_W, room))
    setH(clamp(h + dy, MIN_H, MAX_H))
  }
  const handle = (
    <button
      type="button"
      aria-label={`Resize the box, ${Math.round(width)} by ${Math.round(h)} pixels. Arrow keys change width and height, Shift for bigger steps.`}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onKeyDown={onKey}
      className="ui-border-thin ui-pill ui-shadow-sm absolute -right-3.5 -bottom-3.5 z-10 grid size-8 cursor-nwse-resize touch-none place-items-center bg-paper p-0 transition-transform duration-150 ease-snap hover:scale-110 active:scale-95 focus-visible:ui-focus"
    >
      <span aria-hidden="true" className="relative block size-3.5">
        <span className="ui-pill absolute right-0 bottom-0 size-1 bg-ink" />
        <span className="ui-pill absolute right-0 bottom-1.5 size-1 bg-ink" />
        <span className="ui-pill absolute right-1.5 bottom-0 size-1 bg-ink" />
        <span className="ui-pill absolute right-0 bottom-3 size-1 bg-mute" />
        <span className="ui-pill absolute right-1.5 bottom-1.5 size-1 bg-mute" />
        <span className="ui-pill absolute right-3 bottom-0 size-1 bg-mute" />
      </span>
    </button>
  )
  return { wrap, width, h, room, setW, setH, handle }
}

/** The resizable stage: a dashed box that is exactly the text's box. */
function Stage({ width, height, handle, children }: { width: number; height: number; handle: ReactNode; children: ReactNode }) {
  return (
    <div className="ui-r relative bg-canvas" style={{ width, height }}>
      <span aria-hidden="true" className="ui-r pointer-events-none absolute -inset-px [border:var(--ui-bw-thin)_dashed_color-mix(in_srgb,var(--color-ink)_35%,transparent)]" />
      {children}
      {handle}
    </div>
  )
}

const ALIGNS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
  { value: 'justify', label: 'Justify' },
]
const VALIGNS = [
  { value: 'top', label: 'Top' },
  { value: 'middle', label: 'Middle' },
  { value: 'bottom', label: 'Bottom' },
]
const FITS = [
  { value: 'none', label: 'None' },
  { value: 'width', label: 'Width' },
  { value: 'box', label: 'Box' },
]

function Playground() {
  const [text, setText] = useState('Set the *box*, the words do the rest.\nDrag the corner and watch every word *glide*.')
  const [align, setAlign] = useState<KineticTypeAlign>('center')
  const [valign, setValign] = useState<KineticTypeVAlign>('middle')
  const [fit, setFit] = useState<KineticTypeFit>('box')
  const [look, setLook] = useState<WordStyle>('block')
  const [upper, setUpper] = useState(false)
  const stage = useStage({ w: 460, h: 250 })
  const type = useRef<KineticTypeHandle>(null)
  return (
    <div className="grid w-full max-w-[720px] grid-cols-[minmax(0,1fr)] gap-5">
      <div ref={stage.wrap} className="grid min-w-0 justify-items-start pr-4 pb-4">
        <Stage width={stage.width} height={stage.h} handle={stage.handle}>
          <KineticType
            ref={type}
            text={text}
            align={align}
            valign={valign}
            fit={fit}
            wordStyle={look}
            uppercase={upper}
            animate="both"
            className="text-[clamp(18px,4.2vw,28px)] text-ink"
          />
        </Stage>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Range label="Width" value={stage.width} min={MIN_W} max={stage.room} onChange={stage.setW} />
        <Range label="Height" value={stage.h} min={MIN_H} max={MAX_H} onChange={stage.setH} />
      </div>
      <div className="grid justify-items-center gap-3">
        <ToggleGroup label="Word style" size="sm" sfx={false} items={WORD_STYLES} value={look} onValueChange={(v) => setLook(v as WordStyle)} />
        <div className="flex max-w-full flex-wrap justify-center gap-3">
          <ToggleGroup label="Align" size="sm" sfx={false} items={ALIGNS} value={align} onValueChange={(v) => setAlign(v as KineticTypeAlign)} />
          <ToggleGroup label="Vertical align" size="sm" sfx={false} items={VALIGNS} value={valign} onValueChange={(v) => setValign(v as KineticTypeVAlign)} />
          <ToggleGroup label="Fit" size="sm" sfx={false} items={FITS} value={fit} onValueChange={(v) => setFit(v as KineticTypeFit)} />
        </div>
      </div>
      <Field label="Text (*stars* emphasize, new line breaks)" multiline value={text} onChange={setText} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Switch label="Uppercase" checked={upper} onChange={setUpper} sfxOn={false} sfxOff={false} />
        <Button size="sm" variant="paper" sfx={false} icon={<Icon name="play" tone="line" size={16} />} onClick={() => type.current?.play()}>
          Replay entrance
        </Button>
      </div>
    </div>
  )
}

function PosterDemo() {
  const [w, setW] = useState('260')
  return (
    <div className="grid w-full justify-items-center gap-4">
      <div className="max-w-full" style={{ width: Number(w) }}>
        <KineticType text={'*Level*\nup your\ntype\n*game*'} fit="width" align="center" wordStyle="block" uppercase gap={[0.12, 0.08]} lineHeight={1} className="text-3xl" />
      </div>
      <ToggleGroup
        label="Poster width"
        size="sm"
        sfx={false}
        items={[
          { value: '180', label: 'Narrow' },
          { value: '260', label: 'Medium' },
          { value: '340', label: 'Wide' },
        ]}
        value={w}
        onValueChange={setW}
      />
    </div>
  )
}

const PARAGRAPH =
  'Justified type used to mean a typesetter with a box of spacers. Here every *gap* is worked out live, and each word slides to its slot when the column changes. The last line of a paragraph stays flush left, as it *should*.'

function ParagraphDemo() {
  const [w, setW] = useState(380)
  const wrap = useRef<HTMLDivElement>(null)
  const [room, setRoom] = useState(520)
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setRoom(Math.max(200, Math.floor(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const width = Math.min(w, room)
  return (
    <div ref={wrap} className="grid w-full max-w-[560px] grid-cols-[minmax(0,1fr)] gap-4">
      <KineticType text={PARAGRAPH} width={width} align="justify" wordStyle="sticker" className="text-[17px] text-ink" />
      <Range label="Column width" value={width} min={200} max={room} onChange={setW} />
    </div>
  )
}

const LENGTH = 6

function CaptionDemo() {
  const tl = useTimeline({ duration: LENGTH })
  // calm until played: park on a frame where the words have landed
  useEffect(() => tl.seek(2.4), [tl])
  return (
    <div className="grid w-full max-w-[640px] gap-3">
      <div className="ui-card relative aspect-video w-full overflow-hidden bg-[radial-gradient(120%_90%_at_20%_10%,color-mix(in_srgb,var(--color-accent-soft)_85%,transparent),transparent_60%),radial-gradient(90%_80%_at_90%_100%,color-mix(in_srgb,var(--color-pop)_28%,transparent),transparent_65%),linear-gradient(160deg,var(--color-canvas),color-mix(in_srgb,var(--color-accent)_22%,var(--color-canvas)))]">
        <div className="absolute inset-[7%]">
          <KineticType
            text={'Episode 04\n*The final round*'}
            time={tl.time}
            at={[0.4, 4.6]}
            align="right"
            valign="bottom"
            wordStyle="stamp"
            className="text-[clamp(16px,4.6vw,34px)]"
          />
        </div>
      </div>
      <TimelineScrubber timeline={tl} label="Caption timeline" />
    </div>
  )
}

export default {
  slug: 'kinetic-type',
  name: 'Kinetic Type',
  jp: 'モーション文字',
  category: 'Motion',
  description:
    'Motion-graph type: set a box of any width and height and the words lay themselves out inside it, aligned left, center, right or justified and top, middle or bottom, optionally fitted to the box. Change the size, alignment, style or text and every word glides to its new place on a spring with a slight stagger. Words can be plain or tiles (block, outline, sticker, split, stamp, tape) that follow the active style, and the entrance can run on its own or from a timeline.',
  preview: <Playground />,
  usage: `import { KineticType } from '@/components/ui/kinetic-type'

<div className="h-64 w-full max-w-md">
  <KineticType
    text={'Set the *box*,\\nthe words do the rest.'}
    align="center"
    valign="middle"
    fit="box"
    wordStyle="block"
  />
</div>`,
  examples: [
    {
      title: 'Poster stack: every line scaled to the width',
      preview: <PosterDemo />,
      code: `<div style={{ width }}>
  <KineticType text={'*Level*\\nup your\\ntype\\n*game*'} fit="width" align="center" wordStyle="block" uppercase gap={[0.12, 0.08]} lineHeight={1} />
</div>`,
    },
    {
      title: 'Justified paragraph in stickers',
      preview: <ParagraphDemo />,
      code: `<KineticType text={paragraph} width={width} align="justify" wordStyle="sticker" className="text-[17px]" />`,
    },
    {
      title: 'Bottom-right caption on a timeline',
      preview: <CaptionDemo />,
      code: `import { KineticType } from '@/components/ui/kinetic-type'
import { TimelineScrubber, useTimeline } from '@/components/ui/timeline'

const tl = useTimeline({ duration: 6 })

<div className="ui-card relative aspect-video overflow-hidden">
  <div className="absolute inset-[7%]">
    <KineticType text={'Episode 04\\n*The final round*'} time={tl.time} at={[0.4, 4.6]} align="right" valign="bottom" wordStyle="stamp" />
  </div>
</div>
<TimelineScrubber timeline={tl} />`,
    },
  ],
  props: [
    { name: 'text', type: 'string', description: 'The words. *word* or *several words* get the pop colour of the style; a line break (or a literal \\n) forces a new line.' },
    { name: 'width / height', type: 'number | string', default: "'100%'", description: 'The box, any CSS length (numbers are px). With no definite height the box takes the height of its text.' },
    { name: 'align', type: "'left' | 'center' | 'right' | 'justify'", default: "'left'", description: 'Horizontal alignment per line. Justify spreads the gaps; the last line of a paragraph stays flush left.' },
    { name: 'valign', type: "'top' | 'middle' | 'bottom'", default: "'top'", description: 'Where the block of lines sits in the box.' },
    { name: 'fit', type: "'none' | 'width' | 'box'", default: "'none'", description: 'box: the largest font size at which everything fits the box (binary search on the measured layout, never overflows). width: each line scaled to the box width, a poster stack (scaled down as one if it gets taller than the box).' },
    { name: 'wordStyle', type: "'plain' | 'block' | 'outline' | 'sticker' | 'split' | 'stamp' | 'tape'", default: "'plain'", description: 'Words as tiles from word-tiles.tsx. Every look follows data-style (cel rounded, manga square, flat soft) and the theme colours.' },
    { name: 'gap', type: 'number | [x, y]', default: 'plain [0.26, 0.02], tiles [0.14, 0.14]', description: 'Space between words and between lines, in em.' },
    { name: 'lineHeight', type: 'number', default: '1.12', description: 'Line height of a word; tiles add their padding on top.' },
    { name: 'uppercase', type: 'boolean', default: 'false', description: 'Set every word in capitals.' },
    { name: 'animate', type: "'reflow' | 'enter' | 'both' | 'none'", default: "'reflow'", description: 'reflow: words glide (FLIP on springs, slight stagger) when size, alignment, style or text change. enter: words drop in when the text changes or on play(). both: kept words glide, new ones drop in. Reduced motion snaps.' },
    { name: 'time / at', type: 'number / [in, out?]', description: 'Drive the entrance from a clock (useTimeline().time, a video): words drop in from `in` and leave at `out`. A pure function of the time, so scrubbing lands exactly.' },
    { name: 'ref', type: 'Ref<{ play(): void }>', description: 'play() drops every word in again (not while `time` drives it).' },
    { name: 'className', type: 'string', description: 'Font size and colour come from here (the text uses the heading face of the style).' },
  ],
} satisfies DocEntry
