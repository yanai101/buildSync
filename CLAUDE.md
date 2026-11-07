# BuildPro / BuildSync — repo contract

The application lives in `my-tanstack-app/`. The repo root holds only agent and
tooling config. **Run every command from `my-tanstack-app/`** unless stated
otherwise. `archive/` is reference material — never import from it.

## Domain, roles, product rules

@my-tanstack-app/AGENTS.md
@my-tanstack-app/ROLES_AND_PERMISSIONS.md

## Standing rules

@.agents/rules/number-input.md
@.agents/rules/playwright-rule.md

## Commands

| intent | command |
|---|---|
| in-loop check | `npm run gate:fast` (typecheck both projects + tests, ~3s) |
| full gate | `npm run gate` (adds coverage floors) |
| unit tests only | `npm run test` (101 tests, ~0.8s) |
| typecheck **both** projects | `npm run typecheck:all` |
| e2e against the dev server | `npm run test:e2e` |
| e2e against the **production build** | `npm run build && npm run test:e2e:build` |
| prove a big feature works | `npm run verify` |

`convex/` is typechecked by its own sibling project, `tsconfig.convex.json` —
the root `tsconfig.json` excludes it. `npm run typecheck` alone does **not**
cover the backend; always use `typecheck:all`.

## Never edit

- `convex/_generated/**`, `src/routeTree.gen.ts` — generated.
- `.env`, `.env.local`, `.env.e2e` — secrets. Edit `.env.example` instead.
- `package-lock.json` by hand. **It is committed on purpose — do not gitignore
  it again.** It was ignored for most of this project's life, which silently
  broke every CI run and made Vercel installs non-reproducible.
- `my-tanstack-app/.claude/skills/**` — owned by `npx convex ai-files install`.
- `my-tanstack-app/.agent/`, `.agents/`, `.codex/` — untracked mirrors of
  `.claude/skills`. Do not re-add them.

Treat `nitro-modules/vercelAssetCache.ts` as load-bearing: it rewrites Vercel
route config so a missing `/assets/*` chunk gets `no-store` instead of a cached
immutable 404. Changing it breaks deploys in ways local dev will not show.

## Invariants that cause production incidents if broken

1. **Financial data** (budget, quotes, BoQ pricing) is Owner-only **at the
   Convex query/mutation level**, not merely hidden in the UI. Every new
   project-scoped function opens with a guard from `convex/_lib/projectAccess.ts`.
2. **No public function without an access check.** `convex/debugQuery.ts`,
   `fix.ts`, `testUser.ts` and `testUsers.ts` were deleted because they were
   deployed public functions that dumped the users table and mutated data with
   no authentication. `seed.ts:resetDomain` was changed to `internalMutation`
   for the same reason. Do not reintroduce this shape.
3. `convex/zodSchemas.ts` is the single source of truth for the ~49 tables;
   `schema.ts` derives from it. Never edit `schema.ts` shapes directly.
4. Tier gating goes through `convex/_lib/entitlements.ts`. No inline tier checks.
5. Hebrew/RTL, no i18n layer: user-facing strings are hardcoded Hebrew in the
   component. Money inputs MUST use the shared `NumberInput`. Use logical CSS
   properties (`ps-*`/`pe-*`/`ms-*`/`me-*`), never `pl-*`/`pr-*`, and the CSS
   variables in `src/styles/app.css` rather than raw hex.
6. Convex tests insert fixtures via `convex/_test/factories.ts`, never raw
   object literals. `seedProject(t)` returns one user per role plus an outsider
   and a super admin, so an authorization test can cover the whole matrix.
   Raw literals type-fail even when convex-test accepts them at runtime.
7. New backend code goes in a feature-named module, **not** into
   `convex/mutations.ts` (2.3k lines). New frontend logic goes into
   `src/utils/` or `src/hooks/`, not into a screen that is already 1.5k+ lines.
8. **Classify before working.** Trivial (one file, copy, a catalog row, a token)
   → just do it, `gate:fast` proves it. Standard (spans `convex/` and `src/`, or
   a new screen) → full flow. Complex (touches `projectAccess.ts`,
   `entitlements.ts`, billing, `auth.ts`, or changes schema/indexes) → plan and
   review at the highest care, and `npm run verify` before merging.

## Definition of done

`npm run gate` green **and** at least one test that fails without the change.

## Gates, and how to silence them

There is no CI — by design, for a single-developer project.

- `.githooks/pre-push` is the real gate and runs on every push: the fast gate on
  a feature branch, the full gate plus a build on master. Enable once per clone
  with `git config core.hooksPath .githooks`. Bypass deliberately with
  `git push --no-verify`.
- Two Claude Code hooks are ambient but scoped to stay quiet: `post-edit.sh`
  typechecks only when a `convex/` or `src/` file changed, `stop-gate.sh` runs
  the fast gate only when tracked source changed. Both exit immediately if
  `.claude/.factory-off` exists — see `/factory on|off|status`.
- `pre-push` is intentionally *not* affected by that switch.
