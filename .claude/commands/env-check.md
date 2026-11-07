---
description: Check environment-variable parity across Convex, Vercel and local, against env.schema.json.
---

`my-tanstack-app/env.schema.json` is the single source of truth: 24 variables,
each declaring which of the three systems it belongs to.

Run from `my-tanstack-app/`:

- `node scripts/check-env.mjs` — validate the local env (patterns, enums,
  min-lengths, paired keys).
- `node scripts/check-env.mjs --remote` — the parity table across
  `convex:prod`, `convex:dev`, `vercel:{prod,preview,dev}` and `local`.
- `node scripts/check-env.mjs --write-example` — regenerate `.env.example`.
  Never hand-edit that file.

Read the table carefully and report, in words:

1. Any **MISSING** cell — a required var absent from a declared home.
2. Any `?` column — it means the check could not run, not that it passed. The
   Vercel columns need the Vercel CLI (`npm i -g vercel`); say so rather than
   implying Vercel is fine.
3. `opt` means optional-and-absent. Still judge the consequence: an optional var
   can have a real effect. `RESEND_API_KEY` unset makes `convex/support.ts`
   log a warning and send no email, so support tickets are silently unnotified.
4. The three **dual-home** vars (`POLAR_ACCESS_TOKEN`, `POLAR_SERVER`,
   `SUBSCRIPTION_SYNC_SECRET`) must match across Convex and Vercel.
   `SUBSCRIPTION_SYNC_SECRET` must be byte-identical or subscription sync fails
   silently and paying users keep free-tier entitlements. The script prints a
   sha256 prefix of the local value for manual comparison; it never fetches
   remote values.

**This command is read-only.** Never write to a Convex or Vercel environment to
"fix drift" — report it and let the user run the command. Print no values, only
names.
