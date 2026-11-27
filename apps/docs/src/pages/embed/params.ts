// The /embed/fx URL format, shared by the embed page (parse) and the docs builder (write).
import { FX_SCREEN_BACKGROUNDS, FX_SCREEN_COLORS, FX_SCREEN_EFFECTS, FX_SCREEN_TRIGGERS } from '@/components/ui/fx-screen'
import type { FxScreenBackground, FxScreenColor, FxScreenEffect, FxScreenTrigger } from '@/components/ui/fx-screen'

export type EmbedConfig = {
  effect: FxScreenEffect
  intensity: number
  speed: number
  color: FxScreenColor
  background: FxScreenBackground
  trigger: FxScreenTrigger
  interval: number
  text: string
  cx: number
  cy: number
  angle: number
  flashes: boolean
  play: boolean
}

export const EMBED_DEFAULTS: EmbedConfig = {
  effect: 'speed-lines',
  intensity: 0.7,
  speed: 1,
  color: 'accent',
  background: 'transparent',
  trigger: 'loop',
  interval: 1200,
  text: '',
  cx: 0.5,
  cy: 0.5,
  angle: 0,
  flashes: true,
  play: true,
}

const oneOf = <T extends string>(list: readonly T[], v: string | null, fallback: T): T => (list.includes(v as T) ? (v as T) : fallback)
const num = (v: string | null, fallback: number, min: number, max: number) => {
  const n = v === null || v.trim() === '' ? NaN : Number(v)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}

/** ?effect=impact&intensity=0.8&text=ドン&cx=0.5&cy=0.45&background=transparent … → a full config (unknown values fall back). */
export function parseEmbed(search: string): EmbedConfig {
  const q = new URLSearchParams(search)
  const d = EMBED_DEFAULTS
  return {
    effect: oneOf(FX_SCREEN_EFFECTS, q.get('effect'), d.effect),
    intensity: num(q.get('intensity'), d.intensity, 0, 1),
    speed: num(q.get('speed'), d.speed, 0.25, 3),
    color: oneOf(FX_SCREEN_COLORS, q.get('color'), d.color),
    background: oneOf(FX_SCREEN_BACKGROUNDS, q.get('background'), d.background),
    trigger: oneOf(FX_SCREEN_TRIGGERS, q.get('trigger'), d.trigger),
    interval: num(q.get('interval'), d.interval, 120, 60000),
    text: (q.get('text') ?? '').slice(0, 24),
    cx: num(q.get('cx'), d.cx, 0, 1),
    cy: num(q.get('cy'), d.cy, 0, 1),
    angle: num(q.get('angle'), d.angle, -90, 90),
    flashes: q.get('flash') !== '0',
    play: q.get('play') !== '0',
  }
}

export type EmbedLook = { style: string; theme: string; mode: string }

/** The query string for a config: effect always, everything else only when it differs from the default. */
export function embedQuery(c: EmbedConfig, look?: EmbedLook) {
  const d = EMBED_DEFAULTS
  const q = new URLSearchParams()
  q.set('effect', c.effect)
  if (c.intensity !== d.intensity) q.set('intensity', String(c.intensity))
  if (c.speed !== d.speed) q.set('speed', String(c.speed))
  if (c.color !== d.color) q.set('color', c.color)
  q.set('background', c.background)
  if (c.trigger !== d.trigger) q.set('trigger', c.trigger)
  if (c.trigger === 'interval') q.set('interval', String(c.interval))
  if (c.text.trim()) q.set('text', c.text.trim())
  if (c.cx !== d.cx) q.set('cx', String(c.cx))
  if (c.cy !== d.cy) q.set('cy', String(c.cy))
  if (c.effect === 'speed-lines' && c.angle !== d.angle) q.set('angle', String(c.angle))
  if (c.effect === 'flash-cut' && !c.flashes) q.set('flash', '0')
  if (!c.play) q.set('play', '0')
  if (look) {
    q.set('style', look.style)
    q.set('theme', look.theme)
    q.set('mode', look.mode)
  }
  return q.toString()
}
