/**
 * The active kit style, read from <html data-style>. A style changes the *structure*
 * of the kit (shape, line, depth, type) and how loud the effects are; colours are separate.
 *
 *   cel   — sticker cel-shading: soft focus lines, burst, smoke, round debris, pop lettering
 *   manga — printed comic: focus lines, slashes, sharp debris, big lettering
 *   flat  — calm product UI: ring + dot pop + sparkle, no lettering
 */
export type UiStyle = 'cel' | 'manga' | 'flat'

export const uiStyle = (): UiStyle =>
  typeof document === 'undefined' ? 'cel' : ((document.documentElement.dataset.style as UiStyle) || 'cel')

/** How hard springs get kicked in each style. */
export const KICK: Record<UiStyle, number> = { cel: 1, manga: 1, flat: 0.5 }
