#!/usr/bin/env bash
# Real-usage screenshots for the README, taken from a running site with headless Chrome.
#   npm run dev            # in another terminal
#   bash scripts/screenshots.sh [base-url]
# The landing page is captured as one tall image and cropped per section (scrolled
# headless screenshots are unreliable). If the landing layout changes, adjust CROPS.
set -euo pipefail
cd "$(dirname "$0")/.."
BASE="${1:-http://localhost:5173}"
OUT="$PWD/.github/screenshots"
TMP="$(mktemp -d)"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
mkdir -p "$OUT"

shot() { # file path width height
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size="$3,$4" --virtual-time-budget=10000 --screenshot="$1" "$BASE$2" >/dev/null 2>&1
}
crop() { # source name y height   (1440 px wide)
  magick "$1" -crop "1440x$4+0+$3" +repage "$OUT/$2.png"
  echo "  .github/screenshots/$2.png"
}

echo "screenshots from $BASE"
shot "$TMP/cel.png"   "/?intro=0&mode=light"              1440 4500
shot "$TMP/manga.png" "/?intro=0&mode=dark&style=manga"   1440 4500
# CROPS: y offset and height of each landing section at 1440 px
crop "$TMP/cel.png"   home        0    700
crop "$TMP/cel.png"   game-hud    1040 790
crop "$TMP/cel.png"   shop-player 1840 960
crop "$TMP/cel.png"   chat-learn  2800 980
crop "$TMP/manga.png" manga-dark  1040 790

shot "$OUT/component-page.png" "/components/gacha-spin?intro=0&mode=light"        1440 1000
echo "  .github/screenshots/component-page.png"
shot "$OUT/components.png"     "/components?intro=0&mode=light&style=flat"        1440 1000
echo "  .github/screenshots/components.png"
shot "$OUT/mobile.png"         "/components/dialogue-box?intro=0&mode=light"      430  932
echo "  .github/screenshots/mobile.png"
rm -rf "$TMP"
