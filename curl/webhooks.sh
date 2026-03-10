#!/bin/bash
# Webhook management via the Postcard.bot API
# Usage: POSTCARDBOT_API_KEY=pk_live_your_key bash webhooks.sh [create|list|delete <id>]

if [ -z "$POSTCARDBOT_API_KEY" ]; then
  echo "Set POSTCARDBOT_API_KEY environment variable"
  exit 1
fi

BASE_URL="${POSTCARDBOT_API_URL:-https://postcard.bot}"
ACTION="${1:-list}"

case "$ACTION" in
  create)
    URL="${2:-https://example.com/webhooks}"
    echo "Creating webhook for $URL..."
    curl -s -X POST "$BASE_URL/api/v1/webhooks" \
      -H "Authorization: Bearer $POSTCARDBOT_API_KEY" \
      -H "Content-Type: application/json" \
      -d "{
        \"url\": \"$URL\",
        \"events\": [\"postcard.created\", \"postcard.sent\", \"postcard.delivered\", \"postcard.failed\", \"postcard.returned\"]
      }" | python3 -m json.tool 2>/dev/null || cat
    echo ""
    echo "IMPORTANT: Save the 'secret' above — it won't be shown again."
    ;;

  list)
    echo "Listing webhooks..."
    curl -s "$BASE_URL/api/v1/webhooks" \
      -H "Authorization: Bearer $POSTCARDBOT_API_KEY" \
      | python3 -m json.tool 2>/dev/null || cat
    ;;

  delete)
    WEBHOOK_ID="$2"
    if [ -z "$WEBHOOK_ID" ]; then
      echo "Usage: bash webhooks.sh delete <webhook_id>"
      exit 1
    fi
    echo "Deleting webhook $WEBHOOK_ID..."
    curl -s -X DELETE "$BASE_URL/api/v1/webhooks/$WEBHOOK_ID" \
      -H "Authorization: Bearer $POSTCARDBOT_API_KEY" \
      | python3 -m json.tool 2>/dev/null || cat
    ;;

  *)
    echo "Usage: bash webhooks.sh [create <url>|list|delete <id>]"
    ;;
esac
