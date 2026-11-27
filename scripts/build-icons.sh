#!/usr/bin/env bash
# Regenerates the favicons and app icons in apps/docs/public from the SVG sources.
# Needs rsvg-convert (librsvg) and ImageMagick (`magick`).
set -euo pipefail
cd "$(dirname "$0")/.."
P=apps/docs/public
tmp="$(mktemp -d)"
rsvg-convert -w 16 -h 16 $P/favicon.svg -o "$tmp/16.png"
rsvg-convert -w 32 -h 32 $P/favicon.svg -o $P/favicon-32.png
rsvg-convert -w 48 -h 48 $P/favicon.svg -o "$tmp/48.png"
magick "$tmp/16.png" $P/favicon-32.png "$tmp/48.png" $P/favicon.ico
rsvg-convert -w 180 -h 180 scripts/icon-app.svg -o $P/apple-touch-icon.png
rsvg-convert -w 192 -h 192 scripts/icon-app.svg -o $P/icon-192.png
rsvg-convert -w 512 -h 512 scripts/icon-app.svg -o $P/icon-512.png
rm -rf "$tmp"
echo "icons rebuilt (og-image: open scripts/og-image.html in a browser at 1200x630 and screenshot it)"
