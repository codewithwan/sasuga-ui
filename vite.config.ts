import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import { brand } from './brand.config.ts'

/** Fills %BRAND_*% placeholders in index.html from brand.config.ts. */
/**
 * Deploy settings. Locally both are '/'. The GitHub Pages workflow sets
 * BASE_PATH=/sukasuki-ui/ and SITE_URL=https://<user>.github.io/sukasuki-ui/.
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

// https://vite.dev/config/
/**
 * /llms.txt — a plain-text map of the kit for AI coding agents: what it is, how to install it,
 * and every component with its docs page and raw source URL. Generated from src/docs/entries.
 */
const llmsTxt = (): Plugin => {
  const root = fileURLToPath(new URL('.', import.meta.url))
  const raw = (p: string) => `https://raw.githubusercontent.com/${brand.repo}/main/${p}`
  const text = () => {
    const dir = `${root}src/docs/entries/`
    const items = readdirSync(dir)
      .filter((f) => f.endsWith('.tsx'))
      .map((f) => {
        const src = readFileSync(dir + f, 'utf8')
        const pick = (key: string) =>
          new RegExp(`${key}:\\s*(['"\`])((?:\\\\.|(?!\\1)[\\s\\S])*?)\\1`).exec(src)?.[2]?.replace(/\\(.)/g, '$1').replace(/\s+/g, ' ').trim() ?? ''
        const slug = pick('slug')
        const file = (slug === 'toast' ? 'toaster' : slug) || f.replace('.tsx', '')
        const path = ['src/components/ui/', 'src/components/art/']
          .flatMap((d) => [`${d}${file}.tsx`, `${d}${file}.ts`])
          .find((p) => existsSync(root + p))
        return { slug, name: pick('name'), category: pick('category'), description: pick('description'), path }
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
      `- New app: \`npx degit ${brand.repo}/template my-app\`, then install and run.`,
      `- Existing app: install class-variance-authority clsx tailwind-merge; add an "@" alias to src; copy src/index.css, src/lib/utils.ts, src/lib/theme.ts and src/fx/ from the repo; then copy the components you need from src/components/ui/ (plus any kit file they import).`,
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
      ...items.map((i) => `- [${i.name}](${SITE_URL}components/${i.slug}) (${i.category}) — ${i.description}${i.path ? ` Source: ${raw(i.path)}` : ''}`),
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
  plugins: [react(), tailwindcss(), brandHtml(), llmsTxt()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
