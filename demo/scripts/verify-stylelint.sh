#!/usr/bin/env bash
# Runs stylelint with the demo's .stylelintrc.json and emits a jest-style
# summary line so the upheld gate can parse test metrics (exit 0 alone is
# UNMET to upheld, which only understands jest/vitest/pytest metrics).
set -u
cd "$(dirname "$0")/.."
out=$(npx stylelint "app/**/*.css" 2>&1)
rc=$?
if [ $rc -eq 0 ]; then
  echo "Tests: 1 passed, 1 total"
else
  echo "$out" | head -20
  echo "Tests: 0 passed, 1 total"
fi
exit $rc
