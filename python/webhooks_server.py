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
from base64 import b64encode

from flask import Flask, request, jsonify

WEBHOOK_SECRET = os.environ.get("WEBHOOK_SECRET")
PORT = int(os.environ.get("PORT", 3001))

if not WEBHOOK_SECRET:
    print("Set WEBHOOK_SECRET environment variable")
    print("You get this when creating a webhook via the API")
    sys.exit(1)

app = Flask(__name__)


def verify_signature(raw_body: bytes, signature_header: str) -> bool:
    if not signature_header:
        return False

    # Parse "t=timestamp,v1=base64signature"
    parts = {}
    for part in signature_header.split(","):
        key, _, value = part.partition("=")
        parts[key] = value

    timestamp = parts.get("t")
    signature = parts.get("v1")

    if not timestamp or not signature:
        return False

    # Reject timestamps older than 5 minutes
    age = abs(time.time() * 1000 - int(timestamp))
    if age > 5 * 60 * 1000:
        print(f"Webhook timestamp too old: {age:.0f}ms")
        return False

    # Verify HMAC-SHA256
    payload = f"{timestamp}.{raw_body.decode()}"
    expected = b64encode(
        hmac.new(
            WEBHOOK_SECRET.encode(), payload.encode(), hashlib.sha256
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

    event = json.loads(raw_body)

    print(f"Webhook received: {event['event']}")
    print(f"  Postcard: {event['postcard_id']}")
    print(f"  Status: {event['status']}")
    print(f"  To: {event.get('to', {}).get('name')}, {event.get('to', {}).get('city')}")

    # Handle different event types
    handlers = {
        "postcard.created": lambda: print("  -> Postcard created, will be printed soon"),
        "postcard.sent": lambda: print("  -> Postcard printed and mailed!"),
        "postcard.delivered": lambda: print("  -> Postcard delivered!"),
        "postcard.failed": lambda: print(f"  -> Postcard failed: {event.get('error')}"),
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
