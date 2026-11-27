// Builds the CLI package in /cli from brand.config.ts:
//   cli/package.json   name, bin, description, links — all from the brand (version is kept)
//   cli/dist/index.mjs cli/src/index.mjs with the brand constants filled in
//   cli/README.md, cli/LICENSE
// Run: npm run cli:build   (then: cd cli && npm publish)
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cli = join(root, 'cli')
const { brand } = await import(pathToFileURL(join(root, 'brand.config.ts')).href)

const pkgPath = join(cli, 'package.json')
const previous = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, 'utf8')) : {}
const version = previous.version ?? '0.1.0'
const docs = brand.docs.endsWith('/') ? brand.docs : `${brand.docs}/`

const pkg = {
  name: brand.package,
  version,
  description: `CLI for ${brand.name}: ${brand.tagline}. Adds components to your React + Tailwind CSS v4 project.`,
  type: 'module',
  bin: { [brand.package.replace(/^@[^/]+\//, '')]: 'dist/index.mjs' },
  files: ['dist'],
  engines: { node: '>=18' },
  license: 'MIT',
  author: brand.author,
  homepage: docs,
  repository: { type: 'git', url: `git+https://github.com/${brand.repo}.git`, directory: 'cli' },
  bugs: { url: `https://github.com/${brand.repo}/issues` },
  keywords: ['react', 'ui', 'components', 'tailwindcss', 'cli', 'game-ui', 'animation'],
}
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)

const constants = { name: brand.name, package: brand.package, version, registry: `${docs}r/`, docs }
const src = readFileSync(join(cli, 'src/index.mjs'), 'utf8')
const marker = /\/\* @brand \*\/[\s\S]*?\/\* @end \*\//
if (!marker.test(src)) throw new Error('cli/src/index.mjs: the /* @brand */ … /* @end */ block is missing')
mkdirSync(join(cli, 'dist'), { recursive: true })
const dist = join(cli, 'dist/index.mjs')
writeFileSync(dist, src.replace(marker, JSON.stringify(constants)))
chmodSync(dist, 0o755)

const run = `npx ${brand.package}`
writeFileSync(
  join(cli, 'README.md'),
  `# ${brand.package}

The CLI for [${brand.name}](${docs}) — ${brand.tagline}.

It copies the components into your project (you own the code), with everything they need.
Needs a React 19 + TypeScript app with Tailwind CSS v4 (Vite or Next.js).

\`\`\`bash
${run} init              # deps, core files, styles, fonts
${run} add button        # one or more components
${run} add --all         # every component
${run} list              # every component, by category
\`\`\`

Options: \`--yes\` (no prompts), \`--overwrite\`, \`--cwd <dir>\`, \`--registry <url>\`, \`--framework <id>\`, \`--no-install\`.

\`init\` writes \`${brand.package}.json\` with the folders the files go to (\`src/components/ui\`,
\`src/components/art\`, \`src/lib\`, \`src/fx\`, \`src/styles/${brand.package}.css\`) and the import alias
(\`@\`), plus \`"framework": "react"\`. Change them there; \`add\` rewrites the imports to match.

React is the only framework today. In a Vue (or other) project the CLI says so and links the
roadmap (${docs}roadmap) instead of copying React files.

Docs: ${docs} · Source: https://github.com/${brand.repo}

MIT © ${brand.author}
`,
)
copyFileSync(join(root, 'LICENSE'), join(cli, 'LICENSE'))
console.log(`cli: ${brand.package}@${version} → cli/dist/index.mjs (registry ${constants.registry})`)
