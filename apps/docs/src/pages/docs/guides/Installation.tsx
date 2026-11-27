import { FONTS_LINK, site, withBase } from '@/data/site'
import { agentPromptKit, coreFiles } from '@/docs/sources'
import { CodeBlock, CopyButton } from '../CodeBlock'
import { InstallSnippet } from '../InstallSnippet'
import { RUN, usePackageManager } from '../package-manager'
import type { Manager } from '../package-manager'
import { C, Guide, P, Section, Step } from './Guide'

const DEPS = 'class-variance-authority clsx tailwind-merge'

const VITE = `// vite.config.ts
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
})`

const TSCONFIG = `// tsconfig.app.json → compilerOptions
"paths": { "@/*": ["./src/*"] }`

/** Each core file: where it goes in your app ← where it is in the repo. */
const FILES = (() => {
  const w = Math.max(...coreFiles.map((f) => f.path.length)) + 2
  return coreFiles.map((f) => `${f.path.padEnd(w)}# ${f.repo}`).join('\n')
})()

const HTML = `<html lang="en" data-style="cel" data-theme="lilac">`

const MAIN = `// main.tsx
import './index.css'
import { initTheme } from './lib/theme'

initTheme() // restores the saved style + colour before the first paint`

const COMPONENT = `src/components/ui/button.tsx
src/components/ui/toaster.tsx   # + use-toast.ts, for useToast()`

const USAGE = `import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'

export default function App() {
  return (
    <Toaster>
      <Button variant="accent" sfx="ドン!">Attack</Button>
    </Toaster>
  )
}`

/** A fresh Vite + React + TypeScript app, in whichever package manager is picked. */
const CREATE: Record<Manager, string> = {
  npm: 'npm create vite@latest my-app -- --template react-ts',
  pnpm: 'pnpm create vite my-app --template react-ts',
  yarn: 'yarn create vite my-app --template react-ts',
  bun: 'bun create vite my-app --template react-ts',
}
function NewApp() {
  const pm = usePackageManager()
  return <CodeBlock code={`${CREATE[pm]}\ncd my-app`} />
}

/** What init leaves in the project. */
const CLI_FILES = (() => {
  const rows = [
    [`${site.package}.json`, 'where files go + the import alias'],
    [`src/styles/${site.package}.css`, 'tokens, styles, colours, ui-* utilities'],
    ['src/lib/', 'cn(), the style / colour helpers and useTheme'],
    ['src/fx/', 'springs (useSprings) + canvas effects engine'],
    ['src/components/ui/button.tsx', 'each component you add (+ the kit files it imports)'],
  ]
  const w = Math.max(...rows.map(([p]) => p.length)) + 2
  return rows.map(([p, note]) => `${p.padEnd(w)}# ${note}`).join('\n')
})()

function CliCommands() {
  const pm = usePackageManager()
  const run = `${RUN[pm]} ${site.package}`
  return <CodeBlock code={`${run} add health-bar gacha-card   # several at once\n${run} add --all                    # everything\n${run} list                         # every component, by category`} />
}

export function Installation() {
  return (
    <Guide
      to="/docs/installation"
      lead={
        <p className="m-0">
          The CLI sets up any React 19 + Tailwind CSS v4 + TypeScript project (Vite or Next.js) and copies in the components you pick. Prefer
          doing it by hand? Every step is below too. Either way the code is yours.
        </p>
      }
    >
      <Section id="cli" title="Use the CLI">
        <P>
          <C>init</C> installs the three dependencies, writes <C>{`${site.package}.json`}</C>, copies the core files, imports the
          stylesheet right after <C>@import 'tailwindcss'</C> and adds the fonts. If Tailwind or the <C>@</C> alias is missing it tells you
          the exact lines to add.
        </P>
        <InstallSnippet mode="cli" />
        <P>Then add components. Each one brings the kit files it imports, and its npm packages are installed in one go.</P>
        <InstallSnippet mode="cli" command="add button" />
        <CliCommands />
        <CodeBlock code={CLI_FILES} title="what you get" lang="text" lineNumbers={false} />
        <P>
          Existing files are kept unless you pass <C>--overwrite</C>. Move the folders or change the alias in{' '}
          <C>{`${site.package}.json`}</C> and <C>add</C> rewrites the imports to match. <C>--yes</C> skips the prompts.
        </P>
        <P>Starting from nothing? Create a Vite app first, then run init in it:</P>
        <NewApp />
      </Section>

      <Section id="agent" title="With an AI agent">
        <P>
          Using Cursor, Copilot or another coding agent? Give it this prompt. For a single component, every component page has a{' '}
          <C>Copy prompt for your agent</C> button with the exact files. Agents can also read{' '}
          <a href={withBase('/llms.txt')} className="font-bold text-accent">
            llms.txt
          </a>
          , a plain-text map of the whole kit.
        </P>
        <div>
          <CopyButton text={agentPromptKit()} label="Copy prompt" />
        </div>
        <CodeBlock code={agentPromptKit()} title="prompt.txt" lang="text" lineNumbers={false} />
      </Section>

      <Section id="manual" title="By hand: copy the files">
        <P>What the CLI does, step by step: add three small dependencies, copy the core files once, then copy any component you want.</P>
      </Section>

      <ol className="m-0 grid list-none gap-10 p-0">
        <Step n={1} title="Install the dependencies">
          <P>Class variants, conditional classes and Tailwind class merging. That is the whole runtime.</P>
          <InstallSnippet packages={DEPS} />
        </Step>

        <Step n={2} title="Set up Tailwind v4 and the @ alias">
          <P>
            Components import from <C>@/lib/utils</C> and <C>@/fx</C>. Point <C>@</C> at <C>src</C> in Vite and in TypeScript.
          </P>
          <InstallSnippet packages="tailwindcss @tailwindcss/vite" dev />
          <CodeBlock code={VITE} />
          <CodeBlock code={TSCONFIG} />
        </Step>

        <Step n={3} title="Copy the core">
          <P>
            These files are shared by every component. <C>index.css</C> starts with <C>@import 'tailwindcss'</C>, so it replaces your main
            stylesheet (or merge its <C>@theme</C>, style blocks and <C>@utility</C> rules into yours). In the repo the framework-agnostic
            core lives in <C>packages/core</C> and the React hooks in <C>packages/react</C>; in your app they all go into <C>src/</C>.
          </P>
          <CodeBlock code={FILES} />
        </Step>

        <Step n={4} title="Load the fonts">
          <P>Each style has its own heading face. Add this to the <C>&lt;head&gt;</C> of your index.html, or self-host the same families.</P>
          <CodeBlock code={FONTS_LINK} />
        </Step>

        <Step n={5} title="Pick a style and a colour">
          <P>
            Put the two attributes on <C>&lt;html&gt;</C>. If you copied <C>theme.ts</C>, call <C>initTheme()</C> once so a saved choice
            comes back on the next visit.
          </P>
          <CodeBlock code={HTML} />
          <CodeBlock code={MAIN} />
        </Step>

        <Step n={6} title="Add components">
          <P>
            Copy <C>components/ui/&lt;name&gt;.tsx</C> from the component's page. Each one only imports the core, so take one or all of them.
            Wrap the app in <C>&lt;Toaster&gt;</C> if you use toasts.
          </P>
          <CodeBlock code={COMPONENT} />
          <CodeBlock code={USAGE} />
        </Step>
      </ol>

      <Section id="checklist" title="Checklist">
        <ul className="m-0 grid max-w-[68ch] gap-2 pl-5 leading-relaxed">
          <li>
            <C>cn</C> resolves from <C>@/lib/utils</C> and the effects from <C>@/fx</C>.
          </li>
          <li>
            <C>&lt;html&gt;</C> has <C>data-style</C> and <C>data-theme</C>.
          </li>
          <li>
            The body uses <C>var(--font-sans)</C>, set per style — the base layer in <C>index.css</C> already does this.
          </li>
          <li>Clicking a Button draws an impact. If not, check that reduced motion is off in your OS settings.</li>
        </ul>
      </Section>
    </Guide>
  )
}
