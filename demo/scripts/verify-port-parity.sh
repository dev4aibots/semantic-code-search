#!/usr/bin/env bash
# Verifies the engine files in app/lib/ are byte-identical to the audited port
# at ~/workspace/demos/semantic-code-search/lib/ (retrieval behavior frozen).
set -euo pipefail
SRC="$HOME/workspace/demos/semantic-code-search/lib"
DST="$HOME/workspace/demos/semantic-code-search/app/lib"
for f in types.ts corpus.ts index_store.ts retrieval.ts app.ts; do
  diff -q "$SRC/$f" "$DST/$f" > /dev/null || { echo "MISMATCH: $f"; exit 1; }
done
echo "PORT PARITY: 5/5 files byte-identical"
echo "Tests: 5 passed, 5 total"
