#!/usr/bin/env node
// The kit's CLI: `init` sets a project up, `add` copies components in, `list` shows them.
// Zero dependencies (Node built-ins + global fetch). scripts/build-cli.mjs copies this file to
// cli/dist/index.mjs and fills BRAND from brand.config.ts, so the names below are placeholders.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import process from 'node:process'
import { createInterface } from 'node:readline/promises'
import { parseArgs } from 'node:util'

const BRAND = /* @brand */ { name: 'UI kit', package: 'ui-kit', version: '0.0.0-dev', registry: 'http://localhost:5173/r/', docs: 'http://localhost:5173/' } /* @end */

/** File-safe form of the package name ('@scope/kit' → 'kit'), for the config and stylesheet names. */
const SLUG = BRAND.package.replace(/^@[^/]+\//, '')
const CONFIG_FILE = `${SLUG}.json`
const CORE = 'core'
/** The framework whose registry sits at the root of the registry URL; other ports live under <registry>/<framework>/. */
const DEFAULT_FRAMEWORK = 'react'
/** UI frameworks the CLI can recognise from package.json (first match wins, so React projects stay React). */
const UI_FRAMEWORKS = [
  ['react', 'React', ['react', 'next']],
  ['vue', 'Vue', ['vue', 'nuxt']],
  ['svelte', 'Svelte', ['svelte', '@sveltejs/kit']],
  ['solid', 'Solid', ['solid-js']],
  ['angular', 'Angular', ['@angular/core']],
]

/* ─────────────────────────── output ─────────────────────────── */

const COLOR =
  !('NO_COLOR' in process.env) && process.env.TERM !== 'dumb' && (process.env.FORCE_COLOR ? process.env.FORCE_COLOR !== '0' : Boolean(process.stdout.isTTY))
const paint = (open, close) => (s) => (COLOR ? `\x1b[${open}m${s}\x1b[${close}m` : String(s))
const c = {
  bold: paint(1, 22),
  dim: paint(2, 22),
  red: paint(31, 39),
  green: paint(32, 39),
  yellow: paint(33, 39),
  blue: paint(34, 39),
  magenta: paint(35, 39),
  cyan: paint(36, 39),
}
const out = (s = '') => process.stdout.write(`${s}\n`)
const ok = (s) => out(`${c.green('✔')} ${s}`)
const note = (s) => out(`${c.cyan('ℹ')} ${s}`)
const warn = (s) => out(`${c.yellow('▲')} ${s}`)
const fail = (s) => process.stderr.write(`${c.red('✖')} ${s}\n`)
const code = (s) => c.cyan(s)
/** Prints a snippet, indented, for the user to paste. */
const snippet = (text, title) => {
  if (title) out(`  ${c.dim(title)}`)
  for (const line of text.split('\n')) out(`    ${c.magenta(line)}`)
  out()
}
const header = (cmd) => out(`\n${c.bold(c.magenta('◆'))} ${c.bold(BRAND.name)} ${c.dim(`· ${cmd} · v${BRAND.version}`)}\n`)

class CliError extends Error {
  constructor(message, { quiet = false } = {}) {
    super(message)
    this.quiet = quiet // already explained on stdout: exit 1 without the red line
  }
}

// `… | head` closes the pipe early: stop quietly
process.stdout.on('error', (e) => {
  if (e.code === 'EPIPE') process.exit(0)
  throw e
})

/* ─────────────────────────── args ─────────────────────────── */

const HELP = `
${c.bold(BRAND.name)} ${c.dim(`v${BRAND.version}`)} — add components to your React + Tailwind CSS v4 project.

${c.bold('Usage')}
  ${code(`npx ${BRAND.package} init`)}                 set the project up (deps, core files, styles)
  ${code(`npx ${BRAND.package} add <name...>`)}        add components (and what they need)
  ${code(`npx ${BRAND.package} add --all`)}            add every component
  ${code(`npx ${BRAND.package} list`)}                 show every component, by category

${c.bold('Options')}
  -y, --yes              skip prompts, use the defaults
  -o, --overwrite        replace files that already exist (add)
  -a, --all              every component (add)
      --cwd <dir>        the project folder (default: current folder)
      --registry <url>   registry to read from (default: ${BRAND.registry})
      --framework <id>   UI framework (default: from ${CONFIG_FILE}, else detected; react today)
      --no-install       do not install npm packages, print the command instead
  -h, --help             show this help
  -v, --version          show the version

${c.bold('Docs')}  ${BRAND.docs}
`

function parse(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      yes: { type: 'boolean', short: 'y' },
      overwrite: { type: 'boolean', short: 'o' },
      all: { type: 'boolean', short: 'a' },
      cwd: { type: 'string' },
      registry: { type: 'string' },
      framework: { type: 'string' },
      'no-install': { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  })
  return { flags: values, command: positionals[0], names: positionals.slice(1) }
}

/* ─────────────────────────── prompts ─────────────────────────── */

let ctx // { cwd, flags, interactive }

async function ask(question, fallback = '') {
  if (!ctx.interactive) return fallback
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    return (await rl.question(`${c.cyan('?')} ${question} `)).trim()
  } finally {
    rl.close()
  }
}
async function confirm(question, yes = true) {
  if (!ctx.interactive) return yes
  const a = (await ask(`${question} ${c.dim(yes ? '(Y/n)' : '(y/N)')}`)).toLowerCase()
  return a ? a.startsWith('y') : yes
}

/* ─────────────────────────── files ─────────────────────────── */

const posix = (p) => p.split(sep).join('/')
const abs = (p) => resolve(ctx.cwd, p)
const rel = (p) => posix(relative(ctx.cwd, p)) || '.'
const readText = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : null)
function writeText(p, text) {
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, text)
}
function readJson(p) {
  const text = readText(p)
  if (text == null) return null
  try {
    return JSON.parse(text)
  } catch {
    return parseJsonc(text)
  }
}
/** JSON with comments and trailing commas (tsconfig), parsed without breaking strings like "@/*". */
function parseJsonc(text) {
  let s = ''
  for (let i = 0, str = false; i < text.length; i++) {
    const ch = text[i]
    if (str) {
      s += ch
      if (ch === '\\') s += text[++i] ?? ''
      else if (ch === '"') str = false
    } else if (ch === '"') {
      str = true
      s += ch
    } else if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++
      s += '\n'
    } else if (ch === '/' && text[i + 1] === '*') {
      i = text.indexOf('*/', i + 2)
      if (i < 0) break
      i++
    } else s += ch
  }
  try {
    return JSON.parse(s.replace(/,(\s*[}\]])/g, '$1'))
  } catch {
    return null
  }
}

/* ─────────────────────────── registry ─────────────────────────── */

/** The registry root (where index.json and frameworks.json are). */
const registryRoot = () => {
  const r = ctx.flags.registry ?? loadConfig()?.registry ?? BRAND.registry
  return r.endsWith('/') ? r : `${r}/`
}
/** Where this project's framework's items are: the root for React (as in 0.1), <root>/<framework>/ otherwise. */
const registryBase = () => (ctx.framework && ctx.framework !== DEFAULT_FRAMEWORK ? `${registryRoot()}${ctx.framework}/` : registryRoot())
const cache = new Map()
async function fetchJson(name, base = registryBase()) {
  const key = `${base}${name}`
  if (cache.has(key)) return cache.get(key)
  let data
  if (/^https?:\/\//.test(base)) {
    let res
    try {
      res = await fetch(new URL(name, base), { headers: { accept: 'application/json' } })
    } catch (e) {
      throw new CliError(`Could not reach the registry at ${base} (${e.cause?.code ?? e.message}). Check your connection, or pass --registry <url>.`)
    }
    if (res.status === 404) return null
    if (!res.ok) throw new CliError(`The registry answered ${res.status} for ${new URL(name, base)}.`)
    data = await res.json()
  } else {
    const p = resolve(base, name)
    if (!existsSync(p)) return null
    data = JSON.parse(readFileSync(p, 'utf8'))
  }
  cache.set(key, data)
  return data
}

/** r/frameworks.json: every framework port and its status (null when the registry predates it). */
async function getFrameworks() {
  try {
    return await fetchJson('frameworks.json', registryRoot())
  } catch {
    return null
  }
}
async function getIndex() {
  const index = await fetchJson('index.json')
  if (!index?.items) throw new CliError(`No registry index at ${registryBase()}index.json.`)
  return index
}
const getItem = async (name) => {
  const item = await fetchJson(`${name}.json`)
  if (!item) throw new CliError(`"${name}" is listed but ${registryBase()}${name}.json is missing.`)
  return item
}

/* ─────────────────────────── project ─────────────────────────── */

const LOCKS = [
  ['bun.lock', 'bun'],
  ['bun.lockb', 'bun'],
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['package-lock.json', 'npm'],
]
const RUNNER = { npm: 'npx', pnpm: 'pnpm dlx', yarn: 'yarn dlx', bun: 'bunx' }
const addArgs = (pm, pkgs, dev) => [pm === 'npm' ? 'install' : 'add', ...(dev ? [pm === 'bun' ? '-d' : '-D'] : []), ...pkgs]
const addCommand = (pm, pkgs, dev = false) => [pm, ...addArgs(pm, pkgs, dev)].join(' ')

function packageManager(dir) {
  for (let d = dir, up = 0; up < 4; d = dirname(d), up++) {
    for (const [file, pm] of LOCKS) if (existsSync(join(d, file))) return pm
    if (dirname(d) === d) break
  }
  const agent = process.env.npm_config_user_agent ?? ''
  return ['pnpm', 'yarn', 'bun'].find((pm) => agent.startsWith(pm)) ?? 'npm'
}

const firstFile = (names) => names.find((n) => existsSync(abs(n))) ?? null

/** Everything init and add need to know about the user's project. */
function detect() {
  const pkg = readJson(abs('package.json'))
  if (!pkg) throw new CliError(`No package.json in ${ctx.cwd}. Run this inside your app (or pass --cwd <dir>).`)
  const deps = { ...pkg.peerDependencies, ...pkg.devDependencies, ...pkg.dependencies }
  const viteConfig = firstFile(['vite.config.ts', 'vite.config.mts', 'vite.config.js', 'vite.config.mjs'])
  const framework = deps.next ? 'next' : deps.vite || viteConfig ? 'vite' : 'react' // the bundler / meta-framework
  const ui = UI_FRAMEWORKS.find(([, , names]) => names.some((n) => deps[n]))?.[0] ?? DEFAULT_FRAMEWORK
  const src = existsSync(abs('src')) ? 'src' : '.'

  // Tailwind CSS: the installed version wins over the range in package.json
  const installed = readJson(abs('node_modules/tailwindcss/package.json'))?.version
  const range = deps.tailwindcss
  const major = Number.parseInt((installed ?? range ?? '').replace(/^[^\d]*/, ''), 10)
  const tailwind = { present: Boolean(installed || range), major: Number.isNaN(major) ? (range ? 4 : 0) : major }

  // the "@" style alias: tsconfig paths ("@/*": ["./src/*"]); Vite also needs resolve.alias
  let alias = null
  for (const file of ['tsconfig.app.json', 'tsconfig.json', 'jsconfig.json']) {
    const opts = readJson(abs(file))?.compilerOptions
    if (!opts?.paths) continue
    const base = resolve(abs(dirname(file)), opts.baseUrl ?? '.')
    const found = Object.entries(opts.paths)
      .filter(([k, v]) => k.endsWith('/*') && Array.isArray(v) && String(v[0]).endsWith('/*'))
      .map(([k, v]) => ({ name: k.slice(0, -2), root: rel(resolve(base, String(v[0]).slice(0, -2))), file }))
    alias = found.find((a) => a.name === '@') ?? found.find((a) => a.root === src) ?? found[0] ?? null
    if (alias) break
  }
  const viteText = viteConfig ? readText(abs(viteConfig)) : ''
  const viteAlias =
    framework !== 'vite' ||
    (alias && new RegExp(`['"]?${alias.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]?\\s*[:,]`).test(viteText ?? '')) ||
    /tsconfigPaths/.test(viteText ?? '')

  const cssCandidates = ['src/index.css', 'src/App.css', 'src/app/globals.css', 'app/globals.css', 'src/styles/globals.css', 'styles/globals.css', 'src/main.css', 'src/style.css']
  const mainCss = cssCandidates.find((f) => /@import\s+(url\()?['"]tailwindcss['"]/.test(readText(abs(f)) ?? '')) ?? null
  const entry = firstFile(['src/main.tsx', 'src/main.jsx', 'src/index.tsx', 'src/main.ts'])
  const typescript = Boolean(deps.typescript) || existsSync(abs('tsconfig.json'))

  return { pkg, deps, framework, ui, src, tailwind, alias, viteConfig, viteAlias, mainCss, entry, typescript, pm: packageManager(ctx.cwd) }
}

/* ─────────────────────────── config ─────────────────────────── */

function defaultConfig(project) {
  const base = (p) => (project.src === '.' ? p : `${project.src}/${p}`)
  return {
    framework: ctx.framework ?? DEFAULT_FRAMEWORK,
    alias: project.alias?.name ?? '@',
    aliasRoot: project.alias?.root ?? project.src,
    rsc: project.framework === 'next',
    paths: {
      components: base('components/ui'),
      art: base('components/art'),
      lib: base('lib'),
      fx: base('fx'),
      css: base(`styles/${SLUG}.css`),
    },
  }
}
let configCache
function loadConfig() {
  if (configCache === undefined) configCache = readJson(abs(CONFIG_FILE))
  return configCache
}
function saveConfig(cfg) {
  writeText(abs(CONFIG_FILE), `${JSON.stringify(cfg, null, 2)}\n`)
  configCache = cfg
}

/** Where a registry file goes in this project. */
const KIND_PATH = { ui: 'components', art: 'art', lib: 'lib', fx: 'fx' }
function targetOf(file, cfg) {
  if (file.type === 'css') return abs(cfg.paths.css)
  return abs(join(cfg.paths[KIND_PATH[file.type]], file.target))
}

/** The import a file at `fromDir` uses for a kit folder: the alias when the folder is under it, a relative path otherwise. */
function importBase(kind, fromDir, cfg) {
  const dir = abs(cfg.paths[KIND_PATH[kind]])
  if (cfg.alias) {
    const r = relative(abs(cfg.aliasRoot ?? '.'), dir)
    if (!r.startsWith('..') && !isAbsolute(r)) return r ? `${cfg.alias}/${posix(r)}` : cfg.alias
  }
  const r = posix(relative(fromDir, dir))
  return r ? (r.startsWith('.') ? r : `./${r}`) : '.'
}

/** Kit files import '@/components/ui', '@/components/art', '@/lib' and '@/fx': point them at this project's folders. */
function transform(file, cfg, target) {
  let text = file.content
  if (file.type === 'css') return text
  const kinds = { 'components/ui': 'ui', 'components/art': 'art', lib: 'lib', fx: 'fx' }
  text = text.replace(/((?:from|import)\s*\(?\s*)(['"])@\/(components\/ui|components\/art|lib|fx)(\/[^'"]*)?\2/g, (_, pre, q, folder, rest = '') => {
    return `${pre}${q}${importBase(kinds[folder], dirname(target), cfg)}${rest}${q}`
  })
  // Next.js app router: components with hooks or handlers are client components
  if (cfg.rsc && (file.type === 'ui' || file.type === 'art') && /\b(use[A-Z]\w*|createContext)\s*\(/.test(text) && !/^['"]use client['"]/.test(text))
    text = `'use client'\n\n${text}`
  return text
}

/* ─────────────────────────── install ─────────────────────────── */

function installPackages(pkgs, project, { dev = false } = {}) {
  const missing = pkgs.filter((p) => !project.deps[p])
  if (!missing.length) return true
  const cmd = addCommand(project.pm, missing, dev)
  if (ctx.flags['no-install']) {
    note(`Install these yourself: ${code(cmd)}`)
    return true
  }
  out(`${c.dim('$')} ${c.dim(cmd)}`)
  const r = spawnSync(project.pm, addArgs(project.pm, missing, dev), { cwd: ctx.cwd, stdio: 'inherit', shell: process.platform === 'win32' })
  if (r.status === 0) {
    missing.forEach((p) => (project.deps[p] = 'latest'))
    ok(`Installed ${missing.join(', ')}`)
    return true
  }
  warn(`Installing failed. Run it yourself: ${code(cmd)}`)
  return false
}

/** Names → registry items, dependencies first (core before everything). */
async function resolveItems(names, index) {
  const known = new Map(index.items.map((i) => [i.name, i]))
  const order = []
  const seen = new Set()
  const visit = async (name, chain) => {
    if (seen.has(name)) return
    seen.add(name)
    const meta = known.get(name)
    if (!meta) throw new CliError(`"${chain.at(-1)}" needs "${name}", which the registry does not have.`)
    for (const dep of meta.registryDependencies ?? []) await visit(dep, [...chain, name])
    order.push(meta)
  }
  for (const n of names) await visit(n, [n])
  return Promise.all(order.map((m) => getItem(m.name)))
}

/** Finds the registry name for what the user typed: 'Button', 'toaster' (file name), 'ui/button'. */
function lookup(input, index) {
  const q = input.toLowerCase().replace(/^.*\//, '').replace(/\.(tsx?|json)$/, '')
  if (index.items.some((i) => i.name === q)) return q
  const byFile = index.items.find((i) => (i.files ?? []).some((f) => f.replace(/^.*\//, '').replace(/\.tsx?$/, '') === q))
  return byFile?.name ?? null
}
function suggest(input, index) {
  const dist = (a, b) => {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
    for (let j = 1; j <= b.length; j++) d[0][j] = j
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    return d[a.length][b.length]
  }
  const q = input.toLowerCase()
  return index.items
    .filter((i) => i.name !== CORE && (i.name.includes(q) || q.includes(i.name) || dist(q, i.name) <= 2))
    .map((i) => i.name)
    .slice(0, 4)
}

/**
 * Writes the items and their dependencies. Files of the items the user named are replaced only with
 * --overwrite (or a yes when asked); files pulled in as dependencies are kept when they exist.
 */
async function install(names, project, cfg) {
  const index = await getIndex()
  const items = await resolveItems(names, index)
  const named = new Set(names)
  const report = { created: [], updated: [], unchanged: [], kept: [] }
  let all = ctx.flags.overwrite ? true : null

  for (const item of items) {
    for (const file of item.files) {
      const target = targetOf(file, cfg)
      const text = transform(file, cfg, target)
      const current = readText(target)
      if (current == null) {
        writeText(target, text)
        report.created.push(target)
        continue
      }
      if (current === text) {
        report.unchanged.push(target)
        continue
      }
      let replace = false
      if (named.has(item.name)) {
        if (all !== null) replace = all
        else if (ctx.interactive) {
          const a = (await ask(`${rel(target)} exists and differs. Overwrite? ${c.dim('(y)es / (N)o / (a)ll')}`)).toLowerCase()
          if (a === 'a' || a === 'all') all = replace = true
          else replace = a === 'y' || a === 'yes'
        }
      }
      if (replace) {
        writeText(target, text)
        report.updated.push(target)
      } else report.kept.push(target)
    }
  }

  const deps = [...new Set(items.flatMap((i) => i.dependencies ?? []))]
  return { items, report, deps }
}

function printReport({ created, updated, unchanged, kept }) {
  for (const f of created) out(`  ${c.green('created ')} ${rel(f)}`)
  for (const f of updated) out(`  ${c.yellow('replaced')} ${rel(f)}`)
  for (const f of kept) out(`  ${c.dim('kept    ')} ${c.dim(`${rel(f)} (exists, differs; use --overwrite to replace)`)}`)
  if (unchanged.length) out(`  ${c.dim(`unchanged ${unchanged.length} file${unchanged.length > 1 ? 's' : ''} already up to date`)}`)
}

/* ─────────────────────────── framework ─────────────────────────── */

/** The UI framework: --framework, else sasuga.json, else what package.json depends on. */
function pickFramework() {
  const flag = ctx.flags.framework?.toLowerCase()
  if (flag) return flag
  const cfg = existsSync(abs('package.json')) ? loadConfig() : null
  if (cfg) return cfg.framework ?? DEFAULT_FRAMEWORK // configs written by 0.1 have no framework: React
  try {
    return detect().ui
  } catch {
    return DEFAULT_FRAMEWORK
  }
}

/**
 * Makes sure the registry has the project's framework. React always passes (its registry is the root,
 * as in 0.1). For any other framework, r/frameworks.json says whether its port is published yet; if not,
 * this explains it and points at the roadmap instead of failing on a missing file.
 */
async function ensureFramework() {
  const id = ctx.framework
  if (id === DEFAULT_FRAMEWORK) return
  const title = UI_FRAMEWORKS.find(([f]) => f === id)?.[1] ?? id
  const info = await getFrameworks()
  const port = info?.frameworks?.find((f) => f.id === id)
  if (port?.registry != null) return
  const roadmap = info?.roadmap ?? `${BRAND.docs}roadmap`
  const ready = (info?.frameworks ?? [{ id: DEFAULT_FRAMEWORK, title: 'React', registry: '' }]).filter((f) => f.registry != null)
  out(`${c.magenta('◆')} ${c.bold(`${title} support is coming`)}${port ? c.dim(` (status: ${port.status})`) : ''}`)
  out()
  out(`  ${BRAND.name} is ${ready.map((f) => f.title).join(' and ')} only for now${port ? `; the ${title} port is on the roadmap` : ''}.`)
  out(`  Follow it, or help port it: ${c.blue(roadmap)}`)
  out()
  out(c.dim(`  Using ${ready[0]?.title ?? 'React'} in this project after all? Pass --framework ${ready[0]?.id ?? DEFAULT_FRAMEWORK}, or set "framework" in ${CONFIG_FILE}.`))
  out()
  throw new CliError(`No ${title} components in the registry yet.`, { quiet: true })
}

/* ─────────────────────────── init ─────────────────────────── */

const FRAMEWORK = { vite: 'Vite', next: 'Next.js', react: 'React' }

function aliasSnippets(project, cfg) {
  const root = cfg.aliasRoot === '.' ? '.' : `./${cfg.aliasRoot}`
  const ts = `"compilerOptions": {\n  "paths": { "${cfg.alias}/*": ["${root}/*"] }\n}`
  out(`  Add the alias so ${code(`${cfg.alias}/lib/utils`)} resolves:`)
  snippet(ts, project.framework === 'vite' ? '// tsconfig.json and tsconfig.app.json' : '// tsconfig.json')
  if (project.framework === 'vite')
    snippet(
      `import { fileURLToPath, URL } from 'node:url'\n\nexport default defineConfig({\n  // …\n  resolve: { alias: { '${cfg.alias}': fileURLToPath(new URL('${root}', import.meta.url)) } },\n})`,
      `// ${project.viteConfig ?? 'vite.config.ts'}`,
    )
}

function tailwindSteps(project) {
  if (project.framework === 'next') {
    out(`  1. ${code(addCommand(project.pm, ['tailwindcss', '@tailwindcss/postcss', 'postcss'], true))}`)
    snippet(`export default { plugins: { '@tailwindcss/postcss': {} } }`, '2. // postcss.config.mjs')
    snippet(`@import 'tailwindcss';`, '3. /* app/globals.css, first line */')
  } else {
    out(`  1. ${code(addCommand(project.pm, ['tailwindcss', '@tailwindcss/vite'], true))}`)
    snippet(`import tailwindcss from '@tailwindcss/vite'\n\nexport default defineConfig({\n  plugins: [react(), tailwindcss()],\n})`, `2. // ${project.viteConfig ?? 'vite.config.ts'}`)
    snippet(`@import 'tailwindcss';`, '3. /* src/index.css, first line */')
  }
  out(`  Guide: ${c.blue('https://tailwindcss.com/docs/installation')}`)
  out()
}

async function init() {
  header('init')
  const project = detect()
  out(
    `  ${c.dim('project')}  ${FRAMEWORK[project.framework]}${project.typescript ? ' + TypeScript' : ''} ${c.dim('·')} ${project.pm} ${c.dim('·')} ${project.src === '.' ? 'no src/ folder' : 'src/'}`,
  )
  out()

  // Tailwind CSS v4
  if (!project.tailwind.present || project.tailwind.major < 4) {
    warn(
      project.tailwind.present
        ? `Tailwind CSS ${project.tailwind.major} found — the kit needs Tailwind CSS v4 (CSS-first config, @utility, @theme).`
        : 'Tailwind CSS is not installed — the kit needs Tailwind CSS v4.',
    )
    tailwindSteps(project)
    if (!(await confirm('Continue anyway (and set up Tailwind after)?', true))) throw new CliError('Stopped. Set up Tailwind CSS v4, then run init again.')
  } else ok(`Tailwind CSS v${project.tailwind.major}`)
  if (!project.typescript) warn('No TypeScript found — the components are .tsx files, so the app needs TypeScript (or a bundler that strips types).')

  // config
  let cfg = loadConfig()
  if (cfg) note(`Using the existing ${code(CONFIG_FILE)}`)
  else {
    cfg = defaultConfig(project)
    if (!project.alias && ctx.interactive) {
      warn(`No path alias found in tsconfig (like "@/*": ["./${project.src === '.' ? '' : `${project.src}/`}*"]).`)
      if (!(await confirm(`Use the "@" alias? Say no to write relative imports instead`, true))) cfg.alias = null
    }
    saveConfig(cfg)
    ok(`Wrote ${code(CONFIG_FILE)} ${c.dim(`(components → ${cfg.paths.components})`)}`)
  }

  // alias
  if (cfg.alias) {
    if (!project.alias || project.alias.name !== cfg.alias) {
      warn(`The "${cfg.alias}" alias is not set up yet.`)
      aliasSnippets(project, cfg)
    } else if (!project.viteAlias) {
      warn(`"${cfg.alias}" is in ${project.alias.file} but not in ${project.viteConfig ?? 'vite.config.ts'}.`)
      aliasSnippets(project, cfg)
    } else ok(`Alias ${code(`${cfg.alias}/*`)} → ${cfg.aliasRoot}/`)
  } else note('Relative imports (no alias)')

  // core files + deps
  const { items, report, deps } = await install([CORE], project, cfg)
  ok(`Core files (${items[0].files.length})`)
  printReport(report)
  installPackages(deps, project)

  // stylesheet import
  const cssTarget = abs(cfg.paths.css)
  if (project.mainCss) {
    const mainPath = abs(project.mainCss)
    const css = readText(mainPath)
    let spec = posix(relative(dirname(mainPath), cssTarget))
    if (!spec.startsWith('.')) spec = `./${spec}`
    if (css.includes(spec) || css.includes(`${SLUG}.css`)) ok(`${project.mainCss} already imports ${spec}`)
    else {
      const next = css.replace(/^(@import\s+(?:url\()?(['"])tailwindcss\2\)?[^;\n]*;?)[ \t]*$/m, (line, _l, q) => `${line}\n@import ${q}${spec}${q};`)
      writeText(mainPath, next)
      ok(`Imported the styles in ${project.mainCss} ${c.dim(`(@import '${spec}')`)}`)
    }
  } else {
    const guess = ['src/index.css', 'src/app/globals.css', 'app/globals.css', 'src/App.css'].find((f) => existsSync(abs(f)))
    warn(`No stylesheet with @import "tailwindcss" found. Put these two lines at the top of ${guess ?? 'your main stylesheet'}:`)
    snippet(`@import 'tailwindcss';\n@import '${posix(relative(abs(project.src === '.' ? 'app' : project.src), cssTarget)).replace(/^(?!\.)/, './')}';`)
  }

  // fonts
  const fonts = items[0].fonts
  if (fonts?.html) {
    const html = project.framework === 'vite' ? abs('index.html') : null
    const text = html && readText(html)
    if (text?.includes('</head>')) {
      if (text.includes(fonts.href)) ok('index.html already loads the fonts')
      else {
        const indent = /\n([ \t]*)<\/head>/.exec(text)?.[1] ?? ''
        writeText(html, text.replace(/([ \t]*)<\/head>/, `${fonts.html.split('\n').map((l) => `${indent}  ${l}`).join('\n')}\n$1</head>`))
        ok('Added the Google Fonts <link> to index.html')
      }
    } else {
      note(`Load the fonts: put this in the <head>${project.framework === 'next' ? ' of app/layout.tsx' : ''}:`)
      snippet(project.framework === 'next' ? fonts.html.replace(/crossorigin(?=\s)/, 'crossOrigin=""') : fonts.html)
    }
  }

  // theme
  const lib = importBase('lib', abs(project.entry ? dirname(project.entry) : project.src), cfg)
  out()
  note(`Restore the saved style + colour before the first paint${project.framework === 'next' ? ' (client side)' : ''}:`)
  if (project.framework === 'next')
    snippet(
      `'use client'\nimport { useEffect } from 'react'\nimport { initTheme } from '${lib}/theme'\n\nexport function ThemeInit() {\n  useEffect(() => initTheme(), [])\n  return null\n}`,
      '// components/theme-init.tsx — render <ThemeInit /> in app/layout.tsx, and put data-style="cel" data-theme="lilac" on <html>',
    )
  else snippet(`import { initTheme } from '${lib}/theme'\n\ninitTheme()`, `// ${project.entry ?? 'src/main.tsx'}`)

  const run = RUNNER[project.pm]
  out(`${c.green(c.bold('Ready.'))} Add your first component:`)
  out(`  ${code(`${run} ${BRAND.package} add button`)}`)
  out(`  ${c.dim(`${run} ${BRAND.package} list   ·   docs: ${BRAND.docs}`)}`)
  out()
}

/* ─────────────────────────── add ─────────────────────────── */

async function add(input) {
  header('add')
  let cfg = loadConfig()
  if (!cfg) {
    warn(`No ${CONFIG_FILE} here yet.`)
    if (!(await confirm(`Run ${code('init')} first?`, true))) throw new CliError(`Run ${RUNNER[detect().pm]} ${BRAND.package} init, then add again.`)
    await init()
    cfg = loadConfig()
    header('add')
  }
  const project = detect()
  const index = await getIndex()

  let names
  if (ctx.flags.all) names = index.items.filter((i) => i.type !== 'core' && i.type !== 'hook').map((i) => i.name)
  else {
    if (!input.length && ctx.interactive) input = (await ask(`Which components? ${c.dim('(space-separated, e.g. button health-bar)')}`)).split(/[\s,]+/).filter(Boolean)
    if (!input.length) throw new CliError(`Name a component: ${BRAND.package} add button  (or --all). See: ${BRAND.package} list`)
    names = []
    for (const n of input) {
      const found = lookup(n, index)
      if (!found) {
        const s = suggest(n, index)
        throw new CliError(`No component called "${n}".${s.length ? ` Did you mean: ${s.join(', ')}?` : ''} See: ${BRAND.package} list`)
      }
      names.push(found)
    }
  }

  const { items, report, deps } = await install(names, project, cfg)
  const extra = items.filter((i) => !names.includes(i.name) && i.name !== CORE)
  ok(`${names.length} component${names.length > 1 ? 's' : ''}${extra.length ? ` + ${extra.length} needed by ${names.length > 1 ? 'them' : 'it'} (${extra.map((i) => i.name).join(', ')})` : ''}`)
  printReport(report)
  installPackages(deps, project)

  const docs = items.filter((i) => names.includes(i.name) && i.docs)
  if (docs.length) {
    out()
    out(c.bold('Docs'))
    const w = Math.max(...docs.map((i) => i.title.length))
    for (const i of docs) out(`  ${i.title.padEnd(w)}  ${c.blue(new URL(i.docs, BRAND.docs).href)}`)
  }
  out()
}

/* ─────────────────────────── list ─────────────────────────── */

async function list() {
  header('list')
  const index = await getIndex()
  const cfg = existsSync(abs('package.json')) ? loadConfig() : null
  const groups = new Map()
  for (const i of index.items) {
    if (i.type === 'core') continue
    if (!groups.has(i.category)) groups.set(i.category, [])
    groups.get(i.category).push(i)
  }
  const w = Math.max(...index.items.map((i) => i.name.length))
  const cols = process.stdout.columns || 100
  for (const [cat, items] of groups) {
    out(c.bold(c.magenta(cat)))
    for (const i of items) {
      const main = i.files?.[0]
      const has = cfg && main && existsSync(targetOf({ type: main.includes('/art/') ? 'art' : 'ui', target: main.replace(/^.*\//, '') }, cfg))
      const desc = (i.description ?? '').replace(/\s+/g, ' ')
      const room = Math.max(20, cols - w - 8)
      out(`  ${has ? c.green('✔') : ' '} ${c.cyan(i.name.padEnd(w))}  ${c.dim(desc.length > room ? `${desc.slice(0, room - 1)}…` : desc)}`)
    }
    out()
  }
  const run = RUNNER[existsSync(abs('package.json')) ? packageManager(ctx.cwd) : 'npm']
  out(`${index.items.length - 1} items. Add one: ${code(`${run} ${BRAND.package} add <name>`)}   ${c.dim(cfg ? '✔ = in this project' : '')}`)
  out()
}

/* ─────────────────────────── main ─────────────────────────── */

async function main() {
  let parsed
  try {
    parsed = parse(process.argv.slice(2))
  } catch (e) {
    fail(e.message)
    out(HELP)
    return 1
  }
  const { flags, command, names } = parsed
  if (flags.version) return out(BRAND.version), 0
  if (flags.help || !command || command === 'help') return out(HELP), 0

  const cwd = resolve(flags.cwd ?? process.cwd())
  if (!existsSync(cwd)) return fail(`--cwd ${cwd} does not exist`), 1
  ctx = { cwd, flags, interactive: !flags.yes && Boolean(process.stdin.isTTY && process.stdout.isTTY) }

  try {
    if (['init', 'add', 'list', 'ls'].includes(command)) {
      ctx.framework = pickFramework()
      await ensureFramework()
    }
    if (command === 'init') await init()
    else if (command === 'add') await add(names)
    else if (command === 'list' || command === 'ls') await list()
    else {
      fail(`Unknown command "${command}".`)
      out(HELP)
      return 1
    }
    return 0
  } catch (e) {
    if (e instanceof CliError) {
      if (!e.quiet) fail(e.message)
    }
    else fail(e?.stack ?? String(e))
    return 1
  }
}

process.exitCode = await main()
