// Send postcards to a CSV list of recipients via the Postcard.bot bulk API
// Usage: POSTCARDBOT_API_KEY=pk_live_your_key node bulk-send.js customers.csv
//
// CSV format (first row = headers):
//   name,address_line1,city,state,zip,country
//   Jane Doe,123 Main St,San Francisco,CA,94102,US
//
// The message supports {{name}} which is replaced with each recipient's first name.

const fs = require("fs");
const path = require("path");

const API_KEY = process.env.POSTCARDBOT_API_KEY;
const BASE_URL = process.env.POSTCARDBOT_API_URL || "https://postcard.bot";

if (!API_KEY) {
  console.error("Set POSTCARDBOT_API_KEY environment variable");
  process.exit(1);
}

const csvFile = process.argv[2];
if (!csvFile) {
  console.error("Usage: node bulk-send.js <customers.csv>");
  console.error("\nSee sample.csv for the expected format.");
  process.exit(1);
}

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row = {};
    headers.forEach((h, i) => (row[h] = values[i] || ""));
    return {
      name: row.name || "",
      address_line1: row.address_line1 || row.address || "",
      address_line2: row.address_line2 || "",
      city: row.city || "",
      state: row.state || "",
      zip: row.zip || row.postal_code || "",
      country: row.country || "US",
    };
  });
}

async function bulkSend() {
  const recipients = parseCSV(csvFile);
  console.log(`Loaded ${recipients.length} recipients from ${csvFile}`);

  if (recipients.length === 0) {
    console.error("No recipients found in CSV");
    process.exit(1);
  }

  // Show first few recipients
  console.log("\nFirst recipients:");
  recipients.slice(0, 3).forEach((r) => {
    console.log(`  ${r.name}, ${r.city} ${r.state}`);
  });
  if (recipients.length > 3) console.log(`  ... and ${recipients.length - 3} more`);

  const response = await fetch(`${BASE_URL}/api/v1/postcards/bulk`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipients,
      from: {
        name: "Your Business Name",
        address_line1: "456 Oak Ave",
        city: "New York",
        state: "NY",
        zip: "10001",
      },
      // {{name}} is replaced with each recipient's first name
      message: "Hi {{name}}, thank you for being a valued customer! We appreciate your business.",
      image_url: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1875",
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("\nError:", data.error);
    if (data.details) console.error("Details:", data.details);
    process.exit(1);
  }

  console.log("\nBulk job queued!");
  console.log(`  Bulk ID: ${data.bulk_id}`);
  console.log(`  Total recipients: ${data.total}`);
  console.log(`  Reserved cost: $${data.total_cost.toFixed(2)}`);
  console.log(`  Status: ${data.status}`);
  console.log(`\nCards will be processed in background batches (~25/minute).`);
  console.log(`Check progress: node check-status.js ${data.bulk_id}`);
}

bulkSend().catch(console.error);
