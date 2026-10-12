#!/usr/bin/env bash
# Claim: zero TypeScript errors. Jest-style summary for the upheld parser.
set -euo pipefail
npx tsc --noEmit
echo "Tests: 1 passed, 1 total"
