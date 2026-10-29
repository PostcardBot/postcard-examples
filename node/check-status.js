// Check the status of a postcard or bulk job
// Usage: POSTCARDBOT_API_KEY=pk_live_your_key node check-status.js <postcard_id or bulk_id>

const API_KEY = process.env.POSTCARDBOT_API_KEY;
const BASE_URL = (process.env.POSTCARDBOT_API_URL || "https://postcard.bot").replace(/\/+$/, "");

if (!API_KEY) {
  console.error("Set POSTCARDBOT_API_KEY environment variable");
  process.exit(1);
}

const id = process.argv[2];
if (!id) {
  console.error("Usage: node check-status.js <postcard_id or bulk_id>");
  process.exit(1);
}

async function checkStatus() {
  // Determine if this is a bulk job or single postcard
  const isBulk = id.startsWith("bulk_");
  const endpoint = isBulk
    ? `${BASE_URL}/api/v1/postcards/bulk/${encodeURIComponent(id)}`
    : `${BASE_URL}/api/v1/postcards/${encodeURIComponent(id)}`;

  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${API_KEY}` },
    signal: AbortSignal.timeout(30000),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Error:", data.error);
    process.exit(1);
  }

  if (isBulk) {
    console.log("Bulk Job Status:");
    console.log(`  ID: ${data.bulk_id || id}`);
    console.log(`  Status: ${data.status}`);
    console.log(`  Total: ${data.total}`);
    console.log(`  Processed: ${data.processed}`);
    console.log(`  Succeeded: ${data.succeeded}`);
    console.log(`  Failed: ${data.failed}`);
    if (data.failures?.length) {
      console.log("\nFailures:");
      data.failures.forEach((f) => console.log(`  ${f.index}: ${f.error}`));
    }
  } else {
    console.log("Postcard Status:");
    console.log(`  ID: ${data.id}`);
    console.log(`  Status: ${data.status}`);
    console.log(`  Delivery: ${data.delivery_status || "pending"}`);
    console.log(`  Expected delivery: ${data.expected_delivery_date || "TBD"}`);
    console.log(`  To: ${data.to?.name}, ${data.to?.city}, ${data.to?.country}`);
    if (data.error) console.log(`  Reason: ${data.error}`);
    if (data.refund) console.log("  Refund:", JSON.stringify(data.refund));
    if (data.queued_since) console.log(`  Queued since: ${data.queued_since}`);
  }
}

checkStatus().catch((error) => { console.error(error.message); process.exitCode = 1; });
