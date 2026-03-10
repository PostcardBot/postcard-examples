#!/bin/bash
# Send a single postcard via the Postcard.bot API
# Usage: POSTCARDBOT_API_KEY=pk_live_your_key bash send-postcard.sh

if [ -z "$POSTCARDBOT_API_KEY" ]; then
  echo "Set POSTCARDBOT_API_KEY environment variable"
  echo "Get your key at https://postcard.bot/account"
  exit 1
fi

BASE_URL="${POSTCARDBOT_API_URL:-https://postcard.bot}"

curl -s -X POST "$BASE_URL/api/v1/postcards" \
  -H "Authorization: Bearer $POSTCARDBOT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": {
      "name": "Jane Doe",
      "address_line1": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "zip": "94102",
      "country": "US"
    },
    "from": {
      "name": "John Smith",
      "address_line1": "456 Oak Ave",
      "city": "New York",
      "state": "NY",
      "zip": "10001"
    },
    "message": "Wish you were here! Having an amazing time.",
    "image_url": "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1875"
  }' | python3 -m json.tool 2>/dev/null || cat
