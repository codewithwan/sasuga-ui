/**
 * Live palette for the canvas FX. Values are read from the theme's CSS variables,
 * so effects follow whatever `data-theme` is active. Call `refreshPalette()`
 * after switching themes.
 */
export const C = {
  ink: '#1d1a4a',
  accent: '#7a6cff',
  soft: '#b8b3ff',
  white: '#ffffff',
  pop: '#ff5c9a',
}

export function refreshPalette() {
  if (typeof document === 'undefined') return
  const cs = getComputedStyle(document.documentElement)
  const read = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback
  C.ink = read('--color-ink', C.ink)
  C.accent = read('--color-accent', C.accent)
  C.soft = read('--color-accent-soft', C.soft)
  C.pop = read('--color-pop', C.pop)
}
