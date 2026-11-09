# steelproxy

[![npm version](https://img.shields.io/npm/v/steelproxy.svg)](https://www.npmjs.com/package/steelproxy)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/steelproxy.svg)](https://nodejs.org)

Modern, fully typed TypeScript / Node.js client for the [Steel Proxy](https://api.steelproxy.com/docs) Reseller and Franchise API. Integrate automated proxy sales (datacenter, residential, rotating mobile/residential) into your websites, bots, and marketplace platforms.

Official API documentation: <https://api.steelproxy.com/docs>

---

## Features

- 🌐 **Comprehensive Catalog** — Fetch available proxy categories (`server`, `residential`, `rotation`), locations, lease terms, and discounted reseller prices.
- 🚀 **Instant Order Fulfillment** — Provision proxies instantly with dedicated HTTP/SOCKS5 credentials and personal rotation links.
- 🔄 **Order Management & Extensions** — Inspect active orders and extend proxy duration by 1, 2, 3, or 6 months.
- ⚡ **Marketplace Webhooks** — Webhook support and URL generator for BOT-T and external store platforms.
- 📦 **Dual Module Format** — Full support for ES Modules and CommonJS.
- 🛡️ **Typed & Robust** — Written in TypeScript with full TSDoc annotations and dedicated error classes (`SteelProxyPaymentRequiredError`, `SteelProxyConflictError`, etc.).

---

## Installation

```bash
npm install steelproxy
```

Requires Node.js 18 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects your account's available proxy catalog and order count. It does not order proxies or spend balance.

### TypeScript / ESM

```ts
import { SteelProxy } from "steelproxy";

const client = new SteelProxy({
  apiKey: process.env.STEELPROXY_API_KEY!,
});

// 1. Read available proxy types
const types = await client.getProxyTypes();
console.log("Proxy types:", types);

// 2. Read available locations
const locations = await client.getLocations();
console.log(`Available nodes: ${locations.length}`);

// 3. Inspect orders count (read-only)
const orders = await client.getOrders({ page: 1, page_size: 5 });
console.log(`Total orders: ${orders.total}`);
```

### CommonJS

```js
const { SteelProxy } = require("steelproxy");

async function main() {
  const client = new SteelProxy({
    apiKey: process.env.STEELPROXY_API_KEY,
  });

  const types = await client.getProxyTypes();
  console.log("Proxy types:", types);
}

main().catch(console.error);
```

---

## Usage Guide

### 1. Exploring the Catalog

```ts
import { SteelProxy } from "steelproxy";

const client = new SteelProxy({ apiKey: process.env.STEELPROXY_API_KEY });

// Get available proxy types
const types = await client.getProxyTypes();

// Get locations filtered by proxy type
const locations = await client.getLocations({ proxy_type: "residential" });
for (const loc of locations) {
  console.log(`Node #${loc.node_id}: ${loc.title} (${loc.country_code}) - Terms: ${loc.terms_days.join(", ")} days`);
}

// Get wholesale prices with reseller discount
const prices = await client.getPrices({ country_code: "US" });
for (const p of prices) {
  console.log(`${p.proxy_type} ${p.country_code} node #${p.node_id} for ${p.term_days}d: ${p.price} ${p.currency}`);
}
```

### 2. Ordering Proxies

> [!WARNING]
> Creating orders charges your Steel Proxy reseller balance.

```ts
import { SteelProxy, ProxyType, RotationMode } from "steelproxy";

const client = new SteelProxy({ apiKey: process.env.STEELPROXY_API_KEY });

// Static residential proxies
const order = await client.createOrder({
  proxy_type: ProxyType.RESIDENTIAL,
  node_id: 5,
  term_days: 7,
  quantity: 2,
  buyer_reference: "order-8841",
});

console.log(`Order #${order.order_id} created. Price: ${order.price} ${order.currency}`);
for (const proxy of order.proxies) {
  console.log("HTTP:", proxy.connection_string_http);
  console.log("SOCKS5:", proxy.connection_string_socks5);
}

// Rotating mobile/residential proxies with auto-rotation timer
const rotatingOrder = await client.createOrder({
  proxy_type: ProxyType.ROTATION,
  node_id: 12,
  term_days: 30,
  quantity: 1,
  rotation_mode: RotationMode.TIMER,
  timer_interval_minutes: 10,
});
console.log("Rotate link:", rotatingOrder.proxies[0].rotate_link);
```

### 3. Retrieving and Listing Orders

```ts
import { SteelProxy } from "steelproxy";

const client = new SteelProxy({ apiKey: process.env.STEELPROXY_API_KEY });

// Get single order with proxy credentials
const order = await client.getOrder(118432);
console.log(`Order status: ${order.status}, expires at: ${order.expires_at}`);

// List orders with pagination
const list = await client.getOrders({ page: 1, page_size: 20 });
console.log(`Page ${list.page} of ${Math.ceil(list.total / list.page_size)}`);
```

### 4. Extending an Existing Order

```ts
import { SteelProxy } from "steelproxy";

const client = new SteelProxy({ apiKey: process.env.STEELPROXY_API_KEY });

// Extend order by 1, 2, 3, or 6 months
const ext = await client.extendOrder(118432, { months: 1 });
console.log(`New expiration date: ${ext.expires_at}`);
console.log(`Balance after extension: ${ext.balance_after} ${ext.currency}`);
```

### 5. Webhook Integration for External Marketplaces

Generate static webhook URLs for automated sales platforms (such as BOT-T or external shop bots):

```ts
import { SteelProxy, ProxyType } from "steelproxy";

const client = new SteelProxy({ apiKey: process.env.STEELPROXY_API_KEY });

const webhookUrl = client.buildWebhookUrl({
  proxy_type: ProxyType.RESIDENTIAL,
  country_code: "US",
  term_days: 7,
});

console.log("Paste into marketplace webhook settings:", webhookUrl);
```

---

## Error Handling

All client errors inherit from `SteelProxyError`, with specific subclasses for API HTTP statuses:

```ts
import {
  SteelProxy,
  SteelProxyError,
  SteelProxyUnauthorizedError,
  SteelProxyPaymentRequiredError,
  SteelProxyConflictError,
  SteelProxyNotFoundError,
} from "steelproxy";

const client = new SteelProxy({ apiKey: "sp_live_key" });

try {
  await client.createOrder({
    proxy_type: "server",
    node_id: 1,
    term_days: 30,
    quantity: 10,
  });
} catch (err) {
  if (err instanceof SteelProxyPaymentRequiredError) {
    console.error("Insufficient balance on reseller account");
  } else if (err instanceof SteelProxyConflictError) {
    console.error("Out of stock: no available proxies on this node");
  } else if (err instanceof SteelProxyUnauthorizedError) {
    console.error("Invalid or missing API key");
  } else if (err instanceof SteelProxyError) {
    console.error(`Steel Proxy API error [${err.statusCode}]: ${err.message}`);
  }
}
```

---

## Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | `process.env.STEELPROXY_API_KEY` | Reseller API key from Telegram bot (`Profile -> API key`) |
| `baseURL` | `string` | `https://api.steelproxy.com/v1` | Custom base URL for the API |
| `timeoutMs` | `number` | `30000` | Request timeout in milliseconds |
| `userAgent` | `string` | `steelproxy/0.1.0` | Custom User-Agent header |

---

## License

[ISC](LICENSE)
