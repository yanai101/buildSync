# archive/

Material kept for reference only. Nothing here is built, imported, deployed or
tested, and nothing in `my-tanstack-app/` may import from it.

It lives here rather than being deleted so that `git grep`, `rg` and agent file
searches over the repo root return only live code — the root used to hold ~45
stale files, which made every search noisy.

## 2026-04-prototypes/

The static mockups that preceded the TanStack app (`BuildPro.html`,
`bp-components.jsx`, `bp-data.jsx`, `bp-screens.jsx`, `bp-setup.jsx`), two
saved-page HTML dumps used while checking the daily-logs screen, and
`screenshots/` — 41 PNGs from manual UI review passes, mostly dark-mode
before/after shots.

Those screenshots are the reason the design pass now owns dark-mode parity and
why `/verify` keeps Playwright screenshot baselines: the filenames
(`*_dark.png`, `*_dark_fixed.png`, `*_dark_fixed2.png`) are a record of the same
check being done by hand, screen by screen.
