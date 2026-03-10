# Postcard.bot API Examples

Ready-to-run code examples for the [Postcard.bot](https://postcard.bot) REST API. Send real, printed postcards programmatically.

## Quick Start

1. Get an API key at [postcard.bot/account](https://postcard.bot/account)
2. Add balance at [postcard.bot/buy-credits](https://postcard.bot/buy-credits)
3. Pick an example below and run it

## Examples

### Node.js

| File | Description |
|------|-------------|
| [send-postcard.js](node/send-postcard.js) | Send a single postcard |
| [bulk-send.js](node/bulk-send.js) | Send postcards to a CSV list of recipients |
| [check-status.js](node/check-status.js) | Check postcard delivery status |
| [webhooks-server.js](node/webhooks-server.js) | Receive and verify webhook events |

```bash
cd node
npm install
POSTCARDBOT_API_KEY=pk_live_your_key node send-postcard.js
```

### Python

| File | Description |
|------|-------------|
| [send_postcard.py](python/send_postcard.py) | Send a single postcard |
| [bulk_send.py](python/bulk_send.py) | Send postcards to a CSV list of recipients |
| [check_status.py](python/check_status.py) | Check postcard delivery status |
| [webhooks_server.py](python/webhooks_server.py) | Receive and verify webhook events |

```bash
cd python
pip install requests flask
POSTCARDBOT_API_KEY=pk_live_your_key python send_postcard.py
```

### cURL

| File | Description |
|------|-------------|
| [send-postcard.sh](curl/send-postcard.sh) | Send a single postcard |
| [bulk-send.sh](curl/bulk-send.sh) | Send bulk postcards |
| [check-balance.sh](curl/check-balance.sh) | Check account balance and pricing tier |
| [webhooks.sh](curl/webhooks.sh) | Create, list, and delete webhooks |

```bash
cd curl
export POSTCARDBOT_API_KEY=pk_live_your_key
bash send-postcard.sh
```

## API Reference

- [Developer Docs](https://postcard.bot/developers) — full API reference, MCP server setup, pricing
- [OpenAPI Spec](https://postcard.bot/api/v1/openapi) — import into Postman, Swagger UI, or any API client
- [MCP Server](https://www.npmjs.com/package/@postcardbot/mcp-server) — let AI agents send postcards via Claude, Cursor, etc.

## Pricing

Volume pricing based on lifetime top-up amount:

| Tier | Lifetime top-up | USA | International |
|------|-----------------|-----|---------------|
| Pay-as-you-go | $0 | $1.99 | $2.99 |
| Starter | $1+ | $1.49 | $2.49 |
| Bronze | $20+ | $1.29 | $2.29 |
| Silver | $50+ | $0.99 | $1.99 |
| Gold | $200+ | $0.85 | $1.85 |
| Platinum | $500+ | $0.79 | $1.79 |
| Diamond | $1,000+ | $0.69 | $1.69 |

All-inclusive: printing + postage + delivery. No subscription.

## License

MIT
