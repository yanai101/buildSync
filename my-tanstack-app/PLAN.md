# Plan (v2): Replace all mock data with real Convex data + wire every card interaction

> **How to keep this file alive:** treat it as the source of truth for progress.
> When a step is finished, flip its status in the **Progress tracker** below
> from `[ ]` to `[x]`, add a one-line note with the commit/PR ref + date under
> the step heading ("**Completed:** …"), and remove any sub-bullets that turned
> out to be unnecessary. If a step changes shape mid-flight, edit the step
> body — don't let the plan drift from reality. When the last box is ticked,
> the final cleanup step must also be ticked before declaring done.

---

## v2 — Self-critique and what changed

### Top 5 weaknesses in v1
1. **Step 4 (Stages) is a monster with a hidden cross-step dependency.** "Release payment" writes an `expenses` row, but the `expenses` module / schema isn't defined until Step 10. Ordering bug + 5+ workflows bundled in one step = high blast radius.
2. **No partial-rollout safety net.** A migrated page has no fallback: if a new mutation regresses, the page is dead until a fix ships. Rollback is "revert the commit," which is slow and coarse.
3. **Photos (old Step 8) conflates three independent risk profiles** — upload (network + storage), notes (trivial CRUD), annotations (stroke schema still undecided). The riskiest sub-task (annotations) blocks the most visible one (upload).
4. **Every UI step edits the same ~2300-line `LegacyScreens.tsx` file under `@ts-nocheck`.** Merge conflicts guaranteed between concurrent steps; zero compile-time protection during the riskiest work of the project.
5. **Loading / error / retry are unspecified.** Today's pages render instantly from `useState(MOCK)`. Real queries start as `undefined`; without skeletons, error boundaries, and upload retry, users will perceive a regression on every migrated page.

### Key improvements in v2
1. **New Step 0 — screen extraction.** Pull each `*Screen` out of `LegacyScreens.tsx` into `src/screens/<Name>.tsx`. Pure refactor, zero behavior change; drop `@ts-nocheck` per file; each subsequent step edits a ~200-line file instead of a 2300-line monolith.
2. **Dual-source adapter + per-page feature flag** (`src/hooks/useDataSource.ts`, backed by `localStorage.buildsync:ds:<key>`, defaults to `mock`). Every migrated page goes through the adapter; rollback is a toggle, not a revert. A dev-only control lives in the avatar dropdown.
3. **`ScreenBoundary`** wrapping every screen — loading skeleton, retryable error banner, empty state. One component, reused.
4. **Backend-foundation phase is stubbed first.** All Convex modules are scaffolded (auth check + empty handler) and deployed before any page flips. Confirms auth plumbing and regenerates `api.d.ts` so later UI work has types.
5. **Stages split into 4a/4b/4c/4d**; photos split into 8a/8b/8c. Each sub-step is independently shippable and reversible.
6. **Stages read flattened to three narrow queries** (`stages.list`, `stageTasks.list`, `stageMilestones.list`) composed on the client. Avoids expensive server-side nested joins, each query cached separately, pagination-friendly.
7. **Budget + expenses module moved earlier** (to Step 5 in v2) — decouples stages payment release (needs `expenses.create`) from a late-phase module.
8. **Activity feed is a single shape-neutral helper** — `logActivity(ctx, kind, payload)` — not inline writes in every mutation.
9. **Upload retry policy** — 3 attempts with exponential backoff (1s/3s/10s). On final failure, keep the local blob preview and mark the photo row as `pending_upload` so user doesn't lose work.
10. **Zod-based validation shared server↔client** — reuse schemas already in `convex/zodSchemas.ts` for form validation.
11. **One central `logError(err, { op, args })`** — console for now, easy swap to Sentry/PostHog later.
12. **Pagination is first-class** — expenses, messages, photos use Convex `.paginate()` from day one, not `.take(50)` with a TODO.

---

## Progress tracker (v2)

**Phase A — Refactor foundation (no feature changes)**
- [ ] **Step 0** — Extract screens out of `LegacyScreens.tsx`; drop `@ts-nocheck`
- [ ] **Step 1** — `ScreenBoundary` + `useDataSource` + `logError` + dev toggle UI
- [ ] **Step 2** — Backend foundation: all Convex modules **stubbed** (auth + empty handler); schema tweak for `photos.storageId`; `_lib/ownership.ts`, `_lib/activity.ts`

**Phase B — Page migrations (each behind the flag)**
- [ ] **Step 3** — `/setup` wired to `projects.updateDetails` / `updateRooms`
- [ ] **Step 4a** — `/stages` read-only from DB (list + progress display)
- [ ] **Step 4b** — `/stages` task toggle (optimistic)
- [ ] **Step 4c** — `/stages` payment review + supervisor approve
- [ ] **Step 5** — `/budget` (moved earlier; unblocks 4d) — categories + expenses (paginated)
- [ ] **Step 4d** — `/stages` payment release → writes `expenses` row + activity
- [ ] **Step 6** — `/contractors` + payment milestones
- [ ] **Step 7** — `/boq` (CRUD + inline edit)
- [ ] **Step 8** — `/boqwizard` (batch import via `createMany`)
- [ ] **Step 9a** — `/photos` upload + list (Convex storage; retry policy)
- [ ] **Step 9b** — `/photos` notes (wires the empty `onChange={()=>{}}`)
- [ ] **Step 9c** — `/photos` annotations (stroke schema)
- [ ] **Step 10** — `/notes` (messages CRUD + resolved toggle)
- [ ] **Step 11** — `/quotes` + quote topics (server-side approve-rejects-others txn)
- [ ] **Step 12** — `/timeline` (read-only)

**Phase C — Cleanup & Access Control**
- [ ] **Step 13** — Implement strict Role-Based Access Control (RBAC) across all screens as defined in `ROLES_AND_PERMISSIONS.md`. Enforce UI restrictions for `inspector` and `contractor`.
- [ ] **Step 14** — Default `useDataSource` to `db` everywhere, delete mock branches, remove dev toggle.
- [ ] **Step 15** — Grep sweeps (`mockData` / empty handlers) clean; `src/utils/mockData.ts` stays only as `convex/seed.ts` input.

---

## v2 execution order rationale

- Phase A is pure refactor + scaffolding. Zero user-visible change. Fast to review, fast to roll back.
- Phase B migrations flip behind a flag. Default stays `mock` when a step merges; flip to `db` in a follow-up after smoke test. Each flip is independently reversible.
- Phase C removes the safety net once every page has been stable on `db` for at least one session.

### What to implement first — next 3 concrete PRs

1. **PR #1 — Step 0 (Screen extraction)**
   - Create `src/screens/` folder.
   - Move each `*Screen` function from `src/components/LegacyScreens.tsx` into its own file.
   - Update route shells (`src/routes/*.tsx`) to import from the new paths.
   - Drop `@ts-nocheck` per file; fix any newly-visible type errors inline (`as any` is acceptable for now — proper typing happens during each page's migration).
   - No behavior change. Verification: visual parity + TypeScript green.

2. **PR #2 — Step 1 (ScreenBoundary + useDataSource + logError)**
   - `src/components/ScreenBoundary.tsx` — loading / error / empty states.
   - `src/hooks/useDataSource.ts` — generic adapter with localStorage-backed per-key flag, default `mock`.
   - `src/utils/logError.ts` — single entry point for error telemetry (console now).
   - Dev-only UI toggle in avatar dropdown (behind `import.meta.env.DEV`) listing current data-source keys.
   - Wrap every screen in `ScreenBoundary`. Rewire `DashboardScreen` through `useDataSource('dashboard', { db, mock })` (default `db` since it's already real) to prove the adapter works end-to-end.
   - Verification: toggle `buildsync:ds:dashboard` between `mock` and `db` in the dev tool; dashboard swaps data source live.

3. **PR #3 — Step 2 (Backend foundation stubbed)**
   - `convex/_lib/ownership.ts`, `convex/_lib/activity.ts`.
   - Schema tweak: add `photos.storageId: v.optional(v.string())` in `convex/schema.ts` + `convex/zodSchemas.ts`.
   - Scaffold empty modules: `stages.ts`, `stageTasks.ts`, `stageMilestones.ts`, `contractors.ts`, `contractorPaymentMilestones.ts`, `boqItems.ts`, `photos.ts`, `photoAnnotations.ts`, `photoNotes.ts`, `messages.ts`, `budgetCategories.ts`, `expenses.ts`, `timelineBars.ts`, `priceQuotes.ts`, `quoteTopics.ts`.
   - Each module exports a `list` that calls `requireProjectAccess` and returns `[]`. No mutations yet.
   - Deploy. Confirm `api.d.ts` regenerates and Phase B steps have types ready.
   - Verification: `npx convex dev` clean; no page breaks (nothing uses these yet because Phase B is flag-off).

---

## v2 — Detailed step notes (only where changed vs v1)

### Step 0 — Screen extraction

**Files moved:**
- `LegacyScreens.tsx` → split into:
  - `src/screens/DashboardScreen.tsx`
  - `src/screens/ProjectSetupScreen.tsx`
  - `src/screens/StagesScreen.tsx`
  - `src/screens/ContractorsScreen.tsx` (keep `PaymentSchedule` as a co-located subcomponent or move to `src/components/ContractorPaymentSchedule.tsx`)
  - `src/screens/BOQScreen.tsx`
  - `src/screens/BOQWizardScreen.tsx`
  - `src/screens/PhotosScreen.tsx`
  - `src/screens/NotesScreen.tsx`
  - `src/screens/BudgetScreen.tsx`
  - `src/screens/QuotesScreen.tsx`
  - `src/screens/TimelineScreen.tsx`
- Shared constants that remain UX helpers (`DEFAULT_ROOMS`, `ROOM_TYPE_OPTS`, `calcSmartItems`, `DEFAULT_PAYMENT_SCHEDULES`, `STAGE_AMOUNTS` [will be deleted in Step 4a], etc.) move into `src/screens/_constants/` or stay co-located with the screen that owns them.
- Route shells in `src/routes/*.tsx` updated to import from new paths.

**Rules:**
- Preserve every line of behavior verbatim. No refactor inside.
- Drop `@ts-nocheck`; add `as any` surgically only where a type is truly unknowable without DB migration.

### Step 1 — Boundary, adapter, dev toggle

**`src/components/ScreenBoundary.tsx`:**
```tsx
<ScreenBoundary loading={data === undefined} error={error} empty={data?.length === 0}>
  {/* screen body */}
</ScreenBoundary>
```
- Loading = skeleton card (reuse `Card` styling; placeholder grey blocks).
- Error = inline banner + retry button that calls `onRetry` (re-runs query via client.query refetch or key bump).
- Empty = optional slot, defaults to a Hebrew "אין נתונים עדיין" message.

**`src/hooks/useDataSource.ts`:**
```ts
function useDataSource<T>(key: string, sources: { db: () => T; mock: () => T }): T
```
- Reads `localStorage.buildsync:ds:<key>` (`'db' | 'mock'`), defaults to `'mock'`.
- Dev toggle UI (only in `import.meta.env.DEV`) inside the avatar dropdown — a "Data sources" submenu listing current keys with a pill selector.

**`src/utils/logError.ts`:**
```ts
export function logError(err: unknown, ctx: { op: string; args?: unknown }): void
```
- Console.error with a structured prefix now; TODO swap to a real sink later.

### Step 2 — Backend foundation (stubbed)

All modules export:
- `list: query({ args: { projectId }, handler: async (ctx, { projectId }) => { await requireProjectAccess(ctx, projectId); return []; } })`
- (Mutations added in later phases, per step.)

Exceptions:
- `convex/projects.ts` — extend with `get`, `listRooms` now (setup needs them in Step 3).
- `convex/photos.ts` — scaffold `generateUploadUrl` action signature now, body in Step 9a.

### Step 4 split (replaces v1 Step 4)

- **4a — Read-only.** `stages.list` returns raw rows. `stageTasks.list({stageIds})` batch. `stageMilestones.list({stageIds})` batch. Client composes. `/stages` flipped to `db` shows the same cards as today, driven by DB. No mutations.
- **4b — Task toggle.** `stageTasks.setDone` with optimistic update. Progress bar recomputes.
- **4c — Payment review + approve.** Two mutations: `stages.requestPaymentReview`, `stages.supervisorApprove`. Activity feed entries via `logActivity`.
- **4d — Payment release.** `stages.releasePayment` calls `expenses.create` inside the same transaction + activity. **Requires Step 5 done.**

### Step 5 (was v1 Step 10) — `/budget` moved earlier

Same content as v1 Step 10, but lands before 4d so 4d has `expenses.create` to call. Uses `paginate()` from day one.

### Step 9 split (replaces v1 Step 8)

- **9a — Upload + list.** Storage pipeline end-to-end. Cards render real images via `photos.getUrl`. Retry policy (3 × exp-backoff; on final fail, keep blob preview + mark row `pending_upload`).
- **9b — Notes.** `photoNotes` CRUD; wires the empty `onChange={()=>{}}` (now lives in `src/screens/PhotosScreen.tsx` after Step 0).
- **9c — Annotations.** Stroke schema; save on canvas commit; load on modal open.

### Step 13 — Flag removal

- For each `useDataSource` site, remove the `mock` branch; leave only `db`.
- Delete the dev toggle UI.
- Delete unused mock helpers and hardcoded constants in screens.

### Step 14 — Grep cleanup

- `grep -rn "from '~/utils/mockData'" src/` → zero.
- `grep -rn "onClick={() => {}}" src/` → zero.
- `grep -rn "@ts-nocheck" src/` → zero in `src/screens/`.

---

## New safeguards (migration + UX + backend)

**Migration safety:**
- Per-page feature flag via `useDataSource`. Flip forward in a dedicated PR after smoke test. Rollback = toggle, instant.
- Never delete mock branches in the same PR that introduces DB reads for a page. Mock-branch deletion waits for Step 13.

**UX safety:**
- Every screen wrapped in `ScreenBoundary` (loading / error / empty).
- Every destructive action (remove item, reject quote) gets a confirm modal reusing `Modal` from `Shared.tsx`.
- Optimistic updates on every idempotent toggle (task done, resolved, milestone paid, quote approved).
- Hebrew copy for loading + error states matches existing UI tone (`טוען…`, `שגיאה בטעינת הנתונים. נסה שוב.`).

**Backend safety:**
- `requireProjectAccess` on every mutation + query that takes a `projectId`.
- Cross-entity writes (e.g., payment release → expense + activity) in a single mutation transaction.
- `logActivity(ctx, kind, payload)` — shape-neutral signature so the `activityFeed` schema can evolve without touching callers.
- Pagination on growth tables from day one (`paginate` with `numItems: 50`, `cursor` round-tripped in client).

**Validation:**
- Reuse `convex/zodSchemas.ts` in client forms via `zod.safeParse`. Error messages surfaced inline beneath the field.

**Observability:**
- Single `logError(err, { op, args })` helper. All catch blocks call it.
- One `console.debug('[bp]', ...)` prefix for dev tracing; stripped in prod build.

**Upload retry (photos):**
- `uploadWithRetry(url, blob)` — 3 attempts, exp backoff (1s, 3s, 10s).
- On final failure: keep blob URL in memory, mark the `photos` row as `pending_upload`, schedule a client-side retry queue in `localStorage`.

---



## Context

Today only `/` (dashboard) and `/projects` read from Convex. Every other page
drives from `src/utils/mockData.ts` via a single import at
`src/components/LegacyScreens.tsx:6`. Cards render, but buttons/edits/status
changes mutate only local `useState` — nothing persists.

Goal:
1. Every page reads from Convex.
2. Every clickable card action (add, edit, delete, toggle, approve, release
   payment, add note, upload photo, etc.) calls a real mutation.
3. `/photos` uploads real files via Convex file storage.
4. `src/utils/mockData.ts` remains only as input to `convex/seed.ts`; no UI imports it.

Agreed scope decisions:
- **Photos** → real Convex file storage (`ctx.storage`).
- **Page order** → sidebar order (Setup → Stages → Contractors → BOQ → BOQ Wizard → Photos → Notes → Budget → Quotes → Timeline).
- **Setup** → edits the current project only; no new-project creation.

---

## Shared conventions (read once, applies to every step)

- **Convex functions** — one module per table. Every function validates args
  with `v.*` and derives `userId` via `getAuthUserId(ctx)` (see
  `convex/users.ts:13`). Queries use `withIndex('by_project', …)`, never
  `.filter()` (see `convex/dashboard.ts:17-29`). Growth tables (photos,
  expenses, messages, activityFeed) accept a pagination arg and `.take(n)`.
- **Auth/ownership** — every mutation calls `requireProjectAccess(ctx, projectId)`
  from the helper introduced in Step 1.
- **Activity feed** — status changes + new expenses + approvals call
  `insertActivity(ctx, ...)` from the helper in Step 1. Dashboard's recent
  activity panel picks them up automatically via `api.dashboard.getOverview`.
- **Client hooks** — every page gets a thin hook mirroring
  `src/hooks/useDashboardOverview.ts`: pull `projectId` from
  `useCurrentProject()`, run `useQuery(…, projectId ? {projectId} : 'skip')`,
  return `{ projectId, data, isPending }`.
- **Out of scope for this plan** — new-project creation, user-invite flow,
  timeline editing, BOQ import/export, quote PDF storage.

---

# Steps

Each step is a self-contained unit of work with a clear "done when" checkpoint.
Steps 1–2 must be first. Steps 3–12 can then be tackled in listed order; each
is independently reviewable and shippable.

---

## Step 1 — Shared helpers

**Why first:** every subsequent mutation depends on these two helpers.

**Files created:**
- `convex/_lib/ownership.ts` — `requireProjectAccess(ctx, projectId)` throws
  unless the caller is `ownerUserId` on the project. Single source of truth for
  authorization. Forward-compatible with future roles.
- `convex/_lib/activity.ts` — `insertActivity(ctx, { projectId, text, role? })`
  reads current user via `getAuthUserId` and writes one `activityFeed` row.

**Done when:** both helpers compile and a smoke test mutation (any existing
one is fine, e.g., temporarily call from `dashboard.ts`) can call them without
error.

---

## Step 2 — Schema tweak for photo storage

**Why now:** Step 8 (photos) needs this; landing it early avoids a schema-only
deploy later.

**Files modified:**
- `convex/schema.ts` — `photos` table gains `storageId: v.optional(v.string())`.
- `convex/zodSchemas.ts` — mirror the optional field.

**Done when:** `npx convex dev` applies the schema without validation errors.

---

## Step 3 — `/setup` (edit current project)

**Screen:** `LegacyScreens.tsx:1420` (`ProjectSetupScreen`).

**Convex functions to add (in `convex/projects.ts`):**
- `get({ projectId })`
- `listRooms({ projectId })`
- `updateDetails({ projectId, name, address, floors, area })`
- `updateRooms({ projectId, rooms: [{ id, name, type, size, ... }] })`
  — upsert + delete-missing by id.

**Client hook:** None needed — the screen uses `useQuery`/`useMutation` directly.

**Wiring:**
- Hydrate `cfg` initial state from `api.projects.get` + `api.projects.listRooms`
  on mount.
- Keep `DEFAULT_ROOMS` / `ROOM_TYPE_OPTS` / `calcSmartItems`
  (`LegacyScreens.tsx:1321-1417`) as client constants — UX helpers, not data.
- Final "save" (`LegacyScreens.tsx:1451`) → `updateDetails` + `updateRooms`.
- Team fields → read-only with a "invite flow in progress" note.

**Done when:** editing project details, reloading, and logging out/in shows the
saved values. Dashboard `project.name` reflects renames.

**Effort:** M.

---

## Step 4 — `/stages`

**Screen:** `LegacyScreens.tsx:248` (`StagesScreen`).

**Convex module (`convex/stages.ts`):**
- `list({ projectId })` — server joins `stageTasks`, `stageMilestones`,
  `stageMilestoneTasks`. Returns `[{ stage, tasks, milestones: [{milestone, tasks}] }]`.
- `setTaskDone({ taskId, done })` — flip task + recompute parent stage `progressPct`.
- `requestPaymentReview({ stageId })` → `status='review_requested'` + activity.
- `supervisorApprove({ stageId })` → append approval record + activity.
- `addProofPhoto({ stageId, photoId })` → link + counter bump.
- `releasePayment({ stageId, milestoneId? })` → mark paid, insert `expenses`
  row if contractor is bound, activity.

**Client hook:** `src/hooks/useProjectStages.ts`.

**Wiring — cards on stage card at `LegacyScreens.tsx:355-380`:**
- Expand/collapse — client-only.
- Task checkbox → `setTaskDone` with `.withOptimisticUpdate(...)` for instant feel.
- "Request review" button → `requestPaymentReview`.
- "Approve" (visible to supervisor) → `supervisorApprove` (owner-only in practice today).
- "Add proof photo" → `addProofPhoto` (uses photos from Step 8; until then,
  disable the button or link via ID entry).
- "Release payment" → `releasePayment`.

**Remove:** hardcoded `STAGE_AMOUNTS` / `STAGE_MILESTONES`
(`LegacyScreens.tsx:196-215`) and `seedStages()` (line 217) — values already
live in the seeded rows.

**Done when:** toggling a task, requesting review, approving, and releasing
payment all persist; activity feed on `/` shows the events; reload keeps state.

**Effort:** L.

---

## Step 5 — `/contractors`

**Screen:** `LegacyScreens.tsx:628` (`ContractorsScreen`), subcomponent
`PaymentSchedule` at line 506.

**Convex modules:**
- `convex/contractors.ts` — `list`, `create`, `update`, `remove`.
- `convex/contractorPaymentMilestones.ts` — `listByContractor`, `create`,
  `update`, `setStatus`, `remove`, `createManyFromTemplate`.

**Client hook:** `src/hooks/useProjectContractors.ts`.

**Wiring:**
- `useState(CONTRACTORS_DATA)` → hook.
- Keep `DEFAULT_PAYMENT_SCHEDULES` / `DEFAULT_SCHEDULE`
  (`LegacyScreens.tsx:449-504`) as client template constants; "apply template"
  button → `createManyFromTemplate`.
- Grid card click → detail view (local routing).
- Add/edit modal (line 730) → `contractors.create` / `contractors.update`.
- Milestone status toggle → `contractorPaymentMilestones.setStatus`.
- Add custom milestone → `.create`. Remove milestone → `.remove`.

**Done when:** adding a contractor + applying a template + marking a milestone
paid all persist.

**Effort:** M.

---

## Step 6 — `/boq`

**Screen:** `LegacyScreens.tsx:782` (`BOQScreen`).

**Convex module (`convex/boqItems.ts`):**
- `listByProject`, `listByRoom`, `create`, `createMany`, `update`, `setStatus`,
  `remove`.

**Client hook:** `src/hooks/useProjectBoq.ts` (returns items grouped by `roomId`).

**Wiring:**
- `useState(BOQ_DATA)` + `ROOMS_LIST` → hook + `api.projects.listRooms`.
- Add-item form (`LegacyScreens.tsx:820-835`) → `boqItems.create`.
- Status badge click (line 859) → `boqItems.setStatus`.
- **New** — inline cell edits on blur → `boqItems.update`.
- **New** — per-row delete button → `boqItems.remove`.

**Done when:** items persist per room; status toggle survives reload.

**Effort:** M.

---

## Step 7 — `/boqwizard`

**Screen:** `LegacyScreens.tsx:1878` (`BOQWizardScreen`).

**Convex function:** reuses `boqItems.createMany` from Step 6.

**Wiring:**
- Drop `window.PROJECT_ROOMS` (line 1879); source rooms from
  `api.projects.listRooms`.
- Wizard keeps in-memory draft (good UX for qty editing).
- "Import" button → one `boqItems.createMany({ projectId, items })` call.

**Done when:** running the wizard end-to-end creates BOQ rows that appear on
`/boq`.

**Effort:** S.

---

## Step 8 — `/photos` (real file storage)

**Screen:** `LegacyScreens.tsx:879` (`PhotosScreen`).

**Convex modules:**
- `convex/photos.ts` — `list`, `generateUploadUrl` (action),
  `create({ projectId, storageId, tag, label, stageId? })`,
  `getUrl({ photoId })` (wraps `ctx.storage.getUrl`), `update`, `remove`.
- `convex/photoAnnotations.ts` — `listByPhoto`, `create({ photoId, strokes })`,
  `remove`.
- `convex/photoNotes.ts` — `listByPhoto`, `create({ photoId, text, recipient })`,
  `remove`.

**Client hook:** `src/hooks/useProjectPhotos.ts`.

**Upload flow:**
1. `const url = await generateUploadUrl({})` (action).
2. `fetch(url, { method: 'POST', body: file })` → `{ storageId }`.
3. `photos.create({ projectId, storageId, tag, label, stageId? })`.

**Wiring:**
- Upload button (`LegacyScreens.tsx:926`, no handler today) → upload flow.
- Card click (line 942) → modal (already local).
- Canvas stroke save → `photoAnnotations.create({ photoId, strokes })` on save.
- Note form (line 1012) → `photoNotes.create`. **Also wires the empty
  `onChange={()=>{}}` at line 1007** so `recipient` reaches the server.
- Download button (line 1022) → anchor to URL from `getUrl`.

**Done when:** photo uploads, survives reload in another session, annotations
and notes persist; dashboard "proof photo" counts from Step 4 reflect real
uploads.

**Effort:** M.

---

## Step 9 — `/notes`

**Screen:** `LegacyScreens.tsx:1033` (`NotesScreen`).

**Convex module (`convex/messages.ts`):** `list({ projectId, thread? })`,
`create({ projectId, text, thread })`, `setResolved({ messageId, resolved })`.

**Client hook:** `src/hooks/useProjectNotes.ts`.

**Wiring:**
- `useState(NOTES_INITIAL)` → hook.
- Drop the hardcoded role→name map at line 1047; server derives `actorName`
  from `api.users.currentIdentity`.
- Send (line 1120) → `messages.create`.
- Mark resolved (line 1090) → `messages.setResolved`.

**Done when:** messages round-trip to DB; a second browser session sees new
messages live via Convex subscription.

**Effort:** S.

---

## Step 10 — `/budget`

**Screen:** `LegacyScreens.tsx:1130` (`BudgetScreen`).

**Convex modules:**
- `convex/budgetCategories.ts` — `list` returns `{ ...category, spent }` where
  `spent` aggregates matching `expenses`; `create`, `update`, `remove`.
- `convex/expenses.ts` — `list` (paginated, default 50 latest), `create`,
  `update`, `remove`.

**Client hook:** `src/hooks/useProjectBudget.ts`.

**Wiring:**
- Replace `BUDGET_CATS` import and inline expense array
  (`LegacyScreens.tsx:1135-1142`).
- Stat cards use the aggregated values (same math as today).
- **"Add expense"** button (line 1213, no handler today) → new modal →
  `expenses.create`.
- Expense row → inline edit + remove → `expenses.update` / `remove`.
- Budget category add/edit/remove → matching category mutations.

**Done when:** adding an expense updates the category's `spent` and the
dashboard's "total spent" stat on `/` without any additional code, since
`api.dashboard.getOverview` already sums `budgetCategories`.

**Effort:** M.

---

## Step 11 — `/quotes`

**Screen:** `LegacyScreens.tsx:2107` (`QuotesScreen`).

**Convex modules:**
- `convex/priceQuotes.ts` — `list({ projectId, topicKey? })`, `create`,
  `update`, `setStatus` (auto-rejects others in same topic in one txn), `remove`.
- `convex/quoteTopics.ts` — `list({ projectId })` merges built-ins with project
  customs; `create`, `remove`.

**Built-ins location:** move `QUOTE_TOPICS` from `src/utils/mockData.ts` into
`convex/_lib/quoteTopicsBuiltins.ts` and import from `quoteTopics.list`.

**Client hook:** `src/hooks/useProjectQuotes.ts`.

**Wiring:**
- `useState(QUOTES_DATA)` + `customTopics` → hook.
- Add/edit modal → `priceQuotes.create` / `.update`.
- Delete (line 2156) → `priceQuotes.remove`.
- Approve/reject → `priceQuotes.setStatus` (loop at lines 2161-2169 moves to
  server inside the transaction).
- Add custom topic → `quoteTopics.create`.

**Done when:** quote workflow including approve-rejects-others works across
reloads.

**Effort:** M.

---

## Step 12 — `/timeline` (read-only)

**Screen:** `LegacyScreens.tsx:1239` (`TimelineScreen`).

**Convex module (`convex/timelineBars.ts`):** `list({ projectId })`.

**Client hook:** `src/hooks/useProjectTimeline.ts`.

**Wiring:**
- `TIMELINE_DATA` / `TOTAL_WEEKS` → hook output.
- Compute `totalWeeks = Math.max(...bars.map(b => b.col + b.span))` in the
  screen (not a DB field).
- No edit UI — out of scope.

**Done when:** Gantt bars render from DB rows.

**Effort:** S.

---

## Step 13 — Cleanup

**Checks:**
- `grep -rn "from '~/utils/mockData'" src/` → must return zero.
- `grep -rn "onClick={() => {}}" src/` → zero (the photo-notes one from Step 8
  was the known stub).
- Delete dead local helpers — `seedStages`, inline hardcoded expense array,
  `window.PROJECT_ROOMS` fallback.
- `src/utils/mockData.ts` itself **stays** — `convex/seed.ts` still imports it.
- Update `PAGE_SUBTITLES` in `src/components/Layout.tsx` where helpful.

**Done when:** all greps above are clean; build is green.

---

## Critical files

| Area | Files |
| --- | --- |
| Screens to rewrite | `src/components/LegacyScreens.tsx` (most steps edit this file) |
| Route shells | `src/routes/setup.tsx`, `stages.tsx`, `contractors.tsx`, `boq.tsx`, `boqwizard.tsx`, `photos.tsx`, `notes.tsx`, `budget.tsx`, `quotes.tsx`, `timeline.tsx` |
| Schema | `convex/schema.ts`, `convex/zodSchemas.ts` (photos.storageId only) |
| Patterns reused | `src/hooks/useDashboardOverview.ts`, `src/hooks/useCurrentProject.ts`, `convex/dashboard.ts`, `convex/users.ts` |

---

## Per-step verification template

After each step:
1. `npm run dev` + `npx convex dev` — generated API type-checks with zero errors.
2. On the target page: perform each card interaction → hard-reload → state
   persists.
3. Second browser profile / second user — sees only their own data
   (`requireProjectAccess` works).
4. Activity feed entries appear on `/` where the step specifies.
5. `grep -rn "from '~/utils/mockData'" src/` does not grow.

---

## Assumptions / risks

- **Supervisor role** — stage approvals resolve to "owner only" until the invite
  flow exists. UI renders the button conditionally on `role`, so it's
  forward-compatible.
- **`projects.committed`** — stored today. Once contractor milestones are live,
  consider deriving it in `dashboard.getOverview` instead. Not a blocker; flag
  if drift appears.
- **Photo URL expiry** — `ctx.storage.getUrl` returns short-lived URLs; Convex
  subscriptions refresh them. Add a client 403-retry only if a bug appears.
- **BOQ migration** — existing seeded rows stay; no data migration needed.
