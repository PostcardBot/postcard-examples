"""Read account-specific prices, balance and any pricing protection expiry."""
import json
import os
import sys
import requests

key = os.environ.get("POSTCARDBOT_API_KEY")
if not key:
    sys.exit("Set POSTCARDBOT_API_KEY")
base = os.environ.get("POSTCARDBOT_API_URL", "https://postcard.bot").rstrip("/")
response = requests.get(f"{base}/api/v1/balance", headers={"Authorization": f"Bearer {key}"}, timeout=30)
data = response.json()
if not response.ok:
    sys.exit(data.get("error", f"HTTP {response.status_code}"))
print(json.dumps(data, indent=2))
