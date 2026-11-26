import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import { brand } from './brand.config.ts'

/** Fills %BRAND_*% placeholders in index.html from brand.config.ts. */
const brandHtml = (): Plugin => {
  const manifest = () =>
    JSON.stringify(
      {
        name: brand.name,
        short_name: brand.word,
        description: brand.tagline,
        start_url: '/',
        display: 'standalone',
        background_color: '#f6f5ff',
        theme_color: '#7a6cff',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      null,
      2,
    )
  return {
    name: 'brand-html',
    transformIndexHtml: (html) => html.replaceAll('%BRAND_NAME%', brand.name).replaceAll('%BRAND_TAGLINE%', brand.tagline),
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
export default defineConfig({
  plugins: [react(), tailwindcss(), brandHtml()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
