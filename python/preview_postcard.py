"""Preview a single postcard without mailing or deducting balance via the Postcard.bot API.

Usage: POSTCARDBOT_API_KEY=pk_live_your_key python preview_postcard.py
"""

import json
import os
import sys
import requests

API_KEY = os.environ.get("POSTCARDBOT_API_KEY")
BASE_URL = os.environ.get("POSTCARDBOT_API_URL", "https://postcard.bot").rstrip("/")

if not API_KEY:
    print("Set POSTCARDBOT_API_KEY environment variable")
    print("Get your key at https://postcard.bot/account")
    sys.exit(1)

response = requests.post(
    f"{BASE_URL}/api/v1/postcards/preview",
    timeout=30,
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    },
    json={
        "to": {
            "name": "Jane Doe",
            "address_line1": "123 Main St",
            "city": "San Francisco",
            "state": "CA",
            "zip": "94102",
            "country": "US",
        },
        "from": {
            "name": "John Smith",
            "address_line1": "456 Oak Ave",
            "city": "New York",
            "state": "NY",
            "zip": "10001",
            "country": "US",
        },
        "message": "Wish you were here! Having an amazing time.",
        "image_url": "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1875",
    },
)

data = response.json()

if not response.ok:
    print(f"Error: {data.get('error')}")
    if data.get("details"):
        print(f"Details: {data['details']}")
    if data.get("top_up_url"):
        print(f"Add balance: {data['top_up_url']}")
    sys.exit(1)

print(json.dumps(data, indent=2))
print("Preview only. No postcard sent and no balance deducted.")
