# Assets

Raster art for sasuga/ui is generated with ChatGPT image generation (GPT-image) as sheets on a transparent background, then sliced into single files. Everything that must stay crisp or themeable is **not** generated: UI icons come from `<Icon>` (`packages/react/src/components/ui/icon.tsx`), sound-effect stickers, bubbles and the brand mark are hand-built SVG (`packages/react/src/components/art/stickers.tsx`), the in-app mascot is the SVG `Mascot` / `Chibi` (`packages/react/src/components/art/mascot.tsx`), and favicons come from `npm run icons`.

**Budget: 3 images.** They are spent only where hand-built SVG can't reach — a polished character reference, one key visual, and logo directions:

1. Koma character sheet: the canonical look of the mascot (turnaround + expressions). Run it first and attach it to prompt 2.
2. Key visual: one hero scene for the README top and the social preview.
3. Logo concepts: four directions for the mark. The chosen one is **traced into SVG** (`BrandMark`) so it is crisp at 16 px and follows the theme — the raster itself is never shipped.

Each prompt is self-contained, so it can be re-run on its own.

## Inventory

| # | Sheet | Grid | Files (in `apps/docs/public/assets/`) | Used in |
|---|---|---|---|---|
| 1 | Koma character sheet | 2×4 landscape | `mascot/koma-{front,three-quarter,side,back,neutral,happy,surprised,wink}.webp` | every guide header (`GUIDES[].art` in `data/site.ts`: happy, neutral, wink, surprised, side, back), components index (three-quarter), landing band (happy), footer (front), Roadmap request card (wink), 404 (surprised), Mascot page (all 8), Image Loader page, README "Meet Koma" |
| 2 | Key visual | single 3:2 | `hero/koma-impact.webp` | landing hero (beside the headline, under it on phones), README top image, `og-image.png` (rendered from `scripts/og-image.html`) |
| 3 | Logo concepts | 2×2 | no raster shipped (sheet kept in `assets/raw/`) | **concept 1 (burst + star + pop shards) is the logo**, traced into vector polygons: `BrandMark mark="star"` (nav, footer, intro, Stickers page), `favicon.svg`, `scripts/icon-app.svg` (favicons and app icons via `npm run icons`) and the social card. As SVG it stays crisp and follows the theme colour and the style's line colour |

## Generation workflow

1. Use one ChatGPT conversation for all three prompts so the style stays consistent.
2. Attach a screenshot of the current SVG Koma (`https://codewithwan.github.io/sasuga-ui/components/mascot`) to prompt 1 and add: "Match the attached character's design: hair, outfit, colours and face." Run prompt 1 first.
3. When Koma looks right, attach that image to prompt 2 and add: "Use the attached character exactly: same face, hair, eyes, outfit and colours."
4. Check each sheet against the QA list. If one cell fails, reply: "Keep everything exactly the same, only redraw cell N so that ...". Regenerate the whole sheet only if the style drifted.
5. Download the PNG and save it unedited in `assets/raw/` (git-ignored).
6. Slice once into `apps/docs/public/assets/<group>/<name>.webp`. Busts often overlap their cell borders, so slice by connected components (each opaque blob goes to the cell nearest its centre), crop to its bounds, pad to a square and export 768×768 WebP (quality 88). Keep the key visual whole: trim transparent margins and export 1600 px wide.
7. Run `python3 scripts/art-placeholders.py`: it writes each image's size and a ~1 KB placeholder (a 32 px silhouette for cut-out art) to `apps/docs/src/data/art.ts`.
8. Wire them in with `<Art name="mascot/koma-happy" alt="…" />` (the docs wrapper around `ImageLoader`), with alt text like `Koma, the sasuga/ui mascot, …`, or `alt=""` where she is decoration.

## Export sizes

| Kind | Stored size | Displayed at |
|---|---|---|
| mascot poses and expressions | 768×768 | 120 to 320 px |
| key visual | 1600×1067 | full README / content width |
| logo concepts | 1024×1024 | reference only |

## QA checklist per sheet

- Background is truly transparent (checkerboard in a viewer, not white and not a painted checkerboard).
- Exact number of cells, in the requested order, none touching or overlapping.
- No text, letters, numbers, Japanese characters, logos or watermarks anywhere — including inside speech bubbles and on buttons.
- Only palette colours; flat cel fills with at most one flat shadow tone per area; no gradients, airbrush, glow, painterly texture or soft drop shadows.
- Same outline weight and scale across the sheet.
- Koma is an original character: she must not resemble any existing anime character, game or franchise, and has no fan-service posing.
- Koma matches prompt 1 (lilac hair with an ahoge, pink eyes, pink star hair clip, pink hair ties, cream hoodie with a deep-violet sailor collar and pink ribbon).
- Logo marks read clearly at 32 px and use at most three colours.

---

## The prompts

Copy each prompt as one message. The style, people and content-rule paragraphs are repeated on purpose so every prompt works alone.

### Prompt 1 — Koma character sheet (2×4 landscape)

```
Style: crisp anime cel-shaded sticker illustration for sasuga/ui, a React component kit that gives web games and apps "game feel": springy buttons, impact frames and sound-effect lettering. The mood is playful, punchy and clean: confident, not cutesy-overload, not generic AI anime, not glossy or painterly, no airbrushed shading. Clean dark ink outline in #1D1A4A with a uniform weight of about 2.5% of each cell's width, smooth and confident with rounded ends. Simple bold shapes, readable silhouettes. Flat color fills ONLY from this palette: ink #1D1A4A, lilac #7A6CFF, soft lilac #B8B3FF, pop pink #FF5C9A, deep violet #4C4290, cream #FFF8F2, canvas #F6F5FF, plus pure white #FFFFFF for small eye and hair highlights. Skin tones only #FFE5D6 with one flat shadow tone #F6C0AB. Cel shading means at most one flat, hard-edged shadow shape per area in a darker palette tone. No gradients, no textures, no soft drop shadows, no glow, no outer white sticker border, no text, no letters, no numbers, no Japanese characters, no logos, no watermark. Same scale and line weight for every cell.

People: one original character, Koma, the kit's mascot — an energetic young woman drawn in a clean anime style with large expressive eyes, natural proportions for the bust and full figure (not chibi in this sheet), modest clothing, no fan-service posing. She must not resemble any existing anime character, game or franchise. Recurring character, identical in every image:
- Koma: skin #FFE5D6; long straight lilac #7A6CFF hair to mid-back with blunt bangs, two side locks tied with small pop pink #FF5C9A hair ties, and one curved ahoge strand on top; large pop pink #FF5C9A eyes with two white highlights on the same side; a small pop pink five-point star hair clip on her right bangs; an oversized cream #FFF8F2 hoodie with a deep violet #4C4290 sailor collar and a pop pink #FF5C9A ribbon bow; lilac #7A6CFF pleated skirt, cream socks and deep violet sneakers.

Content rules: no school logos, no brand marks, no weapons. Keep every pose friendly and energetic. No background scenery.

Every cell is a free-form illustration with no background shape, resting on a small flat soft lilac #B8B3FF oval of ground.

Layout: one landscape 3:2 sheet with exactly 2 rows and 4 columns = 8 separate cells. Each cell is centered in its own equal-size cell and fills about 70% of it. Wide empty space between cells; nothing touches, overlaps or crosses into another cell. Order row by row, left to right:
Row 1 (full figure turnaround, neutral smile, arms relaxed): 1) front view; 2) three-quarter view facing left; 3) side view facing left; 4) back view showing the long hair, the hair ties and the hoodie's sailor collar.
Row 2 (head-and-shoulders, same angle, front): 5) neutral, small closed-mouth smile; 6) happy, eyes closed in arcs, open grin, both fists up; 7) surprised, eyes wide, mouth a small round O, ahoge sticking straight up; 8) wink, one eye closed, finger making a peace sign next to her cheek.

Output: a PNG with a real transparent background (alpha channel).
```

### Prompt 2 — Key visual (single 3:2)

```
Style: crisp anime cel-shaded sticker illustration for sasuga/ui, a React component kit that gives web games and apps "game feel": springy buttons, impact frames and sound-effect lettering. The mood is playful, punchy and clean: confident, not cutesy-overload, not generic AI anime, not glossy or painterly, no airbrushed shading. Clean dark ink outline in #1D1A4A with a uniform weight of about 0.8% of the image width, smooth and confident with rounded ends. Simple bold shapes, readable silhouettes. Flat color fills ONLY from this palette: ink #1D1A4A, lilac #7A6CFF, soft lilac #B8B3FF, pop pink #FF5C9A, deep violet #4C4290, cream #FFF8F2, canvas #F6F5FF, plus pure white #FFFFFF for small highlights. Skin tones only #FFE5D6 with one flat shadow tone #F6C0AB. Cel shading means at most one flat, hard-edged shadow shape per area in a darker palette tone. No gradients, no textures, no soft drop shadows, no glow, no outer white sticker border, no text, no letters, no numbers, no Japanese characters, no logos, no watermark.

People: use the attached character exactly: same face, hair, eyes, outfit and colours. Koma is an original character, drawn in a clean anime style with natural proportions, modest clothing, no fan-service posing; she must not resemble any existing anime character, game or franchise.
- Koma: skin #FFE5D6; long straight lilac #7A6CFF hair with blunt bangs, pop pink #FF5C9A hair ties and one ahoge; pop pink #FF5C9A eyes; pop pink star hair clip; cream #FFF8F2 hoodie with a deep violet #4C4290 sailor collar and a pop pink ribbon; lilac pleated skirt; deep violet sneakers.

Content rules: no text anywhere — the button and the floating interface pieces are plain shapes with no labels, icons made of letters or numbers. No weapons, no background scenery, no logos.

Scene: one single wide illustration in landscape 3:2. Koma, full figure, leaps in from the left and slams her right fist down onto a giant rounded-rectangle sticker button (lilac #7A6CFF face, ink outline, soft lilac #B8B3FF block shadow offset down-right) that squashes flat under the hit. A big jagged comic impact burst in pop pink #FF5C9A and white explodes from the contact point, with bold manga speed lines in ink radiating outward and a few round lilac debris dots and four-point white sparkles flying. Around her float a few flat interface pieces drawn as stickers, tilted and scattered: a pill toggle switch (lilac track, white knob), a slider with a round knob, a segmented health bar in pop pink, a five-point star, and a rounded card. The group is centered and fills about 80% of the width; nothing is cut off at the edges; generous empty transparent space around it.

Output: a PNG with a real transparent background (alpha channel).
```

### Prompt 3 — Logo concepts (2×2)

```
Style: bold flat logo marks for sasuga/ui, a React component kit that gives web games and apps "game feel": springy buttons, impact frames and sound-effect lettering ("sasuga" is a Japanese compliment, roughly "impressive, as expected of you"). The mood is punchy, friendly and confident: not corporate, not generic, not cute-mascot. Clean dark ink outline in #1D1A4A with a uniform weight of about 3% of each mark's width, smooth with rounded joins. Very simple geometric forms that still read clearly at 32 pixels. Each mark uses at most three colours from this palette: ink #1D1A4A, lilac #7A6CFF, soft lilac #B8B3FF, pop pink #FF5C9A, plus pure white #FFFFFF. Flat fills only. No gradients, no textures, no drop shadows, no glow, no 3D, no text, no letters, no monograms, no numbers, no Japanese characters, no watermark. Same scale and line weight for every mark.

Content rules: no people or faces in this sheet; abstract symbols only; nothing that resembles an existing brand's logo.

Every mark is a single free-form symbol with no background shape.

Layout: one square sheet with exactly 2 rows and 2 columns = 4 separate logo marks. Each mark is centered in its own equal-size cell and fills about 60% of it. Wide empty space between marks; nothing touches, overlaps or crosses into another cell. Order row by row, left to right:
Row 1: 1) a ten-point comic impact burst in lilac with a white five-point star in its centre and a small offset soft lilac block shadow behind it; 2) a rounded comic shout bubble with a short tail, in white, containing a lilac five-point star and two small pop pink sparkle accents.
Row 2: 3) a five-point star in lilac built from bold motion: three short ink speed lines streak out behind it to the lower left, with a pop pink spark at its tip; 4) a lilac five-point star with two fading afterimage stars trailing behind it (soft lilac, then white with ink outline), like a fast motion smear.

Output: a PNG with a real transparent background (alpha channel).
```
