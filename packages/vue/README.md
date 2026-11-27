# @sasuga/vue

The Vue 3 port of sasuga/ui.

**Status: not started.** Nothing here is usable yet. The folders are ready, the shared core is
ready (`packages/core`: tokens and styles, the FX engine, springs, the theme store), and the
registry and CLI already know about this package. The CLI tells Vue projects that support is
coming and links the roadmap (https://codewithwan.github.io/sasuga-ui/roadmap).

Want to help? Read [PORTING.md](PORTING.md), pick a component, and mark it in
[`roadmap.json`](../../roadmap.json).

```
packages/vue/
  package.json          @sasuga/vue, private, peer vue ^3.5 (no deps installed yet)
  src/components/       one <Name>.vue per component (Button.vue, HealthBar.vue, …)
  src/composables/      useSprings, useTheme and the hooks ported to composables
```

There is no build step yet, on purpose: this package is skipped by `npm run typecheck` and
`npm run build` until it has a `typecheck` script. Adding one is the first step in PORTING.md.

MIT © codewithwan
