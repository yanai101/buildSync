# Design — BuildSync

A locked design system for BuildSync's public-facing pages. Every page redesign reads this file before emitting code. Don't regenerate it per page; extend or amend it when the system needs to grow.

Source of truth: the live landing page (`public/index.html`). The tokens below are its tokens.

## Genre
Atmospheric: a dark paper, real photography from the build sequence, and one warm accent.

## Macrostructure family
- **Marketing** (`/`, `public/index.html`): Feature Stack. A scroll-scrubbed build with a sticky stage, sections below it, and a statement footer.
- **Auth** (`/login`, `/register`, `/join/$code`): Split Studio. One full-height photo panel from the build sequence plus one form panel.
  - Login: stage 5 (finished house).
  - Register: stage 0 (empty plot and plans).
  - Join: stage 2 (frame with the crew).
  - On phones, the photo becomes a strip above the form.
- **App** (everything behind login): out of scope. It keeps `src/styles/app.css` and its light/dark themes.

## Theme
- `--color-paper`       oklch(14.5% 0.004 286)  · #0a0a0c
- `--color-paper-2`     oklch(18.5% 0.006 286)  · #111115
- `--color-ink`         oklch(97% 0.003 286)
- `--color-ink-2`       oklch(84% 0.004 286)
- `--color-ink-3`       oklch(64% 0.006 286)
- `--color-rule`        oklch(100% 0 0 / 0.09)
- `--color-accent`      oklch(68% 0.155 50)     · #E07A38 (the only accent)
- `--color-accent-deep` oklch(55.5% 0.146 49)   · #B45309
- `--color-accent-ink`  oklch(14.5% 0.004 286)  (text on accent fills)
- `--color-success`     oklch(69.6% 0.149 162.5)
- `--color-warning`     oklch(76.9% 0.165 70)
- `--color-danger`      oklch(63.7% 0.208 25)
- `--color-info`        oklch(62.3% 0.188 260)
- `--color-focus`       oklch(85% 0.12 70)

## Typography
- Display: Heebo 800/900, roman, tracking -0.02em
- Body: Heebo 400/500
- Mono (numbers only): JetBrains Mono 500/700
- Hebrew RTL throughout: `lang="he" dir="rtl"`

## Spacing
A 4-point named scale (`--space-2xs` … `--space-3xl`). Pages use named tokens, not raw values.

## Motion
- Easings: `--ease-out` cubic-bezier(0.16, 1, 0.3, 1); no bounce or overshoot.
- Reveal pattern: none on auth pages; scroll-scrub only on the landing page.
- Reduced motion: no scrub; transitions collapse to ≤150ms opacity.

## Microinteractions stance
- Silent success: navigation is the confirmation, so no celebratory toasts.
- Errors appear inline, next to the action, with a text icon and no emoji.
- Loading shows a spinner plus a verb in the button ("מתחבר…"), and the button is disabled while it runs.

## CTA voice
- Primary: a pill, accent fill with dark ink text, min-height 48px, full width in forms.
- Secondary: a pill with a hairline outline and the ink text color (Google sign-in, "back").
- Text links: accent color, weight 700, no underline until hover.

## Per-page allowances
- Marketing MAY use the build photography, the blueprint grid and the progress meter.
- Auth uses exactly one build photo. No glassmorphism, no animated SVG scenes, no blurred orbs, no gradient bars.
- No emoji as icons anywhere; use the `Icon` set in `src/components/Shared.tsx`.

## What pages MUST share
- The wordmark: logo plus "Build**Sync**" with the accent on "Sync", linking to `/`.
- The accent color and its placement (≤ 5% of any viewport).
- Heebo display and body.
- The CTA voice (pill shape, padding rhythm).

## What pages MAY differ on
- Which build photo appears (one per auth page, as listed above).
- Macrostructure within the family.
