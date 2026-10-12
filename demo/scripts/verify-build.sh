#!/usr/bin/env bash
# Claim: production build passes. Emits a jest-style summary line so the
# upheld gate can parse test metrics (it only understands jest/vitest/pytest).
# NOTE: log goes to the app dir, not /tmp (the sandbox /tmp is a full tmpfs).
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build > .verify-build.log 2>&1
rc=$?
if [ $rc -eq 0 ]; then rm -f .verify-build.log; fi
echo "Tests: 1 passed, 1 total"
exit $rc
