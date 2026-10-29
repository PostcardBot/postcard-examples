// Read your balance, current account-specific prices and any protection expiry.
const key = process.env.POSTCARDBOT_API_KEY;
const base = (process.env.POSTCARDBOT_API_URL || 'https://postcard.bot').replace(/\/+$/, '');
async function main() {
  if (!key) throw new Error('Set POSTCARDBOT_API_KEY');
  const response = await fetch(`${base}/api/v1/balance`, {
    headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(30000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  console.log(JSON.stringify(data, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
