#!/bin/sh
# Stop hook: refuse to end a turn on a red suite — but only if source actually
# changed, so questions, code reading and doc edits never trigger a test run.
set -e
ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
[ -f "$ROOT/.claude/.factory-off" ] && exit 0
cd "$ROOT" || exit 0

CHANGED="$(git status --porcelain -- 'my-tanstack-app/src' 'my-tanstack-app/convex' 2>/dev/null)"
[ -z "$CHANGED" ] && exit 0

cd my-tanstack-app || exit 0
if ! npm run --silent gate:fast; then
  echo "stop-gate: gate:fast is failing — fix it before finishing." >&2
  exit 2
fi
