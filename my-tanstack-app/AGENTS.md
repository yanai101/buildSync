# BuildPro (BuildSync)

## About the project

BuildPro (internally also referred to as BuildSync) is a construction
project management web app for the Israeli residential building market. It
replaces the WhatsApp-screenshots-and-spreadsheets workflow homeowners and
contractors currently use with a single project hub covering budget &
expenses, stages/tasks, checklists, permits & municipal paperwork (היתר
בנייה, טופס 4), contractor management, timelines, photos, and team
communication.

Stack: [TanStack Start](https://tanstack.com/start) (React 19 + TanStack
Router) on the frontend, [Convex](https://convex.dev) as the backend
(database, functions, auth via `@convex-dev/auth`), Tailwind CSS, deployed
via Netlify/Vercel.

## Target audience

The app is role-gated for four kinds of users on a construction project
(see `ROLES_AND_PERMISSIONS.md` for the full access matrix):

- **Owner** (בעל הנכס / היזם) — full access, including budget, quotes, and
  payment release. The only role that can delete a project or manage other
  managers.
- **Manager** (מנהל פרויקט / מפקח ראשי) — operational access to tasks,
  contractors, and documents; blocked from all financial data (budget,
  quotes).
- **Inspector** (מפקח מקצועי / מהנדס / אדריכל) — field-quality role;
  approves checklists, timelines, and stage progress; blocked from all
  pricing/financial data.
- **Contractor** (קבלן מבצע) — isolated, narrow access limited to their own
  assigned tasks/stages, their own payment milestones, and photo uploads
  for their stage only.

## Required actions from the user/agent

- This project uses Convex as its backend. When working on Convex code,
  **always read `convex/_generated/ai/guidelines.md` first** for
  guidelines on correctly using Convex APIs and patterns — it overrides
  training-data assumptions about Convex.
- Convex agent skills for common tasks can be installed by running
  `npx convex ai-files install`.
- Before starting new feature work, check `ROADMAP.md` for what has
  already shipped ("Already shipped — do not redo") and update its status
  markers (⏳/🔨/✅/🟡) when a phase starts or finishes.
- If working from `PLAN.md`, keep the **Progress tracker** in sync: flip
  `[ ]` to `[x]` and add a completion note (commit/PR ref + date) as steps
  land — don't let the plan drift from reality.
- Respect the role/permission boundaries in `ROLES_AND_PERMISSIONS.md`
  when building or modifying any feature — especially financial data
  (budget, quotes, pricing in the BoQ), which must stay Owner-only at the
  backend/query level, not just hidden in the UI.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
