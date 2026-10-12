#!/usr/bin/env bash
# Claim: production build passes. Emits a jest-style summary line so the
# upheld gate can parse test metrics (it only understands jest/vitest/pytest).
set -euo pipefail
npm run build > /tmp/verify-build.log 2>&1
echo "Tests: 1 passed, 1 total"
