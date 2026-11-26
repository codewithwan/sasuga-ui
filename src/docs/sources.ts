// The real source of every kit file, loaded on demand (not part of the main bundle),
// so a docs page can show the exact file people copy — plus the kit files it imports.
import { site } from '@/data/site'

const RAW = import.meta.glob<string>(['/src/components/ui/*.{ts,tsx}', '/src/components/art/*.tsx'], {
  query: '?raw',
  import: 'default',
})

/** Docs slugs whose main file is named differently. */
const ALIAS: Record<string, string> = { toast: 'toaster' }

export type SourceFile = { path: string; code: string }

/** "src/components/ui/button.tsx" style path (no leading slash). */
const rel = (abs: string) => abs.replace(/^\//, '')

function mainPath(slug: string) {
  const name = ALIAS[slug] ?? slug
  for (const dir of ['/src/components/ui/', '/src/components/art/']) {
    for (const ext of ['.tsx', '.ts']) if (RAW[`${dir}${name}${ext}`]) return `${dir}${name}${ext}`
  }
  return null
}

/** Kit files a file imports (other components, hooks, art) — not the shared core (fx, lib, css). */
function localImports(abs: string, code: string) {
  const dir = abs.slice(0, abs.lastIndexOf('/') + 1)
  const out: string[] = []
  for (const m of code.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const spec = m[1]
    let base: string | null = null
    if (spec.startsWith('@/components/ui/') || spec.startsWith('@/components/art/')) base = `/src/${spec.slice(2)}`
    else if (spec.startsWith('./')) base = dir + spec.slice(2)
    else if (spec.startsWith('../art/')) base = `/src/components/art/${spec.slice(7)}`
    if (!base) continue
    for (const ext of ['.tsx', '.ts', '']) if (RAW[base + ext]) out.push(base + ext)
  }
  return out
}

/** The component's file first, then every kit file it needs (deduped, in discovery order). */
export async function loadSources(slug: string): Promise<SourceFile[]> {
  const first = mainPath(slug)
  if (!first) return []
  const files: SourceFile[] = []
  const queue = [first]
  const seen = new Set<string>()
  while (queue.length) {
    const abs = queue.shift()!
    if (seen.has(abs)) continue
    seen.add(abs)
    const code = await RAW[abs]()
    files.push({ path: rel(abs), code })
    queue.push(...localImports(abs, code))
  }
  return files
}

/** Raw GitHub URL of a repo file. */
export const rawUrl = (path: string) => `https://raw.githubusercontent.com/${site.repo}/main/${path}`

/** The docs site's own URL (works locally and on the deployed subpath). */
export const docsUrl = (path: string) =>
  typeof window === 'undefined' ? path : `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`

/** A prompt an AI coding agent can follow to add one component. */
export function agentPrompt(name: string, slug: string, files: string[], usage: string) {
  return `Add the "${name}" component from ${site.name} (https://github.com/${site.repo}) to this React + Tailwind CSS v4 + TypeScript project.

1. Make sure the kit core is set up (skip what already exists):
   - install: class-variance-authority clsx tailwind-merge
   - a "@" path alias pointing at src (vite.config.ts and tsconfig)
   - copy from the repo, unchanged: src/index.css (or merge its @theme, style and @utility blocks into the main stylesheet), src/lib/utils.ts, src/lib/theme.ts and the whole src/fx folder
   Guide: ${docsUrl('/docs/installation')}

2. Copy these files unchanged to the same paths:
${files.map((f) => `   - ${f}  ←  ${rawUrl(f)}`).join('\n')}

3. Use it like this:
${usage}

Keep the files as they are: they rely on the ui-* utilities and theme tokens from index.css. Docs: ${docsUrl(`/components/${slug}`)}`
}

/** A prompt for adding the whole kit. */
export function agentPromptKit() {
  return `Set up ${site.name} (https://github.com/${site.repo}), a copy-paste React component kit, in this project.

- New project: run \`npx degit ${site.repo}/template my-app\`, then install and start it.
- Existing React 19 + Tailwind CSS v4 + TypeScript project: install class-variance-authority clsx tailwind-merge, add a "@" alias to src, then copy from the repo unchanged: src/index.css (or merge its @theme, style and @utility blocks), src/lib/utils.ts, src/lib/theme.ts, src/fx/, and the components you need from src/components/ui/ (with any kit files they import).

Every component and its raw file URL is listed in ${docsUrl('/llms.txt')}. Installation guide: ${docsUrl('/docs/installation')}`
}
