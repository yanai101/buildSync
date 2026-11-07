#!/bin/sh
# PostToolUse(Edit|Write): typecheck only the project the edited file belongs to.
# Exits immediately for anything that isn't backend or frontend source, so docs,
# config and plan edits cost nothing.
set -e
ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
[ -f "$ROOT/.claude/.factory-off" ] && exit 0

FILE="$(cat - 2>/dev/null | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
[ -z "$FILE" ] && exit 0

cd "$ROOT/my-tanstack-app" || exit 0
case "$FILE" in
  */my-tanstack-app/convex/*.ts) npm run --silent typecheck:convex ;;
  */my-tanstack-app/src/*.ts|*/my-tanstack-app/src/*.tsx) npm run --silent typecheck ;;
  *) exit 0 ;;
esac
