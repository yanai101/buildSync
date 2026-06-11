#!/bin/bash
# Convert the landing page images (public/) to WebP next to the originals.
# Requires cwebp (brew install webp). Re-run after replacing any source PNG.
set -euo pipefail
cd "$(dirname "$0")/../public"

IMAGES=(
  hero.png
  dashboard_mockup.png
  images/budget_dashboard.png
  images/bg_core_triad.png
  images/bg_communication.png
  images/bg_stages.png
  images/bg_bureaucracy.png
  images/bg_orders.png
  images/bg_hero_chaos.png
  images/bg_roi_section.png
  images/bg_split_value_prop.png
  images/house_cta_bg.png
)

for img in "${IMAGES[@]}"; do
  out="${img%.png}.webp"
  cwebp -q 80 -m 6 "$img" -o "$out" >/dev/null 2>&1
  printf '%s: %s -> %s\n' "$img" "$(du -h "$img" | cut -f1)" "$(du -h "$out" | cut -f1)"
done
