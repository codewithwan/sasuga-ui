# My app — built with Sukasuki UI

A starter with every Sukasuki UI component already in place: game-feel controls with springs,
hand-drawn impact effects and sound-effect lettering, in three styles, four colours and light/dark.

```bash
npm install
npm run dev
```

## What's inside

```
src/App.tsx           a small demo — start editing here
src/components/ui     every component, one file each (your code now)
src/components/art    mascot and sticker art
src/fx                springs + the canvas effects engine
src/lib/theme.ts      useTheme(): style / colour / light-dark switches
src/index.css         design tokens and ui-* utilities
src/data/site.ts      your app name for the logo stickers
```

Switch the look with attributes on `<html>` (or `useTheme()`):
`data-style="cel | manga | flat"`, `data-theme="lilac | mint | peach | sky"`, `data-mode="light | dark"`.

Docs and live examples: https://codewithwan.github.io/sukasuki-ui/ · source: https://github.com/codewithwan/sukasuki-ui

MIT licensed · made by [codewithwan](https://github.com/codewithwan)
