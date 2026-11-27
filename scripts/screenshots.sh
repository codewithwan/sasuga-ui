#!/usr/bin/env bash
# Real-usage screenshots for the README, taken from a running site with headless Chrome.
#   npm run dev            # in another terminal (from the repo root)
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
# phones: through scripts/phone-frame.html (a 390x844 iframe), then cropped
FRAME="file://$PWD/scripts/phone-frame.html?src="
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 --window-size=600,900 \
  --virtual-time-budget=25000 --screenshot="$TMP/phone.png" "${FRAME}$BASE/%3Fintro%3D0%26mode%3Dlight%26static%3D1" >/dev/null 2>&1
magick "$TMP/phone.png" -crop 780x1688+0+0 +repage "$OUT/mobile.png"
echo "  .github/screenshots/mobile.png"
rm -rf "$TMP"
