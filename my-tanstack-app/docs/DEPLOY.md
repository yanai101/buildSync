# Deploying BuildSync

Two systems, deployed separately today: the **Convex backend** and the
**Vercel frontend**. `vercel.json` holds only valid Vercel keys — Vercel
rejects unknown top-level properties, so none of this lives there.

Env vars: `env.schema.json` is the single source of truth.
Check all three systems with `node scripts/check-env.mjs --remote`.

## Today (manual, two steps, order matters)

```bash
npm run verify                 # gate + build + e2e against the built server
npx convex deploy              # backend FIRST: the schema must exist before the client ships
vercel deploy                  # or --prod
node scripts/smoke.mjs <url>   # prove it actually came up
```

The local `CONVEX_DEPLOYMENT` is the **dev** deployment
(`dev:precise-octopus-626`). `npx convex deploy` targets **production**
(`quaint-mastiff-517`), which is a different deployment. Always confirm which
one you are about to change.

Any change to `convex/schema.ts` or `convex/zodSchemas.ts` is a migration. A
breaking one goes through the `convex-migrate-rehearse` skill first, never
straight to prod.

## The target state: Convex deploys from the Vercel build

Change `buildCommand` in `vercel.json` to:

```
npx convex deploy --cmd-url-env-var-name VITE_CONVEX_URL --cmd 'npm run build'
```

**Do not make this change until the prerequisites below are done** — without a
deploy key, `npx convex deploy` inside the build has no credentials and every
deploy fails.

`--cmd-url-env-var-name` is explicit because Convex only guarantees
auto-inference for the frameworks it documents, and TanStack Start is not one of
them. The deploy then *injects* `VITE_CONVEX_URL`, so stop setting it by hand on
Vercel.

### Why it is worth doing

- Removes the "frontend shipped, backend didn't" failure mode: a build can no
  longer produce a client that queries functions its backend lacks.
- `VITE_CONVEX_URL` becomes injected rather than hand-maintained per
  environment. Hand-maintaining it — specifically, scoping it to Production
  only — is what makes preview deployments 500 during SSR.
- Each branch gets its own isolated Convex backend.

### Prerequisites

1. **Two deploy keys.** Convex dashboard → project `buildsync` → Settings →
   Deploy Keys. Generate a **Production** key and a **Preview** key.
2. **Both in Vercel, under the same name.** Vercel → Settings → Environment
   Variables → add `CONVEX_DEPLOY_KEY` **twice**: the production key with only
   *Production* ticked, the preview key with only *Preview* ticked. The preview
   key is what gives each branch its own backend.
3. **Convex project environment variable defaults.** Convex dashboard →
   Settings → project environment variables. Add every `convex:`-scoped var
   from `env.schema.json`. Preview backends are created **empty** and inherit
   nothing from production, so without defaults each preview comes up
   unconfigured.
4. **Verify**, then flip `buildCommand`, push a branch, and check the preview
   renders: `node scripts/smoke.mjs <preview-url>`.

### Seeding previews — not ready yet

Convex's `--preview-run <fn>` seeds a fresh preview backend. It cannot be
pointed at `seed:seedMyProject`: that function calls `getAuthUserId` and throws
without an authenticated caller, and a failing seed **fails the deploy after the
preview backend has already been provisioned**.

Seeding previews therefore needs a dedicated `internalMutation` that takes an
owner email or creates its own user, rather than reading the caller's identity.
Until that exists, leave `--preview-run` off: previews will render but come up
with an empty database.

### Once armed: a push to master is a production deploy

That is why `.githooks/pre-push` runs the full gate plus a build on master and
only the fast gate on feature branches. Enable it once per clone:

```bash
git config core.hooksPath .githooks
```

## Local development: Polar webhooks

Locally, Polar webhooks are forwarded to the dev server with the Polar CLI:

```bash
polar listen http://localhost:3000/api/webhook/polar
```

This is why `POLAR_SERVER` is **deliberately not set** on the Convex dev
deployment or locally: the code defaults to `'sandbox'` everywhere it is read
(`src/server/billing/products.ts`, `src/routes/api/webhook/polar.ts`,
`convex/users.ts`), which is the behaviour you want against the Polar sandbox.

`env.schema.json` records this with `requiredIn: ["convex:prod",
"vercel:production"]`, so `check-env.mjs` reports it as optional outside
production instead of flagging a false drift. If you ever see POLAR_SERVER
listed as MISSING in a production column, that one is real — a prod deployment
falling back to `'sandbox'` would point checkout and the customer portal at the
wrong Polar environment.

## Reaching a protected preview

Set `VERCEL_AUTOMATION_BYPASS_SECRET` and the `x-vercel-protection-bypass`
header is sent by both `scripts/smoke.mjs` and Playwright. One mechanism, no
separate `vercel curl` workaround.
