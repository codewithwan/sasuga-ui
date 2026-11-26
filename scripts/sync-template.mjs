// Copies the kit (components, art, effects engine, theme helpers, tokens) into /template,
// so the starter people download always matches the docs site.
// Run: npm run template:sync
import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const from = (p) => join(root, 'src', p)
const to = (p) => join(root, 'template', 'src', p)

const DIRS = ['components/ui', 'components/art', 'fx']
const FILES = ['lib/utils.ts', 'lib/theme.ts', 'index.css']

for (const d of DIRS) {
  rmSync(to(d), { recursive: true, force: true })
  cpSync(from(d), to(d), { recursive: true })
}
for (const f of FILES) {
  mkdirSync(dirname(to(f)), { recursive: true })
  cpSync(from(f), to(f))
}
console.log(`template synced: ${[...DIRS, ...FILES].join(', ')}`)
