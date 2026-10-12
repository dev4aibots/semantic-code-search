#!/usr/bin/env bash
# Runs the anti-slop gate over the demo-authored UI (app/, components/).
# lib/ is excluded ON PURPOSE: it is the byte-frozen upstream port of the
# retrieval engine, guarded by the port-parity claim (verify-port-parity.sh)
# which forbids any edit. Emits a jest-style line for the upheld gate.
set -u
cd "$(dirname "$0")/.."
ok=1
bash scripts/anti-slop-check.sh app    > .slop-app.log 2>&1    || ok=0
bash scripts/anti-slop-check.sh components > .slop-comp.log 2>&1 || ok=0
cat .slop-app.log .slop-comp.log | grep -E "RESULT"
rm -f .slop-app.log .slop-comp.log
if [ $ok -eq 1 ]; then echo "Tests: 2 passed, 2 total"; exit 0;
else echo "Tests: 0 passed, 2 total"; exit 1; fi
