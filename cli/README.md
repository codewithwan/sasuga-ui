# sasuga

The CLI for [sasuga/ui](https://codewithwan.github.io/sasuga-ui/) — Game-feel UI components for React.

It copies the components into your project (you own the code), with everything they need.
Needs a React 19 + TypeScript app with Tailwind CSS v4 (Vite or Next.js).

```bash
npx sasuga init              # deps, core files, styles, fonts
npx sasuga add button        # one or more components
npx sasuga add --all         # every component
npx sasuga list              # every component, by category
```

Options: `--yes` (no prompts), `--overwrite`, `--cwd <dir>`, `--registry <url>`, `--no-install`.

`init` writes `sasuga.json` with the folders the files go to (`src/components/ui`,
`src/components/art`, `src/lib`, `src/fx`, `src/styles/sasuga.css`) and the import alias
(`@`). Change them there; `add` rewrites the imports to match.

Docs: https://codewithwan.github.io/sasuga-ui/ · Source: https://github.com/codewithwan/sasuga-ui

MIT © codewithwan
