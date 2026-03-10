"""Check the status of a postcard or bulk job.

Usage: POSTCARDBOT_API_KEY=pk_live_your_key python check_status.py <postcard_id or bulk_id>
"""

import os
import sys
import requests

API_KEY = os.environ.get("POSTCARDBOT_API_KEY")
BASE_URL = os.environ.get("POSTCARDBOT_API_URL", "https://postcard.bot")

if not API_KEY:
    print("Set POSTCARDBOT_API_KEY environment variable")
    sys.exit(1)

if len(sys.argv) < 2:
    print("Usage: python check_status.py <postcard_id or bulk_id>")
    sys.exit(1)

card_id = sys.argv[1]
is_bulk = card_id.startswith("bulk_")

url = (
    f"{BASE_URL}/api/v1/postcards/bulk/{card_id}"
    if is_bulk
    else f"{BASE_URL}/api/v1/postcards/{card_id}"
)

response = requests.get(url, headers={"Authorization": f"Bearer {API_KEY}"})
data = response.json()

if not response.ok:
    print(f"Error: {data.get('error')}")
    sys.exit(1)

if is_bulk:
    print("Bulk Job Status:")
    print(f"  ID: {data.get('id', card_id)}")
    print(f"  Status: {data['status']}")
    print(f"  Total: {data['total']}")
    print(f"  Processed: {data['processed']}")
    print(f"  Succeeded: {data['succeeded']}")
    print(f"  Failed: {data['failed']}")
    if data.get("failures"):
        print("\nFailures:")
        for f in data["failures"]:
            print(f"  {f['index']}: {f['error']}")
else:
    print("Postcard Status:")
    print(f"  ID: {data['id']}")
    print(f"  Status: {data['status']}")
    print(f"  Delivery: {data.get('delivery_status', 'pending')}")
    print(f"  Service: {data.get('service', 'unknown')}")
    print(f"  Expected delivery: {data.get('expected_delivery_date', 'TBD')}")
    to = data.get("to", {})
    print(f"  To: {to.get('name')}, {to.get('city')}, {to.get('country')}")
