# BuildSync — Feature Roadmap

This file tracks the next phases of work derived from the homeowner + PM gap analysis (see commit history / chat for the audit). Update the **Status** marker at the top of each phase when work starts and finishes — so future sessions don't redo what's already shipped.

**Status legend**

- ⏳ `Pending` — not started
- 🔨 `In progress` — actively being built (note the branch)
- ✅ `Done` — merged to master; record the merge commit + date
- 🟡 `Partial` — landed but a known follow-up remains; describe it

---

## Already shipped (do not redo)

- ✅ **Personal files page** — owner-only locker with gzip + per-file note. Merged 2026-04-27 in commit `1acc719`.
- ✅ **Notes thread independence** — `/notes` no longer cross-posts between contractor and internal threads. Merged 2026-04-27 in commit `7bd6d9b`.
- ✅ **Team & invitation system (Phases A–C of the team plan)** — `/team`, `/join/$code`, owner-gated nav, role-based route guards, register-with-code. Branch `feat/team-members-roles`, *not yet merged to master* as of 2026-04-27.

The original detailed plans for the three items above live in `~/.claude/plans/add-a-new-rosy-manatee.md`. Anything not on the "shipped" list above is fair game.

---

## Phase 1 — Permits & municipal paperwork

**Status:** ⏳ Pending
**Why:** Every Israeli build starts with היתר בנייה, plans approval, and ends with טופס 4 / אישור אכלוס. Today the app has zero surface for this — owners track it in WhatsApp screenshots.
**Roles that need it:** owner, manager (read+write); inspector (read).
**Effort:** Medium.

### Schema (`convex/zodSchemas.ts` + `convex/schema.ts`)

New `zPermit`:

```
projectId: zid('projects')
kind: z.enum(['building_permit','plans_approval','occupancy_form_4','utility_connection','other'])
title: z.string()
authority: z.string().optional()      // e.g. "ועדה מקומית רעננה"
referenceNumber: z.string().optional()
status: z.enum(['draft','submitted','approved','rejected','expired'])
submittedAt: z.string().optional()    // ISO date
approvedAt: z.string().optional()
expiresAt: z.string().optional()
notes: z.string().optional()
attachmentFileIds: z.array(zid('projectFiles')).optional()
```

Indexes: `by_project`, `by_project_status`.

### Backend — `convex/permits.ts` (new)

- `listByProject({ projectId })` — owner/manager/inspector. Returns rows with attached file URLs resolved.
- `createPermit({ projectId, ...fields })` — owner/manager. Use `requireProjectFileManager` from `convex/_lib/projectAccess.ts:38-48`.
- `updatePermit({ permitId, patch })` — owner/manager.
- `deletePermit({ permitId })` — owner/manager. Does not delete the underlying `projectFiles` rows (keep their history).

### Frontend

- `src/routes/permits.tsx` (new), `src/screens/PermitsScreen.tsx` (new).
- Layout NAV entry: `{ id: '/permits', label: 'אישורים והיתרים', icon: 'clipboard', section: 'ניהול', roles: ['owner','manager','inspector'] }` (inspector read-only — UI hides edit affordances when `identity.role === 'inspector'`).
- Page layout: cards grouped by `kind`, each card shows status badge, expiry countdown ("פג בעוד 23 ימים"), attached files (reuses `useProjectFileUploader.ts` for upload). Add-permit modal mirrors `TeamScreen.tsx` invite modal.
- Dashboard tile: count of permits expiring in <30 days; clickable → `/permits?filter=expiring`.

### Verification

- Owner adds a permit with an attached PDF → row in `permits`, file in `projectFiles` linked via `attachmentFileIds`.
- Manager edits → persists.
- Inspector views → no edit/delete buttons rendered.
- Contractor / non-team user → "אין לך גישה" via the `useRequireRole` guard.
- `npx tsc --noEmit` clean except the pre-existing BOQ html2pdf errors.

---

## Phase 2 — Punch list (רשימת ליקויים)

**Status:** ⏳ Pending
**Why:** Today defects live in `/notes` chat or WhatsApp screenshots. A walkthrough produces 50 items; without structured tracking they get lost.
**Roles:** owner, manager, inspector (full); contractor (read items assigned to them, mark "claim fixed").
**Effort:** Medium-large.

### Schema

New `zPunchItem`:

```
projectId: zid('projects')
title: z.string()
description: z.string().optional()
severity: z.enum(['critical','major','minor','cosmetic'])
location: z.object({ roomId: zid('projectRooms').optional(), freeText: z.string().optional() })
status: z.enum(['open','assigned','contractor_claims_fixed','verified','rejected','closed'])
assignedContractorId: zid('contractors').optional()
reportedByUserId: zid('users')
reportedAt: z.number()
photoIds: z.array(zid('photos')).optional()
fixedByDate: z.string().optional()  // ISO target date
verifiedByUserId: zid('users').optional()
verifiedAt: z.number().optional()
```

Indexes: `by_project`, `by_project_status`, `by_assigned_contractor`, `by_room`.

### Backend — `convex/punchList.ts` (new)

- `listByProject` — all team roles. Contractors only get rows where `assignedContractorId` matches their linked `contractors.userId`.
- `createPunchItem` — owner/manager/inspector.
- `assignPunchItem({ id, contractorId, fixedByDate? })` — owner/manager.
- `claimFixed({ id })` — contractor only, on items assigned to them. Sets status to `contractor_claims_fixed`.
- `verifyOrReject({ id, verified: boolean, reason? })` — owner/manager/inspector. Verified → `closed`. Rejected → back to `assigned`.
- `addPhotosToItem({ id, photoIds })` — any team member.

### Frontend

- `src/routes/punch-list.tsx` (new), `src/screens/PunchListScreen.tsx` (new).
- Layout NAV: `{ id: '/punch-list', label: 'רשימת ליקויים', icon: 'alert', section: 'תיעוד', roles: ['owner','manager','inspector','contractor'] }`.
- Filters at top: severity, status, room, assigned contractor.
- List item card: severity color stripe (red/orange/yellow/grey), title, room, assigned contractor avatar, status pill. Click → drawer with full description + photos + history.
- Empty state with CTA: "סמן ליקוי ראשון".
- Photos integration: "צרף תמונה" opens the existing `/photos` upload flow with `usage: 'document'` and stores the resulting `photos._id` in `photoIds`.

### Verification

- Owner reports a critical defect with 2 photos → item appears in DB, photos linked.
- Inspector verifies → status → `closed`, `verifiedAt` set.
- Contractor logs in (after Phase 4 of the team plan), sees only their assigned items, can claim fixed but cannot close.
- Severity sort: critical first.

---

## Phase 3 — Cost-vs-budget alerts (quick win)

**Status:** ⏳ Pending
**Why:** The dashboard *already* renders variance UI in `src/components/DashboardInsights.tsx:36-51`, but it reads a hardcoded mock `forecast` from `src/utils/mockData.ts:312-313`. Wiring it to real data is a one-day job that turns a dummy widget into a load-bearing alert.
**Effort:** Small.

### Backend

Extend `convex/dashboard.ts` (or wherever `useDashboardOverview` reads from):

- Aggregate per category: sum of `expenses.amount where status='שולם'` (paid) and `where status='ממתין'` (committed).
- Compare to `budgetCategories.budget`.
- Return per-category: `{ name, budget, paid, committed, projected: paid + committed, variancePct }`.
- Add a top-level `topOverruns: [{ name, variancePct, amountOver }]` sorted desc, top 3.

### Frontend

- `src/components/DashboardInsights.tsx:31-51` — replace the mock `forecast` consumer with the new aggregated payload from the hook.
- Add a banner card on `/` when any category is over budget (red) or projected to overrun (>90%, amber).
- Click-through from a banner card lands on `/budget?category=<id>` with that category pre-filtered.

### Verification

- Add expenses totaling 110% of a category's budget → red banner appears within seconds (Convex reactivity).
- Mark some expenses as "ממתין" (committed) — they count toward `projected` but not `paid`.
- Empty project → no banner.

---

## Phase 4 — Email-delivered invitations (quick win, depends on Team merge)

**Status:** ⏳ Pending — requires `feat/team-members-roles` to be merged first.
**Why:** Today owners must copy `/join/<code>` URLs and paste into WhatsApp manually. An email layer is a 30-line addition once a transactional provider is configured.
**Effort:** Small once the provider is chosen.

### Provider choice

Recommend **Resend** (cheapest free tier, simple API, works with Convex actions). Alternative: SendGrid. Document the decision in CLAUDE.md once made.

### Setup

1. Sign up; verify a sender domain (or use Resend's onboarding domain for dev).
2. Add `RESEND_API_KEY` to Convex environment variables: `npx convex env set RESEND_API_KEY <key>`.
3. Document the env var requirement in `README.md`.

### Backend

In `convex/invitations.ts`, after the existing `createInvitation` mutation succeeds, schedule a follow-up action:

```ts
await ctx.scheduler.runAfter(0, internal.invitations._sendInvitationEmail, {
  invitationId,
});
```

New `_sendInvitationEmail` internal action (no `'use node'` needed — `fetch` works in default runtime):

- Reads the invitation, project name, owner name.
- Skips silently if `invitedEmail` is empty.
- POSTs to `https://api.resend.com/emails` with a templated Hebrew body containing the `https://<host>/join/<code>` URL.
- Logs but does not throw on send failure (the code is still copyable in the UI).

### Frontend

- `TeamScreen.tsx` invite modal: when an `invitedEmail` is provided, show "ההזמנה תישלח גם במייל" under the email field.
- After successful send, show "נשלח אימייל ל…" toast in addition to the existing "code copied" affordances.

### Verification

- Create an invitation with `invitedEmail` → receive a real email in <30s with the join URL.
- Email lands in inbox (not spam) on a verified domain.
- Failure (bad API key) → invitation still created, code still copyable, no user-facing error block.

---

## Phase 5 — Material orders & deliveries

**Status:** ⏳ Pending
**Why:** BOQ tells you "100m² of porcelain tiles" but there's no record of "ordered from Hagai's Tiles 5.5.26, arrives 12.5, paid ₪8,400". This is the bridge between BOQ (planning) and budget (actuals).
**Effort:** Large.

### Schema

New `zMaterialOrder`:

```
projectId: zid('projects')
boqItemId: zid('boqItems').optional()
title: z.string()
supplier: z.string()
supplierContact: z.string().optional()
qty: z.number()
unit: z.string()
unitPrice: z.number()
totalPrice: z.number()
orderedAt: z.string()                 // ISO date
expectedDelivery: z.string().optional()
deliveredAt: z.string().optional()
status: z.enum(['draft','ordered','partial','delivered','returned','cancelled'])
paymentStatus: z.enum(['unpaid','partial','paid'])
expenseId: zid('expenses').optional() // link to budget row
attachmentFileIds: z.array(zid('projectFiles')).optional()
notes: z.string().optional()
```

Indexes: `by_project`, `by_project_status`, `by_boq_item`, `by_supplier`.

### Backend — `convex/materialOrders.ts` (new)

CRUD shape mirrors `permits.ts`. The interesting bits:

- On `markDelivered`, optionally auto-create an `expenses` row (uses existing `addExpense` mutation in `convex/budget.ts`) and store its id back in `expenseId`. Owner toggles this in the UI per order.
- `linkToBoqItem` — when set, the BOQ row in `/boq` shows a "ordered" badge and the actual ordered quantity vs planned.

### Frontend

- `src/routes/material-orders.tsx` + `src/screens/MaterialOrdersScreen.tsx`. NAV under "ניהול".
- Page layout: table grouped by status (Draft / Ordered / Delivered), each row with supplier, delivery countdown, payment status pill.
- "Order from BOQ" CTA on `/boq` per row → opens the create-order modal pre-filled.

### Verification

- Create order from a BOQ row → BOQ row shows "הוזמן".
- Mark delivered with "create expense" toggled → an `expenses` row appears in `/budget` linked to the right category.
- Date math: when `expectedDelivery` is past and `status === 'ordered'`, show red overdue badge.

---

## Phase 6 — Warranty tracker (post-handover)

**Status:** ⏳ Pending — only meaningful once a project reaches handover. Lowest priority but easy to land.
**Why:** "Where's the fridge warranty?" is a five-year-recurring question. One table fixes it.
**Effort:** Small.

### Schema

New `zWarranty`:

```
projectId: zid('projects')
title: z.string()                     // "מקרר LG דגם XYZ"
category: z.string()                  // "מטבח" / "אינסטלציה" / "מבנה"
provider: z.string()                  // contractor or manufacturer
contractorId: zid('contractors').optional()
startDate: z.string()
durationMonths: z.number()
expiresAt: z.string()                 // computed but stored for indexing
notes: z.string().optional()
attachmentFileIds: z.array(zid('projectFiles')).optional()
```

Index `by_project_expires` for upcoming-expiry queries.

### Backend — `convex/warranties.ts` (new)

Standard CRUD. Plus a query `listExpiringSoon({ projectId, days })` for the dashboard.

### Frontend

- `src/routes/warranties.tsx` + `src/screens/WarrantiesScreen.tsx`.
- Group by category. Card shows expiry countdown.
- Dashboard tile: "n אחריות פגות בתוך 60 ימים" (after handover).

### Verification

- Add a 24-month warranty starting today → expires in 24 months, card shows "פג בעוד 730 ימים".
- One starting 2 years ago for 1 year → marked expired, greyed.

---

## Phase 7 — Verified contractor recommendations

**Status:** 🔨 In progress — branch `codex/contractor-recommendations`.
**Why:** Turn verified project experience into a trusted contractor-discovery layer, while keeping contractor identity and contact details exclusive to Pro projects.
**Roles:** All authenticated project members may read masked recommendations. Only owner, manager, and inspector may review contractors that exist in their current project. Contractors may respond only through a linked contractor account; they can never review.
**Effort:** Large.

### Product rules

- Free members see recommendation content, scores, broad area, specialty, and a privacy-safe image preview; contractor identity and contact are masked.
- Pro/Premium access is inherited from the current project's owner. It unlocks the contractor name, business details, original logo/photo, and contact request.
- The directory is authenticated-only: no public routes, SEO pages, raw storage URLs, or external search index for contractor identity.
- One review per reviewer × contractor × project. Reviews can be edited by their author, reported, and hidden by a super-admin.

### Planned schema and backend

- `contractorProfiles` — cross-project canonical contractor profile, including Pro-only identity/contact and source + blurred preview images.
- Optional `contractorProfileId` on existing `contractors` rows; new contractors are linked on write, and legacy rows remain valid during the transition.
- `contractorReviews`, `contractorReviewResponses`, and `contractorReviewReports` with role, subscription, and project-membership checks at every public Convex function.
- New `contractorReviews` entitlement in the shared `TIER_CAPABILITIES` map.

### Frontend

- New `/contractor-recommendations` page in the authenticated application shell, linked from `/contractors` and the sidebar.
- Editorial recommendation feed, filters, profile detail, masked Free state, Pro upgrade path, review form, contractor response, and moderation state.
- A single contractor image upload creates both the protected original and a privacy-safe blurred preview; a specialty-specific generic illustration is used when no image is provided.

### Verification

- Free API responses never include name, business, contact, original image storage id/URL, or searchable identifiers.
- Owner/manager/inspector in a Pro project can review only contractors attached to that project; contractor mutation attempts fail.
- A linked contractor can add one response to a published review; unrelated users cannot.
- Tests cover tier inheritance, image masking, duplicate-review prevention, and report/moderation behavior.

---

## Cross-cutting quick wins (each <1 day)

These don't justify a full phase but are listed so the next session can pick them up between phases.

| ID | Item | File:line | Status |
|----|------|-----------|--------|
| QW-1 | Hide dev-mode mock toggles in production builds | `src/components/Layout.tsx:405-461` (wrap with `import.meta.env.DEV` check that's already there — verify it's actually applied) | ⏳ |
| QW-2 | Empty-state CTAs on `/quotes`, `/contractors`, `/budget` | each screen's `if (data.length === 0)` branch | ⏳ |
| QW-3 | Timeline drag tooltip showing target date | `src/screens/TimelineScreen.tsx` `DragHint` is defined but not rendered | ⏳ |
| QW-4 | "פעולות נוספות (בקרוב)" stub on Account → real actions | `src/routes/account.tsx:285` | ⏳ |
| QW-5 | `mailto:` fallback on Team invite (works without Phase 4) | `src/screens/TeamScreen.tsx` invite-modal post-create section | ⏳ |
| QW-6 | Add `dueDate` to contractor payment milestones + overdue badge | `convex/zodSchemas.ts` `zContractorPaymentMilestone`; `src/components/PaymentControl.tsx` | ⏳ |
| QW-7 | Global search across project | new — needs scoping; defer until at least Phase 2 lands so there's enough to search | ⏳ |

---

## Recommended order

1. **Phase 3** (cost variance — the dashboard is lying to you today; quickest win with biggest perceived value).
2. Merge `feat/team-members-roles` to master, then **Phase 4** (email invitations) so the team flow is end-to-end usable.
3. **Phase 1** (permits) — the single biggest pain for an Israeli build.
4. **Phase 2** (punch list) — comes alive once Phase 1's photo-attachment plumbing is exercised.
5. **Phase 5** (material orders) — natural extension of BOQ + Budget.
6. **Phase 6** (warranties) — lowest urgency, save for last or post-handover.

Each phase ends with: typecheck, manual flow test, commit on a feature branch, merge to master, and **update this file's status marker to ✅ with the merge commit hash and date**.
