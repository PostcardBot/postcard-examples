#!/usr/bin/env bash
set -euo pipefail
: "${POSTCARDBOT_API_KEY:?Set POSTCARDBOT_API_KEY}"
ID="${1:?Usage: check-status.sh postcard_id_or_bulk_id}"
[[ "$ID" =~ ^[A-Za-z0-9_-]+$ ]] || { echo "Invalid ID" >&2; exit 1; }
BASE_URL="${POSTCARDBOT_API_URL:-https://postcard.bot}"
PATH_PART="postcards/$ID"
[[ "$ID" != bulk_* ]] || PATH_PART="postcards/bulk/$ID"
curl --silent --show-error --fail-with-body --connect-timeout 10 --max-time 30 \
  "${BASE_URL%/}/api/v1/$PATH_PART" -H "Authorization: Bearer $POSTCARDBOT_API_KEY"
