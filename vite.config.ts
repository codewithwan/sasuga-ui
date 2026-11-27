import { existsSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import { brand } from './brand.config.ts'
import { buildRegistry, readEntries } from './scripts/build-registry.mjs'

/** Fills %BRAND_*% placeholders in index.html from brand.config.ts. */
/**
 * Deploy settings. Locally both are '/'. The GitHub Pages workflow sets
 * BASE_PATH=/<repo>/ and SITE_URL=https://<user>.github.io/<repo>/.
 */
const BASE = process.env.BASE_PATH ?? '/'
const SITE_URL = process.env.SITE_URL ?? BASE

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
 * /r/index.json + /r/<name>.json — the registry the CLI installs from (scripts/build-registry.mjs).
 * Served fresh by the dev server, emitted into dist on build.
 */
const registry = (): Plugin => {
  const root = fileURLToPath(new URL('.', import.meta.url))
  const build = () => buildRegistry({ brand, root })
  return {
    name: 'registry',
    configureServer(server) {
      server.middlewares.use('/r', (req, res, next) => {
        const text = build()[(req.url ?? '').split('?')[0].replace(/^\//, '')]
        if (!text) return next()
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.end(text)
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
  const root = fileURLToPath(new URL('.', import.meta.url))
  const raw = (p: string) => `https://raw.githubusercontent.com/${brand.repo}/main/${p}`
  const text = () => {
    const items = readEntries(root)
      .map(({ slug, name, category, description }) => {
        const file = slug === 'toast' ? 'toaster' : slug
        const path = ['src/components/ui/', 'src/components/art/']
          .flatMap((d) => [`${d}${file}.tsx`, `${d}${file}.ts`])
          .find((p) => existsSync(root + p))
        return { slug, name, category, description, path }
      })
      .filter((i) => i.slug)
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
    const lines = [
      `# ${brand.name}`,
      '',
      `> ${brand.tagline}: springs, impact frames and sound-effect lettering. A copy-paste (shadcn-style) kit for React 19 + Tailwind CSS v4 + TypeScript. Three structural styles (cel, manga, flat), four colours, light/dark, all from CSS tokens.`,
      '',
      '## Install',
      '',
      `- CLI (recommended), in a React 19 + Tailwind CSS v4 + TypeScript app: \`npx ${brand.package} init\` (installs the deps, writes the core files and the stylesheet import), then \`npx ${brand.package} add button health-bar\` (or \`add --all\`). \`npx ${brand.package} list\` shows every component. The CLI reads the registry at ${SITE_URL}r/index.json (one JSON per component at ${SITE_URL}r/<name>.json with the full file contents).`,
      `- By hand: install class-variance-authority clsx tailwind-merge; add an "@" alias to src; copy src/index.css, src/lib/utils.ts, src/lib/theme.ts and src/fx/ from the repo; then copy the components you need from src/components/ui/ (plus any kit file they import).`,
      `- Guide: ${SITE_URL}docs/installation`,
      `- Core files: ${raw('src/index.css')} · ${raw('src/lib/utils.ts')} · ${raw('src/lib/theme.ts')} · https://github.com/${brand.repo}/tree/main/src/fx`,
      '',
      '## Theming',
      '',
      '- Attributes on <html>: data-style="cel|manga|flat", data-theme="lilac|mint|peach|sky", data-mode="light|dark".',
      '- Components only use ui-* utilities (ui-card, ui-border, ui-shadow, ui-head, ui-r, ui-pill…) and theme colours, never hard-coded shapes.',
      '',
      '## Components',
      '',
      ...items.map((i) => `- [${i.name}](${SITE_URL}components/${i.slug}) (${i.category}) — ${i.description} Add: \`npx ${brand.package} add ${i.slug}\`.${i.path ? ` Source: ${raw(i.path)}` : ''}`),
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
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
