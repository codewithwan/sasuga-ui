# Design rules (brand name lives in brand.config.ts)

These rules hold for every framework port (`packages/react`, `packages/vue`, …): the tokens,
utilities and effects all come from `packages/core`, so a port only changes the framework glue.

The kit is built around anime impact frames: calm sticker-like
controls at rest, a burst of drawn effects on interaction. It must **not** look like
any specific game's UI (no Persona 5 look-alike).

## Two axes on `<html>`

| Attribute | Values | Changes |
|---|---|---|
| `data-style` | `cel` (default), `manga`, `flat` | **Structure**: radius, line weight and colour, shadow kind, heading type, texture, FX loudness |
| `data-theme` | `lilac` (default), `mint`, `peach`, `sky` | **Colour**: `accent`, `accent-soft`, `pop` |
| `data-mode` | `light`, `dark` (default from `prefers-color-scheme`) | **Surface**: `ink` ⇄ `paper`/`canvas` flip, so ink stays the line + text colour |

Every switch (`applyTheme` / `applyStyle` / `applyMode` in `packages/core/src/lib/theme-core.ts`) runs inside a View Transition: cel reveals as a circle from the click point, manga drops the new page in stepped comic frames, flat cross-fades, light/dark always opens as a circle from the toggle.

| Style | Look | FX (`packages/core/src/fx/effects.ts`) |
|---|---|---|
| **Cel** | White sticker, 3px navy ink outline, 15–20px radius, solid offset shadow in `accent-soft`, Mochiy Pop One headings with a soft letter drop, M PLUS Rounded body | soft focus lines, spiky burst, smoke, round debris, Mochiy lettering, speed lines, slashes |
| **Manga** | Printed comic page: off-white paper, 3px black line, almost square corners, solid black drop, screentone (`ui-tone`), Anton uppercase headings | everything, plus focus lines, sharp debris, big lettering |
| **Flat** | Calm product UI with life: faint hairline, 14–22px radius, layered shadow tinted by the accent, glossy fills, Plus Jakarta Sans 800 | ring + dot pop + sparkle, no lettering |

Springs (`createSpring` in `packages/core/src/fx/spring.ts`, wrapped by React's `useSprings`) are scaled by `KICK[uiStyle()]`: cel 1, manga 1, flat 0.5.

## Tokens → utilities (always use these, never hard-code a shape)

| Need | Use |
|---|---|
| Card / panel / popover surface | `ui-card` (border + large radius + paper bg + shadow) |
| Border | `ui-border` (main line) · `ui-border-thin` (inner/secondary line) · one side: `ui-border-t/-b/-y` · inner divider `ui-divider` · bar/rule `ui-rule` |
| Radius | `ui-r` · `ui-r-sm` · `ui-r-lg` · `ui-pill` (pill in cel/flat, square-ish in manga) |
| Depth | `ui-shadow` · `ui-shadow-sm` · `ui-shadow-lg` · `ui-shadow-hover` · `ui-shadow-press` (all work with `hover:` / `group-hover:` / `active:`) |
| Headings, buttons, labels | `ui-head` (font family, style, weight, case, tracking from the style) |
| Screentone (manga only, no-op elsewhere) | `ui-tone` on a surface, or `ui-tex` to force the image |
| Filled control (accent/ink/pop background) | add the marker `ui-fill` so its border disappears in flat |
| Decoration that should vanish in flat | marker `fx-only` |
| Colours | `bg-paper` (surface), `bg-canvas` (page tint / sunken areas), `border-line` / `text-mute` (secondary), `bg-accent`, `bg-accent-soft` (tints, selected rows, tracks), `text-pop` / `bg-pop` (hit colour, sparingly), `text-ink` |
| Focus ring | `focus-visible:ui-focus` (also `peer-`/`group-focus-visible:`) |
| DOM SFX lettering | `ui-lettering` (+ a text size); in cel use `font-display` instead of jp if you want the pop face |
| Animations | `animate-pop`, `animate-shake`, `animate-blink`, `animate-panel-in`, `animate-rise`, `animate-bob`, `animate-marquee(-rev)`, `animate-drift` (+ `motion-lines` for moving stripes), `animate-wobble` |
| Fonts | `font-sans` (Inter body), `font-display` (via `ui-head`), `font-jp` (Dela Gothic One — small Japanese sub-labels only), `font-mono` |

The reference implementation is `packages/react/src/components/ui/button.tsx`.

## Icons and art

- No emoji or unicode glyphs as icons. Use `<Icon name="…" />` from `packages/react/src/components/ui/icon.tsx` (50 sticker icons, `duo` / `line` / `solid`, recolour with `--icon-fill` / `--icon-stroke`).
- The mascot is **Koma** (`packages/react/src/components/art/mascot.tsx`): `<Mascot expression>` bust and `<Chibi pose>` full body. Use her for demos instead of placeholder faces.
- Never hard-code black/white: only `text-white` on accent/pop fills survives dark mode.

## Banned (Persona-isms and removed utilities)

- `clip-*` polygons, `skew-*`, decorative `rotate-*` (functional rotation such as a
  chevron flipping is fine), star-shaped buttons.
- Ransom-note lettering (mixed fonts/colours per glyph), calling-card slabs, red/black/white
  palettes, tilted full-width marquee bands, "Take your time"-style copy.
- Hard-coded `shadow-[Npx_Npx_0_…]`, `border-2/3/4` for a component outline, and
  `uppercase tracking-*` on headings (use `ui-head`).
- Removed utilities: `speedlines`, `halftone`, `hatch-*`, `pinstripe`, `text-stroke-*`,
  `box-clone`, `font-heavy`, `font-serif`, colours `accent-deep`, `animate-stamp`,
  `animate-ransom-in`, `animate-stripes`, `animate-flicker`, `animate-jitter`, `animate-spin-slow`.

## Motion

Keep the energy in **motion**, not decoration: springs that squash and overshoot,
slide-ins on `translate` (no skew), drawn canvas effects via `impactOn` / `impactAt`
and the factories in `@/fx` (they already adapt to the style). DOM effects above the
top layer (dialogs) use the Web Animations API and should check `uiStyle()`.
