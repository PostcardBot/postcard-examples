// Express server that receives and verifies Postcard.bot webhook events
// Usage: WEBHOOK_SECRET=whsec_your_secret node webhooks-server.js
//
// 1. First create a webhook via the API or MCP:
//    curl -X POST https://postcard.bot/api/v1/webhooks \
//      -H "Authorization: Bearer pk_live_your_key" \
//      -H "Content-Type: application/json" \
//      -d '{"url":"https://your-server.com/webhooks","events":["postcard.sent","postcard.delivered"]}'
//
// 2. Save the "secret" from the response
// 3. Run this server with that secret

const express = require("express");
const crypto = require("crypto");

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const PORT = process.env.PORT || 3001;

if (!WEBHOOK_SECRET && require.main === module) {
  console.error("Set WEBHOOK_SECRET environment variable");
  console.error("You get this when creating a webhook via the API");
  process.exit(1);
}

const app = express();

// Need raw body for signature verification
app.use("/webhooks", express.raw({ type: "application/json" }));

function verifySignature(rawBody, signatureHeader, secret = WEBHOOK_SECRET, now = Math.floor(Date.now() / 1000)) {
  if (!secret || !Buffer.isBuffer(rawBody) || typeof signatureHeader !== 'string') return false;

  // Format: t=timestamp,v1=base64signature
  const parts = Object.create(null);
  for (const part of signatureHeader.split(',')) {
    const separator = part.indexOf('=');
    if (separator < 1) return false;
    const key = part.slice(0, separator).trim();
    if (Object.hasOwn(parts, key)) return false;
    parts[key] = part.slice(separator + 1).trim(); // Preserve Base64 '=' padding.
  }

  const timestamp = parts.t;
  const signature = parts.v1;

  if (!/^\d{1,12}$/.test(timestamp || '') || !/^[A-Za-z0-9+/]{43}=$/.test(signature || '')) return false;

  // Reject timestamps older than 5 minutes
  // The API signs Unix SECONDS, not milliseconds. Reject invalid/future/stale values.
  const seconds = Number(timestamp);
  if (!Number.isSafeInteger(seconds) || Math.abs(now - seconds) > 300) return false;

  // Verify HMAC-SHA256
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(rawBody)
    .digest();

  const supplied = Buffer.from(signature, 'base64');
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

app.post("/webhooks", (req, res) => {
  const signature = req.headers["x-postcardbot-signature"];
  const rawBody = req.body;

  if (!verifySignature(rawBody, signature)) {
    console.error("Invalid webhook signature");
    return res.status(401).json({ error: "Invalid signature" });
  }

  let event;
  try { event = JSON.parse(rawBody.toString('utf8')); }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  if (!event || typeof event.event !== 'string' || !event.data || typeof event.data !== 'object' || Array.isArray(event.data)) {
    return res.status(400).json({ error: 'Invalid event envelope' });
  }
  const data = event.data;

  console.log(`Webhook received: ${event.event}`);
  console.log(`  Postcard/bulk job: ${data.postcard_id || data.bulk_id || 'N/A'}`);
  console.log(`  Status: ${data.status || 'See event type'}`);
  console.log(`  Time: ${event.timestamp}`);

  // Handle different event types
  switch (event.event) {
    case "postcard.created":
      console.log("  -> Postcard created; this does not confirm printing or delivery");
      break;
    case "postcard.sent":
      console.log(data.is_bulk ? "  -> Bulk processing summary" : "  -> Accepted for printing; not proof of delivery");
      break;
    case "postcard.delivered":
      console.log("  -> Postcard delivered!");
      break;
    case "postcard.failed":
      console.log("  -> Postcard failed:", data.error);
      break;
    case "postcard.returned":
      console.log("  -> Postcard returned to sender");
      break;
  }

  res.json({ received: true });
});

// Make business actions idempotent: duplicate webhook deliveries must not repeat them.
module.exports = { verifySignature, app };
if (require.main === module) app.listen(PORT, () => {
  console.log(`Webhook server listening on port ${PORT}`);
  console.log(`POST http://localhost:${PORT}/webhooks`);
  console.log("\nUse a tunnel (ngrok, cloudflared) to expose this to the internet.");
});
