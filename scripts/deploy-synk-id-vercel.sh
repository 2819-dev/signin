#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMMIT="$(git rev-parse HEAD 2>/dev/null || date +%s)"
COMMIT_REF="$COMMIT" node scripts/write-version.js

cd "$ROOT/synk-id"
node scripts/prepare.js

# Anonymous / claimable deploy by default. Pass --prod-project after claiming.
npx vercel deploy --temporary --yes --prod --format json

cd "$ROOT"
COMMIT_REF="$COMMIT" node scripts/notify-app-update.js "$COMMIT" || true
