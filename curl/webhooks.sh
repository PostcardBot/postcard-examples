#!/usr/bin/env bash
set -euo pipefail
# Webhook management via the Postcard.bot API
# Usage: POSTCARDBOT_API_KEY=pk_live_your_key bash webhooks.sh [create|list|delete <id>]

if [ -z "${POSTCARDBOT_API_KEY:-}" ]; then
  echo "Set POSTCARDBOT_API_KEY environment variable"
  exit 1
fi

BASE_URL="${POSTCARDBOT_API_URL:-https://postcard.bot}"
ACTION="${1:-list}"

case "$ACTION" in
  create)
    URL="${2:?Usage: webhooks.sh create https://your-server.example/webhooks}"
    payload=$(printf '%s' "$URL" | "${PYTHON:-python3}" -c 'import json,sys; print(json.dumps({"url":sys.stdin.read(),"events":["postcard.created","postcard.sent","postcard.delivered","postcard.failed","postcard.returned"]}))')
    echo "Creating webhook for $URL..."
    curl --silent --show-error --fail-with-body --connect-timeout 10 --max-time 30 -X POST "$BASE_URL/api/v1/webhooks" \
      -H "Authorization: Bearer $POSTCARDBOT_API_KEY" \
      -H "Content-Type: application/json" \
      --data-binary "$payload"
    echo ""
    echo "IMPORTANT: Save the 'secret' above — it won't be shown again."
    ;;

  list)
    echo "Listing webhooks..."
    curl --silent --show-error --fail-with-body --connect-timeout 10 --max-time 30 "$BASE_URL/api/v1/webhooks" \
      -H "Authorization: Bearer $POSTCARDBOT_API_KEY"
    ;;

  delete)
    WEBHOOK_ID="${2:-}"
    if [ -z "$WEBHOOK_ID" ]; then
      echo "Usage: bash webhooks.sh delete <webhook_id>"
      exit 1
    fi
    [[ "$WEBHOOK_ID" =~ ^[A-Za-z0-9_-]+$ ]] || { echo "Invalid webhook ID" >&2; exit 1; }
    echo "Deleting webhook $WEBHOOK_ID..."
    curl --silent --show-error --fail-with-body --connect-timeout 10 --max-time 30 -X DELETE "$BASE_URL/api/v1/webhooks/$WEBHOOK_ID" \
      -H "Authorization: Bearer $POSTCARDBOT_API_KEY"
    ;;

  *)
    echo "Usage: bash webhooks.sh [create <url>|list|delete <id>]"
    exit 1
    ;;
esac
