import { useCallback, useSyncExternalStore } from 'react'
import { refreshPalette } from '@/fx/palette'
import type { UiStyle } from '@/fx/style'

/**
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

const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => (root().dataset.theme as ThemeId) || 'lilac', () => 'lilac' as ThemeId)
  const style = useSyncExternalStore(subscribe, () => (root().dataset.style as StyleId) || 'cel', () => 'cel' as StyleId)
  const mode = useSyncExternalStore(subscribe, () => (root().dataset.mode as ModeId) || 'light', () => 'light' as ModeId)
  const setTheme = useCallback((id: ThemeId, origin?: Origin) => applyTheme(id, origin), [])
  const setStyle = useCallback((id: StyleId, origin?: Origin) => applyStyle(id, origin), [])
  const setMode = useCallback((id: ModeId, origin?: Origin) => applyMode(id, origin), [])
  return { theme, setTheme, style, setStyle, mode, setMode }
}
