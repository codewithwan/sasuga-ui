import { useCallback, useSyncExternalStore } from 'react'
import { applyMode, applyStyle, applyTheme, getThemeState, subscribeTheme } from '@/lib/theme-core'
import type { ModeId, Origin, StyleId, ThemeId } from '@/lib/theme-core'

/** The current style, colour and mode, plus setters that play the switch transition. React adapter over the theme core. */
export function useTheme() {
  const theme = useSyncExternalStore(subscribeTheme, () => getThemeState().theme, () => 'lilac' as ThemeId)
  const style = useSyncExternalStore(subscribeTheme, () => getThemeState().style, () => 'cel' as StyleId)
  const mode = useSyncExternalStore(subscribeTheme, () => getThemeState().mode, () => 'light' as ModeId)
  const setTheme = useCallback((id: ThemeId, origin?: Origin) => applyTheme(id, origin), [])
  const setStyle = useCallback((id: StyleId, origin?: Origin) => applyStyle(id, origin), [])
  const setMode = useCallback((id: ModeId, origin?: Origin) => applyMode(id, origin), [])
  return { theme, setTheme, style, setStyle, mode, setMode }
}
