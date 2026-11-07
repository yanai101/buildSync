---
description: Deploy Convex and Vercel in the right order, with an env check first and a smoke check after. Usage: /deploy [preview|prod]
argument-hint: preview | prod
---

Target: `$ARGUMENTS` (default `preview`). **Never deploy to prod without an
explicit go-ahead in the conversation for this specific deploy.**

Run from `my-tanstack-app/`.

1. **Preflight** — working tree clean? expected branch? `npm run gate` green?
   For prod also require `npm run verify`.
2. **Env** — `node scripts/check-env.mjs --remote --ci`. Stop on drift and report
   it; do not "fix" it by writing to a remote environment.
3. **Announce and confirm** — name the exact Convex deployment and Vercel
   environment that will change, then wait for the user. The local
   `CONVEX_DEPLOYMENT` is the *dev* deployment; `npx convex deploy` targets
   **production**, which is a different deployment. State both names so there is
   no ambiguity. Invoke the installed `convex-deploy-guard` skill for the prod
   confirmation rather than reimplementing it.
4. **Convex before Vercel** — the schema must exist before the client that
   queries it ships. Note that once `vercel.json`'s `buildCommand` runs
   `npx convex deploy`, a Vercel build already does this in the right order, so
   a manual `convex deploy` is only for deploying the backend alone.
   Check `git diff` for `convex/schema.ts` or `convex/zodSchemas.ts`: any change
   there is a migration, and a breaking one goes through
   `convex-migrate-rehearse` first, never straight to prod.
5. **Vercel** — `vercel deploy` (add `--prod` only for prod). Capture the URL.
6. **Smoke** — `node scripts/smoke.mjs <url>`. For a protected preview, set
   `VERCEL_AUTOMATION_BYPASS_SECRET` so the bypass header is sent. Report SKIP
   as SKIP, never as a pass.
7. **Report** — URL, what changed, smoke results. On failure print
   `vercel rollback` as a suggestion and **do not run it**: a wrong automatic
   rollback during a schema transition is worse than a bad deploy.
