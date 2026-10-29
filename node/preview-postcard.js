// Preview a single postcard without mailing or deducting balance via the Postcard.bot API
// Usage: POSTCARDBOT_API_KEY=pk_live_your_key node preview-postcard.js

const API_KEY = process.env.POSTCARDBOT_API_KEY;
const BASE_URL = (process.env.POSTCARDBOT_API_URL || "https://postcard.bot").replace(/\/+$/, "");

if (!API_KEY) {
  console.error("Set POSTCARDBOT_API_KEY environment variable");
  console.error("Get your key at https://postcard.bot/account");
  process.exit(1);
}

async function previewPostcard() {
  const response = await fetch(`${BASE_URL}/api/v1/postcards/preview`, {
    method: "POST",
    signal: AbortSignal.timeout(30000),
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: {
        name: "Jane Doe",
        address_line1: "123 Main St",
        city: "San Francisco",
        state: "CA",
        zip: "94102",
        country: "US",
      },
      from: {
        name: "John Smith",
        address_line1: "456 Oak Ave",
        city: "New York",
        state: "NY",
        zip: "10001",
        country: "US",
      },
      message: "Wish you were here! Having an amazing time.",
      image_url: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1875",
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Error:", data.error);
    if (data.details) console.error("Details:", data.details);
    if (data.top_up_url) console.error("Add balance:", data.top_up_url);
    process.exit(1);
  }

  console.log(JSON.stringify(data, null, 2));
  console.log("Preview only. No postcard sent and no balance deducted.");
}

previewPostcard().catch((error) => { console.error(error.message); process.exitCode = 1; });
