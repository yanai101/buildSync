---
description: Turn the ambient factory hooks on or off, or report their state. Usage: /factory on|off|status
argument-hint: on | off | status
---

Argument: `$ARGUMENTS` (one of `on`, `off`, `status`; treat empty as `status`).

The switch is the presence of the file `.claude/.factory-off` at the repo root.
Both ambient hooks (`post-edit.sh`, `stop-gate.sh`) check for it first and exit 0
if it exists.

- `off`   → create it (`touch .claude/.factory-off`). Confirm that per-edit
            typecheck and the end-of-turn gate are now silent.
- `on`    → remove it (`rm -f .claude/.factory-off`).
- `status`→ report whether the file exists, and say which layers are active.

Always state clearly that `.githooks/pre-push` is **not** affected by this
switch: it still gates every push, because it is what stands in front of
production. Bypassing it is a deliberate `git push --no-verify`.
