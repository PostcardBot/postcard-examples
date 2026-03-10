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

if (!WEBHOOK_SECRET) {
  console.error("Set WEBHOOK_SECRET environment variable");
  console.error("You get this when creating a webhook via the API");
  process.exit(1);
}

const app = express();

// Need raw body for signature verification
app.use("/webhooks", express.raw({ type: "application/json" }));

function verifySignature(rawBody, signatureHeader) {
  if (!signatureHeader) return false;

  // Format: t=timestamp,v1=base64signature
  const parts = {};
  signatureHeader.split(",").forEach((part) => {
    const [key, value] = part.split("=", 2);
    parts[key] = value;
  });

  const timestamp = parts.t;
  const signature = parts.v1;

  if (!timestamp || !signature) return false;

  // Reject timestamps older than 5 minutes
  const age = Math.abs(Date.now() - parseInt(timestamp));
  if (age > 5 * 60 * 1000) {
    console.warn("Webhook timestamp too old:", age, "ms");
    return false;
  }

  // Verify HMAC-SHA256
  const payload = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("base64");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

app.post("/webhooks", (req, res) => {
  const signature = req.headers["x-postcardbot-signature"];
  const rawBody = req.body.toString();

  if (!verifySignature(rawBody, signature)) {
    console.error("Invalid webhook signature");
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = JSON.parse(rawBody);

  console.log(`Webhook received: ${event.event}`);
  console.log(`  Postcard: ${event.postcard_id}`);
  console.log(`  Status: ${event.status}`);
  console.log(`  To: ${event.to?.name}, ${event.to?.city}`);
  console.log(`  Time: ${event.timestamp}`);

  // Handle different event types
  switch (event.event) {
    case "postcard.created":
      console.log("  -> Postcard created, will be printed soon");
      break;
    case "postcard.sent":
      console.log("  -> Postcard printed and mailed!");
      break;
    case "postcard.delivered":
      console.log("  -> Postcard delivered!");
      break;
    case "postcard.failed":
      console.log("  -> Postcard failed:", event.error);
      break;
    case "postcard.returned":
      console.log("  -> Postcard returned to sender");
      break;
  }

  res.json({ received: true });
});

app.listen(PORT, () => {
  console.log(`Webhook server listening on port ${PORT}`);
  console.log(`POST http://localhost:${PORT}/webhooks`);
  console.log("\nUse a tunnel (ngrok, cloudflared) to expose this to the internet.");
});
