---
description: Run the quality gate (typecheck both projects + tests + coverage) and report a pass/fail table.
---

Run the gate and report it as a compact table. Do not paste raw tool output.

1. `cd my-tanstack-app && npm run gate`
2. Report one row per stage — app typecheck, convex typecheck, tests, coverage —
   each PASS/FAIL, plus the test count and the four coverage percentages.
3. On failure: show only the failing diagnostics (file:line and message), the
   likely cause, and the smallest fix. Do not fix anything unless asked.

Use `npm run gate:fast` instead if the caller only wants typecheck + tests with
no coverage (it is about a second faster and is what the in-loop hook runs).
