// Send a single postcard via the Postcard.bot API
// Usage: POSTCARDBOT_API_KEY=pk_live_your_key node send-postcard.js

const API_KEY = process.env.POSTCARDBOT_API_KEY;
const BASE_URL = process.env.POSTCARDBOT_API_URL || "https://postcard.bot";

if (!API_KEY) {
  console.error("Set POSTCARDBOT_API_KEY environment variable");
  console.error("Get your key at https://postcard.bot/account");
  process.exit(1);
}

async function sendPostcard() {
  const response = await fetch(`${BASE_URL}/api/v1/postcards`, {
    method: "POST",
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

  console.log("Postcard sent!");
  console.log(`  ID: ${data.id}`);
  console.log(`  Service: ${data.service}`);
  console.log(`  Price: $${data.price.toFixed(2)}`);
  console.log(`  Balance remaining: $${data.balance_remaining.toFixed(2)}`);
  console.log(`  Expected delivery: ${data.expected_delivery_date || "TBD"}`);
}

sendPostcard().catch(console.error);
