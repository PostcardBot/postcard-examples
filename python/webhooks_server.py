"""Flask server that receives and verifies Postcard.bot webhook events.

Usage: WEBHOOK_SECRET=whsec_your_secret python webhooks_server.py

1. Create a webhook via the API:
   curl -X POST https://postcard.bot/api/v1/webhooks \
     -H "Authorization: Bearer pk_live_your_key" \
     -H "Content-Type: application/json" \
     -d '{"url":"https://your-server.com/webhooks","events":["postcard.sent","postcard.delivered"]}'

2. Save the "secret" from the response
3. Run this server with that secret
"""

import hashlib
import hmac
import json
import os
import sys
import time
import re
from base64 import b64encode

from flask import Flask, request, jsonify

WEBHOOK_SECRET = os.environ.get("WEBHOOK_SECRET")
PORT = int(os.environ.get("PORT", 3001))

if not WEBHOOK_SECRET and __name__ == "__main__":
    print("Set WEBHOOK_SECRET environment variable")
    print("You get this when creating a webhook via the API")
    sys.exit(1)

app = Flask(__name__)


def verify_signature(raw_body: bytes, signature_header: str, secret=None, now=None) -> bool:
    secret = secret or WEBHOOK_SECRET
    if not signature_header or not secret:
        return False

    # Parse "t=timestamp,v1=base64signature"
    parts = {}
    for part in signature_header.split(","):
        key, separator, value = part.partition("=")
        key = key.strip()
        if not separator or not key or key in parts:
            return False
        parts[key] = value.strip()

    timestamp = parts.get("t")
    signature = parts.get("v1")

    if not re.fullmatch(r"[0-9]{1,12}", timestamp or "") or not re.fullmatch(r"[A-Za-z0-9+/]{43}=", signature or ""):
        return False

    # Reject timestamps older than 5 minutes
    # The signature header uses Unix seconds, not milliseconds.
    age = abs((time.time() if now is None else now) - int(timestamp))
    if age > 300:
        return False

    # Verify HMAC-SHA256
    payload = timestamp.encode("ascii") + b"." + raw_body
    expected = b64encode(
        hmac.new(
            secret.encode(), payload, hashlib.sha256
        ).digest()
    ).decode()

    return hmac.compare_digest(signature, expected)


@app.route("/webhooks", methods=["POST"])
def handle_webhook():
    raw_body = request.get_data()
    signature = request.headers.get("X-PostcardBot-Signature", "")

    if not verify_signature(raw_body, signature):
        print("Invalid webhook signature")
        return jsonify({"error": "Invalid signature"}), 401

    try:
        event = json.loads(raw_body)
    except (ValueError, UnicodeDecodeError):
        return jsonify({"error": "Invalid JSON"}), 400
    if not isinstance(event, dict) or not isinstance(event.get("event"), str) or not isinstance(event.get("data"), dict):
        return jsonify({"error": "Invalid event envelope"}), 400
    data = event["data"]

    print(f"Webhook received: {event['event']}")
    print(f"  Postcard/bulk job: {data.get('postcard_id', data.get('bulk_id', 'N/A'))}")
    print(f"  Status: {data.get('status', 'See event type')}")

    # Handle different event types
    handlers = {
        "postcard.created": lambda: print("  -> Created; this does not confirm printing or delivery"),
        "postcard.sent": lambda: print("  -> Bulk processing summary" if data.get("is_bulk") else "  -> Accepted for printing; not proof of delivery"),
        "postcard.delivered": lambda: print("  -> Postcard delivered!"),
        "postcard.failed": lambda: print(f"  -> Postcard failed: {data.get('error')}"),
        "postcard.returned": lambda: print("  -> Postcard returned to sender"),
    }

    handler = handlers.get(event["event"])
    if handler:
        handler()

    return jsonify({"received": True})


if __name__ == "__main__":
    print(f"Webhook server listening on port {PORT}")
    print(f"POST http://localhost:{PORT}/webhooks")
    print("\nUse a tunnel (ngrok, cloudflared) to expose this to the internet.")
    app.run(port=PORT)
