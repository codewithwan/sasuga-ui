import { useEffect, useLayoutEffect, useRef } from 'react'
import type { CSSProperties, HTMLAttributes } from 'react'
import { prefersReducedMotion, uiStyle } from '@/fx'
import { cn } from '@/lib/utils'

export type SplitFlapAlign = 'left' | 'center' | 'right'
export type SplitFlapSize = 'sm' | 'md' | 'lg'

export type SplitFlapProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** The text on the board, one string per row. Every change flips the cells that differ. */
  value: string | string[]
  /** Cells per row. Default: the longest row. Longer rows are cut, shorter ones padded with blanks. */
  columns?: number
  /** Where a short row sits in its cells. */
  align?: SplitFlapAlign
  /** The drum every cell flips through, in order. Matching is case-insensitive; a character outside it flips straight in. */
  charset?: string
  /** Flips per second of one cell. Default 18 (28 in flat). */
  speed?: number
  /** Delay between neighbouring cells when a change starts, left to right, in ms. */
  stagger?: number
  /** Cell size preset, or a font-size class ('text-[52px]'). The board scales down to fit its container. */
  size?: SplitFlapSize | (string & {})
  /**
   * Fill the container: the cells scale so the whole board fits its width AND height (any frame,
   * 16:9, 9:16, 1:1…), keeping their aspect, and the board sits centred. Give the outer element a
   * size (className 'h-full', 'aspect-[9/16]'…); `size` is ignored.
   */
  fit?: boolean
  /** Classes for the board housing (the panel around the cells). */
  boardClassName?: string
  /** Fired when every cell has reached its character after a change. */
  onSettle?: () => void
}

export const SPLIT_FLAP_CHARSET = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:-!?/'

const SIZES: Record<SplitFlapSize, string> = {
  sm: 'text-[18px]',
  md: 'text-[28px]',
  lg: 'text-[42px]',
}

/* Geometry in em of the board font size: fixed so a change of text never reflows. */
const CW = 0.8
const GAP = 0.09
const PADX = 0.32
const CH = 1.24
const ROWGAP = 0.12
const PADY = 0.3
/** Total width of a board of n cells, plus slack for the housing border. */
const boardEm = (n: number) => n * CW + Math.max(0, n - 1) * GAP + PADX * 2 + 0.15
/** Total height of a board of r rows, plus slack for the housing border. */
const boardH = (r: number) => r * CH + Math.max(0, r - 1) * ROWGAP + PADY * 2 + 0.15

/** Map a character onto the drum: as is, else the other case, else unchanged (flips straight in). */
function normalize(ch: string, set: string) {
  if (set.includes(ch)) return ch
  const up = ch.toUpperCase()
  if (set.includes(up)) return up
  const low = ch.toLowerCase()
  if (set.includes(low)) return low
  return ch
}

function layout(value: string | string[], columns: number | undefined, align: SplitFlapAlign, set: string) {
  const rows = (Array.isArray(value) ? value : [value]).map((r) => [...r].map((c) => normalize(c, set)))
  if (rows.length === 0) rows.push([])
  const n = Math.max(1, columns ?? Math.max(...rows.map((r) => r.length)))
  return {
    n,
    grid: rows.map((r) => {
      const row = r.slice(0, n)
      const free = n - row.length
      const left = align === 'right' ? free : align === 'center' ? Math.floor(free / 2) : 0
      return [...Array<string>(left).fill(' '), ...row, ...Array<string>(free - left).fill(' ')]
    }),
  }
}

/** The next card on the drum on the way from `cur` to `to` (one direct flip for strangers). */
function nextChar(cur: string, to: string, set: string) {
  const i = set.indexOf(cur)
  if (i < 0 || !set.includes(to)) return to
  return set[(i + 1) % set.length]
}

type Cell = {
  cur: string
  target: string
  running: boolean
  timer: number
  anims: Animation[]
  /** glyphs: static top, static bottom, flap top, flap bottom */
  st: HTMLElement
  sb: HTMLElement
  ft: HTMLElement
  fb: HTMLElement
  flapTop: HTMLElement
  flapBot: HTMLElement
  shadeTop: HTMLElement
  shadeBot: HTMLElement
}

const show = (c: Cell, ch: string) => {
  c.st.textContent = c.sb.textContent = c.ft.textContent = c.fb.textContent = ch
}

/* The two halves: each clips a full-height glyph to its own half of the card. */
const HALF = 'absolute inset-x-0 h-1/2 overflow-hidden [backface-visibility:hidden]'
const TOP = `${HALF} top-0 bg-[var(--flap-top)] [border-radius:var(--flap-r)_var(--flap-r)_0_0]`
const BOT = `${HALF} bottom-0 bg-[var(--flap-bot)] bg-[image:var(--ui-tex)] [background-size:6px_6px] [border-radius:0_0_var(--flap-r)_var(--flap-r)]`
const GLYPH = 'absolute inset-x-0 block h-[200%] text-center leading-[1.24em]'
const SHADE = 'pointer-events-none absolute inset-0 bg-black opacity-0'

/* Per-style look. cel: ink cards with paper letters. manga: hard paper cards, ink outline,
   screentone on the lower half. flat: calm tinted cards, hairline hinge. */
const LOOK = cn(
  '[--flap-top:var(--color-ink)] [--flap-bot:color-mix(in_srgb,var(--color-ink)_93%,var(--color-paper))] [--flap-fg:var(--color-paper)]',
  '[--flap-hinge:color-mix(in_srgb,var(--color-ink)_55%,#000)] [--flap-r:0.12em] [--flap-edge:transparent]',
  '[[data-style=manga]_&]:[--flap-top:var(--color-paper)] [[data-style=manga]_&]:[--flap-bot:var(--color-paper)] [[data-style=manga]_&]:[--flap-fg:var(--color-ink)]',
  '[[data-style=manga]_&]:[--flap-hinge:var(--color-ink)] [[data-style=manga]_&]:[--flap-r:0.03em] [[data-style=manga]_&]:[--flap-edge:var(--color-ink)]',
  '[[data-style=flat]_&]:[--flap-top:color-mix(in_srgb,var(--color-ink)_5%,var(--color-paper))] [[data-style=flat]_&]:[--flap-bot:color-mix(in_srgb,var(--color-ink)_8%,var(--color-paper))]',
  '[[data-style=flat]_&]:[--flap-fg:var(--color-ink)] [[data-style=flat]_&]:[--flap-hinge:var(--color-paper)] [[data-style=flat]_&]:[--flap-r:0.14em]',
)

/**
 * A split-flap board, the flipping-letter display of stations and airports. Each cell is a
 * card cut in two at a hinge; on a change it flips through its drum (the charset) one card at a
 * time until it reaches the new character: the top half folds down over the bottom half with
 * perspective, darkening as it turns. The flips are Web Animations on the half-cards, chained per
 * cell, so a cell that gets a new target mid-run just keeps going from where it is.
 */
export function SplitFlap({
  value,
  columns,
  align = 'left',
  charset = SPLIT_FLAP_CHARSET,
  speed,
  stagger = 26,
  size = 'md',
  fit = false,
  boardClassName,
  onSettle,
  className,
  style,
  ...props
}: SplitFlapProps) {
  const { n, grid } = layout(value, columns, align, charset)
  const key = grid.map((r) => r.join('')).join('\n')
  const label = (Array.isArray(value) ? value : [value])
    .map((r) => r.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(', ')

  const board = useRef<HTMLDivElement>(null)
  const cells = useRef(new Map<string, Cell>())
  const mounted = useRef(false)
  const armed = useRef(false)
  const cfg = useRef({ charset, speed, stagger, onSettle })
  useLayoutEffect(() => {
    cfg.current = { charset, speed, stagger, onSettle }
  })

  const idle = () => {
    for (const c of cells.current.values()) if (c.running || c.timer || c.cur !== c.target) return false
    return true
  }
  const settleCheck = () => {
    if (armed.current && idle()) {
      armed.current = false
      cfg.current.onSettle?.()
    }
  }

  /** One flip of one cell toward its target, then the next, until it lands. */
  const step = (c: Cell) => {
    c.timer = 0
    if (c.cur === c.target || !c.st.isConnected) {
      c.running = false
      settleCheck()
      return
    }
    const flat = uiStyle() === 'flat'
    const next = nextChar(c.cur, c.target, cfg.current.charset)
    const landing = next === c.target
    const rate = cfg.current.speed ?? (flat ? 28 : 18)
    const d = (1000 / Math.max(1, rate)) * (landing && !flat ? 1.35 : 1)
    c.st.textContent = c.fb.textContent = next
    c.sb.textContent = c.ft.textContent = c.cur
    c.running = true
    // the falling top half accelerates like a card dropping; the lower half lands crisp
    const top = c.flapTop.animate(
      [
        { transform: 'rotateX(0deg)', easing: 'cubic-bezier(.45,0,.9,.55)' },
        { transform: 'rotateX(-90deg)', offset: 0.5 },
        { transform: 'rotateX(-90deg)' },
      ],
      { duration: d },
    )
    const land = landing && !flat
    const bot = c.flapBot.animate(
      land
        ? [
            { transform: 'rotateX(90deg)', offset: 0 },
            { transform: 'rotateX(90deg)', offset: 0.42, easing: 'cubic-bezier(.15,.45,.45,1)' },
            { transform: 'rotateX(0deg)', offset: 0.78, easing: 'ease-out' },
            { transform: 'rotateX(9deg)', offset: 0.88, easing: 'ease-in' },
            { transform: 'rotateX(0deg)' },
          ]
        : [
            { transform: 'rotateX(90deg)', offset: 0 },
            { transform: 'rotateX(90deg)', offset: 0.5, easing: 'cubic-bezier(.15,.45,.45,1)' },
            { transform: 'rotateX(0deg)' },
          ],
      { duration: d, fill: 'forwards' },
    )
    c.anims = [top, bot]
    if (!flat) {
      c.anims.push(
        c.shadeTop.animate([{ opacity: 0 }, { opacity: 0.4, offset: 0.5 }, { opacity: 0.4 }], { duration: d }),
        c.shadeBot.animate([{ opacity: 0.32 }, { opacity: 0.32, offset: 0.5 }, { opacity: 0, offset: land ? 0.78 : 1 }, { opacity: 0 }], { duration: d }),
      )
    }
    bot.onfinish = () => {
      // swap the resting lower half under the filled flap, then drop the animations: same frame
      c.sb.textContent = next
      c.cur = next
      for (const a of c.anims) a.cancel()
      c.anims = []
      step(c)
    }
  }
  const stepRef = useRef(step)
  useLayoutEffect(() => {
    stepRef.current = step
  })

  useLayoutEffect(() => {
    const host = board.current
    if (!host) return
    const still = prefersReducedMotion()
    const first = !mounted.current
    mounted.current = true
    const seen = new Set<string>()
    let moved = false
    grid.forEach((row, r) => {
      // only the cells that change take a place in the stagger
      let order = 0
      row.forEach((ch, col) => {
        const id = `${r}:${col}`
        seen.add(id)
        let c = cells.current.get(id)
        if (!c) {
          const el = host.querySelector<HTMLElement>(`[data-cell="${id}"]`)
          if (!el) return
          const q = (s: string) => el.querySelector<HTMLElement>(s)!
          c = {
            cur: ' ',
            target: ' ',
            running: false,
            timer: 0,
            anims: [],
            st: q('[data-st]'),
            sb: q('[data-sb]'),
            ft: q('[data-ft]'),
            fb: q('[data-fb]'),
            flapTop: q('[data-flap-top]'),
            flapBot: q('[data-flap-bot]'),
            shadeTop: q('[data-shade-top]'),
            shadeBot: q('[data-shade-bot]'),
          }
          cells.current.set(id, c)
          // a new cell on a live board starts blank and flips in
          c.cur = first || still ? ch : ' '
          show(c, c.cur)
        }
        c.target = ch
        if (still) {
          window.clearTimeout(c.timer)
          c.timer = 0
          for (const a of c.anims) a.cancel()
          c.anims = []
          c.running = false
          c.cur = ch
          show(c, ch)
          return
        }
        if (c.cur === ch && !c.running) return
        moved = true
        if (c.running || c.timer) return
        const cell = c
        c.timer = window.setTimeout(() => stepRef.current(cell), (order++ + r * 1.5) * cfg.current.stagger)
      })
    })
    for (const [id, c] of cells.current) {
      if (seen.has(id)) continue
      window.clearTimeout(c.timer)
      for (const a of c.anims) a.cancel()
      cells.current.delete(id)
    }
    if (first) return
    armed.current = true
    if (!moved) settleCheck()
    // the laid-out text is the only trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    const map = cells.current
    return () => {
      for (const c of map.values()) {
        window.clearTimeout(c.timer)
        for (const a of c.anims) a.cancel()
      }
      map.clear()
      mounted.current = false
    }
  }, [])

  const preset = size in SIZES ? SIZES[size as SplitFlapSize] : size
  // the shadow sits outside the housing: keep a few px of room for it
  const fontSize = fit
    ? `min(calc((100cqw - 14px) / ${boardEm(n).toFixed(3)}), calc((100cqh - 14px) / ${boardH(grid.length).toFixed(3)}))`
    : `min(1em, calc((100cqi - 8px) / ${boardEm(n).toFixed(3)}))`
  return (
    <div
      className={cn(fit ? 'grid h-full min-h-0 w-full place-items-center [container-type:size]' : cn('@container w-full max-w-full', preset), className)}
      style={style}
      {...props}
    >
      <div
        ref={board}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label={label}
        className={cn(
          LOOK,
          'ui-r ui-border ui-shadow mx-auto grid w-fit max-w-full gap-[0.12em] bg-paper py-[0.3em] font-mono leading-none font-bold',
          '[[data-style=flat]_&]:ui-border-thin [[data-style=flat]_&]:ui-shadow-sm [[data-style=flat]_&]:font-semibold',
          boardClassName,
        )}
        style={
          {
            fontSize,
            paddingInline: `${PADX}em`,
            // the housing line and corners shrink with a small board instead of swallowing it
            borderWidth: 'min(var(--ui-bw), 0.11em)',
            borderRadius: 'min(var(--ui-r), 0.42em)',
          } as CSSProperties
        }
      >
        {grid.map((row, r) => (
          <div key={r} aria-hidden="true" className="flex gap-[0.09em]">
            {row.map((_, col) => (
              <span
                key={col}
                data-cell={`${r}:${col}`}
                className="relative block h-[1.24em] w-[0.8em] shrink-0 [color:var(--flap-fg)] [perspective:3.2em]"
              >
                {/* resting halves: next card's top (revealed as the flap falls), current card's bottom */}
                <span className={TOP}>
                  <span data-st="" className={cn(GLYPH, 'top-0')} />
                </span>
                <span className={BOT}>
                  <span data-sb="" className={cn(GLYPH, 'bottom-0')} />
                </span>
                {/* the flap: current top folds down, then the next card's bottom lands */}
                <span data-flap-bot="" className={cn(BOT, 'z-[2] origin-top [transform:rotateX(90deg)]')}>
                  <span data-fb="" className={cn(GLYPH, 'bottom-0')} />
                  <span data-shade-bot="" className={SHADE} />
                </span>
                <span data-flap-top="" className={cn(TOP, 'z-[3] origin-bottom [transform:rotateX(-90deg)]')}>
                  <span data-ft="" className={cn(GLYPH, 'top-0')} />
                  <span data-shade-top="" className={SHADE} />
                </span>
                {/* outline (manga) and the hinge across the middle */}
                <span className="pointer-events-none absolute inset-0 z-[4] [border-radius:var(--flap-r)] [box-shadow:inset_0_0_0_max(1px,0.05em)_var(--flap-edge)]" />
                <span className="pointer-events-none absolute inset-x-0 top-1/2 z-[4] h-[max(1px,0.045em)] -translate-y-1/2 bg-[var(--flap-hinge)]" />
              </span>
            ))}
          </div>
        ))}
        <span className="sr-only">{label}</span>
      </div>
    </div>
  )
}
