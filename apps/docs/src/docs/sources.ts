// The real source of every kit file, loaded on demand (not part of the main bundle),
// so a docs page can show the exact file people copy — plus the kit files it imports.
import { site } from '@/data/site'

// Keys are relative to this file; repo() turns them into repo paths (packages/react/src/…).
const RAW = import.meta.glob<string>(['../../../../packages/react/src/components/ui/*.{ts,tsx}', '../../../../packages/react/src/components/art/*.tsx'], {
  query: '?raw',
  import: 'default',
})
// The core every component needs, as it lands in a React app: packages/core plus the React
// adapters that replace or join its files (fx/index.ts with useSprings, lib/theme.ts with useTheme…).
// Only the file names are used (nothing is loaded).
const CORE = import.meta.glob(['../../../../packages/core/src/{lib,fx}/*.ts', '../../../../packages/react/src/{lib,fx}/*.ts', '../../../../packages/core/src/styles/index.css'], {
  query: '?raw',
  import: 'default',
})

/** Docs slugs whose main file is named differently. */
const ALIAS: Record<string, string> = { toast: 'toaster' }

/**
 * A kit file, with both of its paths:
 * - `path`: where it goes in the user's app, e.g. "src/components/ui/button.tsx"
 * - `repo`: where it lives in this repo (raw links), e.g. "packages/react/src/components/ui/button.tsx"
 */
export type SourceFile = { path: string; repo: string; code: string }

const PREFIX = '../../../../'
/** Glob key → repo path: "packages/react/src/components/ui/button.tsx". */
const repo = (key: string) => key.slice(PREFIX.length)
/** Repo path → app path: packages/<core|react>/src/x → src/x (the core stylesheet → src/index.css). */
export const appPath = (repoPath: string) =>
  repoPath === 'packages/core/src/styles/index.css' ? 'src/index.css' : repoPath.replace(/^packages\/[^/]+\//, '')

const UI = `${PREFIX}packages/react/src/components/ui/`
const ART = `${PREFIX}packages/react/src/components/art/`

function mainKey(slug: string) {
  const name = ALIAS[slug] ?? slug
  for (const dir of [UI, ART]) {
    for (const ext of ['.tsx', '.ts']) if (RAW[`${dir}${name}${ext}`]) return `${dir}${name}${ext}`
  }
  return null
}

/** Kit files a file imports (other components, hooks, art) — not the shared core (fx, lib, css). */
function localImports(key: string, code: string) {
  const dir = key.slice(0, key.lastIndexOf('/') + 1)
  const out: string[] = []
  for (const m of code.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const spec = m[1]
    let base: string | null = null
    if (spec.startsWith('@/components/ui/')) base = UI + spec.slice('@/components/ui/'.length)
    else if (spec.startsWith('@/components/art/')) base = ART + spec.slice('@/components/art/'.length)
    else if (spec.startsWith('./')) base = dir + spec.slice(2)
    else if (spec.startsWith('../art/')) base = ART + spec.slice(7)
    if (!base) continue
    for (const ext of ['.tsx', '.ts', '']) if (RAW[base + ext]) out.push(base + ext)
  }
  return out
}

/** The component's file first, then every kit file it needs (deduped, in discovery order). */
export async function loadSources(slug: string): Promise<SourceFile[]> {
  const first = mainKey(slug)
  if (!first) return []
  const files: SourceFile[] = []
  const queue = [first]
  const seen = new Set<string>()
  while (queue.length) {
    const key = queue.shift()!
    if (seen.has(key)) continue
    seen.add(key)
    const code = await RAW[key]()
    files.push({ path: appPath(repo(key)), repo: repo(key), code })
    queue.push(...localImports(key, code))
  }
  return files
}

/** The core files of a React app, { path, repo }: React's lib/fx files win over the core's of the same name. */
export const coreFiles = (() => {
  const byPath = new Map<string, string>()
  for (const key of Object.keys(CORE).sort((a, b) => Number(a.includes('/react/')) - Number(b.includes('/react/')))) byPath.set(appPath(repo(key)), repo(key))
  return [...byPath].map(([path, repoPath]) => ({ path, repo: repoPath })).sort((a, b) => a.path.localeCompare(b.path))
})()

/** Raw GitHub URL of a repo file. */
export const rawUrl = (path: string) => `https://raw.githubusercontent.com/${site.repo}/main/${path}`

/** The docs site's own URL (works locally and on the deployed subpath). */
export const docsUrl = (path: string) =>
  typeof window === 'undefined' ? path : `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`

/** A prompt an AI coding agent can follow to add one component. */
export function agentPrompt(name: string, slug: string, files: Pick<SourceFile, 'path' | 'repo'>[], usage: string) {
  return `Add the "${name}" component from ${site.name} (https://github.com/${site.repo}) to this React + Tailwind CSS v4 + TypeScript project.

If you can run commands, the CLI does steps 1 and 2: \`npx ${site.package} init --yes\` (only once per project), then \`npx ${site.package} add ${slug} --yes\`. Otherwise:

1. Make sure the kit core is set up (skip what already exists):
   - install: class-variance-authority clsx tailwind-merge
   - a "@" path alias pointing at src (vite.config.ts and tsconfig)
   - copy these core files unchanged to these paths (src/index.css starts with @import 'tailwindcss': use it as the main stylesheet, or merge its @theme, style and @utility blocks into yours):
${coreFiles.map((f) => `     - ${f.path}  ←  ${rawUrl(f.repo)}`).join('\n')}
   Guide: ${docsUrl('/docs/installation')}

2. Copy these files unchanged to these paths:
${files.map((f) => `   - ${f.path}  ←  ${rawUrl(f.repo)}`).join('\n')}

3. Use it like this:
${usage}

Keep the files as they are: they rely on the ui-* utilities and theme tokens from index.css. Docs: ${docsUrl(`/components/${slug}`)}`
}

/** A prompt for adding the whole kit. */
export function agentPromptKit() {
  return `Set up ${site.name} (https://github.com/${site.repo}), a copy-paste React component kit, in this project.

- With the CLI (React 19 + Tailwind CSS v4 + TypeScript, Vite or Next.js): run \`npx ${site.package} init --yes\`, then \`npx ${site.package} add <name...> --yes\` for the components you need (\`npx ${site.package} list\` shows them all). Follow any setup lines init prints (Tailwind, the "@" alias, initTheme).
- By hand: install class-variance-authority clsx tailwind-merge, add a "@" alias to src, then copy the core files unchanged to these paths (src/index.css starts with @import 'tailwindcss'; or merge its @theme, style and @utility blocks into your stylesheet):
${coreFiles.map((f) => `  - ${f.path}  ←  ${rawUrl(f.repo)}`).join('\n')}
  Then copy the components you need to src/components/ui/ (with any kit files they import). In the repo the React components live in packages/react/src/components/ui/; their paths in your app drop the "packages/react/" part.

Every component and its raw file URL is listed in ${docsUrl('/llms.txt')}. Installation guide: ${docsUrl('/docs/installation')}`
}
