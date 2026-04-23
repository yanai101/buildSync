# BuildFlow MVP Architecture (TanStack Start + Convex)

## Scope Guard
- This architecture implements MVP only.
- Excluded now: Phase 2 supplier portal, reports, reminders, AI features.

## Architectural Decisions
- Use TanStack Start as the app shell and routing runtime with file-based routes under `src/routes`.
- Use Convex as the system of record for all domain data and real-time reads.
- Use TanStack Query for UI-level caching and optimistic UX wrappers around Convex calls where needed.
- Use MUI as the component system for fast mobile-first delivery with mature RTL support.
- Use `react-i18next` with Hebrew (`he`) as default and no language switch in MVP.
- Keep strict separation between:
  - `convex/`: backend schema and function contracts
  - `src/features/*`: module UI + hooks + validation
  - `src/shared/*`: cross-cutting infrastructure (i18n, theme, rtl, providers)

## Runtime Layers
1. Presentation Layer (TanStack Start routes + MUI)
2. Feature Layer (budget/suppliers/payments/stages/files/dashboard)
3. Data Access Layer (feature hooks + Convex API client wrappers)
4. Backend Layer (Convex schema, queries, mutations, access checks)

## Access Control (MVP)
- Every Convex query/mutation enforces project ownership:
  - user must be authenticated
  - project.ownerUserId must match auth user identity
- No supplier/guest role in MVP.

## Mobile-First UX Rules
- Bottom navigation for `/app/*` routes.
- Global quick action for Add Expense (one tap from Budget/Home).
- Forms optimized for thumb reach and numeric keypad for amounts.

## Repository Structure (Target)
```text
build-flow/
  convex/
    schema.ts
    auth.ts
    projects.ts
    budgetCategories.ts
    expenses.ts
    suppliers.ts
    payments.ts
    stages.ts
    files.ts
    dashboard.ts
    seeds.ts
  src/
    routes/
      __root.tsx
      index.tsx
      auth/
        login.tsx
      onboarding/
        new-project.tsx
      app/
        route.tsx
        home.tsx
        budget/
          index.tsx
          $categoryId.tsx
        suppliers/
          index.tsx
          $supplierId.tsx
        payments.tsx
        stages/
          index.tsx
          $stageId.tsx
        files.tsx
    shared/
      providers/
      i18n/
      theme/
      components/
      utils/
      types/
    features/
      auth/
      onboarding/
      dashboard/
      budget/
      suppliers/
      payments/
      stages/
      files/
  public/
    manifest.webmanifest
    icons/
```

## Route Map (MVP)
- `/` redirect to `/app/home` if authenticated else `/auth/login`
- `/auth/login`
- `/onboarding/new-project`
- `/app/home`
- `/app/budget`
- `/app/budget/$categoryId`
- `/app/suppliers`
- `/app/suppliers/$supplierId`
- `/app/payments`
- `/app/stages`
- `/app/stages/$stageId`
- `/app/files`
