import { FONTS_LINK } from '@/data/site'
import { CodeBlock } from '../CodeBlock'
import { InstallSnippet } from '../InstallSnippet'
import { C, Guide, P, Section, Step } from './Guide'

const DEPS = 'class-variance-authority clsx tailwind-merge'

const TAILWIND = `npm i -D tailwindcss @tailwindcss/vite

// vite.config.ts
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

const FILES = `src/lib/utils.ts     # cn(): clsx + tailwind-merge
src/fx/              # engine, effects, palette, springs, style — the whole folder
src/index.css        # tokens, the three styles, four colours, ui-* utilities
src/lib/theme.ts     # optional: STYLES / THEMES lists, applyStyle, useTheme`

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

export function Installation() {
  return (
    <Guide
      to="/docs/installation"
      lead={
        <p className="m-0">
          Two ways in. Start a new app from the starter template (everything already wired up), or copy the files into an existing React 19
          + Tailwind CSS v4 + TypeScript project. Either way the code is yours.
        </p>
      }
    >
      <Section id="template" title="New app: use the template">
        <P>
          One command copies the starter (Vite, React, Tailwind v4, every component, the effects engine and the three styles) into a new
          folder. Then install and run it.
        </P>
        <InstallSnippet mode="create" />
        <CodeBlock code={'cd my-app\nnpm install\nnpm run dev'} />
        <P>
          Prefer clicking? Open the repository on GitHub and press <C>Use this template</C>, or download the ZIP and keep the{' '}
          <C>template</C> folder.
        </P>
      </Section>

      <Section id="manual" title="Existing app: copy the files">
        <P>Add three small dependencies, copy the core files once, then copy any component you want.</P>
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
          <CodeBlock code={TAILWIND} />
          <CodeBlock code={TSCONFIG} />
        </Step>

        <Step n={3} title="Copy the core">
          <P>
            These files are shared by every component. <C>index.css</C> starts with <C>@import 'tailwindcss'</C>, so it replaces your main
            stylesheet (or merge its <C>@theme</C>, style blocks and <C>@utility</C> rules into yours).
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
