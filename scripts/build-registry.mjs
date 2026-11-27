// Builds the component registry the CLI installs from, for every framework port:
//   r/index.json + r/<name>.json            React (the default; the CLI 0.1.0 reads these paths)
//   r/<framework>/index.json + <name>.json  other ports, once roadmap.json marks them preview/available
//   r/frameworks.json                       every port, its status and which components it has
// Each item lists its files with their full contents, `path` (where the file lives in this repo)
// and `type` + `target` (where it goes in the user's project, e.g. ui + button.tsx →
// src/components/ui/button.tsx).
// Used by apps/docs/vite.config.ts (dev server + build) and runnable on its own:
//   npm run registry:build            → apps/docs/dist/r
//   node scripts/build-registry.mjs out/dir
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Where things live in the repo (root-relative). */
export const PATHS = {
  /** The docs app: one page per component in entries/, the fonts in index.html. */
  docs: 'apps/docs',
  entries: 'apps/docs/src/docs/entries',
  html: 'apps/docs/index.html',
  /** Framework-agnostic core: styles/index.css, lib/, fx/. */
  core: 'packages/core/src',
  /** Framework ports, their status and what they need. */
  roadmap: 'roadmap.json',
}

/**
 * How each framework package is laid out. `kit` folders hold the items (one file = one item, or
 * a docs page's files); `lib` and `fx` overlay the core's folders of the same name (a file with the
 * same name replaces the core's, e.g. React's fx/index.ts adds useSprings to the barrel).
 */
const LAYOUT = {
  react: {
    kit: [
      { dir: 'src/components/ui', type: 'ui' },
      { dir: 'src/components/art', type: 'art' },
    ],
    peers: ['react', 'react-dom'],
  },
  vue: {
    kit: [
      { dir: 'src/components', type: 'ui' },
      { dir: 'src/composables', type: 'composable' },
    ],
    peers: ['vue'],
  },
}

/** The framework whose registry sits at the root of r/ (backward compatible with CLI 0.1.0). */
export const DEFAULT_FRAMEWORK = 'react'
/** From these statuses on, a framework's registry is published under r/<id>/. */
const PUBLISHED = new Set(['preview', 'available'])

/** Category order of the docs sidebar (apps/docs/src/docs/types.ts), then the extra groups. */
const ORDER = ['Actions', 'Forms', 'Game', 'Feedback', 'Overlay', 'Display', 'Layout', 'Motion', 'Art', 'Hooks']

/** Docs slugs whose main file is named differently, and the extra files that belong to them. */
const ALIAS = { toast: 'toaster' }
const EXTRA = { toast: ['use-toast'] }

/** Core npm dependencies every component needs (cn() and the variants helper). */
const CORE_DEPS = ['class-variance-authority', 'clsx', 'tailwind-merge']

const posix = (p) => p.split('\\').join('/')
const read = (root, p) => readFileSync(join(root, p), 'utf8')
const isFile = (root, p) => existsSync(join(root, p)) && statSync(join(root, p)).isFile()
/** 'HealthBar.vue' / 'health-bar.tsx' → 'health-bar'. */
const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
const stem = (p) => kebab(p.slice(p.lastIndexOf('/') + 1).replace(/\.(tsx?|vue|css)$/, ''))
const title = (slug) => slug.replace(/(^|-)(\w)/g, (_, d, c) => (d ? ' ' : '') + c.toUpperCase())

/** The kanban cards from roadmap.json (shown on the docs roadmap page). */
function readBoard(root = ROOT) {
  return JSON.parse(read(root, PATHS.roadmap)).board ?? []
}

/** The framework ports from roadmap.json: [{ id, title, status, package, requires, inProgress }]. */
export function readFrameworks(root = ROOT) {
  const { frameworks } = JSON.parse(read(root, PATHS.roadmap))
  return frameworks.map((f) => ({ inProgress: [], ...f }))
}

/** All files of a folder, recursively, as root-relative posix paths ([] when it does not exist). */
function walk(root, dir, re = /\.(tsx?|vue|css)$/) {
  if (!existsSync(join(root, dir))) return []
  const out = []
  for (const name of readdirSync(join(root, dir)).sort()) {
    const p = `${dir}/${name}`
    if (statSync(join(root, p)).isDirectory()) out.push(...walk(root, p, re))
    else if (re.test(name)) out.push(p)
  }
  return out
}

/** Docs entries (apps/docs/src/docs/entries/*.tsx): slug, name, category, description, read without running them. */
export function readEntries(root = ROOT) {
  const dir = join(root, PATHS.entries)
  // `${MASCOT_NAME}` style placeholders → the string constant a React kit file exports
  const consts = {}
  for (const { dir: d } of LAYOUT.react.kit)
    for (const p of walk(root, `packages/react/${d}`)) for (const m of read(root, p).matchAll(/export const (\w+) = '([^'\n]*)'/g)) consts[m[1]] = m[2]
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

/** A one-line description for items without a docs page: the doc comment of the export named
 *  after the file (use-combo → useCombo, monster → Monster), else the file's leading comment. */
function describe(code, name) {
  const camel = name.replace(/-(\w)/g, (_, c) => c.toUpperCase())
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

/** The Google Fonts <link> tags from the docs index.html (preconnects + stylesheet). */
function fontsSnippet(root) {
  const html = read(root, PATHS.html)
  const links = html.match(/<link\b[^>]*fonts\.(?:googleapis|gstatic)\.com[\s\S]*?\/>/g) ?? []
  const pretty = links.map((l) => l.replace(/\s*\n\s*/g, ' ').replace(/\s+\/>$/, ' />').trim())
  const href = /href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)"/.exec(html)?.[1] ?? ''
  return { html: pretty.join('\n'), href }
}

/**
 * Every kit file of one framework, with where it goes: { path, type, target }.
 * The core (css, lib/, fx/) comes first, with the framework's lib/ and fx/ files laid over it.
 */
export function kitFiles(root, framework) {
  const pkg = `packages/${framework}/src`
  const core = [{ path: `${PATHS.core}/styles/index.css`, type: 'css', target: 'index.css' }]
  for (const kind of ['lib', 'fx']) {
    const byTarget = new Map()
    for (const base of [`${PATHS.core}/${kind}`, `${pkg}/${kind}`]) for (const p of walk(root, base, /\.ts$/)) byTarget.set(posix(relative(base, p)), p)
    for (const [target, path] of [...byTarget].sort(([a], [b]) => a.localeCompare(b))) core.push({ path, type: kind, target })
  }
  const kit = LAYOUT[framework].kit.flatMap(({ dir, type }) =>
    walk(root, `packages/${framework}/${dir}`)
      .filter((p) => !/\/index\.ts$/.test(p))
      .map((path) => ({ path, type, target: posix(relative(`packages/${framework}/${dir}`, path)) })),
  )
  return { core, kit }
}

/** Resolves a local import to a kit file path (root-relative), or null: "@/x" → the framework package first, then the core. */
function resolveLocal(root, framework, from, spec) {
  let bases = []
  if (spec.startsWith('@/')) bases = [`packages/${framework}/src/${spec.slice(2)}`, `${PATHS.core}/${spec.slice(2)}`]
  else if (spec.startsWith('.')) bases = [posix(join(dirname(from), spec))]
  for (const base of bases)
    for (const ext of ['.tsx', '.ts', '.vue', '/index.ts', '/index.tsx', '']) {
      const p = base + ext
      if (isFile(root, p)) return p
    }
  return null
}

/** The registry items of one framework: Map name → { meta, files }. */
function buildItems({ root, framework, entries }) {
  const { core, kit } = kitFiles(root, framework)
  const owner = new Map() // path → item name
  const items = new Map() // name → { meta, files }

  core.forEach((f) => owner.set(f.path, 'core'))
  items.set('core', {
    meta: {
      name: 'core',
      title: 'Core',
      type: 'core',
      category: 'Core',
      description: 'Design tokens, the three styles and four colours, ui-* utilities, cn(), theme helpers and the FX engine. Every component needs it.',
    },
    files: core,
  })

  // docs pages first (slug = docs slug), then the files no page owns (hooks, extra art)
  for (const [slug, e] of entries) {
    const main = ALIAS[slug] ?? slug
    const files = [main, ...(EXTRA[slug] ?? [])].map((s) => kit.find((f) => stem(f.path) === s)).filter(Boolean)
    if (!files.length) continue
    files.forEach((f) => owner.set(f.path, slug))
    items.set(slug, { meta: { name: slug, title: e.name, type: files[0].type, category: e.category, description: e.description, docs: `components/${slug}` }, files })
  }
  for (const f of kit) {
    if (owner.has(f.path)) continue
    const name = stem(f.path)
    const art = f.type === 'art'
    const hook = f.type === 'composable' || (!art && f.path.endsWith('.ts'))
    owner.set(f.path, name)
    items.set(name, {
      meta: { name, title: title(name), type: art ? 'art' : hook ? 'hook' : 'ui', category: art ? 'Art' : hook ? 'Hooks' : 'Display', description: describe(read(root, f.path), name) },
      files: [f],
    })
  }
  return { items, owner }
}

/** One framework's registry documents (file name relative to its folder → JSON text). */
function buildFramework({ brand, root, version, framework, entries }) {
  const { items, owner } = buildItems({ root, framework, entries })
  const peers = new Set(LAYOUT[framework].peers)
  const docs = {}
  const index = []
  for (const { meta, files: list } of items.values()) {
    const deps = new Set(meta.name === 'core' ? CORE_DEPS : [])
    const reg = new Set(meta.name === 'core' ? [] : ['core'])
    const files = list.map(({ path, type, target }) => {
      let content = read(root, path)
      // the user's own stylesheet imports Tailwind; ours is imported right after it
      if (type === 'css') content = content.replace(/^@import\s+['"]tailwindcss['"];?[ \t]*\r?\n(\r?\n)?/m, '')
      for (const spec of specifiers(content)) {
        const pkg = packageOf(spec)
        if (pkg) {
          if (!peers.has(pkg)) deps.add(pkg)
          continue
        }
        const local = resolveLocal(root, framework, path, spec)
        const dep = local && owner.get(local)
        if (dep && dep !== meta.name) reg.add(dep)
        if (spec.startsWith('@/') && !local) throw new Error(`${path}: "${spec}" is not a kit file — kit files may only import other kit files`)
      }
      return { path, type, target: type === 'css' ? `${brand.package.replace(/^@[^/]+\//, '')}.css` : target, content }
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
  const head = { name: brand.name, package: brand.package, version, docs: brand.docs }
  docs['index.json'] = JSON.stringify(framework === DEFAULT_FRAMEWORK ? { ...head, items: index } : { ...head, framework, items: index }, null, 2)
  return { docs, names: index.filter((i) => i.name !== 'core').map((i) => i.name) }
}

/**
 * Builds every registry document.
 * @param {{ brand: { name: string, package: string, docs: string }, root?: string, version?: string }} opts
 * @returns {Record<string, string>} file name (relative to r/) → JSON text
 */
export function buildRegistry({ brand, root = ROOT, version }) {
  const pkgVersion = version ?? JSON.parse(read(root, 'package.json')).version
  const entries = new Map(readEntries(root).map((e) => [e.slug, e]))
  const docsBase = brand.docs.endsWith('/') ? brand.docs : `${brand.docs}/`
  const out = {}
  const frameworks = []
  for (const fw of readFrameworks(root)) {
    if (!LAYOUT[fw.id]) throw new Error(`${PATHS.roadmap}: no layout for "${fw.id}" in scripts/build-registry.mjs (LAYOUT)`)
    const isDefault = fw.id === DEFAULT_FRAMEWORK
    const published = isDefault || PUBLISHED.has(fw.status)
    const { docs, names } = buildFramework({ brand, root, version: pkgVersion, framework: fw.id, entries })
    if (published) for (const [name, text] of Object.entries(docs)) out[isDefault ? name : `${fw.id}/${name}`] = text
    frameworks.push({
      id: fw.id,
      title: fw.title,
      status: fw.status,
      requires: fw.requires,
      package: fw.package,
      /** Folder of this framework's registry, relative to r/ ('' = r/ itself), or null while unpublished. */
      registry: published ? (isDefault ? '' : `${fw.id}/`) : null,
      /** Registry items this port has (components, hooks/composables, art). */
      components: names,
      /** Items someone is porting right now (roadmap.json). */
      inProgress: fw.inProgress.filter((n) => !names.includes(n)),
    })
  }
  out['frameworks.json'] = JSON.stringify(
    { name: brand.name, package: brand.package, version: pkgVersion, docs: brand.docs, roadmap: `${docsBase}roadmap`, default: DEFAULT_FRAMEWORK, frameworks, board: readBoard(root) },
    null,
    2,
  )
  return out
}

/** Writes the registry into `out` (default apps/docs/dist/r). */
export function writeRegistry(out, opts) {
  const docs = buildRegistry(opts)
  for (const [name, text] of Object.entries(docs)) {
    mkdirSync(dirname(join(out, name)), { recursive: true })
    writeFileSync(join(out, name), `${text}\n`)
  }
  return Object.keys(docs).length
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { brand } = await import(pathToFileURL(join(ROOT, 'brand.config.ts')).href)
  const out = process.argv[2] ? resolve(process.argv[2]) : join(ROOT, PATHS.docs, 'dist/r')
  const n = writeRegistry(out, { brand })
  console.log(`registry: ${n} files → ${posix(relative(process.cwd(), out)) || '.'}`)
}
