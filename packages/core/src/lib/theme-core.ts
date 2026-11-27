import { refreshPalette } from '@/fx/palette'
import type { UiStyle } from '@/fx/style'

/**
 * Theme state, framework-agnostic (no React/Vue import): the lists, the switches and a tiny
 * store. Framework adapters wrap subscribeTheme()/getThemeState() — React: useTheme() in
 * packages/react/src/lib/use-theme.ts.
 *
 * Two independent axes, like shadcn's "style" + "base colour":
 *  - STYLES change the character of every component (shape, type, depth, how loud the effects are)
 *  - THEMES (colours) only swap the accent/pop tokens
 * Both live as attributes on <html>: data-style / data-theme (see index.css).
 */
export const STYLES = [
  { id: 'cel', label: 'Cel', jp: 'セル', blurb: 'Sticker cel-shading: thick ink line, rounded, soft solid shadow, italic type.' },
  { id: 'manga', label: 'Manga', jp: '漫画', blurb: 'Printed comic page: square panels, black drop, screentone, focus lines.' },
  { id: 'flat', label: 'Flat', jp: 'フラット', blurb: 'Quiet product UI: hairlines, soft depth, upright type, barely any FX.' },
] as const satisfies readonly { id: UiStyle; label: string; jp: string; blurb: string }[]

export const THEMES = [
  { id: 'lilac', label: 'Lilac', swatch: '#7a6cff' },
  { id: 'mint', label: 'Mint', swatch: '#12b39b' },
  { id: 'peach', label: 'Peach', swatch: '#ff7447' },
  { id: 'sky', label: 'Sky', swatch: '#3b7dff' },
] as const

export const MODES = ['light', 'dark'] as const
export type ModeId = (typeof MODES)[number]

export type ThemeId = (typeof THEMES)[number]['id']
export type StyleId = (typeof STYLES)[number]['id']

const KEYS = { theme: 'anime-ui-theme', style: 'anime-ui-style', mode: 'anime-ui-mode' } as const
const listeners = new Set<() => void>()
const root = () => document.documentElement

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage can be blocked; the choice still applies for this visit */
  }
}
function load(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
const notify = () => listeners.forEach((l) => l())

/** Where a switch was triggered from (viewport px). Kept for API compatibility. */
export type Origin = { x: number; y: number }

type Cover = (apply: () => void, label: string) => void
let cover: Cover | null = null

/**
 * The app registers its page-change screen here (Wipe.tsx), so switching colour, style or
 * light/dark plays the same transition as changing page: the screen covers, the switch
 * happens underneath, the screen uncovers with the label flashed in between.
 * Without a registered cover (or with reduced motion) the switch is instant.
 */
export function setSwitchCover(fn: Cover | null) {
  cover = fn
}

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

function transition(label: string, apply: () => void) {
  if (!cover || reduced()) apply()
  else cover(apply, label)
}

function setThemeAttr(id: ThemeId) {
  root().dataset.theme = id
  save(KEYS.theme, id)
  refreshPalette()
  notify()
}

export function applyTheme(id: ThemeId, _origin?: Origin) {
  transition(THEMES.find((t) => t.id === id)?.label ?? id, () => setThemeAttr(id))
}

export function applyStyle(id: StyleId, _origin?: Origin) {
  const st = STYLES.find((x) => x.id === id)
  transition(st ? `${st.label} ${st.jp}` : id, () => {
    root().dataset.style = id
    save(KEYS.style, id)
    refreshPalette()
    notify()
  })
}

export function applyMode(id: ModeId, _origin?: Origin) {
  transition(id === 'dark' ? 'Dark' : 'Light', () => {
    root().dataset.mode = id
    root().style.colorScheme = id
    save(KEYS.mode, id)
    refreshPalette()
    syncMeta()
    notify()
  })
}

function syncMeta() {
  const bg = getComputedStyle(root()).getPropertyValue('--color-paper').trim()
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg || '#ffffff')
}

/** Call once before the first render so there is no flash of the defaults. */
export function initTheme() {
  // ?style=manga&theme=mint&mode=dark in the URL wins (shareable looks); otherwise the saved choice
  const q = typeof location === 'undefined' ? null : new URLSearchParams(location.search)
  const theme = q?.get('theme') ?? load(KEYS.theme)
  const style = q?.get('style') ?? load(KEYS.style)
  const mode = q?.get('mode') ?? load(KEYS.mode)
  const prefersDark = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
  root().dataset.theme = THEMES.some((t) => t.id === theme) ? (theme as ThemeId) : 'lilac'
  root().dataset.style = STYLES.some((s) => s.id === style) ? (style as StyleId) : 'cel'
  const m: ModeId = mode === 'dark' || mode === 'light' ? mode : prefersDark ? 'dark' : 'light'
  root().dataset.mode = m
  root().style.colorScheme = m
  refreshPalette()
  syncMeta()
}

/** The current style, colour and mode, read from <html> (defaults before initTheme/in SSR). */
export function getThemeState(): { theme: ThemeId; style: StyleId; mode: ModeId } {
  const d = typeof document === 'undefined' ? undefined : root().dataset
  return {
    theme: (d?.theme as ThemeId) || 'lilac',
    style: (d?.style as StyleId) || 'cel',
    mode: (d?.mode as ModeId) || 'light',
  }
}

/** Calls `cb` after every applyTheme / applyStyle / applyMode. Returns the unsubscribe function. */
export function subscribeTheme(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
