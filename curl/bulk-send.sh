#!/bin/bash
# Send postcards to multiple recipients via the bulk API
# Usage: POSTCARDBOT_API_KEY=pk_live_your_key bash bulk-send.sh

if [ -z "$POSTCARDBOT_API_KEY" ]; then
  echo "Set POSTCARDBOT_API_KEY environment variable"
  exit 1
fi

BASE_URL="${POSTCARDBOT_API_URL:-https://postcard.bot}"

curl -s -X POST "$BASE_URL/api/v1/postcards/bulk" \
  -H "Authorization: Bearer $POSTCARDBOT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "name": "Jane Doe",
        "address_line1": "123 Main St",
        "city": "San Francisco",
        "state": "CA",
        "zip": "94102",
        "country": "US"
      },
      {
        "name": "Bob Wilson",
        "address_line1": "789 Pine Rd",
        "city": "Los Angeles",
        "state": "CA",
        "zip": "90001",
        "country": "US"
      }
    ],
    "from": {
      "name": "Your Business Name",
      "address_line1": "456 Oak Ave",
      "city": "New York",
      "state": "NY",
      "zip": "10001"
    },
    "message": "Hi {{name}}, thank you for being a valued customer!",
    "image_url": "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1875"
  }' | python3 -m json.tool 2>/dev/null || cat

echo ""
echo "Cards are processed in background batches (~25/minute)."
echo "Use check-balance.sh to verify your balance."
