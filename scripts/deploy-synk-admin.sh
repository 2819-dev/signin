#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/synk-admin"
node scripts/prepare.js
SITE_ID="${SYNK_ADMIN_SITE_ID:-5d48ff79-2b95-4c34-aecb-01bcc9c75421}"
npx netlify deploy --prod --dir=public --site="$SITE_ID"
