const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const crypto = require('node:crypto');
const path = require('node:path');
const { promisify } = require('node:util');
const execFile = promisify(require('node:child_process').execFile);
const root = path.resolve(__dirname, '..');
process.env.WEBHOOK_SECRET = 'whsec_offline_fixture';
const { verifySignature, app } = require('../node/webhooks-server');
function signature(body, timestamp = Math.floor(Date.now() / 1000)) {
  return `t=${timestamp},v1=${crypto.createHmac('sha256', process.env.WEBHOOK_SECRET).update(`${timestamp}.`).update(body).digest('base64')}`;
}
test('webhooks preserve padding, use seconds and reject invalid signatures without throwing', () => {
  const raw = Buffer.from(JSON.stringify({ event: 'postcard.sent', data: { postcard_id: 'api_fixture', message: 'Hello 🌊' } }));
  const header = signature(raw);
  assert(header.endsWith('='));
  assert(verifySignature(raw, header));
  for (const bad of ['', 't=NaN,v1=x', header.slice(0, -3), header + ',v1=bad', signature(raw, Math.floor(Date.now()/1000)-301), signature(raw, Date.now())]) {
    assert.equal(verifySignature(raw, bad), false);
  }
  assert.equal(verifySignature(Buffer.from('changed'), header), false);
});
test('webhook receiver accepts envelopes and bulk summaries; rejects bad JSON and signatures', async t => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => server.close());
  const url = `http://127.0.0.1:${server.address().port}/webhooks`;
  for (const data of [{ postcard_id: 'api_fixture', status: 'sent' }, { is_bulk: true, bulk_id: 'bulk_fixture', succeeded: 2 }]) {
    const body = JSON.stringify({ event: 'postcard.sent', timestamp: new Date().toISOString(), data });
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-PostcardBot-Signature': signature(body) }, body });
    assert.equal(response.status, 200);
  }
  const body = '{invalid';
  assert.equal((await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-PostcardBot-Signature': signature(body) }, body })).status, 400);
  assert.equal((await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-PostcardBot-Signature': 't=oops,v1=x' }, body: '{}' })).status, 401);
});
test('CLI examples use current endpoints and statuses without physical mail', async t => {
  const calls = [];
  const server = http.createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk;
    calls.push({ path: req.url, method: req.method, body: raw ? JSON.parse(raw) : null });
    assert.equal(req.headers.authorization, 'Bearer pk_live_fixture');
    res.setHeader('Content-Type', 'application/json');
    if (req.url.endsWith('/preview')) return res.end(JSON.stringify({ will_send: false, price: 1.99, warnings: [] }));
    if (req.url === '/api/v1/postcards/bulk') return res.end(JSON.stringify({ bulk_id: 'bulk_fixture', total: 1, total_cost: 1.99, status: 'queued' }));
    if (req.url === '/api/v1/postcards') { res.statusCode = 202; return res.end(JSON.stringify({ id: 'api_fixture', status: 'pending_review', price: 1.99, balance_remaining: 8.01 })); }
    if (req.url.endsWith('/bulk_fixture')) return res.end(JSON.stringify({ bulk_id: 'bulk_fixture', status: 'processing', total: 1, processed: 1, succeeded: 0, failed: 0 }));
    if (req.url.endsWith('/missing')) { res.statusCode = 404; return res.end(JSON.stringify({ error: 'Postcard not found' })); }
    if (req.url === '/api/v1/balance') return res.end(JSON.stringify({ balance: 10, current_pricing: { usa: 1.99, international: 2.79 }, pricing_protected_until: null }));
    return res.end(JSON.stringify({ id: 'api_fixture', status: 'failed', error: 'Invalid recipient address', refund: { amount: 1.99, kind: 'balance' }, to: {} }));
  }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => server.close());
  const env = { ...process.env, POSTCARDBOT_API_KEY: 'pk_live_fixture', POSTCARDBOT_API_URL: `http://127.0.0.1:${server.address().port}` };
  const run = (file, ...args) => execFile(process.execPath, [path.join(root, 'node', file), ...args], { env, timeout: 10000 });
  assert.match((await run('preview-postcard.js')).stdout, /Preview only/);
  assert.equal(calls.at(-1).path, '/api/v1/postcards/preview');
  assert.match((await run('send-postcard.js')).stdout, /pending_review/);
  assert.equal(calls.at(-1).body.from.country, 'US');
  assert.match((await run('bulk-send.js', path.join(__dirname, 'quoted.csv'))).stdout, /bulk_fixture/);
  assert.equal(calls.at(-1).body.recipients[0].name, 'Example, Inc.');
  assert.equal(calls.at(-1).body.recipients[0].address_line2, 'Floor 2, Unit 4');
  assert.match((await run('check-status.js', 'bulk_fixture')).stdout, /bulk_fixture/);
  assert.match((await run('check-status.js', 'api_fixture')).stdout, /Invalid recipient address/);
  assert.match((await run('check-balance.js')).stdout, /current_pricing/);
  await assert.rejects(run('check-status.js', 'missing'), error => error.code === 1 && /Postcard not found/.test(error.stderr));
});
