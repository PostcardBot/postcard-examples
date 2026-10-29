# Postcard.bot API Examples

Node.js, Python and cURL examples for [Postcard.bot](https://postcard.bot): preview,
send and track postcards, send a CSV mailing, and receive signed webhooks.

## Quick start: preview first

1. Get an API key from your [account](https://postcard.bot/account).
2. Set `POSTCARDBOT_API_KEY` in your environment; never commit it.
3. Run a preview. It does **not** send mail or deduct balance.
4. Edit the sample image, addresses and message before using a send example.
5. [Add balance](https://postcard.bot/buy-credits) when you are ready to send.

`send` and `bulk` examples place paid orders. A `pk_live_` key is live.
`POSTCARDBOT_API_URL` overrides the server origin for development/testing;
it does not turn production requests into sandbox orders.

### Node.js 20+

```bash
cd node
npm ci
export POSTCARDBOT_API_KEY=pk_live_your_key
node check-balance.js
node preview-postcard.js
# After editing the sample for your intended recipient:
node send-postcard.js
node bulk-send.js ../sample.csv
node check-status.js postcard_id_returned_by_the_api
```

### Python 3.10+

```bash
python -m pip install -r python/requirements.txt
export POSTCARDBOT_API_KEY=pk_live_your_key
python python/check_balance.py
python python/preview_postcard.py
# After editing the sample for your intended recipient:
python python/send_postcard.py
python python/bulk_send.py sample.csv
python python/check_status.py postcard_id_returned_by_the_api
```

In PowerShell use `$env:POSTCARDBOT_API_KEY = 'pk_live_your_key'` instead of `export`.

### cURL

Use Bash and cURL 7.76+ (`--fail-with-body`). Webhook creation also uses Python 3
to encode its URL as JSON (`PYTHON` can override the executable). On Windows, use
Git Bash or WSL for `.sh` files.

```bash
export POSTCARDBOT_API_KEY=pk_live_your_key
bash curl/check-pricing.sh       # Public; no key required
bash curl/check-balance.sh       # Your account's actual rates
bash curl/preview-postcard.sh    # No charge or physical mail
# After editing the sample:
bash curl/send-postcard.sh
bash curl/bulk-send.sh
bash curl/check-status.sh postcard_id_returned_by_the_api
bash curl/webhooks.sh list
```

Single-card and preview examples are self-contained: edit their JSON payloads.
For CSV sending, edit the sender, message and artwork in the Node/Python bulk
script. Columns: `name,address_line1,address_line2,city,state,zip,country`;
`address_line2` is optional. Quoted fields containing commas are supported.
Use two-letter country codes and supply state and ZIP for US addresses.
Bulk requests support 1–5,000 recipients; `{{name}}` expands to their first name.

## Responses and status

- Preview returns `will_send: false`, account-specific price, balance sufficiency,
  image/QR checks, back preview and warnings. It is not an order or a reservation.
- A send can return **HTTP 202, `pending_review`**: paid and queued for review,
  but not yet submitted for printing.
- `sent` means accepted for printing, not delivered. Check the status endpoint
  for delivery information, `error`, `refund`, and `queued_since`.
- Bulk submission returns `bulk_id`, `total_cost` and a queue status. Processing
  and review are asynchronous. `processed` can include held cards; it does not
  mean all cards have been mailed.
- Do not depend on a supplier/service field; fulfilment routing is internal.

Examples do not automatically retry sends. If a POST times out, it may already
have been accepted. Check your account/status or contact support before repeating
it, rather than risking a duplicate paid order.

## Webhooks

```bash
bash curl/webhooks.sh create https://your-server.example/webhooks
# Save the returned secret privately, then run one receiver:
WEBHOOK_SECRET=whsec_your_secret node node/webhooks-server.js
WEBHOOK_SECRET=whsec_your_secret python python/webhooks_server.py
```

Both receivers verify `X-PostcardBot-Signature` over the **raw request bytes**.
The header is `t=UNIX_SECONDS,v1=BASE64_HMAC_SHA256`; the signed bytes are the
timestamp, a dot, and the body. Examples enforce a five-minute window. Preserve
Base64 padding and use the secret exactly as issued.

The payload is an envelope; read postcard fields from `data`:

```json
{
  "event": "postcard.sent",
  "timestamp": "2026-10-28T12:00:00.000Z",
  "data": {
    "postcard_id": "api_example",
    "status": "sent",
    "expected_delivery_date": null,
    "price": 1.99
  }
}
```

Bulk summaries use `data.is_bulk`, `data.bulk_id` and processing counts instead.
Make business actions idempotent when handling duplicates. These receivers only
log events; they do not trigger another mailing.

## Pricing

Standard USD rates as of **October 28, 2026**, including printing and postage:

| Option | Lifetime paid top-ups | US | International |
| --- | ---: | ---: | ---: |
| Pay as you go | None | $2.99 | $2.99 |
| Prepaid | $5+ | $1.99 | $2.79 |
| Prepaid | $50+ | $1.69 | $2.69 |
| Prepaid | $500+ | $1.49 | $2.49 |

Minimum top-up: $5. Thresholds are cumulative **funding**, not postcard counts.
Balance and lifetime progress do not expire; per-card rates can change.

Use [GET /api/v1/pricing](https://postcard.bot/api/v1/pricing) for public rates,
and authenticated `GET /api/v1/balance` for your actual `current_pricing` and
`pricing_protected_until`. Eligible existing funded accounts retain previous
standard rates through **December 31, 2026 Pacific time**. Do not derive account
prices from this public table or treat tier numbers as permanent rates.

## White-label: early access

[White-label early access](https://postcard.bot/business/white-label) adds custom
fronts and backs, branding and API fulfilment. Requests are free; paid subscriptions
are not open yet.

| Planned plan | Subscription | US/card | International/card |
| --- | --- | ---: | ---: |
| Business | $99/month | $0.99 | $2.19 |
| Pro monthly | $199/month | $0.89 | $2.09 |
| Pro yearly | $1,999/year | $0.89 | $2.09 |

Cards are charged separately from subscription fees. The standard preview example
is independent of white-label. Design endpoints are documented in OpenAPI, but
access and fulfilment depend on onboarding; a live key alone does not enable them.

[US back guide](https://postcard.bot/api/v1/designs/guides/us) ·
[International back guide](https://postcard.bot/api/v1/designs/guides/international)

Postal areas remain reserved. We mail directly to recipients; this is not packaged
blank-card fulfilment for resale.

## Reference and verification

- [Developer docs](https://postcard.bot/developers)
- [Live OpenAPI specification](https://postcard.bot/api/v1/openapi)
- [MCP server](https://www.npmjs.com/package/@postcardbot/mcp-server)
- [Mailing terms](https://postcard.bot/terms)

Offline checks use local mocks; no API key, payment or physical mail is needed:

```bash
npm --prefix node ci
npm --prefix node test
python -m pip install -r python/requirements.txt
python -m unittest discover -s tests -p 'test_*.py'
```

## License

MIT
