"""Send postcards to a CSV list of recipients via the Postcard.bot bulk API.

Usage: POSTCARDBOT_API_KEY=pk_live_your_key python bulk_send.py customers.csv

CSV format (first row = headers):
  name,address_line1,city,state,zip,country
  Jane Doe,123 Main St,San Francisco,CA,94102,US
"""

import csv
import os
import sys
import requests

API_KEY = os.environ.get("POSTCARDBOT_API_KEY")
BASE_URL = os.environ.get("POSTCARDBOT_API_URL", "https://postcard.bot")

if not API_KEY:
    print("Set POSTCARDBOT_API_KEY environment variable")
    sys.exit(1)

if len(sys.argv) < 2:
    print("Usage: python bulk_send.py <customers.csv>")
    sys.exit(1)

csv_file = sys.argv[1]

# Parse CSV
recipients = []
with open(csv_file, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        recipients.append({
            "name": row.get("name", ""),
            "address_line1": row.get("address_line1") or row.get("address", ""),
            "address_line2": row.get("address_line2", ""),
            "city": row.get("city", ""),
            "state": row.get("state", ""),
            "zip": row.get("zip") or row.get("postal_code", ""),
            "country": row.get("country", "US"),
        })

print(f"Loaded {len(recipients)} recipients from {csv_file}")

# Show first few
for r in recipients[:3]:
    print(f"  {r['name']}, {r['city']} {r['state']}")
if len(recipients) > 3:
    print(f"  ... and {len(recipients) - 3} more")

response = requests.post(
    f"{BASE_URL}/api/v1/postcards/bulk",
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    },
    json={
        "recipients": recipients,
        "from": {
            "name": "Your Business Name",
            "address_line1": "456 Oak Ave",
            "city": "New York",
            "state": "NY",
            "zip": "10001",
        },
        # {{name}} is replaced with each recipient's first name
        "message": "Hi {{name}}, thank you for being a valued customer!",
        "image_url": "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1875",
    },
)

data = response.json()

if not response.ok:
    print(f"\nError: {data.get('error')}")
    if data.get("details"):
        print(f"Details: {data['details']}")
    sys.exit(1)

print("\nBulk job queued!")
print(f"  Bulk ID: {data['bulk_id']}")
print(f"  Total recipients: {data['total']}")
print(f"  Reserved cost: ${data['total_cost']:.2f}")
print(f"  Status: {data['status']}")
print(f"\nCards will be processed in background batches (~25/minute).")
print(f"Check progress: python check_status.py {data['bulk_id']}")
