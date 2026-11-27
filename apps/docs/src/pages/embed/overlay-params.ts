// The /embed/overlay URL format, shared by the embed page (parse) and the docs builder (write).
import { STREAM_SCENES } from '@/components/ui/stream-overlay'
import type { StreamSceneKind } from '@/components/ui/stream-overlay'
import type { EmbedLook } from './params'

export type OverlayBackground = 'solid' | 'transparent'

export type OverlayConfig = {
  scene: StreamSceneKind
  /** Headline; '' = the scene's own. `*word*` is emphasis. */
  title: string
  /** Line under the headline; '' = the scene's own. */
  subtitle: string
  /** Countdown in seconds from when the page loads; 0 = none. */
  countdown: number
  /** Countdown to a moment (ms timestamp); 0 = none. Wins over `countdown`. */
  until: number
  /** Ticker items, written `a|b|c` in the URL. */
  ticker: string[]
  background: OverlayBackground
  /** Channel name on the corner bug. */
  channel: string
  /** The end card's next stream ("FRI 20:00"). */
  next: string
  /** The character art (the kit's mascot, one pose per scene). */
  art: boolean
}

export const OVERLAY_DEFAULTS: OverlayConfig = {
  scene: 'starting',
  title: '',
  subtitle: '',
  countdown: 0,
  until: 0,
  ticker: [],
  background: 'solid',
  channel: '',
  next: '',
  art: true,
}

const oneOf = <T extends string>(list: readonly T[], v: string | null, fallback: T): T => (list.includes(v as T) ? (v as T) : fallback)
const num = (v: string | null, fallback: number, min: number, max: number) => {
  const n = v === null || v.trim() === '' ? NaN : Number(v)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}
const text = (v: string | null, max: number) => (v ?? '').trim().slice(0, max)

/** A timestamp in ms, or a date the browser can read ("2026-12-01T20:00"). */
function moment(v: string | null) {
  if (!v) return 0
  const n = /^\d+$/.test(v.trim()) ? Number(v) : Date.parse(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** ?scene=brb&title=…&countdown=300&ticker=a|b&bg=transparent … → a full config (unknown values fall back). */
export function parseOverlay(search: string): OverlayConfig {
  const q = new URLSearchParams(search)
  const d = OVERLAY_DEFAULTS
  const bg = q.get('bg') ?? q.get('background')
  return {
    scene: oneOf(STREAM_SCENES, q.get('scene'), d.scene),
    title: text(q.get('title'), 60),
    subtitle: text(q.get('sub') ?? q.get('subtitle'), 90),
    countdown: Math.round(num(q.get('countdown'), d.countdown, 0, 86400)),
    until: moment(q.get('until')),
    ticker: (q.get('ticker') ?? '')
      .split('|')
      .map((t) => t.trim().slice(0, 60))
      .filter(Boolean)
      .slice(0, 12),
    background: bg === 'transparent' || bg === 'clear' ? 'transparent' : 'solid',
    channel: text(q.get('channel'), 24),
    next: text(q.get('next'), 16),
    art: q.get('art') !== '0',
  }
}

/** The query string for a config: scene always, everything else only when it differs from the default. */
export function overlayQuery(c: OverlayConfig, look?: EmbedLook) {
  const q = new URLSearchParams()
  q.set('scene', c.scene)
  if (c.title.trim()) q.set('title', c.title.trim())
  if (c.subtitle.trim()) q.set('sub', c.subtitle.trim())
  if (c.countdown > 0) q.set('countdown', String(Math.round(c.countdown)))
  if (c.until > 0) q.set('until', String(c.until))
  const items = c.ticker.map((t) => t.trim()).filter(Boolean)
  if (items.length) q.set('ticker', items.join('|'))
  q.set('bg', c.background)
  if (c.channel.trim()) q.set('channel', c.channel.trim())
  if (c.next.trim()) q.set('next', c.next.trim())
  if (!c.art) q.set('art', '0')
  if (look) {
    q.set('style', look.style)
    q.set('theme', look.theme)
    q.set('mode', look.mode)
  }
  return q.toString()
}
