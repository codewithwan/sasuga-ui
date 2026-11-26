// Everything the landing page and docs say about the kit itself.
// The NAME lives in /brand.config.ts — change it there.
import { brand } from '../../brand.config'

export const site = {
  name: brand.name,
  /** The word before "UI" in the wordmark. */
  word: brand.word,
  /** Glyph stamped on the logo mark. */
  mark: brand.mark,
  jp: brand.jp,
  tagline: `${brand.tagline} — springs, impact frames and sound-effect lettering.`,
  description:
    'A copy-paste React kit for web games and anime-flavoured sites. Calm stickers at rest, a burst of hand-drawn effects when you touch them.',
  /** npm package name. */
  package: brand.package,
  repo: brand.repo,
  /** Starts a new app from the template: `npx degit <repo>/template my-app`. */
  create: `npx degit ${brand.repo}/template my-app`,
  github: brand.github,
  author: brand.author,
}

/** An app path with the deploy base in front, for plain <a href> (router links add it themselves). */
export const withBase = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`

/** Document title for a page: "Theming — <brand name>". */
export const pageTitle = (page?: string) => (page ? `${page} — ${site.name}` : `${site.name} — ${brand.tagline}`)

/** The written docs, in reading order. Components follow them in the sidebar. */
export const GUIDES = [
  { to: '/docs', title: 'Introduction', jp: '紹介' },
  { to: '/docs/installation', title: 'Installation', jp: '導入' },
  { to: '/docs/theming', title: 'Theming', jp: 'テーマ' },
  { to: '/docs/motion', title: 'FX & Motion', jp: '動き' },
] as const

export const FONTS_LINK = `<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Anton&family=Dela+Gothic+One&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&family=Mochiy+Pop+One&family=M+PLUS+Rounded+1c:wght@500;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
  rel="stylesheet"
/>`
