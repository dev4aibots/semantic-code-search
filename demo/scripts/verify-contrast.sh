#!/usr/bin/env bash
# WCAG AA contrast claims for the demo's key text pairs (ccr = @siluat/color-contrast-cli).
# Accent #0071E3 (light) / #0091FF (dark) are the locked single blue, chosen
# because they are text-safe in both directions (the old #0088FF failed).
set -u
cd "$(dirname "$0")/.."
PASS=0; FAIL=0
pair() { # $1 name $2 fg $3 bg
  if npx ccr "$2" "$3" --level AA >/dev/null 2>&1; then
    PASS=$((PASS+1)); echo "ok - $1 ($2 on $3)"
  else
    FAIL=$((FAIL+1)); echo "FAIL - $1 ($2 on $3)"
  fi
}
pair "body text, light"      "#000000" "#FFFFFF"
pair "body text, dark"       "#FFFFFF" "#000000"
pair "button text on accent" "#FFFFFF" "#0071E3"
pair "accent text, light"    "#0071E3" "#FFFFFF"
pair "accent text, dark"     "#0091FF" "#000000"
pair "code text on secondary bg" "#000000" "#F2F2F7"
echo "Tests: $PASS passed, $((PASS+FAIL)) total"
[ "$FAIL" -eq 0 ]
