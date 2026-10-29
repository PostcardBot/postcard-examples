#!/usr/bin/env bash
set -euo pipefail
# Public prices. Use check-balance.sh for your account's effective rates.
BASE_URL="${POSTCARDBOT_API_URL:-https://postcard.bot}"
curl --silent --show-error --fail-with-body --connect-timeout 10 --max-time 30 \
  "${BASE_URL%/}/api/v1/pricing"
