/**
 * ─────────────────────────────────────────────────────────────
 *  BRAND CONFIG — change the kit's name here, and only here.
 * ─────────────────────────────────────────────────────────────
 * Everything reads from this file: the nav logo, the intro, page titles,
 * <title>/<meta> in index.html (vite.config.ts), the footer, the docs, llms.txt,
 * the component registry (/r/*.json) and the CLI (`npm run cli:build`).
 * After changing it: `npm run cli:build`, `npm run icons` if the mark changed,
 * and `bash scripts/screenshots.sh` for the README images.
 */
export const brand = {
  /** Display name, as written everywhere. */
  name: 'sasuga/ui',
  /** The wordmark is `word` + `suffix` (the suffix is drawn in the accent colour). */
  word: 'sasuga',
  suffix: '/ui',
  /** Inside the logo mark: 'star' or 'heart', or a short text such as 'さ'. */
  mark: 'star',
  /** Short Japanese tag shown next to the name. */
  jp: 'さすが',
  /** npm package = the CLI command: `npx sasuga add button`. */
  package: 'sasuga',
  /** GitHub "owner/repo". */
  repo: 'codewithwan/sasuga-ui',
  /** One-line pitch, used in <meta name="description"> and the home title. */
  tagline: 'Game-feel UI components for React',
  /** Live docs site (also hosts the registry at <docs>/r/). */
  docs: 'https://codewithwan.github.io/sasuga-ui/',
  /** Repository link. */
  github: 'https://github.com/codewithwan/sasuga-ui',
  /** Author handle, credited in the footer. */
  author: 'codewithwan',
} as const

export type Brand = typeof brand
