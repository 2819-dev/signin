#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# Stamp a version the PWA can pick up for force-refresh.
COMMIT="$(git rev-parse HEAD 2>/dev/null || date +%s)"
COMMIT_REF="$COMMIT" node scripts/write-version.js
cd "$ROOT/synk-id"
node scripts/prepare.js
SITE_ID="${SYNK_ID_SITE_ID:-2b1916d4-9d03-4cff-855a-19ec6fa1da39}"
npx netlify deploy --prod --dir=public --site="$SITE_ID"
