---
description: Prove the app still works before merging a big feature — gate, production build, e2e against the BUILT server, screenshots.
---

The gate proves the code compiles and the units pass. This proves the app works.

Why it runs against the build: `playwright.config.ts` starts `npm run dev`, so
normal e2e runs exercise the Vite dev server — which is not what Vercel serves.
SSR/prerender, the vendor chunking in `vite.config.ts` and the asset rules in
`nitro-modules/vercelAssetCache.ts` exist **only in the built output**, so a
green dev-server run can still ship a broken app.

From `my-tanstack-app/`:

1. `npm run gate` — typecheck both projects, tests, coverage floors.
2. `npm run build` — catches SSR/prerender breakage the dev server hides.
3. `npm run test:e2e:build` — Playwright against `node .output/server/index.mjs`
   on port 3100 (not 3000, so a running dev server cannot be tested by mistake).
   Needs `.env.e2e` for the authenticated projects; the `public` project needs no
   credentials, so fall back to `--project=public` if auth is unavailable and say
   so explicitly rather than reporting a full pass.
4. Screenshot the screens this change touched, in light **and** dark, desktop
   **and** mobile. Dark mode is this codebase's recurring regression — the
   archived `ss_*_dark_fixed*.png` files are a record of it being caught by hand.
5. Report a pass/fail table plus the screenshots. State anything you could not
   check.

To verify a deployed preview instead of a local build, set `E2E_BASE_URL` and no
local server is started.

Skip this for a one-line change — `/gate` is enough there. This costs minutes.
