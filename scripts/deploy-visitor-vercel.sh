#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMMIT="$(git rev-parse HEAD 2>/dev/null || date +%s)"
COMMIT_REF="$COMMIT" node scripts/write-version.js

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

ARGS=(deploy --temporary --yes --prod --format json)
ARGS+=(-e "DATABASE_URL=${DATABASE_URL}")
[[ -n "${ADMIN_SECRET:-}" ]] && ARGS+=(-e "ADMIN_SECRET=${ADMIN_SECRET}")
[[ -n "${SYNK_ADMIN_SESSION_SECRET:-}" ]] && ARGS+=(-e "SYNK_ADMIN_SESSION_SECRET=${SYNK_ADMIN_SESSION_SECRET}")
[[ -n "${SYNK_ADMIN_SECRET:-}" ]] && ARGS+=(-e "SYNK_ADMIN_SECRET=${SYNK_ADMIN_SECRET}")
[[ -n "${SYNK_ADMIN_USERNAME:-}" ]] && ARGS+=(-e "SYNK_ADMIN_USERNAME=${SYNK_ADMIN_USERNAME}")
[[ -n "${SYNK_ADMIN_PASSWORD_HASH:-}" ]] && ARGS+=(-e "SYNK_ADMIN_PASSWORD_HASH=${SYNK_ADMIN_PASSWORD_HASH}")
[[ -n "${SYNK_ADMIN_TOTP_SECRET:-}" ]] && ARGS+=(-e "SYNK_ADMIN_TOTP_SECRET=${SYNK_ADMIN_TOTP_SECRET}")
[[ -n "${VAPID_PUBLIC_KEY:-}" ]] && ARGS+=(-e "VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}")
[[ -n "${VAPID_PRIVATE_KEY:-}" ]] && ARGS+=(-e "VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}")
[[ -n "${VAPID_SUBJECT:-}" ]] && ARGS+=(-e "VAPID_SUBJECT=${VAPID_SUBJECT}")
[[ -n "${SYNK_ID_ORIGIN:-}" ]] && ARGS+=(-e "SYNK_ID_ORIGIN=${SYNK_ID_ORIGIN}")
[[ -n "${RESEND_API_KEY:-}" ]] && ARGS+=(-e "RESEND_API_KEY=${RESEND_API_KEY}")

npx vercel "${ARGS[@]}"
