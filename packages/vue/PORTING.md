# Porting sasuga/ui to Vue 3

A guide for porting the React components to Vue. The React package is the reference: same
look, same motion, same props and the same accessibility. Only the framework glue changes.

- **Reference:** `packages/react/src/components/ui/<slug>.tsx` and its docs page
  (`/components/<slug>` on the docs site, source in `apps/docs/src/docs/entries/<slug>.tsx`).
- **Shared, do not copy:** `packages/core` (tokens + styles, FX engine, springs, theme store, `cn()`).
- **Design rules:** [`docs/DESIGN.md`](../../docs/DESIGN.md) applies unchanged.
- **Progress:** [`roadmap.json`](../../roadmap.json) at the repo root (see [Marking progress](#marking-progress)).

## 1. Folder conventions

```
packages/vue/
  package.json
  tsconfig.json              (you add it: step 2)
  src/
    components/<Name>.vue    one single-file component per React file, PascalCase:
                             button.tsx → Button.vue, health-bar.tsx → HealthBar.vue,
                             toaster.tsx → Toaster.vue
    composables/use-*.ts     the adapters (use-springs.ts, use-theme.ts) and the React hooks
                             that have a Vue equivalent (use-toast.ts, use-combo.ts, …)
    lib/, fx/                optional: files that replace or join the core's files of the same
                             name in a Vue app (React uses this for fx/index.ts and lib/theme.ts)
```

- The **file name is the registry name**: `HealthBar.vue` → `health-bar`, which must match the
  React slug so the docs metadata (title, category, description) and the roadmap line up.
  Docs slug `toast` ships `Toaster.vue` + `composables/use-toast.ts` (see `ALIAS` / `EXTRA` in
  `scripts/build-registry.mjs`).
- One component per file. Helpers used by one component stay in it; helpers shared by several go
  in `src/composables/` (logic) or are imported from the core.
- Kit files may only import other kit files, core files and npm packages. The registry build
  fails on anything else (for example a docs-only file).

## 2. Set the package up (first pull request)

Nothing is installed for Vue yet, so the root install, build and lint stay React-only. The first
pull request adds:

1. Dependencies, from the repo root (one lockfile, one root `node_modules`):

   ```bash
   npm i -D -w @sasuga/vue vue@^3.5 vue-tsc @vitejs/plugin-vue
   ```

   Keep `vue` in `peerDependencies`. You can drop `peerDependenciesMeta` (it only stops npm from
   installing Vue before the port exists).

2. `packages/vue/tsconfig.json`: copy `packages/react/tsconfig.json`, remove `"jsx"`, and point
   the paths at Vue first, then the core:

   ```jsonc
   "paths": {
     "@/fx": ["../core/src/fx/index.ts"],
     "@/fx/*": ["./src/fx/*", "../core/src/fx/*"],
     "@/lib/*": ["./src/lib/*", "../core/src/lib/*"],
     "@/components/*": ["./src/components/*"],
     "@/composables/*": ["./src/composables/*"]
   }
   ```

   (If you add `src/fx/index.ts`, point `"@/fx"` at it instead.)

3. A `typecheck` script in `packages/vue/package.json`, e.g. `"typecheck": "vue-tsc --noEmit -p tsconfig.json"`.
   The root `npm run typecheck` runs every workspace that has one.

4. A playground to see your work: a small Vite app in `apps/vue-playground/` (it becomes a
   workspace automatically). Use `@vitejs/plugin-vue` + `@tailwindcss/vite`, an `@` alias that
   tries `packages/vue/src` then `packages/core/src` (copy `kitAliases()` from
   `apps/docs/vite.config.ts`), and a stylesheet like `apps/docs/src/index.css`:

   ```css
   @import '../../../packages/core/src/styles/index.css';
   @source '../../../packages/vue/src';
   ```

   Call `initTheme()` from `@/lib/theme` before mounting, and load the fonts from
   `apps/docs/index.html`.

## 3. What the core gives you

Import these with the same `@/` paths the React files use. In a user's app all of it sits in
one `src/` folder; in this repo `@/x` resolves to `packages/vue/src/x` first, then
`packages/core/src/x` (the same rule as `resolveLocal()` in `scripts/build-registry.mjs`).

| Import | What |
| --- | --- |
| `packages/core/src/styles/index.css` | Tokens, the three styles, four colours, every `ui-*` utility. Same classes as React, so the same look. |
| `@/lib/utils` | `cn()` (clsx + tailwind-merge). |
| `@/lib/theme` | `STYLES`, `THEMES`, `MODES`, `applyStyle/Theme/Mode`, `initTheme`, `setSwitchCover`, `subscribeTheme`, `getThemeState`. No framework code. |
| `@/fx` | The canvas engine (`spawn`, `delayed`, `timed`, `centerOf`, `prefersReducedMotion`…), the effects (`burst`, `rays`, `shards`, `smoke`, `sparkle`, `sfx`, `speedLines`, `slash`, `pop`), `impactOn/impactAt`, `C` (palette), `uiStyle()`, `KICK` and `createSpring()`. |
| `class-variance-authority` | Framework-agnostic: copy each `cva(...)` variant table as it is. |

## 4. React → Vue

| React | Vue 3.5 |
| --- | --- |
| `useSprings(ref, initial, render, config)` | `useSprings(elRef, initial, render, config)`, a composable over `createSpring()` (below) |
| `useTheme()` | `useTheme()` composable over `subscribeTheme()` + `getThemeState()` (below) |
| `useRef<HTMLElement>(null)` for an element | template ref: `const el = useTemplateRef<HTMLElement>('el')` or `ref<HTMLElement \| null>(null)` |
| `useRef` for a value that does not render | a plain `let` in `<script setup>` (or `shallowRef` if the template reads it) |
| `useState` / derived values | `ref()` / `computed()` |
| `useEffect` / `useLayoutEffect` | `watch` / `watchEffect` (`flush: 'post'` when it reads the DOM), `onMounted`, `onBeforeUnmount` |
| props + defaults | `defineProps<Props>()` with destructured defaults; keep the React prop names |
| controlled props: `checked` + `onChange` + `defaultChecked`, `value` + `onChange` + `defaultValue`, `open` + `onOpenChange` | `v-model` via `defineModel()`: `checked` → `defineModel<boolean>('checked')` (`v-model:checked`), `value` → `defineModel('modelValue')`. Uncontrolled use falls back to the `default*` prop. Keep the change callback as an `emit` too. |
| other callbacks (`onSelect`, `onCast`, …) | `defineEmits<{ select: [id: string] }>()` |
| `children`, render props | the default slot, named slots, scoped slots |
| `className` | `class` (fallthrough). When it belongs on an inner element: `defineOptions({ inheritAttrs: false })` + `cn(base, attrs.class)` |
| `createContext` / `useContext` (Toaster, Tabs…) | `provide` / `inject` with a typed `InjectionKey` |
| `createPortal(node, document.body)` (achievement, damage numbers, dropdown, hover card, item slot) | `<Teleport to="body">` |
| `cloneElement` / `asChild` (tooltip, hover card) | a slot whose root gets the props (`v-bind` on the slotted element, or a scoped slot) |
| `useId()` | `useId()` (Vue 3.5) |
| `'use client'` | nothing |

### useSprings

```ts
// packages/vue/src/composables/use-springs.ts
import { onBeforeUnmount, onMounted } from 'vue'
import type { Ref } from 'vue'
import { createSpring } from '@/fx/spring'
import type { SpringConfig, SpringRender, SpringValues } from '@/fx/spring'

export function useSprings<K extends string, T extends HTMLElement = HTMLElement>(
  el: Readonly<Ref<T | null>>,
  initial: SpringValues<K>,
  render: SpringRender<K, T>,
  config: SpringConfig = {},
) {
  const spring = createSpring<K, T>(initial, { el: () => el.value, render, config: () => config })
  onMounted(spring.draw)
  onBeforeUnmount(spring.stop)
  return spring // { set, kick, snap, draw, stop, bind }
}
```

The React hook is in `packages/react/src/fx/use-springs.ts`; the render functions in the React
components (they write `transform` / `scale` straight to the element) carry over unchanged.

### useTheme

```ts
// packages/vue/src/composables/use-theme.ts
import { onScopeDispose, shallowRef } from 'vue'
import { applyMode, applyStyle, applyTheme, getThemeState, subscribeTheme } from '@/lib/theme'

export function useTheme() {
  const state = shallowRef(getThemeState())
  onScopeDispose(subscribeTheme(() => (state.value = getThemeState())))
  return { state, setTheme: applyTheme, setStyle: applyStyle, setMode: applyMode }
}
```

## 5. Accessibility parity

The React file is the spec. For every component:

- the same elements (native `<button>`, `<input>`, `<dialog>`…), roles and `aria-*` attributes,
  the same ids wiring (`useId()` for `aria-labelledby` / `aria-controls`);
- the same keyboard map (arrows, Home/End, Escape, Enter/Space, type-ahead, roving `tabindex`),
  focus return when an overlay closes, focus trap where React has one;
- `focus-visible:ui-focus` for focus rings;
- `prefersReducedMotion()` from `@/fx` gating every effect and spring kick that React gates;
- live regions (`aria-live`) where React announces changes (toasts, counters, achievements).

Check by tabbing through the React docs page and your playground side by side, and compare the
accessibility trees in the browser dev tools.

## 6. Adding an item to the registry

1. Add the file under `src/components/` (or `src/composables/`) with the right name (section 1).
2. `npm run registry:build`, then look at `apps/docs/dist/r/frameworks.json`: the slug shows up in
   the `vue` entry's `components`. That is what the roadmap page counts.
3. Dependencies are read from the imports: npm packages become `dependencies` (`vue` is a peer and
   is left out), `@/components/…` and `@/composables/…` imports become `registryDependencies`.
   `core` is added to every item.
4. While Vue's status is `planned` or `in-progress` nothing is published for Vue. From `preview`
   on, the build also writes `r/vue/index.json` and `r/vue/<name>.json` (React stays at `r/`), and
   the CLI serves projects whose `sasuga.json` says `"framework": "vue"` (or that depend on `vue`).

Before switching to `preview`, the CLI needs one change in `cli/src/index.mjs`: it only knows the
React folders today (`KIND_PATH`: ui, art, lib, fx). Add the Vue ones (a `composables` path in
`defaultConfig()`, the `composable` file type in `targetOf()`, `@/composables` in `transform()`),
then `npm run cli:build` and test against the dev registry (`--registry http://localhost:5173/r/`).

The registry layout for Vue is the `vue` entry of `LAYOUT` in `scripts/build-registry.mjs`; edit
it there if the folders change.

## 7. Marking progress

Everything is in `roadmap.json` at the repo root, `frameworks` → `vue`:

| When | Do |
| --- | --- |
| You start the port | `"status": "in-progress"` |
| You start a component | add its slug to `"inProgress"` (so nobody else picks it) |
| A component is done | nothing to mark: its file counts it as ported. Remove the slug from `"inProgress"`. |
| People can try it with the CLI | `"status": "preview"` (publishes `r/vue/`) |
| Every component is ported and documented | `"status": "available"` |

The docs page `/docs/roadmap` (and `/roadmap`) shows the status and the per-component table from
`r/frameworks.json`. Also update the status line in `packages/vue/README.md`.

## 8. Checklist for each component

- [ ] Same props, events (as emits / `v-model`) and slots as the React props table.
- [ ] Looks right in `cel`, `manga` and `flat`, every colour, light and dark; only `ui-*` utilities
      and theme colours, no hard-coded shapes (DESIGN.md).
- [ ] Same effects (`spawn`, `impactOn`, springs) at the same moments, quieter in `flat`.
- [ ] Reduced motion respected.
- [ ] Keyboard and ARIA parity (section 5).
- [ ] `npm run lint`, `npm run typecheck` and `npm run build` pass from the root.
- [ ] Slug removed from `inProgress` in `roadmap.json`.
