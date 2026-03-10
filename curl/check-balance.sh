#!/bin/bash
# Check account balance and current pricing tier
# Usage: POSTCARDBOT_API_KEY=pk_live_your_key bash check-balance.sh

if [ -z "$POSTCARDBOT_API_KEY" ]; then
  echo "Set POSTCARDBOT_API_KEY environment variable"
  exit 1
fi

BASE_URL="${POSTCARDBOT_API_URL:-https://postcard.bot}"

curl -s "$BASE_URL/api/v1/balance" \
  -H "Authorization: Bearer $POSTCARDBOT_API_KEY" \
  | python3 -m json.tool 2>/dev/null || cat
