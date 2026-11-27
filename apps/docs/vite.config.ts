import { readdirSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Alias, Plugin } from 'vite'
import { brand } from '../../brand.config.ts'
import { buildRegistry, kitFiles, readEntries } from '../../scripts/build-registry.mjs'
import type { KitFile } from '../../scripts/build-registry.mjs'

/** The repo root (brand.config.ts, roadmap.json, packages/, scripts/). */
const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const CORE = `${ROOT}packages/core/src`
/** Where each kind of kit file goes in a React app (the CLI's defaults; the stylesheet when copied by hand). */
const USER_DIRS: Record<string, string> = { css: 'src/', lib: 'src/lib/', fx: 'src/fx/', ui: 'src/components/ui/', art: 'src/components/art/' }
const REACT = `${ROOT}packages/react/src`

/**
 * "@/…" exactly as the kit files see it in a user's project, where everything sits in one src/:
 * the React package wins (components, art, and its lib/ + fx/ files such as the fx/index.ts barrel
 * with useSprings, or lib/theme.ts with useTheme), then the core (packages/core: fx/, lib/), then the
 * docs app itself (pages, sections, docs). Most specific first, like the tsconfig.app.json paths.
 */
const kitAliases = (): Alias[] => {
  const exact = (spec: string, file: string): Alias => ({ find: new RegExp(`^${spec.replace(/[/.-]/g, '\\$&')}$`), replacement: file })
  const overlay = (kind: 'fx' | 'lib') =>
    readdirSync(`${REACT}/${kind}`)
      .filter((f) => f.endsWith('.ts'))
      .map((f) => exact(`@/${kind}/${f.replace(/\.ts$/, '')}`, `${REACT}/${kind}/${f}`))
  return [
    exact('@/fx', `${REACT}/fx/index.ts`),
    ...overlay('fx'),
    ...overlay('lib'),
    { find: /^@\/(fx|lib)\//, replacement: `${CORE}/$1/` },
    { find: /^@\/components\/(ui|art)(?=\/|$)/, replacement: `${REACT}/components/$1` },
    { find: /^@\//, replacement: fileURLToPath(new URL('./src/', import.meta.url)) },
  ]
}

/**
 * Deploy settings. Locally both are '/'. The GitHub Pages workflow sets
 * BASE_PATH=/<repo>/ and SITE_URL=https://<user>.github.io/<repo>/.
 */
const BASE = process.env.BASE_PATH ?? '/'
const SITE_URL = process.env.SITE_URL ?? BASE

/** Fills %BRAND_*% placeholders in index.html from brand.config.ts. */
const brandHtml = (): Plugin => {
  const manifest = () =>
    JSON.stringify(
      {
        name: brand.name,
        short_name: brand.word,
        description: brand.tagline,
        start_url: '.',
        display: 'standalone',
        background_color: '#f6f5ff',
        theme_color: '#7a6cff',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      null,
      2,
    )
  return {
    name: 'brand-html',
    transformIndexHtml: (html) =>
      html.replaceAll('%BRAND_NAME%', brand.name).replaceAll('%BRAND_TAGLINE%', brand.tagline).replaceAll('%SITE_URL%', SITE_URL).replaceAll('%BASE%', BASE),
    // the web manifest is generated from brand.config.ts too (dev server + build)
    configureServer(server) {
      server.middlewares.use('/site.webmanifest', (_req, res) => {
        res.setHeader('Content-Type', 'application/manifest+json')
        res.end(manifest())
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'site.webmanifest', source: manifest() })
    },
  }
}

/**
 * /r/index.json + /r/<name>.json (React), /r/frameworks.json and /r/<framework>/… — the registry the
 * CLI installs from (scripts/build-registry.mjs). Served fresh by the dev server, emitted into dist on build.
 */
const registry = (): Plugin => {
  const build = () => buildRegistry({ brand, root: ROOT })
  return {
    name: 'registry',
    configureServer(server) {
      server.middlewares.use('/r', (req, res, next) => {
        const name = (req.url ?? '').split('?')[0].replace(/^\//, '')
        if (!name.endsWith('.json')) return next()
        const text = build()[name]
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Access-Control-Allow-Origin', '*')
        // a missing item is a 404 (like on the deployed site), not the app's HTML
        res.statusCode = text ? 200 : 404
        res.end(text ?? JSON.stringify({ error: `no registry file r/${name}` }))
      })
    },
    generateBundle() {
      for (const [name, source] of Object.entries(build())) this.emitFile({ type: 'asset', fileName: `r/${name}`, source })
    },
  }
}

/**
 * /llms.txt — a plain-text map of the kit for AI coding agents: what it is, how to install it,
 * and every component with its docs page and raw source URL. Generated from src/docs/entries.
 */
const llmsTxt = (): Plugin => {
  const raw = (p: string) => `https://raw.githubusercontent.com/${brand.repo}/main/${p}`
  const text = () => {
    // repo path (for raw links) → where the file goes in a React app
    const { core, kit } = kitFiles(ROOT, 'react')
    const at = (f: KitFile) => `${USER_DIRS[f.type]}${f.target}`
    const items = readEntries(ROOT)
      .map(({ slug, name, category, description }) => {
        const file = kit.find((f) => f.path.replace(/^.*\//, '').replace(/\.tsx?$/, '') === (slug === 'toast' ? 'toaster' : slug))
        return { slug, name, category, description, file }
      })
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
    const lines = [
      `# ${brand.name}`,
      '',
      `> ${brand.tagline}: springs, impact frames and sound-effect lettering. A copy-paste (shadcn-style) kit for React 19 + Tailwind CSS v4 + TypeScript. Three structural styles (cel, manga, flat), four colours, light/dark, all from CSS tokens.`,
      '',
      '## Install',
      '',
      `- CLI (recommended), in a React 19 + Tailwind CSS v4 + TypeScript app: \`npx ${brand.package} init\` (installs the deps, writes the core files and the stylesheet import), then \`npx ${brand.package} add button health-bar\` (or \`add --all\`). \`npx ${brand.package} list\` shows every component. The CLI reads the registry at ${SITE_URL}r/index.json (one JSON per component at ${SITE_URL}r/<name>.json with the full file contents).`,
      `- By hand: install class-variance-authority clsx tailwind-merge; add an "@" alias to src; copy the core files below to the paths shown (src/index.css starts with @import 'tailwindcss', so it can be the main stylesheet); then copy the components you need to src/components/ui/ (plus any kit file they import). In this repo the framework-agnostic core lives in packages/core and the React files in packages/react; in your app they all sit in one src/ folder.`,
      `- Guide: ${SITE_URL}docs/installation`,
      `- Other frameworks: ${SITE_URL}roadmap (machine-readable: ${SITE_URL}r/frameworks.json)`,
      '',
      '## Core files (copy once)',
      '',
      ...core.map((f) => `- ${at(f)} ← ${raw(f.path)}`),
      '',
      '## Theming',
      '',
      '- Attributes on <html>: data-style="cel|manga|flat", data-theme="lilac|mint|peach|sky", data-mode="light|dark".',
      '- Components only use ui-* utilities (ui-card, ui-border, ui-shadow, ui-head, ui-r, ui-pill…) and theme colours, never hard-coded shapes.',
      '',
      '## Components',
      '',
      ...items.map((i) => `- [${i.name}](${SITE_URL}components/${i.slug}) (${i.category}) — ${i.description} Add: \`npx ${brand.package} add ${i.slug}\`.${i.file ? ` File: ${at(i.file)} ← ${raw(i.file.path)}` : ''}`),
      '',
    ]
    return lines.join('\n')
  }
  return {
    name: 'llms-txt',
    configureServer(server) {
      server.middlewares.use('/llms.txt', (_req, res) => {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.end(text())
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'llms.txt', source: text() })
    },
  }
}

export default defineConfig({
  base: BASE,
  plugins: [react(), tailwindcss(), brandHtml(), llmsTxt(), registry()],
  resolve: { alias: kitAliases() },
})
