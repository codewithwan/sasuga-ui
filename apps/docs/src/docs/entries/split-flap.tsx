import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Icon } from '@/components/ui/icon'
import { SplitFlap } from '@/components/ui/split-flap'
import { FrameControls } from '@/components/site/FrameControls'
import type { DocEntry } from '../types'

/* ── Departures: one row changes every few seconds ── */

type Flight = { to: string; time: string; status: string }

const POOL: Flight[] = [
  { to: 'SKY HARBOR', time: '12:40', status: 'ON TIME' },
  { to: 'EMBER PEAK', time: '12:55', status: 'BOARDING' },
  { to: 'MOONWELL', time: '13:10', status: 'DELAYED' },
  { to: 'GLASS DUNES', time: '13:25', status: 'GATE 4' },
  { to: 'IRONVALE', time: '13:40', status: 'ON TIME' },
  { to: 'WILLOWMERE', time: '13:55', status: 'GATE 9' },
  { to: 'CORAL SPIRE', time: '14:05', status: 'BOARDING' },
  { to: 'MISTGATE', time: '14:20', status: 'ON TIME' },
  { to: 'THORNWOOD', time: '14:35', status: 'CANCEL' },
  { to: 'CINDER BAY', time: '14:50', status: 'DELAYED' },
]

const fmt = (f: Flight) => `${f.to.padEnd(11)} ${f.time} ${f.status.padEnd(8)}`
const ROWS = 4

function DeparturesDemo() {
  const [flights, setFlights] = useState(() => POOL.slice(0, ROWS))
  const cursor = useRef({ row: 0, next: ROWS })
  const advance = () => {
    const { row, next } = cursor.current
    cursor.current = { row: (row + 1) % ROWS, next: (next + 1) % POOL.length }
    setFlights((list) => list.map((f, i) => (i === row ? POOL[next] : f)))
  }
  useEffect(() => {
    // advance only touches refs and a state setter, so the first one is good for the interval
    const id = window.setInterval(advance, 3600)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="grid w-full max-w-[720px] grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="ui-head flex items-center gap-2 text-[17px] text-ink">
          <Icon name="flag" tone="line" size={18} />
          Departures
        </span>
        <span className="font-mono text-xs text-mute">Hall 2, upper deck</span>
      </div>
      <SplitFlap value={flights.map(fmt)} columns={26} size="text-[26px]" />
      <div className="flex justify-end">
        <Button size="sm" variant="paper" sfx={false} icon={<Icon name="arrow-right" tone="line" size={16} />} onClick={advance}>
          Next
        </Button>
      </div>
    </div>
  )
}

/* ── Scoreboard with +1 buttons ── */

function ScoreDemo() {
  const [a, setA] = useState(3)
  const [b, setB] = useState(2)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <div className="grid w-full max-w-[520px] grid-cols-[minmax(0,1fr)] justify-items-center gap-5">
      <SplitFlap value={[`SUN DRAGONS ${pad(a)}`, `TIDE WOLVES ${pad(b)}`]} columns={14} size="lg" />
      <div className="flex flex-wrap justify-center gap-3">
        <Button size="sm" variant="accent" sfx={false} icon={<Icon name="plus" tone="line" size={16} />} onClick={() => setA((v) => (v + 1) % 100)}>
          Dragons
        </Button>
        <Button size="sm" variant="pop" sfx={false} icon={<Icon name="plus" tone="line" size={16} />} onClick={() => setB((v) => (v + 1) % 100)}>
          Wolves
        </Button>
        <Button
          size="sm"
          sfx={false}
          onClick={() => {
            setA(0)
            setB(0)
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  )
}

/* ── Type to flip ── */

const COLS = 14

/** Break text into `rows` rows of whole words, `cols` cells each (a long word is cut). */
function wrap(text: string, cols = COLS, rows = 2) {
  const out: string[] = ['']
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    const last = out[out.length - 1]
    if (!last) out[out.length - 1] = word.slice(0, cols)
    else if (last.length + 1 + word.length <= cols) out[out.length - 1] = `${last} ${word}`
    else if (out.length < rows) out.push(word.slice(0, cols))
    else break
  }
  while (out.length < rows) out.push('')
  return out
}

function TypeDemo() {
  const [text, setText] = useState('Gates open at dawn')
  const [settled, setSettled] = useState(true)
  const rows = wrap(text)
  const key = rows.join('\n')
  const [shown, setShown] = useState(key)
  if (shown !== key) {
    setShown(key)
    setSettled(false)
  }
  return (
    <div className="grid w-full max-w-[520px] grid-cols-[minmax(0,1fr)] gap-4">
      <SplitFlap value={rows} columns={COLS} align="center" size="lg" onSettle={() => setSettled(true)} />
      <Field label="Board text" value={text} onChange={setText} placeholder="Type anything" />
      <p className="flex items-center gap-2 text-xs text-mute" aria-hidden="true">
        <Icon name={settled ? 'check' : 'clock'} tone="line" size={14} />
        {settled ? 'Settled' : 'Flipping'}
      </p>
    </div>
  )
}

/* ── Fit: the same board in video frames ── */

const CALLS = ['Gates open at dawn', 'Last ferry to Mistgate', 'Storm over Ember Peak', 'Welcome to Sky Harbor']


/** Words wrapped to the frame's columns, centred in its rows like a real board. */
function board(text: string, cols: number, rows: number) {
  const lines = wrap(text, cols, rows).filter(Boolean)
  const top = Math.floor((rows - lines.length) / 2)
  return Array.from({ length: rows }, (_, i) => lines[i - top] ?? '')
}

/** Columns and rows chosen from the frame's shape, so the board fills any frame you set. */
function gridFor(width: number, height: number) {
  const aspect = width / height
  const rows = aspect > 1.4 ? 5 : aspect > 0.9 ? 7 : 9
  const cols = Math.max(6, Math.min(24, Math.round(((aspect * rows) / 0.645) * 0.92)))
  return { rows, cols }
}

function FitDemo() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setI((v) => (v + 1) % CALLS.length), 4200)
    return () => window.clearInterval(id)
  }, [])
  return (
    <div className="w-full max-w-[720px]">
      <FrameControls initial="16:9" maxHeight="min(60svh, 520px)">
        {({ width, height }) => {
          const { rows, cols } = gridFor(width, height)
          return (
            <div className="h-full w-full bg-canvas p-[4%]">
              <SplitFlap fit value={board(CALLS[i], cols, rows)} columns={cols} align="center" />
            </div>
          )
        }}
      </FrameControls>
    </div>
  )
}

/* ── Launch countdown: digits keep flipping as the target moves on ── */

function CountdownDemo() {
  const [left, setLeft] = useState(15)
  const [running, setRunning] = useState(false)
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(id)
  }, [running])
  const done = left === 0
  const row = done ? 'LIFTOFF!' : `T- 00:${String(left).padStart(2, '0')}`
  return (
    <div className="grid w-full max-w-[420px] grid-cols-[minmax(0,1fr)] justify-items-center gap-4">
      <SplitFlap value={['AURORA LANCE', row]} columns={12} align="center" size="md" />
      <div className="flex flex-wrap justify-center gap-3">
        <Button
          size="sm"
          variant="accent"
          sfx={false}
          icon={<Icon name={running && !done ? 'pause' : 'play'} tone="line" size={16} />}
          onClick={() => setRunning((r) => !r)}
          disabled={done}
        >
          {running && !done ? 'Hold' : 'Start'}
        </Button>
        <Button
          size="sm"
          sfx={false}
          onClick={() => {
            setRunning(false)
            setLeft(15)
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  )
}

export default {
  slug: 'split-flap',
  name: 'Split Flap',
  jp: 'フラップ',
  category: 'Motion',
  description:
    'The flipping-letter board of stations and airports. When the text changes, every cell that differs flips through its drum of characters to the new one, a card at a time: the top half folds down over the bottom with perspective and a shadow, cells staggered left to right. The board keeps a fixed grid, so it never reflows, scales down to fit narrow screens and follows the active style: ink cards in cel, hard screentoned cards in manga, calm quick flips in flat.',
  preview: <DeparturesDemo />,
  usage: `import { SplitFlap } from '@/components/ui/split-flap'

<SplitFlap
  value={['SKY HARBOR  12:40 ON TIME', 'EMBER PEAK  12:55 BOARDING']}
  columns={26}
  onSettle={() => console.log('board settled')}
/>`,
  examples: [
    {
      title: 'Scoreboard',
      preview: <ScoreDemo />,
      code: `const pad = (n: number) => String(n).padStart(2, '0')

<SplitFlap value={[\`SUN DRAGONS \${pad(a)}\`, \`TIDE WOLVES \${pad(b)}\`]} columns={14} size="lg" />
<Button onClick={() => setA((v) => v + 1)}>Dragons</Button>`,
    },
    {
      title: 'Type to flip, with onSettle',
      preview: <TypeDemo />,
      code: `const [text, setText] = useState('Gates open at dawn')
const [settled, setSettled] = useState(true)

<SplitFlap value={wrap(text)} columns={14} align="center" size="lg" onSettle={() => setSettled(true)} />
<Field label="Board text" value={text} onChange={(t) => { setText(t); setSettled(false) }} />`,
    },
    {
      title: 'Fit to any frame (set the size)',
      preview: <FitDemo />,
      code: `// fit: the cells scale to the container's width and height, the board sits centred
<div className="aspect-[9/16] w-full">
  <SplitFlap fit value={['', '', 'LAST', 'FERRY', 'TO', 'MISTGATE', '', '']} columns={8} align="center" />
</div>`,
    },
    {
      title: 'Launch countdown: a moving target',
      preview: <CountdownDemo />,
      code: `// each second retargets the digits; a cell still flipping just carries on from where it is
<SplitFlap value={['AURORA LANCE', left ? \`T- 00:\${pad(left)}\` : 'LIFTOFF!']} columns={12} align="center" />`,
    },
  ],
  props: [
    { name: 'value', type: 'string | string[]', description: 'The text, one string per row. Every change flips the cells that differ; the board mounts showing the value without flipping.' },
    { name: 'columns', type: 'number', default: 'longest row', description: 'Cells per row. Shorter rows are padded with blanks, longer rows are cut.' },
    { name: 'align', type: "'left' | 'center' | 'right'", default: "'left'", description: 'Where a short row sits in its cells.' },
    {
      name: 'charset',
      type: 'string',
      default: "' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:-!?/'",
      description: 'The drum every cell flips through, in order, wrapping around. Matching is case-insensitive; a character outside the set flips straight in with one flip.',
    },
    { name: 'speed', type: 'number', default: '18 (flat 28)', description: 'Flips per second of one cell. The last flip lands a little slower with a small clack (not in flat).' },
    { name: 'stagger', type: 'number', default: '26', description: 'Delay in ms between neighbouring changing cells when a change starts, left to right, rows slightly later.' },
    { name: 'size', type: "'sm' | 'md' | 'lg' | string", default: "'md'", description: 'Cell size preset (18 / 28 / 42 px type) or a font-size class. Cells keep a fixed aspect; a board wider than its container scales down to fit.' },
    { name: 'fit', type: 'boolean', default: 'false', description: "Fill the container: the cells scale so the board fits its width and height (any frame, 16:9, 9:16, 1:1), keeping their aspect, centred. Give the outer element a size (className 'h-full', 'aspect-[9/16]'); size is ignored." },
    { name: 'onSettle', type: '() => void', description: 'Fired once every cell has reached its character after a change.' },
    { name: 'boardClassName', type: 'string', description: 'Classes for the housing around the cells.' },
    { name: 'className', type: 'string', description: 'Classes for the outer element: a full-width size container, or with fit the frame the board fills.' },
  ],
} satisfies DocEntry
