// Builds the component registry the CLI installs from: r/index.json (every item) and
// r/<name>.json (one item with its files' full contents and where they go).
// Used by vite.config.ts (dev server + build) and runnable on its own:
//   npm run registry:build            → dist/r
//   node scripts/build-registry.mjs out/dir
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Category order of the docs sidebar (src/docs/types.ts), then the extra groups. */
const ORDER = ['Actions', 'Forms', 'Game', 'Feedback', 'Overlay', 'Display', 'Layout', 'Motion', 'Art', 'Hooks']

/** Docs slugs whose main file is named differently, and the extra files that belong to them. */
const ALIAS = { toast: 'toaster' }
const EXTRA = { toast: ['use-toast'] }

/** Core npm dependencies every component needs (cn() and the variants helper). */
const CORE_DEPS = ['class-variance-authority', 'clsx', 'tailwind-merge']
/** Peer packages the user's app already has. */
const PEERS = new Set(['react', 'react-dom'])

const posix = (p) => p.split('\\').join('/')
const read = (root, p) => readFileSync(join(root, p), 'utf8')

/** Docs entries (src/docs/entries/*.tsx): slug, name, category, description, read without running them. */
export function readEntries(root = ROOT) {
  const dir = join(root, 'src/docs/entries')
  // `${MASCOT_NAME}` style placeholders → the string constant a kit file exports
  const consts = {}
  for (const p of [...walk(root, 'src/components/ui'), ...walk(root, 'src/components/art')])
    for (const m of read(root, p).matchAll(/export const (\w+) = '([^'\n]*)'/g)) consts[m[1]] = m[2]
  return readdirSync(dir)
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => {
      const file = readFileSync(join(dir, f), 'utf8')
      // the page object itself (examples above it have their own `description:` keys)
      const src = file.includes('export default') ? file.slice(file.lastIndexOf('export default')) : file
      const pick = (key) =>
        new RegExp(`${key}:\\s*(['"\`])((?:\\\\.|(?!\\1)[\\s\\S])*?)\\1`).exec(src)?.[2]?.replace(/\\(.)/g, '$1').replace(/\$\{(\w+)\}/g, (m, k) => consts[k] ?? m).replace(/\s+/g, ' ').trim() ?? ''
      return { slug: pick('slug'), name: pick('name'), category: pick('category'), description: pick('description') }
    })
    .filter((e) => e.slug)
}

/** All files of a folder, recursively, as root-relative posix paths. */
function walk(root, dir) {
  const out = []
  for (const name of readdirSync(join(root, dir)).sort()) {
    const p = `${dir}/${name}`
    if (statSync(join(root, p)).isDirectory()) out.push(...walk(root, p))
    else if (/\.(tsx?|css)$/.test(name)) out.push(p)
  }
  return out
}

/** Module specifiers a file imports (static imports, re-exports and dynamic import()). */
function specifiers(code) {
  const out = new Set()
  for (const m of code.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) out.add(m[1])
  return [...out]
}

/** npm package of a bare specifier ('@scope/pkg/sub' → '@scope/pkg'), or null for local imports. */
function packageOf(spec) {
  if (spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('@/') || spec.startsWith('node:')) return null
  const parts = spec.split('/')
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
}

/** Resolves a local import to a kit file path (root-relative), or null. */
function resolveLocal(root, from, spec) {
  let base = null
  if (spec.startsWith('@/')) base = `src/${spec.slice(2)}`
  else if (spec.startsWith('.')) base = posix(join(dirname(from), spec))
  if (!base) return null
  for (const ext of ['.tsx', '.ts', '/index.ts', '/index.tsx', '']) {
    const p = base + ext
    if (existsSync(join(root, p)) && statSync(join(root, p)).isFile()) return p
  }
  return null
}

/** A one-line description for items without a docs page: the doc comment of the export named
 *  after the file (use-combo → useCombo, monster → Monster), else the file's leading comment. */
function describe(code, stem) {
  const camel = stem.replace(/-(\w)/g, (_, c) => c.toUpperCase())
  const pascal = camel[0].toUpperCase() + camel.slice(1)
  const block = (re) => re.exec(code)?.[1]
  const raw =
    block(new RegExp(`/\\*\\*((?:(?!\\*/)[\\s\\S])*)\\*/\\s*export\\s+(?:function|const)\\s+(?:${camel}|${pascal})\\b`)) ??
    block(/\/\*\*((?:(?!\*\/)[\s\S])*)\*\/[ \t]*\r?\n[ \t]*\r?\n/) ??
    ''
  const text = raw
    .split('\n')
    .map((l) => l.replace(/^\s*\*\s?/, ''))
    .filter((l) => !/^\s{2,}\S/.test(l)) // indented code samples
    .join(' ')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return /^(.{20,240}?\.)(\s|$)/.exec(text)?.[1] ?? text
}

const title = (slug) => slug.replace(/(^|-)(\w)/g, (_, d, c) => (d ? ' ' : '') + c.toUpperCase())

/** The Google Fonts <link> tags from index.html (preconnects + stylesheet). */
function fontsSnippet(root) {
  const html = read(root, 'index.html')
  const links = html.match(/<link\b[^>]*fonts\.(?:googleapis|gstatic)\.com[\s\S]*?\/>/g) ?? []
  const pretty = links.map((l) => l.replace(/\s*\n\s*/g, ' ').replace(/\s+\/>$/, ' />').trim())
  const href = /href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)"/.exec(html)?.[1] ?? ''
  return { html: pretty.join('\n'), href }
}

/**
 * Builds every registry document.
 * @param {{ brand: { name: string, package: string, docs: string }, root?: string, version?: string }} opts
 * @returns {Record<string, string>} file name (relative to r/) → JSON text
 */
export function buildRegistry({ brand, root = ROOT, version }) {
  const pkgVersion = version ?? JSON.parse(read(root, 'package.json')).version
  const entries = new Map(readEntries(root).map((e) => [e.slug, e]))

  // every kit file → the item that ships it
  const kitFiles = [...walk(root, 'src/components/ui'), ...walk(root, 'src/components/art')].filter((p) => !/\/index\.ts$/.test(p))
  const stem = (p) => p.slice(p.lastIndexOf('/') + 1).replace(/\.(tsx?|css)$/, '')
  const owner = new Map() // path → item name
  const items = new Map() // name → { meta, paths }

  // core: tokens + utilities stylesheet, cn(), theme helpers, the effects engine
  const corePaths = ['src/index.css', 'src/lib/utils.ts', 'src/lib/theme.ts', ...walk(root, 'src/fx')]
  corePaths.forEach((p) => owner.set(p, 'core'))
  items.set('core', {
    meta: {
      name: 'core',
      title: 'Core',
      type: 'core',
      category: 'Core',
      description: 'Design tokens, the three styles and four colours, ui-* utilities, cn(), theme helpers and the FX engine. Every component needs it.',
    },
    paths: corePaths,
  })

  // docs pages first (slug = docs slug), then the files no page owns (hooks, extra art)
  for (const [slug, e] of entries) {
    const main = ALIAS[slug] ?? slug
    const paths = [main, ...(EXTRA[slug] ?? [])].map((s) => kitFiles.find((p) => stem(p) === s)).filter(Boolean)
    if (!paths.length) continue
    paths.forEach((p) => owner.set(p, slug))
    const type = paths[0].includes('/art/') ? 'art' : 'ui'
    items.set(slug, { meta: { name: slug, title: e.name, type, category: e.category, description: e.description, docs: `components/${slug}` }, paths })
  }
  for (const p of kitFiles) {
    if (owner.has(p)) continue
    const name = stem(p)
    const art = p.includes('/art/')
    const hook = !art && p.endsWith('.ts')
    owner.set(p, name)
    items.set(name, {
      meta: { name, title: title(name), type: art ? 'art' : hook ? 'hook' : 'ui', category: art ? 'Art' : hook ? 'Hooks' : 'Display', description: describe(read(root, p), name) },
      paths: [p],
    })
  }

  const typeOf = (p) =>
    p === 'src/index.css'
      ? 'css'
      : p.startsWith('src/lib/')
        ? 'lib'
        : p.startsWith('src/fx/')
          ? 'fx'
          : p.startsWith('src/components/art/')
            ? 'art'
            : 'ui'
  const targetOf = (p) =>
    p === 'src/index.css'
      ? `${brand.package.replace(/^@[^/]+\//, '')}.css`
      : posix(relative({ lib: 'src/lib', fx: 'src/fx', art: 'src/components/art', ui: 'src/components/ui' }[typeOf(p)], p))

  const docs = {}
  const index = []
  for (const { meta, paths } of items.values()) {
    const deps = new Set(meta.name === 'core' ? CORE_DEPS : [])
    const reg = new Set(meta.name === 'core' ? [] : ['core'])
    const files = paths.map((p) => {
      let content = read(root, p)
      // the user's own stylesheet imports Tailwind; ours is imported right after it
      if (p === 'src/index.css') content = content.replace(/^@import\s+['"]tailwindcss['"];?[ \t]*\r?\n(\r?\n)?/m, '')
      for (const spec of specifiers(content)) {
        const pkg = packageOf(spec)
        if (pkg) {
          if (!PEERS.has(pkg)) deps.add(pkg)
          continue
        }
        const local = resolveLocal(root, p, spec)
        const dep = local && owner.get(local)
        if (dep && dep !== meta.name) reg.add(dep)
        if (spec.startsWith('@/') && !local) throw new Error(`${p}: "${spec}" is not a kit file — kit files may only import other kit files`)
      }
      return { path: p, type: typeOf(p), target: targetOf(p), content }
    })
    const item = {
      ...meta,
      dependencies: [...deps].sort(),
      registryDependencies: meta.name === 'core' ? [] : ['core', ...[...reg].filter((r) => r !== 'core').sort()],
    }
    if (meta.name === 'core') item.fonts = fontsSnippet(root)
    docs[`${meta.name}.json`] = JSON.stringify({ ...item, files }, null, 2)
    index.push({ ...item, files: files.map((f) => f.path) })
  }

  index.sort((a, b) => (a.name === 'core' ? -1 : b.name === 'core' ? 1 : ORDER.indexOf(a.category) - ORDER.indexOf(b.category) || a.title.localeCompare(b.title)))
  docs['index.json'] = JSON.stringify({ name: brand.name, package: brand.package, version: pkgVersion, docs: brand.docs, items: index }, null, 2)
  return docs
}

/** Writes the registry into `out` (default dist/r). */
export function writeRegistry(out, opts) {
  mkdirSync(out, { recursive: true })
  const docs = buildRegistry(opts)
  for (const [name, text] of Object.entries(docs)) writeFileSync(join(out, name), `${text}\n`)
  return Object.keys(docs).length
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { brand } = await import(pathToFileURL(join(ROOT, 'brand.config.ts')).href)
  const out = process.argv[2] ? resolve(process.argv[2]) : join(ROOT, 'dist/r')
  const n = writeRegistry(out, { brand })
  console.log(`registry: ${n} files → ${posix(relative(process.cwd(), out)) || '.'}`)
}
