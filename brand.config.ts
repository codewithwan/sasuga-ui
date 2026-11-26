/**
 * ─────────────────────────────────────────────────────────────
 *  BRAND CONFIG — change the kit's name here, and only here.
 * ─────────────────────────────────────────────────────────────
 * Everything user-facing reads from this file: the nav logo, the intro,
 * page titles, <title>/<meta> in index.html (injected by vite.config.ts),
 * the footer, install snippets and the docs.
 */
export const brand = {
  /** Display name, first word + "UI" are styled separately in the logo. */
  name: 'Sukasuki UI',
  /** The word before "UI" (used in the logo wordmark). */
  word: 'Sukasuki',
  /** What sits inside the logo mark: 'heart' (matches the favicon) or a short text such as '好'. */
  mark: 'heart',
  /** Short Japanese tag shown next to the name. */
  jp: '好き好き',
  /** npm package name (reserved for when it is published). */
  package: 'sukasuki-ui',
  /** GitHub "owner/repo". The starter template lives in its /template folder. */
  repo: 'codewithwan/sukasuki-ui',
  /** One-line pitch, used in <meta name="description"> and the home title. */
  tagline: 'Game-feel UI components for React',
  /** Live docs site. */
  docs: 'https://codewithwan.github.io/sukasuki-ui/',
  /** Repository link. */
  github: 'https://github.com/codewithwan/sukasuki-ui',
  /** Author handle, credited in the footer. */
  author: 'codewithwan',
} as const

export type Brand = typeof brand
